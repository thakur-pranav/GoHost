// Security middleware: HTTP headers (helmet), CSRF tokens and rate limits.
const helmet = require("helmet");
const { csrfSync } = require("csrf-sync");
const { rateLimit } = require("express-rate-limit");
const { isProduction } = require("./config.js");

// ---------- Security headers + Content Security Policy ----------
// The CSP lists every place the browser may load code, styles, images and
// data from. Anything else (e.g. a script injected into a listing title)
// is blocked by the browser.
module.exports.securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://api.mapbox.com"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com",
        "https://api.mapbox.com",
      ],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://res.cloudinary.com",
        "https://images.unsplash.com",
        "https://plus.unsplash.com",
        "https://api.mapbox.com",
      ],
      // Mapbox GL fetches map data and runs its renderer in a blob: worker.
      connectSrc: ["'self'", "https://api.mapbox.com", "https://events.mapbox.com"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["blob:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      // Upgrading http -> https would break http://localhost in development.
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },
});

// ---------- CSRF protection ----------
// Every POST/PUT/DELETE must carry the secret token stored in the user's
// session, which other websites can't read. Normal forms send it as a hidden
// _csrf field; the multipart upload forms send it in the URL, because their
// body is only parsed after the upload, and we want to check it before.
const { csrfSynchronisedProtection, generateToken } = csrfSync({
  getTokenFromRequest: (req) =>
    (req.body && req.body._csrf) || req.headers["x-csrf-token"] || req.query._csrf,
});

module.exports.csrfProtection = (req, res, next) => {
  csrfSynchronisedProtection(req, res, (err) => {
    if (err) return next(err);
    // Joi schemas reject unknown fields, so drop the token once checked.
    if (req.body) delete req.body._csrf;
    next();
  });
};

// Template helpers. Calling them is what creates the token, so visitors who
// only browse (no forms shown) still don't get a session.
module.exports.csrfLocals = (req, res, next) => {
  res.locals.csrfToken = () => generateToken(req);
  res.locals.csrfField = () =>
    `<input type="hidden" name="_csrf" value="${generateToken(req)}">`;
  next();
};

// ---------- Rate limits ----------
const tooMany = (message) => (req, res) => {
  req.flash("error", message);
  res.redirect(req.originalUrl);
};

// 10 failed logins per IP per 15 minutes; successful logins don't count.
module.exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  requestWasSuccessful: (req) => req.isAuthenticated(),
  handler: tooMany("Too many failed login attempts. Please try again in 15 minutes."),
});

// 10 sign-up attempts per IP per hour.
module.exports.signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: tooMany("Too many sign-up attempts. Please try again later."),
});
