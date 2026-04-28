/**
 * Application Constants
 * Centralized constant values to avoid magic numbers
 */

module.exports = {
    // Geospatial constants
    DEFAULT_SEARCH_RADIUS_METERS: 200,
    MAX_SEARCH_RADIUS_METERS: 5000,

    // Time range constants
    DEFAULT_TIME_RANGE_DAYS: 30,
    DEFAULT_PREDICTION_DAYS: 90,
    MAX_TIME_RANGE_DAYS: 365,

    // SLA constants (in minutes)
    SLA_CRITICAL: 15,
    SLA_HIGH: 60,
    SLA_MEDIUM: 240,
    SLA_LOW: 1440,

    // Trust score weights
    TRUST_SCORE_MAX: 100,
    TRUST_SCORE_DEFAULT: 50,

    // Classification confidence
    CONFIDENCE_THRESHOLD: 0.6,
    CONFIDENCE_HIGH: 0.8,

    // Pagination
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,

    // File upload
    MAX_FILE_SIZE_MB: 10,
    MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,

    // Rate limiting
    RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: 100,

    // Cache TTL (in seconds)
    CACHE_TTL_SHORT: 60,
    CACHE_TTL_MEDIUM: 300,
    CACHE_TTL_LONG: 3600
};
