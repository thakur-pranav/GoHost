const express = require("express");
const router = express.Router();
const passport = require("passport");
const { saveRedirectUrl, requireStringFields } = require("../middleware.js");
const userController = require("../controllers/users.js");
const { loginLimiter, signupLimiter } = require("../security.js");

router.route("/signup")
  .get(userController.renderSignupForm)
  .post(signupLimiter, requireStringFields("username", "email", "password"), userController.signup);

router.route("/login")
  .get(userController.renderLoginForm)
  .post(
    loginLimiter,
    requireStringFields("username", "password"),
    saveRedirectUrl,
    passport.authenticate("local", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    userController.login
  );

// POST, not GET: a GET link could be triggered by any other site (e.g. an <img>).
router.post("/logout", userController.logout);

module.exports = router;
