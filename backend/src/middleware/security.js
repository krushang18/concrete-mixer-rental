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

// Rate limiting for admin login attempts
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per windowMs
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
    error: "LOGIN_RATE_LIMIT_EXCEEDED",
  },
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    console.log(`Admin login rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many login attempts. Please try again after 15 minutes.",
      error: "LOGIN_RATE_LIMIT_EXCEEDED",
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
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [
      "http://localhost:3000",
      "http://127.0.0.1:5500",
      "http://localhost:8080",
      "https://fioriforrent.com",
      "https://www.fioriforrent.com",
    ];

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
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

// File upload security (for Phase 2)
const validateFileUploadSecurity = (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }

  const files = req.files || [req.file];

  for (const file of files) {
    // Check for suspicious file extensions
    const suspiciousExtensions = [
      ".exe",
      ".bat",
      ".cmd",
      ".scr",
      ".pif",
      ".com",
      ".js",
      ".vbs",
      ".jar",
    ];
    const fileExt = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf("."));

    if (suspiciousExtensions.includes(fileExt)) {
      return res.status(400).json({
        success: false,
        message: "File type not allowed for security reasons",
        error: "SUSPICIOUS_FILE_TYPE",
      });
    }

    // Check file content type matches extension
    const allowedMimeTypes = {
      ".jpg": ["image/jpeg"],
      ".jpeg": ["image/jpeg"],
      ".png": ["image/png"],
      ".gif": ["image/gif"],
      ".pdf": ["application/pdf"],
    };

    if (
      allowedMimeTypes[fileExt] &&
      !allowedMimeTypes[fileExt].includes(file.mimetype)
    ) {
      return res.status(400).json({
        success: false,
        message: "File content does not match file extension",
        error: "FILE_CONTENT_MISMATCH",
      });
    }
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
  adminLoginLimiter,
  generalApiLimiter,
  helmetConfig,
  corsOptions,
  logRequests,
  validateRequest,
  validateFileUploadSecurity,
  securityErrorHandler,
};
