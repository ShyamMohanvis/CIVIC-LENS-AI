/**
 * Idempotency Key Middleware — FR-16-A / VULN-010
 *
 * Requires `Idempotency-Key` header on all mutating endpoints.
 * Uses a simple in-memory store (24h TTL) to detect duplicate submissions.
 *
 * Production note: Replace the in-memory Map with Redis for multi-instance support.
 */

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory store: key → { status, responseBody, createdAt }
// Replace with Redis in production (see NFR for Redis rate-limit + revocation store).
const idempotencyStore = new Map();

// Prune expired keys every hour
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of idempotencyStore.entries()) {
        if (now - record.createdAt > IDEMPOTENCY_TTL_MS) {
            idempotencyStore.delete(key);
        }
    }
}, 60 * 60 * 1000);

/**
 * requireIdempotencyKey — blocks the request if no key is provided.
 */
const requireIdempotencyKey = (req, res, next) => {
    const key = req.headers['idempotency-key'];

    if (!key) {
        return res.status(422).json({
            success: false,
            error: 'Idempotency-Key header is required for this operation.',
            hint: 'Generate a UUID v4 and include it as the Idempotency-Key header.'
        });
    }

    if (key.length < 8 || key.length > 128) {
        return res.status(422).json({
            success: false,
            error: 'Idempotency-Key must be between 8 and 128 characters.'
        });
    }

    // Namespace by user ID (or IP if anonymous) to prevent cross-user token clashes
    const namespace = req.user ? req.user._id.toString() : req.ip;
    const storeKey = `${namespace}:${key}`;

    const existing = idempotencyStore.get(storeKey);

    if (existing) {
        if (existing.status === 'processing') {
            return res.status(409).json({
                success: false,
                error: 'A request with this Idempotency-Key is already being processed.'
            });
        }
        // Return cached successful response (idempotent replay)
        return res.status(existing.httpStatus).json({
            ...existing.responseBody,
            _idempotent: true,
            _cached: true
        });
    }

    // Mark as processing
    idempotencyStore.set(storeKey, {
        status: 'processing',
        createdAt: Date.now()
    });

    // Intercept response to cache it
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        idempotencyStore.set(storeKey, {
            status: 'completed',
            httpStatus: res.statusCode,
            responseBody: body,
            createdAt: Date.now()
        });
        return originalJson(body);
    };

    req._idempotencyKey = storeKey;
    next();
};

/**
 * optionalIdempotencyKey — logs a warning if key is missing but doesn't block.
 * Use on endpoints where idempotency is recommended but not mandatory.
 */
const optionalIdempotencyKey = (req, res, next) => {
    const key = req.headers['idempotency-key'];
    if (!key) {
        console.warn(`⚠️  [Idempotency] No key on ${req.method} ${req.path} — duplicate risk`);
    }
    next();
};

module.exports = { requireIdempotencyKey, optionalIdempotencyKey };
