(() => {
  const mapEl = document.getElementById("map");
  if (!mapEl || typeof mapboxgl === "undefined") return;

  const coordinates = JSON.parse(mapEl.dataset.coordinates); // [lng, lat]
  mapboxgl.accessToken = mapEl.dataset.token;

  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: coordinates,
    zoom: 9,
  });

  const popupContent = document.createElement("div");
  const title = document.createElement("h6");
  title.textContent = mapEl.dataset.title;
  const note = document.createElement("p");
  note.className = "mb-0";
  note.textContent = "Exact location will be provided after booking";
  popupContent.append(title, note);

  new mapboxgl.Marker({ color: "#fe424d" })
    .setLngLat(coordinates)
    .setPopup(new mapboxgl.Popup({ offset: 25 }).setDOMContent(popupContent))
    .addTo(map);
})();
