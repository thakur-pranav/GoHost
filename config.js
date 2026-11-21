// Settings read from the environment (.env locally, the host's dashboard in production).
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ quiet: true });
}

const isProduction = process.env.NODE_ENV === "production";

// The session secret signs login cookies; a guessable one lets anyone forge them.
if (isProduction && !process.env.SECRET) {
  throw new Error("SECRET must be set in production.");
}

module.exports = {
  dbUrl: process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/GoHost",
  sessionSecret: process.env.SECRET || "mysupersecretcode",
  port: process.env.PORT || 8080,
  isProduction,
};
