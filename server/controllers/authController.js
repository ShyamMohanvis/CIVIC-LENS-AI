const User = require('../models/User');
const { generateToken, JWT_EXPIRES_IN } = require('../middleware/authMiddleware');
const crypto = require('crypto');
const { authenticator } = require('otplib');

/**
 * Generate a cryptographically secure refresh token
 */
const generateRefreshToken = () => {
    return crypto.randomBytes(40).toString('hex');
};

/**
 * Citizen Self-Registration — FR-01
 * Auto-generates an Employee ID (CIT-XXXXXX) for citizens.
 */
exports.register = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        // Check for existing account by email or phone
        const query = [];
        if (email) query.push({ email });
        if (phone) query.push({ phone });
        const existing = await User.findOne({ $or: query });
        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'An account with this email or phone already exists.'
            });
        }

        // Auto-generate unique citizen Employee ID
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        const employeeId = `CIT-${randomPart}`;

        const user = new User({
            employeeId,
            name,
            email,
            phone,
            password,
            role: 'CITIZEN',
            isVerified: true, // simplify for now; add OTP verification in Phase C
            jurisdiction: {
                state: 'Uttar Pradesh',
                city: 'Lucknow',
                ulbCode: 'UP-LKO-001'
            }
        });

        await user.save();

        const token = generateToken(user);

        console.log(`✅ Citizen registered: ${employeeId}`);

        res.status(201).json({
            success: true,
            message: 'Registration successful.',
            token,
            user: {
                id: user._id,
                name: user.name,
                employeeId: user.employeeId,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed.',
            details: error.message
        });
    }
};

/**
 * Employee ID + Password authentication for government staff
 * Citizens can also register with employee ID (auto-generated or provided)
 */

/**
 * Login with Employee ID and Password
 */
exports.login = async (req, res) => {
    try {
        const { employeeId, password } = req.body;

        if (!employeeId || !password) {
            return res.status(400).json({
                success: false,
                error: 'Employee ID and password are required.'
            });
        }

        // Find user and include password
        const user = await User.findOne({ employeeId: employeeId.toUpperCase() }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials.'
            });
        }

        // Verify password
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials.'
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                error: 'Account is deactivated. Contact administrator.'
            });
        }

        // ── Check MFA (Phase C) ──
        if (user.mfaEnabled) {
            // Do not issue tokens yet. Ask client for OTP.
            return res.status(200).json({
                success: true,
                mfaRequired: true,
                userId: user._id,
                message: 'MFA required. Please verify OTP.'
            });
        }

        // Generate Access Token & Refresh Token
        const token = generateToken(user);
        const refreshToken = generateRefreshToken();
        
        // Save refresh token to DB (VULN-002: Token Tracking)
        // Family is the device/browser session ID. Using a new one for simple rotation.
        const family = crypto.randomBytes(16).toString('hex');
        
        user.refreshTokens.push({
            token: refreshToken,
            family,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });

        // Cap array at 5 sessions to prevent document bloat
        if (user.refreshTokens.length > 5) {
            user.refreshTokens.shift();
        }

        user.lastLogin = Date.now();
        user.loginCount = (user.loginCount || 0) + 1;
        await user.save();

        console.log(`✅ User logged in: ${user.employeeId} (${user.role})`);

        res.status(200).json({
            success: true,
            message: 'Login successful.',
            token,
            refreshToken, // send to client to store securely
            user: {
                id: user._id,
                name: user.name,
                employeeId: user.employeeId,
                email: user.email,
                role: user.role,
                jurisdiction: user.jurisdiction
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed.',
            details: error.message
        });
    }
};

/**
 * Get current user profile
 */
exports.getCurrentUser = async (req, res) => {
    try {
        // req.user is set by authenticate middleware
        res.status(200).json({
            success: true,
            user: {
                id: req.user._id,
                name: req.user.name,
                employeeId: req.user.employeeId,
                email: req.user.email,
                role: req.user.role,
                jurisdiction: req.user.jurisdiction,
                isVerified: req.user.isVerified,
                lastLogin: req.user.lastLogin,
                createdAt: req.user.createdAt
            }
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user profile.'
        });
    }
};

/**
 * Logout (client-side should delete token, this is for logging purposes)
 */
exports.logout = async (req, res) => {
    try {
        console.log(`👋 User logged out: ${req.user.employeeId}`);

        res.status(200).json({
            success: true,
            message: 'Logout successful.'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Logout failed.'
        });
    }
};

/**
 * Create operator/admin users (restricted to admins)
 */
