const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");

const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mapToken ? mbxGeocoding({ accessToken: mapToken }) : null;
if (!mapToken) {
  console.log("Mapbox not configured (no MAP_TOKEN in .env) - maps are hidden");
}

// Returns a GeoJSON Point for the given place, or undefined when the
// location can't be found or no Mapbox token is configured.
module.exports = async (query) => {
  if (!geocodingClient || !query) return undefined;
  try {
    const response = await geocodingClient
      .forwardGeocode({ query, limit: 1 })
      .send();
    const feature = response.body.features[0];
    return feature ? feature.geometry : undefined;
  } catch (err) {
    console.log("Geocoding failed:", err.message);
    return undefined;
  }
};
