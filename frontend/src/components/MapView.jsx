import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* Charger icon */
const chargerIcon = new L.DivIcon({
  html: "<div style='font-size:30px'>⚡</div>",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  className: ""
});

/* Origin icon */
const originIcon = new L.DivIcon({
  html: "<div style='font-size:26px'>🟢</div>",
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  className: ""
});

/* Destination icon */
const destinationIcon = new L.DivIcon({
  html: "<div style='font-size:26px'>📍</div>",
  iconSize: [26, 26],
  iconAnchor: [13, 24],
  className: ""
});

/* Auto zoom component */
function FitBounds({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions && positions.length > 1) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [positions, map]);

  return null;
}

export default function MapView({ route }) {

  console.log("MapView received route:", route);

  let routePositions = [];

  if (
    route?.geometry?.coordinates &&
    route.geometry.coordinates.length > 0
  ) {
    // GeoJSON is [lng, lat] → Leaflet needs [lat, lng]
    routePositions = route.geometry.coordinates.map(coord => [
      coord[1],
      coord[0]
    ]);
  }

  const chargers = route?.chargers_along_route || [];

  // First and last point of the route polyline
  const origin = routePositions.length > 0 ? routePositions[0] : null;
  const destination =
    routePositions.length > 0
      ? routePositions[routePositions.length - 1]
      : null;

  return (
    <MapContainer
      center={[28.6139, 77.209]}
      zoom={7}
      style={{ height: "100%", width: "100%" }}
    >

      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Auto zoom */}
      <FitBounds positions={routePositions} />

      {/* Route line */}
      {routePositions.length > 0 && (
        <Polyline
          positions={routePositions}
          pathOptions={{
            color: "#00C4FF",
            weight: 7,
            opacity: 0.9
          }}
        />
      )}

      {/* Origin */}
      {origin && (
        <Marker position={origin} icon={originIcon}>
          <Popup>Origin</Popup>
        </Marker>
      )}

      {/* Destination */}
      {destination && (
        <Marker position={destination} icon={destinationIcon}>
          <Popup>Destination</Popup>
        </Marker>
      )}

      {/* Chargers — use actual lat/lng from backend */}
      {chargers.map((c, i) => (
        c.lat && c.lng ? (
          <Marker
            key={c.id || i}
            position={[c.lat, c.lng]}
            icon={chargerIcon}
          >
            <Popup>
              <b>{c.name}</b>
              <br />
              Power: {c.power_kw} kW
            </Popup>
          </Marker>
        ) : null
      ))}

    </MapContainer>
  );
}