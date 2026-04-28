/**
 * Error Response Utility
 * Standardizes error responses across all controllers
 */

class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Send standardized error response
 * @param {Error} error - Error object
 * @param {Response} res - Express response object
 */
function sendErrorResponse(error, res) {
    // Mongoose validation error
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation Error',
            details: error.message
        });
    }

    // Mongoose cast error (invalid ObjectId)
    if (error.name === 'CastError') {
        return res.status(404).json({
            success: false,
            error: 'Resource not found',
            details: `Invalid ${error.path}: ${error.value}`
        });
    }

    // MongoDB duplicate key error
    if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(409).json({
            success: false,
            error: 'Duplicate entry',
            details: `${field} already exists`
        });
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }

    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'Token expired'
        });
    }

    // Custom operational errors
    if (error.isOperational) {
        return res.status(error.statusCode).json({
            success: false,
            error: error.message
        });
    }

    // Unknown/programming errors
    console.error('❌ Unexpected error:', error);
    return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
}

/**
 * Async handler wrapper - catches errors in async functions
 * @param {Function} fn - Async function to wrap
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = {
    AppError,
    sendErrorResponse,
    asyncHandler
};
