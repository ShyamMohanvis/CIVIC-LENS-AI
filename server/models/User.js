const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    // Authentication
    employeeId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
        index: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        sparse: true
    },
    password: {
        type: String,
        select: false // Don't include password in queries by default
    },

    // Profile
    name: {
        type: String,
        required: true,
        trim: true
    },

    // Contact
    phone: {
        type: String,
        trim: true,
        sparse: true,
        index: true
    },

    // Role & Permissions
    role: {
        type: String,
        enum: ['CITIZEN', 'MUNICIPAL_OPERATOR', 'MUNICIPAL_ADMIN', 'STATE_ADMIN'],
        required: true,
        default: 'CITIZEN',
        index: true
    },

    // Jurisdiction (determines what data user can access)
    jurisdiction: {
        state: { type: String, trim: true },
        city: { type: String, trim: true },
        ulbCode: { type: String, trim: true, index: true },
        ward: { type: String, trim: true },
        department: { type: String, trim: true }
    },

    // Status
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },

    // Metadata
    lastLogin: { type: Date },
    loginCount: { type: Number, default: 0 },

    // Administrative
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Auth Hardening — FR-02 / VULN-002
    mfaEnabled: {
        type: Boolean,
        default: false
    },
    mfaSecret: {
        type: String, // TOTP secret
        select: false // never return in standard queries
    },
    refreshTokens: [{
        token: String,
        family: String, // for token rotation/revocation
        expiresAt: Date,
        createdAt: { type: Date, default: Date.now }
    }],

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Indexes for performance
UserSchema.index({ employeeId: 1 });
UserSchema.index({ role: 1, 'jurisdiction.ulbCode': 1 });
UserSchema.index({ 'jurisdiction.state': 1 });
UserSchema.index({ isActive: 1 });

// Hash password before saving — bcrypt cost ≥ 12 per §12.2
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    if (this.password) {
        this.password = await bcrypt.hash(this.password, 12); // cost=12 (was 10)
    }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

// Method to generate OTP
UserSchema.methods.generateOTP = function () {
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    this.otp = {
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        attempts: 0
    };
    return otp;
};

// Method to verify OTP
UserSchema.methods.verifyOTP = function (candidateOTP) {
    if (!this.otp || !this.otp.code) {
        return { success: false, message: 'No OTP found' };
    }

    if (this.otp.attempts >= 3) {
        return { success: false, message: 'Too many attempts. Request new OTP' };
    }

    if (new Date() > this.otp.expiresAt) {
        return { success: false, message: 'OTP expired' };
    }

    if (this.otp.code !== candidateOTP) {
        this.otp.attempts += 1;
        return { success: false, message: 'Invalid OTP' };
    }

    // OTP is valid
    this.isVerified = true;
    this.otp = undefined; // Clear OTP after successful verification
    return { success: true, message: 'OTP verified' };
};

// Method to check if user can access complaint
UserSchema.methods.canAccessComplaint = function (complaint) {
    if (this.role === 'CITIZEN') {
        return complaint.userId && complaint.userId.toString() === this._id.toString();
    }

    if (this.role === 'MUNICIPAL_OPERATOR') {
        return complaint.assignedTo && complaint.assignedTo.toString() === this._id.toString();
    }

    if (this.role === 'MUNICIPAL_ADMIN') {
        return complaint.jurisdiction?.ulbCode === this.jurisdiction.ulbCode;
    }

    if (this.role === 'STATE_ADMIN') {
        return complaint.jurisdiction?.state === this.jurisdiction.state;
    }

    return false;
};

// Virtual for full jurisdiction display name
UserSchema.virtual('jurisdictionDisplay').get(function () {
    const parts = [];
    if (this.jurisdiction.ward) parts.push(`Ward ${this.jurisdiction.ward}`);
    if (this.jurisdiction.city) parts.push(this.jurisdiction.city);
    if (this.jurisdiction.state) parts.push(this.jurisdiction.state);
    return parts.join(', ') || 'All India';
});

// Don't include sensitive fields in JSON
UserSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    delete obj.__v;
    return obj;
};

module.exports = mongoose.model('User', UserSchema);
