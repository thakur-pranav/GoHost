const express = require("express");
const router = express.Router();
const pageController = require("../controllers/pages.js");

router.get("/", pageController.home);
router.get("/privacy", pageController.privacy);
router.get("/terms", pageController.terms);

module.exports = router;
