export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1Ijoicmtya3VtIiwiYSI6ImNscHRzYm4yczBpdHgybG9kcDVtN2k5cWoifQ.N5k4RhRyGV6NIcHLf5TE4A';

  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/rkrkum/clputtf8h01da01pjbcugan6q',
    scrollZoom: false,
    // center: [-118.113491, 34.111745],
    // zoom: 10,
    // interactive: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    // Create marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add Marker
    new mapboxgl.Marker({
      Element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Add Popup
    new mapboxgl.Popup({
      offset: 50,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extends the map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
