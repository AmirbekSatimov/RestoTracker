type Props = {
  latitude: number;
  longitude: number;
  markers?: Array<{ id: string; latitude: number; longitude: number }>;
};

export default function AppMapView({ latitude, longitude, markers = [] }: Props) {
  const lastMarker = markers.length > 0 ? markers[markers.length - 1] : null;
  const mapLatitude = lastMarker ? lastMarker.latitude : latitude;
  const mapLongitude = lastMarker ? lastMarker.longitude : longitude;
  const zoom = 13;
  const safeMarkers = markers.map((marker) => ({
    id: marker.id,
    latitude: marker.latitude,
    longitude: marker.longitude,
  }));
  const srcDoc = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body, #map {
        height: 100%;
        margin: 0;
      }
      body {
        background: #0b0f14;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script>
      const markers = ${JSON.stringify(safeMarkers)};
      const map = L.map('map').setView([${mapLatitude}, ${mapLongitude}], ${zoom});
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      if (markers.length === 0) {
        L.marker([${mapLatitude}, ${mapLongitude}]).addTo(map);
      } else {
        const bounds = [];
        markers.forEach((marker) => {
          bounds.push([marker.latitude, marker.longitude]);
          L.marker([marker.latitude, marker.longitude]).addTo(map);
        });
        if (bounds.length > 1) {
          map.fitBounds(bounds, { padding: [30, 30] });
        }
      }
    </script>
  </body>
</html>`;
  return (
    <iframe
      title="Map"
      srcDoc={srcDoc}
      style={{ border: 0, width: '100%', height: '100%' }}
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
