import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* Charger icon */
const chargerIcon = new L.DivIcon({
  html: "<div style='font-size:30px'>⚡</div>",
  iconSize: [30, 30],
  className: ""
});

/* Origin icon */
const originIcon = new L.DivIcon({
  html: "<div style='font-size:26px'>🟢</div>",
  iconSize: [26, 26],
  className: ""
});

/* Destination icon */
const destinationIcon = new L.DivIcon({
  html: "<div style='font-size:26px'>📍</div>",
  iconSize: [26, 26],
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

  let routePositions = [];

  if (
  route?.geometry?.coordinates &&
  route.geometry.coordinates.length > 0
) {
    routePositions = route.geometry.coordinates.map(coord => [
      coord[1],
      coord[0]
    ]);
  }

  const chargers = route?.chargers_along_route || [];

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

      {/* Chargers */}
      {origin &&
  chargers.map((c, i) => (
    <Marker
      key={i}
      position={[
        origin[0] + (i + 1) * 0.03,
        origin[1] + (i + 1) * 0.03
      ]}
      icon={chargerIcon}
    >
          <Popup>
            <b>{c.name}</b>
            <br />
            Power: {c.power_kw} kW
          </Popup>
        </Marker>
      ))}

    </MapContainer>
  );
}