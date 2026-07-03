# GoHost

GoHost is a small Express.js application for managing listings and reviews. It uses MongoDB for storage, EJS for views, and supports sessions, flash messages, and method override for editing and deleting resources.

## Features

- Create, view, edit, and delete listings
- Add reviews to a listing
- Server-side validation with Joi
- Mongoose models for listings and reviews
- EJS views with layout support via `ejs-mate`
- Flash messaging and session support

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

4. Run the app:
   ```bash
   node app.js
   ```

5. Open the app in your browser:
   ```
   http://localhost:8080
   ```

## Configuration

By default, the app connects to MongoDB at:

```js
mongodb://127.0.0.1:27017/GoHost
```

If needed, update the `MONGO_URL` value in `app.js` to point to your MongoDB instance.

## Routes

- `GET /` — root route
- `GET /listings` — view all listings
- `GET /listings/new` — create new listing page
- `POST /listings` — create listing
- `GET /listings/:id` — view single listing
- `GET /listings/:id/edit` — edit listing page
- `PUT /listings/:id` — update listing
- `DELETE /listings/:id` — delete listing
- `POST /listings/:id/reviews` — create a review
- `DELETE /listings/:id/reviews/:reviewId` — delete a review

## Project Structure

- `app.js` — main server file
- `package.json` — dependencies and metadata
- `routes/` — route handlers for listings and reviews
- `models/` — Mongoose schemas for listings and reviews
- `views/` — EJS templates and layouts
- `public/` — static CSS and client-side JavaScript
- `utils/` — custom error and async wrapper utilities

## Notes

- The root route currently returns a simple text response.
- Error handling is provided in `utils/ExpressError.js` and the `error.ejs` template.


