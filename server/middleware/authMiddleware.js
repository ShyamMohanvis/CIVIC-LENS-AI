const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Environment variable for JWT secret (will be added to .env)
const JWT_SECRET = process.env.JWT_SECRET || 'civic-lens-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate JWT token for user
 */
const generateToken = (user) => {
    const payload = {
        userId: user._id,
        role: user.role,
        jurisdiction: user.jurisdiction,
        phone: user.phone,
        aud: 'CIVI-Lens-Frontend' // JWT Audience Validation — FR-02
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN // Enforced rotation (VULN-002)
    });
};

/**
 * Middleware to authenticate user via JWT token
 * Attaches user object to req.user
 */
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No token provided. Authentication required.'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token (audience is checked here — FR-02)
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET, {
                audience: 'CIVI-Lens-Frontend'
            });
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Token expired. Please login again.'
                });
            }
            return res.status(401).json({
                success: false,
                error: 'Invalid token. Authentication failed.'
            });
        }

        // Get user from database
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found.'
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                error: 'Account is deactivated. Contact administrator.'
            });
        }

        // MFA enforcement for authority roles — VULN-035 / FR-04
        // If the user is a staff member and has NOT yet set up MFA, gate all requests.
        const MFA_REQUIRED_ROLES = ['MUNICIPAL_OPERATOR', 'MUNICIPAL_ADMIN', 'STATE_ADMIN'];
        if (MFA_REQUIRED_ROLES.includes(user.role) && !user.mfaEnabled) {
            return res.status(403).json({
                success: false,
                error: 'Multi-Factor Authentication (MFA) is mandatory for your role. Please set up MFA before proceeding.',
                mfaSetupRequired: true,
                setupEndpoint: '/api/auth/mfa/setup'
            });
        }

        // Attach user to request
        req.user = user;
        req.token = decoded;

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed.'
        });
    }
};

/**
 * Middleware to authorize based on user roles
 * Usage: authorize('MUNICIPAL_ADMIN', 'STATE_ADMIN')
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required.'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Insufficient permissions.',
                requiredRoles: allowedRoles,
                userRole: req.user.role
            });
        }

        next();
    };
};

/**
 * Middleware to check if user can access a specific complaint
 * Call after authenticate middleware
 */
const checkComplaintAccess = async (req, res, next) => {
    try {
        const complaintId = req.params.id;

        if (!complaintId) {
            return res.status(400).json({
                success: false,
                error: 'Complaint ID required.'
            });
        }

        const Complaint = require('../models/Complaint');
        const complaint = await Complaint.findById(complaintId);

        if (!complaint) {
            return res.status(404).json({
                success: false,
                error: 'Complaint not found.'
            });
        }

        // Check access based on role
        if (!req.user.canAccessComplaint(complaint)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. You do not have permission to access this complaint.'
            });
        }

        // Attach complaint to request for use in controller
        req.complaint = complaint;
        next();
    } catch (error) {
        console.error('Complaint access check error:', error);
        res.status(500).json({
            success: false,
            error: 'Error checking complaint access.'
        });
    }
};

/**
 * Optional authentication - doesn't fail if no token provided
 * Use for routes that work for both authenticated and non-authenticated users
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No token, continue without user
            req.user = null;
            return next();
        }

        const token = authHeader.substring(7);

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await User.findById(decoded.userId);

            if (user && user.isActive) {
                req.user = user;
                req.token = decoded;
            }
        } catch (err) {
            // Invalid token, but continue anyway
            req.user = null;
        }

        next();
    } catch (error) {
        console.error('Optional auth error:', error);
        req.user = null;
        next();
    }
};

module.exports = {
    generateToken,
    authenticate,
    authorize,
    checkComplaintAccess,
    optionalAuth,
    JWT_SECRET,
    JWT_EXPIRES_IN
};
