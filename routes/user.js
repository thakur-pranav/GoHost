const express = require("express");
const router = express.Router();
const passport = require("passport");
const { saveRedirectUrl, requireStringFields } = require("../middleware.js");
const userController = require("../controllers/users.js");

router.route("/signup")
  .get(userController.renderSignupForm)
  .post(requireStringFields("username", "email", "password"), userController.signup);

router.route("/login")
  .get(userController.renderLoginForm)
  .post(
    requireStringFields("username", "password"),
    saveRedirectUrl,
    passport.authenticate("local", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    userController.login
  );

router.get("/logout", userController.logout);

module.exports = router;
