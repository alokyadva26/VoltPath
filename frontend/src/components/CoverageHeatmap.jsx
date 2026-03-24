import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

/* Heatmap layer as a react-leaflet child */
function HeatLayer({ points }) {
  const map = useMap();
  const heatRef = useRef(null);

  useEffect(() => {
    if (!map || points.length === 0) return;

    // Remove old layer
    if (heatRef.current) {
      map.removeLayer(heatRef.current);
    }

    heatRef.current = L.heatLayer(points, {
      radius: 35,
      blur: 25,
      maxZoom: 10,
      max: 1.0,
      gradient: {
        0.0: "#22d3a5",
        0.35: "#22d3a5",
        0.5: "#f59e0b",
        0.75: "#ef4444",
        1.0: "#dc2626",
      },
    }).addTo(map);

    return () => {
      if (heatRef.current) {
        map.removeLayer(heatRef.current);
      }
    };
  }, [map, points]);

  return null;
}

/* Color for gap score */
function gapColor(score) {
  if (score >= 400) return "#dc2626";
  if (score >= 300) return "#ef4444";
  if (score >= 200) return "#f59e0b";
  return "#22d3a5";
}

/* Legend */
function Legend() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        right: 16,
        zIndex: 1000,
        background: "rgba(10,22,40,0.92)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        padding: "12px 16px",
        fontSize: 11,
        color: "rgba(255,255,255,0.6)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8, color: "#e2e8f0", fontSize: 12 }}>
        Coverage Gap Score
      </div>
      {[
        { label: "Critical (400+)", color: "#dc2626" },
        { label: "High (300–400)", color: "#ef4444" },
        { label: "Medium (200–300)", color: "#f59e0b" },
        { label: "Good (<200)", color: "#22d3a5" },
      ].map(({ label, color }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0 }} />
          <span>{label}</span>
        </div>
      ))}
      <div style={{ marginTop: 8, fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
        Score = EVs ÷ Chargers
      </div>
    </div>
  );
}

export default function CoverageHeatmap() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/coverage-gap")
      .then((r) => r.json())
      .then((d) => {
        if (d.locations) setLocations(d.locations);
      })
      .catch((err) => console.error("Coverage gap fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  // Find max gap score for normalizing heat intensities
  const maxGap = Math.max(...locations.map((l) => l.gap_score), 1);

  // [lat, lng, intensity] for the heat layer
  const heatPoints = locations.map((l) => [l.lat, l.lng, l.gap_score / maxGap]);

  return (
    <div style={{ position: "relative" }}>
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: "40px 0",
            color: "rgba(255,255,255,0.3)",
            fontSize: 13,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              border: "2px solid rgba(34,211,165,0.2)",
              borderTopColor: "#22d3a5",
              borderRadius: "50%",
              animation: "spin 0.9s linear infinite",
              margin: "0 auto 10px",
            }}
          />
          Loading coverage data...
        </div>
      )}

      {!loading && (
        <>
          <div style={{ height: 420, borderRadius: 14, overflow: "hidden" }}>
            <MapContainer
              center={[22.5, 82.0]}
              zoom={5}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <HeatLayer points={heatPoints} />

              {locations.map((loc) => (
                <CircleMarker
                  key={loc.state}
                  center={[loc.lat, loc.lng]}
                  radius={7}
                  pathOptions={{
                    color: gapColor(loc.gap_score),
                    fillColor: gapColor(loc.gap_score),
                    fillOpacity: 0.85,
                    weight: 2,
                  }}
                >
                  <Tooltip
                    direction="top"
                    offset={[0, -8]}
                    opacity={0.95}
                  >
                    <div style={{ fontFamily: "'Inter', sans-serif", minWidth: 140 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{loc.state}</div>
                      <div style={{ fontSize: 11, color: "#666", lineHeight: 1.5 }}>
                        <div>
                          Gap Score:{" "}
                          <span style={{ fontWeight: 700, color: gapColor(loc.gap_score) }}>
                            {loc.gap_score}
                          </span>
                        </div>
                        <div>EVs: {loc.evs_registered.toLocaleString()}</div>
                        <div>Chargers: {loc.active_chargers.toLocaleString()}</div>
                      </div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
          <Legend />
        </>
      )}
    </div>
  );
}
