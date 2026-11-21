# GoHost

GoHost is an Express.js application for listing places to stay, booking them and leaving reviews. It uses MongoDB for storage, EJS for views, and supports sessions, flash messages, and method override for editing and deleting resources.

**Live demo:** https://gohost.byteforgelabs.tech (Render free plan with MongoDB Atlas, Cloudinary and Mapbox; the first load after a quiet period can take a few seconds)

## Features

- Create, view, edit, and delete listings, with image uploads (Cloudinary, or local disk in development)
- Sign up, log in and log out with Passport; new users are logged in right after sign-up
- Only a listing's owner can edit or delete it, and only a review's author can delete it
- Star-rated reviews showing who wrote them
- Search by title, location or country, filter by category, and an "after taxes" price toggle
- Map of each listing's location (Mapbox)
- Bookings: guests reserve dates on a listing, see their trips, and cancel; hosts see and can cancel bookings on their listings
- Distributed locks on bookings, so two people can never book the same listing for the same night (see below)
- Server-side validation with Joi
- Sessions stored in MongoDB, so logins survive server restarts

## Tech Stack

- Node.js
- Express 5
- MongoDB / Mongoose
- EJS
- `ejs-mate`
- `connect-flash`
- `express-session`
- `method-override`
- `joi`

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/thakur-pranav/GoHost.git
   cd GoHost
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start MongoDB locally

4. Copy `.env.example` to `.env` and fill in any keys you have (see Configuration)

5. Run the app:
   ```bash
   npm run dev    # with nodemon, restarts when you save
   npm start      # plain node
   ```

6. Open the app in your browser:
   ```
   http://localhost:8080
   ```

## Configuration

Copy `.env.example` to `.env`. Every value is optional for local development:

| Variable | Purpose | Default if unset |
|---|---|---|
| `ATLASDB_URL` | MongoDB connection string | `mongodb://127.0.0.1:27017/GoHost` |
| `SECRET` | Session secret | a development secret |
| `PORT` | Port to listen on | `8080` |
| `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET` | Cloudinary image uploads | uploads saved to `public/uploads` |
| `MAP_TOKEN` | Mapbox geocoding and map | no map shown |

## Seeding sample data

Sign up for an account in the app first, then run:

```bash
npm run seed -- <your-username>
```

This **deletes all listings** and inserts the sample listings, owned by that user.

## Adding map coordinates to existing listings

Listings get coordinates automatically when created or edited (with `MAP_TOKEN` set). For listings created before that, run once:

```bash
npm run geocode
```

This only fills in missing coordinates; it doesn't change anything else.

## Routes

- `GET /` — home page
- `GET /signup`, `POST /signup` — sign up
- `GET /login`, `POST /login` — log in
- `GET /logout` — log out
- `GET /privacy`, `GET /terms` — info pages
- `GET /listings` — view all listings (`?q=` to search, `?category=` to filter)
- `GET /listings/new` — create new listing page
- `POST /listings` — create listing
- `GET /listings/:id` — view single listing
- `GET /listings/:id/edit` — edit listing page
- `PUT /listings/:id` — update listing
- `DELETE /listings/:id` — delete listing
- `POST /listings/:id/reviews` — create a review
- `DELETE /listings/:id/reviews/:reviewId` — delete a review
- `POST /listings/:id/bookings` — book a listing
- `GET /bookings` — my trips and bookings on my listings
- `DELETE /bookings/:bookingId` — cancel a booking

## Booking locks

When someone books a listing, the app first acquires a lock for **that listing on each night of the stay** (key `booking:<listingId>:<YYYY-MM-DD>`). While it holds those locks it checks that the dates are still free and saves the booking, then releases them. Anyone else trying to book any of those nights on that listing has to wait, so double bookings can't happen.

- Locks are documents in the MongoDB `locks` collection, keyed by `_id`, so they work across multiple app servers sharing the same database (`utils/lock.js`).
- Taking a lock is a single atomic `findOneAndUpdate` upsert, so two servers can't both get it.
- It's all-or-nothing: if any night is locked, the app releases what it took and retries a few times with backoff. If the dates are still locked after that, the guest is asked to try again.
- Each lock expires after 30 seconds, so a server that crashes mid-booking can't block those dates forever. Before saving, the app checks it still holds its locks.
- Stays are limited to 30 nights and up to 365 days ahead.

## Project Structure

GoHost follows the MVC pattern: models hold the data, views render pages, and controllers hold the logic for each request.

- `server.js` — entry point: connects to MongoDB and starts the server
- `app.js` — builds the Express app (sessions, login, routes, error handling) and exports it, so tests can load it without opening a port
- `config.js` — settings read from the environment
- `models/` — Mongoose schemas for listings, reviews, users and bookings
- `views/` — EJS templates and layouts
- `controllers/` — request handlers for listings, reviews, users, bookings and static pages
- `routes/` — URL definitions: each route lists its middleware and points to a controller
- `package.json` — dependencies and scripts
- `public/` — static CSS and client-side JavaScript
- `utils/` — custom error, async wrapper, geocoding, category, date and lock helpers
- `middleware.js` — login, ownership and validation middleware
- `cloudConfig.js` — image upload storage

## Notes

- Error handling is provided in `utils/ExpressError.js` and the `error.ejs` template.
