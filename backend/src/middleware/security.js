const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

// Rate limiting for customer queries
const customerQueryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: "Too many queries submitted. Please try again after 15 minutes.",
    error: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many queries submitted. Please try again after 15 minutes.",
      error: "RATE_LIMIT_EXCEEDED",
    });
  },
});



// General API rate limiting
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
    error: "API_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helmet configuration for security headers
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
      ],
      scriptSrc: [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
      ],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
      ],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const defaultOrigins = [
      "http://localhost:3000",
      "http://localhost:5000",
      "https://fioriforrent.com",
      "https://www.fioriforrent.com",
    ];

    // Combine env vars and defaults, remove duplicates
    const envOrigins = process.env.CORS_ORIGIN?.split(",") || [];
    const allowedOrigins = [...new Set([...envOrigins, ...defaultOrigins])];

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`[CORS CRITICAL] BLOCKED REQUEST. Origin: '${origin}'`);
      console.error(`[CORS CRITICAL] Allowed List: ${JSON.stringify(allowedOrigins)}`);
      callback(new Error("Not allowed by CORS policy"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["X-Total-Count"],
  maxAge: 86400, // 24 hours
};

// IP logging middleware
const logRequests = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "Unknown";

  console.log(
    `[${timestamp}] ${req.method} ${req.originalUrl} - IP: ${ip} - User-Agent: ${userAgent}`
  );

  next();
};

// Request validation middleware
const validateRequest = (req, res, next) => {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    // /script/i,
    /javascript/i,
    /vbscript/i,
    /onload/i,
    /onerror/i,
    /eval\(/i,
    /alert\(/i,
    /document\.cookie/i,
    /window\.location/i,
  ];

  const checkForSuspiciousContent = (obj) => {
    if (typeof obj === "string") {
      return suspiciousPatterns.some((pattern) => pattern.test(obj));
    }

    if (typeof obj === "object" && obj !== null) {
      return Object.values(obj).some((value) =>
        checkForSuspiciousContent(value)
      );
    }

    return false;
  };

  // Check request body and query parameters
  if (
    checkForSuspiciousContent(req.body) ||
    checkForSuspiciousContent(req.query)
  ) {
    console.log(`Suspicious request detected from IP: ${req.ip}`);
    return res.status(400).json({
      success: false,
      message: "Invalid request detected",
      error: "INVALID_REQUEST",
    });
  }

  next();
};



// Error handling for security middleware
const securityErrorHandler = (err, req, res, next) => {
  if (err.message === "Not allowed by CORS policy") {
    return res.status(403).json({
      success: false,
      message: "Access denied: CORS policy violation",
      error: "CORS_ERROR",
    });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request entity too large",
      error: "PAYLOAD_TOO_LARGE",
    });
  }

  next(err);
};

module.exports = {
  customerQueryLimiter,
  generalApiLimiter,
  helmetConfig,
  corsOptions,
  logRequests,
  validateRequest,
  securityErrorHandler,
};
