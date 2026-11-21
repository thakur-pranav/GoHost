// Settings read from the environment (.env locally, the host's dashboard in production).
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ quiet: true });
}

module.exports = {
  dbUrl: process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/GoHost",
  sessionSecret: process.env.SECRET || "mysupersecretcode",
  port: process.env.PORT || 8080,
  isProduction: process.env.NODE_ENV === "production",
};
