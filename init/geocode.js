// Fills in map coordinates for listings that don't have any yet.
// Doesn't delete or change anything else. Needs MAP_TOKEN in .env.
// Run from the project root:  node init/geocode.js
require("dotenv").config({ quiet: true });

const mongoose = require("mongoose");
const Listing = require("../models/listing.js");
const geocode = require("../utils/geocode.js");

const MONGO_URL = process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/GoHost";

const run = async () => {
  if (!process.env.MAP_TOKEN) {
    throw new Error("MAP_TOKEN is not set. Add it to .env first.");
  }

  const listings = await Listing.find({
    $or: [{ "geometry.coordinates": { $exists: false } }, { "geometry.coordinates": { $size: 0 } }],
  });
  console.log(`${listings.length} listings need coordinates`);

  let done = 0;
  for (const listing of listings) {
    const geometry = await geocode(`${listing.location}, ${listing.country}`);
    if (geometry) {
      await Listing.updateOne({ _id: listing._id }, { $set: { geometry } });
      done++;
    } else {
      console.log(`  could not find: ${listing.title} (${listing.location}, ${listing.country})`);
    }
  }
  console.log(`added coordinates to ${done} listings`);
};

mongoose
  .connect(MONGO_URL)
  .then(run)
  .catch((err) => console.log(err.message))
  .finally(() => mongoose.connection.close());
