const mongoose = require("mongoose");
const Review = require("./review.js");
const Booking = require("./booking.js");
const categories = require("../utils/categories.js");
const Schema = mongoose.Schema;

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8bW91bnRhaW4lMjB2aWV3fGVufDB8fDB8fHww";

const listingSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  image: {
    url: { type: String, default: DEFAULT_IMAGE },
    filename: { type: String, default: "listingimage" },
  },
  price: Number,
  location: String,
  country: String,
  category: {
    type: String,
    enum: categories.map((c) => c.value),
  },
  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    },
  ],
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  // GeoJSON point, filled in by geocoding the location (needs MAP_TOKEN).
  geometry: {
    type: {
      type: String,
      enum: ["Point"],
    },
    coordinates: {
      type: [Number],
      default: undefined,
    },
  },
});

listingSchema.post("findOneAndDelete", async (listing) => {
  if (listing) {
    await Review.deleteMany({ _id: { $in: listing.reviews } });
    await Booking.deleteMany({ listing: listing._id });
  }
});

const Listing = mongoose.model("Listing", listingSchema);
Listing.DEFAULT_IMAGE = DEFAULT_IMAGE;
module.exports = Listing;
