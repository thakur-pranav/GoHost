const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
  listing: {
    type: Schema.Types.ObjectId,
    ref: "Listing",
    required: true,
  },
  guest: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  checkIn: { type: Date, required: true }, // UTC midnight of the first night
  checkOut: { type: Date, required: true }, // UTC midnight of departure day
  guests: { type: Number, min: 1, default: 1 },
  nights: { type: Number, required: true },
  pricePerNight: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  tax: { type: Number, required: true },
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ["confirmed", "cancelled"],
    default: "confirmed",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Supports the "is anything already booked on these dates?" query.
bookingSchema.index({ listing: 1, status: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ guest: 1, checkIn: -1 });

module.exports = mongoose.model("Booking", bookingSchema);
