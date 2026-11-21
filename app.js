const { dbUrl, sessionSecret, isProduction } = require("./config.js");
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const multer = require("multer");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const localStrategy = require("passport-local");
const User = require("./models/user.js");
const { securityHeaders, csrfProtection, csrfLocals } = require("./security.js");

const pageRouter = require("./routes/pages.js");
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const bookingRouter = require("./routes/booking.js");

app.use(securityHeaders);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

// Sessions are kept in MongoDB so logins survive server restarts.
const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: {
    secret: sessionSecret,
  },
  touchAfter: 24 * 3600, // only re-save unchanged sessions once a day
});

store.on("error", (err) => {
  console.log("ERROR in MONGO SESSION STORE", err);
});

const sessionOptions = {
  store,
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false, // don't store a session for visitors who never log in or see a message
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    httpOnly: true,
    sameSite: "lax", // browsers won't send the cookie on form posts from other sites
    secure: isProduction, // HTTPS-only once deployed
  },
};

if (isProduction) {
  app.set("trust proxy", 1); // hosts like Render terminate HTTPS at a proxy
}

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  // Only touch flash when there's something in it: reading it adds an empty
  // object to the session, which would save a session for every visitor.
  const hasFlash = req.session.flash && Object.keys(req.session.flash).length > 0;
  res.locals.success = hasFlash ? req.flash("success") : [];
  res.locals.error = hasFlash ? req.flash("error") : [];
  res.locals.currUser = req.user;
  res.locals.q = "";
  next();
});
app.use(csrfLocals);
// After the locals above, so the error page can still render the navbar.
app.use(csrfProtection);

app.use("/", pageRouter);
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);
app.use("/", bookingRouter);

app.all(/.*/, (req, res, next) => {
  next(new ExpressError(404, "Page Not Found!"));
});

app.use((err, req, res, next) => {
  if (err instanceof mongoose.Error.CastError) {
    err = new ExpressError(404, "Page Not Found!");
  } else if (err.code === "EBADCSRFTOKEN") {
    err = new ExpressError(403, "This form has expired. Please go back, refresh the page and try again.");
  } else if (err instanceof multer.MulterError || /images are allowed/.test(err.message)) {
    err.statusCode = 400;
  }
  let { statusCode = 500, message = "Something went wrong!" } = err;
  if (statusCode === 500) console.log(err);
  res.status(statusCode).render("error.ejs", { err: { statusCode, message } });
});

// server.js connects to the database and starts listening; tests can
// require this file and use the app without opening a port.
module.exports = app;
