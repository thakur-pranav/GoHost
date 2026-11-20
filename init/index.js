// Run from the project root:  node init/index.js [username]
// Seeded listings are owned by [username], or the first user in the DB.
require("dotenv").config({ quiet: true });

const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");
const Review = require("../models/review.js");
const Booking = require("../models/booking.js");
const geocode = require("../utils/geocode.js");

const MONGO_URL = process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/GoHost";

const categoryByTitle = {
  "Cozy Beachfront Cottage": "beach",
  "Modern Loft in Downtown": "iconic-cities",
  "Mountain Retreat": "mountains",
  "Historic Villa in Tuscany": "trending",
  "Secluded Treehouse Getaway": "treehouse",
  "Beachfront Paradise": "beach",
  "Rustic Cabin by the Lake": "lake",
  "Luxury Penthouse with City Views": "iconic-cities",
  "Ski-In/Ski-Out Chalet": "arctic",
  "Safari Lodge in the Serengeti": "camping",
  "Historic Canal House": "rooms",
  "Private Island Retreat": "pools",
  "Charming Cottage in the Cotswolds": "farms",
  "Historic Brownstone in Boston": "rooms",
  "Beachfront Bungalow in Bali": "beach",
  "Mountain View Cabin in Banff": "mountains",
  "Art Deco Apartment in Miami": "iconic-cities",
  "Tropical Villa in Phuket": "pools",
  "Historic Castle in Scotland": "castles",
  "Desert Oasis in Dubai": "pools",
  "Rustic Log Cabin in Montana": "mountains",
  "Beachfront Villa in Greece": "beach",
  "Eco-Friendly Treehouse Retreat": "treehouse",
  "Historic Cottage in Charleston": "farms",
  "Modern Apartment in Tokyo": "iconic-cities",
  "Lakefront Cabin in New Hampshire": "lake",
  "Luxury Villa in the Maldives": "beach",
  "Ski Chalet in Aspen": "arctic",
  "Secluded Beach House in Costa Rica": "beach",
};

const initDB = async () => {
  const username = process.argv[2];
  const owner = username ? await User.findOne({ username }) : await User.findOne({});
  if (!owner) {
    throw new Error(
      username
        ? `No user named "${username}". Sign up in the app first.`
        : "No users found. Sign up in the app first, then re-run this script."
    );
  }

  const listings = [];
  for (const item of initData.data) {
    listings.push({
      ...item,
      image: { url: item.image, filename: "listingimage" },
      owner: owner._id,
      category: categoryByTitle[item.title],
      geometry: await geocode(`${item.location}, ${item.country}`),
    });
  }

  // Remove the old listings together with their reviews and bookings,
  // so nothing is left pointing at a listing that no longer exists.
  const oldListings = await Listing.find({}, "reviews");
  await Review.deleteMany({ _id: { $in: oldListings.flatMap((l) => l.reviews) } });
  await Booking.deleteMany({ listing: { $in: oldListings.map((l) => l._id) } });
  await Listing.deleteMany({});
  await Listing.insertMany(listings);
  console.log(`data was initialized (${listings.length} listings owned by ${owner.username})`);
};

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("connected to DB");
    return initDB();
  })
  .catch((err) => console.log(err.message))
  .finally(() => mongoose.connection.close());
