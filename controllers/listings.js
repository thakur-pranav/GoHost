const Listing = require("../models/listing.js");
const Booking = require("../models/booking.js");
const { todayUTC, formatDay, displayDay } = require("../utils/dates.js");
const categories = require("../utils/categories.js");
const geocode = require("../utils/geocode.js");
const { fileToImage, deleteImage } = require("../cloudConfig.js");

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /listings (supports ?category=... and ?q=... search)
module.exports.index = async (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : "";
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  const filter = {};
  if (category && categories.some((c) => c.value === category)) {
    filter.category = category;
  }
  if (q) {
    const pattern = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ title: pattern }, { location: pattern }, { country: pattern }];
  }

  const allListings = await Listing.find(filter);
  res.render("listings/index.ejs", { allListings, categories, category, q });
};

// GET /listings/new
module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs", { categories });
};

// GET /listings/:id
module.exports.showListing = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({ path: "reviews", populate: { path: "author" } })
    .populate("owner");
  if (!listing) {
    req.flash("error", "Cannot find that listing!");
    return res.redirect("/listings");
  }
  // Upcoming booked stays, so guests can see which dates are taken.
  const bookedStays = await Booking.find({
    listing: listing._id,
    status: "confirmed",
    checkOut: { $gt: todayUTC() },
  }).sort({ checkIn: 1 }).select("checkIn checkOut");
  res.render("listings/show.ejs", {
    listing,
    bookedStays,
    displayDay,
    today: formatDay(todayUTC()),
    mapToken: process.env.MAP_TOKEN,
  });
};

// POST /listings
module.exports.createListing = async (req, res) => {
  const newListing = new Listing(req.body.listing);
  if (!newListing.category) newListing.category = undefined;
  newListing.owner = req.user._id;
  const image = fileToImage(req.file);
  if (image) newListing.image = image;
  newListing.geometry = await geocode(`${newListing.location}, ${newListing.country}`);
  await newListing.save();
  req.flash("success", "Successfully made a new listing!");
  res.redirect(`/listings/${newListing._id}`);
};

// GET /listings/:id/edit
module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  // Ask Cloudinary for a small preview of the current image.
  let previewUrl = (listing.image && listing.image.url) || Listing.DEFAULT_IMAGE;
  if (previewUrl.includes("/upload/")) {
    previewUrl = previewUrl.replace("/upload/", "/upload/w_250/");
  }
  res.render("listings/edit.ejs", { listing, previewUrl, categories });
};

// PUT /listings/:id
module.exports.updateListing = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  const oldImage = listing.image ? { url: listing.image.url, filename: listing.image.filename } : null;
  const locationChanged =
    listing.location !== req.body.listing.location || listing.country !== req.body.listing.country;

  listing.set({ ...req.body.listing });
  if (!listing.category) listing.category = undefined;

  const image = fileToImage(req.file);
  if (image) listing.image = image;

  if (locationChanged || !listing.geometry || !listing.geometry.coordinates) {
    const geometry = await geocode(`${listing.location}, ${listing.country}`);
    if (geometry) listing.geometry = geometry;
  }

  await listing.save();
  if (image) await deleteImage(oldImage);
  req.flash("success", "Listing Updated!");
  res.redirect(`/listings/${id}`);
};

// DELETE /listings/:id
module.exports.destroyListing = async (req, res) => {
  const { id } = req.params;
  // Don't silently wipe out guests' upcoming stays.
  const upcoming = await Booking.countDocuments({
    listing: id,
    status: "confirmed",
    checkOut: { $gt: todayUTC() },
  });
  if (upcoming > 0) {
    req.flash("error", `This listing has ${upcoming} upcoming booking${upcoming > 1 ? "s" : ""}. Cancel them on the Bookings page before deleting it.`);
    return res.redirect(`/listings/${id}`);
  }
  const deletedListing = await Listing.findByIdAndDelete(id);
  if (deletedListing) await deleteImage(deletedListing.image);
  req.flash("success", "Listing Deleted!");
  res.redirect("/listings");
};
