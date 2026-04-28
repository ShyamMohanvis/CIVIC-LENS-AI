const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter — 100 requests / minute per IP
 */
const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many requests. Please slow down and try again in a minute.'
    },
    skip: (req) => req.user?.role === 'STATE_ADMIN' // State admins bypass for dashboard loads
});

/**
 * Auth endpoints limiter — 20 attempts / 15 min per IP (brute-force protection)
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many authentication attempts. Try again in 15 minutes.'
    }
});

/**
 * Complaint submission limiter — 10 complaints / day per user IP
 */
const complaintSubmitLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Daily complaint limit reached (10/day). Try again tomorrow.'
    }
});

/**
 * SOS rate limiter — 2 SOS / hour per IP (per device ideally, IP is fallback)
 * Doc: FR-30 / VULN-001 — 2/hr/device
 */
const sosLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // Temporarily increased from 2 for QA testing (Doc: FR-30 / VULN-001)
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'SOS rate limit exceeded. Please contact emergency services directly: 112.'
    }
});

/**
 * Upvote limiter — 50 upvotes / day per user
 */
const upvoteLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Daily upvote limit reached (50/day).'
    }
});

module.exports = {
    generalLimiter,
    authLimiter,
    complaintSubmitLimiter,
    sosLimiter,
    upvoteLimiter
};
