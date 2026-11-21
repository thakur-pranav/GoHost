const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, validateBooking } = require("../middleware.js");
const bookingController = require("../controllers/bookings.js");

router.post("/listings/:id/bookings", isLoggedIn, validateBooking, wrapAsync(bookingController.createBooking));

router.get("/bookings", isLoggedIn, wrapAsync(bookingController.index));

router.delete("/bookings/:bookingId", isLoggedIn, wrapAsync(bookingController.cancelBooking));

module.exports = router;
