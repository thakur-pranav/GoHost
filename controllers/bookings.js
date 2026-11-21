const Listing = require("../models/listing.js");
const Booking = require("../models/booking.js");
const { withLocks, LockError } = require("../utils/lock.js");
const { parseDay, todayUTC, nightsBetween, DAY_MS } = require("../utils/dates.js");

const MAX_NIGHTS = 30;
const MAX_ADVANCE_DAYS = 365;
const TAX_RATE = 0.18; // GST

// Lock key for one listing on one night.
const nightLockKey = (listingId, day) => `booking:${listingId}:${day}`;

// POST /listings/:id/bookings
module.exports.createBooking = async (req, res) => {
  const { id } = req.params;
  const back = `/listings/${id}`;
  const fail = (msg) => {
    req.flash("error", msg);
    return res.redirect(back);
  };

  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Cannot find that listing!");
    return res.redirect("/listings");
  }
  if (listing.owner && listing.owner.equals(req.user._id)) {
    return fail("You can't book your own listing.");
  }

  const checkIn = parseDay(req.body.booking.checkIn);
  const checkOut = parseDay(req.body.booking.checkOut);
  if (!checkIn || !checkOut) return fail("Please choose valid dates.");
  if (checkIn < todayUTC()) return fail("Check-in can't be in the past.");
  if (checkOut <= checkIn) return fail("Check-out must be after check-in.");
  if (checkIn.getTime() - todayUTC().getTime() > MAX_ADVANCE_DAYS * DAY_MS) {
    return fail(`Bookings can be made up to ${MAX_ADVANCE_DAYS} days ahead.`);
  }

  const nights = nightsBetween(checkIn, checkOut);
  if (nights.length > MAX_NIGHTS) return fail(`You can book at most ${MAX_NIGHTS} nights.`);

  // Lock every night of the stay on this listing. While we hold these locks,
  // nobody else (on any server) can book any of these nights here, so the
  // availability check and the insert below can't be interleaved with another
  // booking for the same dates.
  const lockKeys = nights.map((day) => nightLockKey(listing._id, day));

  let booking;
  try {
    booking = await withLocks(lockKeys, async ({ assertStillHeld }) => {
      const clash = await Booking.exists({
        listing: listing._id,
        status: "confirmed",
        checkIn: { $lt: checkOut },
        checkOut: { $gt: checkIn },
      });
      if (clash) return null;

      const pricePerNight = listing.price || 0;
      const subtotal = pricePerNight * nights.length;
      const tax = Math.round(subtotal * TAX_RATE);

      await assertStillHeld();
      return Booking.create({
        listing: listing._id,
        guest: req.user._id,
        checkIn,
        checkOut,
        guests: req.body.booking.guests,
        nights: nights.length,
        pricePerNight,
        subtotal,
        tax,
        total: subtotal + tax,
      });
    });
  } catch (err) {
    if (err instanceof LockError) {
      return fail("Someone else is booking these dates right now. Please try again in a moment.");
    }
    throw err;
  }

  if (!booking) return fail("Sorry, some of those dates are already booked. Please pick other dates.");

  req.flash("success", `Booking confirmed for ${booking.nights} night${booking.nights > 1 ? "s" : ""}!`);
  res.redirect("/bookings");
};

// GET /bookings - my trips, plus bookings on my listings
module.exports.index = async (req, res) => {
  const trips = await Booking.find({ guest: req.user._id })
    .sort({ checkIn: -1 })
    .populate("listing");

  const myListingIds = await Listing.find({ owner: req.user._id }).distinct("_id");
  const hosting = await Booking.find({ listing: { $in: myListingIds } })
    .sort({ checkIn: -1 })
    .populate("listing")
    .populate("guest");

  res.render("bookings/index.ejs", { trips, hosting, today: todayUTC() });
};

// DELETE /bookings/:bookingId - by the guest or the listing's owner
module.exports.cancelBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId).populate("listing");
  if (!booking) {
    req.flash("error", "Cannot find that booking!");
    return res.redirect("/bookings");
  }

  const isGuest = booking.guest.equals(req.user._id);
  const isHost = booking.listing && booking.listing.owner && booking.listing.owner.equals(req.user._id);
  if (!isGuest && !isHost) {
    req.flash("error", "You can't cancel this booking.");
    return res.redirect("/bookings");
  }
  if (booking.status === "cancelled") {
    req.flash("error", "This booking is already cancelled.");
    return res.redirect("/bookings");
  }
  if (booking.checkOut <= todayUTC()) {
    req.flash("error", "Past stays can't be cancelled.");
    return res.redirect("/bookings");
  }

  // Cancelling only frees dates, so it doesn't need the locks: a booking
  // racing with it will at worst still see the dates as taken.
  booking.status = "cancelled";
  await booking.save();
  req.flash("success", "Booking cancelled.");
  res.redirect("/bookings");
};
