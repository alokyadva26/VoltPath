import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import { useEffect, useState, useRef } from "react";
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

/* User location icon */
const userLocationIcon = new L.DivIcon({
  html: "<div style='font-size:24px'>🔵</div>",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
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

/* Map Logic & Controls */
function MapEngine({ isFullscreen, toggleFullscreen }) {
  const map = useMap();
  const [userLocation, setUserLocation] = useState(null);

  // Handle location found
  useMapEvents({
    locationfound(e) {
      setUserLocation(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  // Handle invalidate size when fullscreen changes
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 300); // 300ms accounts for any css transition
  }, [isFullscreen, map]);

  const controlBtnStyle = {
    background: "#1e293b",
    color: "#e2e8f0",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)",
    fontSize: "18px",
    fontWeight: "bold",
    transition: "all 0.2s ease",
    position: "relative",
    zIndex: 1000,
    pointerEvents: "auto",
  };

  const containerStyle = {
    position: "absolute",
    top: "20px",
    left: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    zIndex: 1000,
    pointerEvents: "none", // Let clicks pass through the container
  };

  return (
    <>
      <div style={containerStyle}>
        <button 
          title="Zoom In" 
          onClick={() => map.zoomIn()} 
          style={controlBtnStyle}
          className="hover:bg-slate-700"
          onMouseEnter={(e) => e.currentTarget.style.background = '#334155'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#1e293b'}
        >
          +
        </button>
        <button 
          title="Zoom Out" 
          onClick={() => map.zoomOut()} 
          style={controlBtnStyle}
          onMouseEnter={(e) => e.currentTarget.style.background = '#334155'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#1e293b'}
        >
          −
        </button>
        <button 
          title="Locate User" 
          onClick={() => map.locate()} 
          style={{...controlBtnStyle, marginTop: "10px"}}
          onMouseEnter={(e) => e.currentTarget.style.background = '#334155'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#1e293b'}
        >
          🎯
        </button>
        <button 
          title={isFullscreen ? "Collapse Map" : "Expand Map"} 
          onClick={toggleFullscreen} 
          style={{...controlBtnStyle, marginTop: "10px"}}
          onMouseEnter={(e) => e.currentTarget.style.background = '#334155'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#1e293b'}
        >
          {isFullscreen ? "↙" : "↗"}
        </button>
      </div>

      {userLocation && (
        <Marker position={userLocation} icon={userLocationIcon}>
          <Popup>You are here</Popup>
        </Marker>
      )}
    </>
  );
}

export default function MapView({ route }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

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

  const fullscreenStyle = {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    width: "100vw",
    height: "100vh",
  };

  const normalStyle = {
    height: "100%",
    width: "100%",
    position: "relative",
  };

  return (
    <div ref={containerRef} style={isFullscreen ? fullscreenStyle : normalStyle}>
      <MapContainer
        center={[28.6139, 77.209]}
        zoom={7}
        zoomControl={false} // Disable default zoom control
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto zoom */}
        <FitBounds positions={routePositions} />

        {/* Custom Controls and Map Logic */}
        <MapEngine 
          isFullscreen={isFullscreen} 
          toggleFullscreen={() => setIsFullscreen(!isFullscreen)} 
        />

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
    </div>
  );
}