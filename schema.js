const Joi = require('joi');
const categories = require('./utils/categories.js');

module.exports.listingSchema = Joi.object({
    listing : Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),
        location: Joi.string().required(),
        country: Joi.string().required(),
        price: Joi.number().required().min(0),
        category: Joi.string().valid(...categories.map((c) => c.value)).allow(""),
        // The image itself arrives as an uploaded file (req.file), not in the body.
    }).required()
});

module.exports.bookingSchema = Joi.object({
    booking: Joi.object({
        checkIn: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required()
            .messages({ "string.pattern.base": "Check-in must be a date" }),
        checkOut: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required()
            .messages({ "string.pattern.base": "Check-out must be a date" }),
        guests: Joi.number().integer().min(1).max(20).required()
            .messages({ "*": "Guests must be between 1 and 20" }),
    }).required()
});

module.exports.reviewSchema = Joi.object({
    review: Joi.object({
        rating: Joi.number().integer().required().min(1).max(5)
            .messages({ "*": "Please choose a star rating" }),
        comment: Joi.string().trim().required()
            .messages({ "*": "Please write a comment" }),
    }).required()
});
