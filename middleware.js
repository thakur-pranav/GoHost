const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema, reviewSchema, bookingSchema } = require("./schema.js");
const { deleteImage, fileToImage } = require("./cloudConfig.js");

module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    // Remember where the user was going so login can send them back there.
    if (req.method === "GET") {
      req.session.redirectUrl = req.originalUrl;
    }
    req.flash("error", "You must be signed in first!");
    return res.redirect("/login");
  }
  next();
};

// passport.authenticate() regenerates the session on login, so copy the
// saved URL into res.locals before that happens.
module.exports.saveRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};

module.exports.isOwner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Cannot find that listing!");
      return res.redirect("/listings");
    }
    if (!listing.owner || !listing.owner.equals(req.user._id)) {
      req.flash("error", "You are not the owner of this listing!");
      return res.redirect(`/listings/${id}`);
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports.isReviewAuthor = async (req, res, next) => {
  try {
    const { id, reviewId } = req.params;
    const review = await Review.findById(reviewId);
    if (!review) {
      req.flash("error", "Cannot find that review!");
      return res.redirect(`/listings/${id}`);
    }
    if (!review.author || !review.author.equals(req.user._id)) {
      req.flash("error", "You are not the author of this review!");
      return res.redirect(`/listings/${id}`);
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports.validateListing = async (req, res, next) => {
  const { error } = listingSchema.validate(req.body);
  if (error) {
    // The image was already uploaded by multer; don't leave it orphaned.
    if (req.file) await deleteImage(fileToImage(req.file));
    const errMsg = error.details.map((el) => el.message).join(",");
    return next(new ExpressError(400, errMsg));
  }
  next();
};

// Login/signup fields go straight into database queries, so they must be
// plain strings (blocks payloads like username[$ne]=x).
module.exports.requireStringFields = (...fields) => (req, res, next) => {
  const bad = fields.some((f) => req.body[f] !== undefined && typeof req.body[f] !== "string");
  if (bad) {
    req.flash("error", "Invalid input.");
    return res.redirect(req.originalUrl);
  }
  next();
};

// Booking form errors go back to the listing page as a flash message rather
// than an error page, since they're usually just a wrong date.
module.exports.validateBooking = (req, res, next) => {
  const { error } = bookingSchema.validate(req.body);
  if (error) {
    req.flash("error", error.details.map((el) => el.message).join(", "));
    return res.redirect(`/listings/${req.params.id}`);
  }
  next();
};

module.exports.validateReview = (req, res, next) => {
  const { error } = reviewSchema.validate(req.body);
  if (error) {
    req.flash("error", error.details.map((el) => el.message).join(", "));
    return res.redirect(`/listings/${req.params.id}`);
  }
  next();
};