exports.createStaffUser = async (req, res) => {
    try {
        const { employeeId, name, email, role, jurisdiction, password } = req.body;

        // Only Municipal Admin and State Admin can create staff
        if (!['MUNICIPAL_ADMIN', 'STATE_ADMIN'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Only admins can create staff users.'
            });
        }

        // Validation
        if (!employeeId || !name || !role || !password) {
            return res.status(400).json({
                success: false,
                error: 'Employee ID, name, role, and password are required.'
            });
        }

        // Role validation based on creator's role
        if (req.user.role === 'MUNICIPAL_ADMIN') {
            // Municipal Admin can only create operators in their city
            if (role !== 'MUNICIPAL_OPERATOR') {
                return res.status(403).json({
                    success: false,
                    error: 'Municipal Admins can only create Municipal Operators.'
                });
            }

            // Must be in same city
            if (jurisdiction.ulbCode !== req.user.jurisdiction.ulbCode) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only create operators in your jurisdiction.'
                });
            }
        }

        // Check if user already exists
        const existingUser = await User.findOne({ employeeId: employeeId.toUpperCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User with this Employee ID already exists.'
            });
        }

        // Create new user
        const user = new User({
            employeeId: employeeId.toUpperCase(),
            name,
            email,
            role,
            jurisdiction,
            password,
            isVerified: true, // Staff users are pre-verified
            createdBy: req.user._id
        });

        await user.save();

        console.log(`✅ New staff user created: ${employeeId} - ${role} by ${req.user.employeeId}`);

        res.status(201).json({
            success: true,
            message: 'Staff user created successfully.',
            user: {
                id: user._id,
                name: user.name,
                employeeId: user.employeeId,
                role: user.role,
                jurisdiction: user.jurisdiction
            }
        });

    } catch (error) {
        console.error('Create staff user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create staff user.',
            details: error.message
        });
    }
};

/**
 * ── Refresh Token Rotation — FR-02 / VULN-002 ──
 * POST /api/auth/refresh
 * Client sends `{ refreshToken: "..." }`. Check DB, rotate, return new pair.
 */
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ success: false, error: 'Refresh token required' });

        // Find user by refresh token
        const user = await User.findOne({ 'refreshTokens.token': refreshToken });
        
        if (!user) {
            // NOTE: If token doesn't exist, it might be a reused token (compromise scenario).
            // A truly secure system would find the user by looking at *previously* used tokens and revoke the family.
            // Simplified for Phase C presentation: just reject.
            return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
        }

        // Find specific token entry
        const tokenEntry = user.refreshTokens.find(rt => rt.token === refreshToken);
        if (new Date() > new Date(tokenEntry.expiresAt)) {
            // Remove expired token
            user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
            await user.save();
            return res.status(401).json({ success: false, error: 'Refresh token expired. Please login again.' });
        }

        // ROTATE: Remove the old token from the DB array
        user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);

        // Generate new pair
        const newAccessToken = generateToken(user);
        const newRefreshToken = generateRefreshToken();

        // Save new RT with same family
        user.refreshTokens.push({
            token: newRefreshToken,
            family: tokenEntry.family,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        await user.save();

        res.json({
            success: true,
            token: newAccessToken,
            refreshToken: newRefreshToken
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * ── Multi-Factor Authentication (Phase C) ──
 * POST /api/auth/mfa/setup
 */
exports.setupMFA = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const secret = authenticator.generateSecret(); // create new secret
        const otpauth = authenticator.keyuri(user.employeeId || user.email, 'CIVI-Lens', secret);

        // Save temporarily (not fully enabled yet)
        user.mfaSecret = secret;
        await user.save();

        res.json({
            success: true,
            secret, // Usually send a QR code image URL here, but secret string works for MVP testing
            otpauth
        });
    } catch (error) {
        console.error('MFA setup error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * POST /api/auth/mfa/verify
 * User submits 6-digit OTP to enable MFA or to complete login.
 */
exports.verifyMFA = async (req, res) => {
    try {
        const { userId, token } = req.body;
        
        // If enabling for the first time, userId comes from req.user
        // If logging in, userId comes from the body (since they aren't JWT authed yet)
        const idToUse = req.user ? req.user._id : userId;

        if (!idToUse) return res.status(400).json({ success: false, error: 'User ID missing' });

        const user = await User.findById(idToUse).select('+mfaSecret');
        if (!user || !user.mfaSecret) {
            return res.status(400).json({ success: false, error: 'MFA not configured' });
        }

        const isValid = authenticator.verify({ token, secret: user.mfaSecret });

        if (!isValid) {
            return res.status(400).json({ success: false, error: 'Invalid OTP' });
        }

        // If this is initial setup, enable it
        if (!user.mfaEnabled) {
            user.mfaEnabled = true;
            await user.save();
            return res.json({ success: true, message: 'MFA successfully enabled.' });
        }

        // If logging in, issue tokens now
        const accessToken = generateToken(user);
        const refreshToken = generateRefreshToken();
        
        const family = crypto.randomBytes(16).toString('hex');
        user.refreshTokens.push({
            token: refreshToken,
            family,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        if (user.refreshTokens.length > 5) user.refreshTokens.shift();
        
        user.lastLogin = Date.now();
        await user.save();

        res.json({
            success: true,
            token: accessToken,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                employeeId: user.employeeId,
                role: user.role,
                jurisdiction: user.jurisdiction
            }
        });

    } catch (error) {
        console.error('MFA verify error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};
