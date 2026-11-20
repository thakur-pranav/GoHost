# GoHost - notes for Claude

Property listing + booking app: Node 22, Express 5, MongoDB/Mongoose 8, EJS (ejs-mate), Passport (passport-local-mongoose), Cloudinary uploads, Mapbox maps. Windows dev machine; prices in INR.

## Commands
- `npm run dev` (nodemon) / `npm start` - app on http://localhost:8080
- `npm run seed -- <username>` - DELETES all listings, inserts init/data.js owned by <username>
- `npm run geocode` - fills missing listing coordinates only (non-destructive), needs MAP_TOKEN
- No automated tests yet (planned: Jest + Supertest + mongodb-memory-server)

## Layout
- `app.js` - setup, session store, error handler. `routes/` hold handlers (no controllers/ yet - planned MVC refactor)
- `middleware.js` - isLoggedIn, saveRedirectUrl, isOwner, isReviewAuthor, validate* (Joi schemas in `schema.js`)
- `cloudConfig.js` - multer: Cloudinary if CLOUD_* set, else disk `public/uploads`; `fileToImage`, `deleteImage`
- `utils/lock.js` - MongoDB distributed locks (`locks` collection, atomic upsert, TTL 30s, all-or-nothing + retry). Booking key: `booking:<listingId>:<YYYY-MM-DD>` per night
- `utils/dates.js` - booking days are UTC-midnight Dates / "YYYY-MM-DD" strings
- `routes/booking.js` - create (locks + overlap check + assertStillHeld), `/bookings` page, cancel

## Gotchas
- Express 5: catch-all is `app.all(/.*/)`; async errors propagate natively.
- connect-mongo v6: `const { MongoStore } = require("connect-mongo")`.
- passport-local-mongoose v9: `require("passport-local-mongoose").default`.
- cloudinary v2 with our own multer storage engine in `cloudConfig.js` (multer-storage-cloudinary was removed: it pins the vulnerable v1 SDK). Uploaded images are deleted when validation fails, an image is replaced, or a listing is deleted.
- Listings with upcoming confirmed bookings can't be deleted. Seed script also removes old listings' reviews/bookings.
- Login/signup reject non-string fields (`requireStringFields`) to block `username[$ne]=` style query injection.
- Listing `image` is `{url, filename}`; old string-image docs break views (was migrated in local DB).
- Flash middleware guards on `req.session.flash` so anonymous visitors don't create sessions.
- Bootstrap must load BEFORE `/css/style.css` in boilerplate, or custom styles get overridden.
- nodemon does not watch `.env` - type `rs` after editing it.
- `.env` holds real keys - never print secret values (CLOUD_API_SECRET, SECRET); check presence/length only.

## Testing approach
- Never test against the real `GoHost` DB. Run a second server:
  `ATLASDB_URL=mongodb://127.0.0.1:27017/GoHost_test PORT=8099 node app.js`, drive it with curl cookie jars, then drop `GoHost_test` and stop the port-8099 process.
- User's own nodemon server runs on 8080 - don't kill it.
