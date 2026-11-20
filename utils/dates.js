// Booking dates are calendar days ("YYYY-MM-DD"), stored as UTC midnight so
// that a day means the same thing on every server regardless of timezone.

const DAY_MS = 24 * 60 * 60 * 1000;

// "2026-12-24" -> Date at 2026-12-24T00:00:00Z, or null if not a real date.
function parseDay(str) {
  if (typeof str !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [y, m, d] = str.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // Rejects things like 2026-02-31, which Date would roll over to March.
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return date;
}

const formatDay = (date) => date.toISOString().slice(0, 10);

const todayUTC = () => parseDay(formatDay(new Date()));

// Every night of a stay: check-in day up to (not including) check-out day.
function nightsBetween(checkIn, checkOut) {
  const days = [];
  for (let t = checkIn.getTime(); t < checkOut.getTime(); t += DAY_MS) {
    days.push(formatDay(new Date(t)));
  }
  return days;
}

// "24 Dec 2026"
const displayDay = (date) =>
  date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

module.exports = { DAY_MS, parseDay, formatDay, todayUTC, nightsBetween, displayDay };
