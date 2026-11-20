const express = require('express');
const router = express.Router();
const User = require('../models/user.js');
const passport = require('passport');
const { saveRedirectUrl, requireStringFields } = require('../middleware.js');

const USERNAME_RE = /^[a-zA-Z0-9_.]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get("/signup", (req, res) => {
    res.render("users/signup.ejs");
});

router.post("/signup", requireStringFields("username", "email", "password"), async (req, res, next) => {
    try {
        let {username, email, password} = req.body;
        if (!username || !email || !password) {
            req.flash("error", "Please fill in username, email and password.");
            return res.redirect("/signup");
        }
        username = username.trim();
        if (!USERNAME_RE.test(username)) {
            req.flash("error", "Username must be 3-30 characters: letters, numbers, _ or .");
            return res.redirect("/signup");
        }
        if (!EMAIL_RE.test(email.trim())) {
            req.flash("error", "Please enter a valid email address.");
            return res.redirect("/signup");
        }
        if (password.length < 6) {
            req.flash("error", "Password must be at least 6 characters.");
            return res.redirect("/signup");
        }
        const newUser = new User({username, email});
        const registeredUser = await User.register(newUser, password);
        // Log the new user in straight away.
        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", "Welcome to GoHost!");
            res.redirect("/listings");
        });
    } catch (e) {
        // 11000 = MongoDB duplicate key, here from the unique email index.
        req.flash("error", e.code === 11000 ? "An account with that email already exists." : e.message);
        res.redirect("/signup");
    }
});

router.get("/login", (req, res) => {
    res.render("users/login.ejs");
});

router.post("/login",
    requireStringFields("username", "password"),
    saveRedirectUrl,
    passport.authenticate("local", {
        failureRedirect: "/login",
        failureFlash: true
    }),
    (req, res) => {
        req.flash("success", "Welcome back to GoHost! You are logged in!");
        res.redirect(res.locals.redirectUrl || "/listings");
    }
);

router.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if(err) {
            return next(err);
        }
        req.flash("success", "You are logged out!");
        res.redirect("/listings");
    });
});

module.exports = router;
