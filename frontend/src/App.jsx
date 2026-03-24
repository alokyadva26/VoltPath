import { useState, useEffect, useRef, useCallback } from "react";
import MapView from "./components/MapView";

const VEHICLES = [
  { id: "nexon_ev", name: "Tata Nexon EV", range: 300, battery: 40.5, icon: "🚗", color: "#00c4ff" },
  { id: "tiago_ev", name: "Tata Tiago EV", range: 220, battery: 24, icon: "🚙", color: "#39ff99" },
  { id: "mg_zs", name: "MG ZS EV", range: 325, battery: 50.3, icon: "🚐", color: "#ff6b35" },
  { id: "kona", name: "Hyundai Kona", range: 310, battery: 39.2, icon: "🚕", color: "#c084fc" },
  { id: "byd_atto", name: "BYD Atto 3", range: 400, battery: 60.5, icon: "🚘", color: "#fbbf24" },
  { id: "xuv400", name: "Mahindra XUV400", range: 310, battery: 39.4, icon: "🏎️", color: "#fb7185" },
];

const MOCK_CHARGERS = [
  { id: 1, name: "Connaught Place Fast Hub", power_kw: 50, distance_km: 2.1, wait: 8 },
  { id: 2, name: "Noida Sector 18 CCS2", power_kw: 100, distance_km: 14.5, wait: 0 },
  { id: 3, name: "Mathura Expressway Station", power_kw: 60, distance_km: 98.2, wait: 12 },
];

const MOCK_ROUTES = {
  default: {
    distance_km: 26.2,
    remaining_soc: 21.9,
    chargers_along_route: [MOCK_CHARGERS[0], MOCK_CHARGERS[1]],
    charging_plan: { charging_needed: false, recommended_stop: null },
  },
  long: {
    distance_km: 188.4,
    remaining_soc: 8.2,
    chargers_along_route: MOCK_CHARGERS,
    charging_plan: {
      charging_needed: true,
      recommended_stop: MOCK_CHARGERS[2],
    },
  },
};

function AnxietyMeter({ soc, routeResult, loading }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const currentAngleRef = useRef(-Math.PI);

  const targetConfidence = routeResult
    ? routeResult.remaining_soc > 20
      ? 85 + Math.min(routeResult.remaining_soc - 20, 10)
      : routeResult.remaining_soc > 10
      ? 55
      : 30
    : soc * 0.6;

  const getColor = (pct) => {
    if (pct < 35) return "#ef4444";
    if (pct < 60) return "#f59e0b";
    return "#22d3a5";
  };

  const getLabel = (pct) => {
    if (pct < 35) return "Anxious";
    if (pct < 60) return "Cautious";
    return "Confident";
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H * 0.72;
    const R = Math.min(W, H) * 0.42;

    const targetAngle = -Math.PI + (targetConfidence / 100) * Math.PI;
    let start = null;

    const draw = (angle) => {
      ctx.clearRect(0, 0, W, H);

      // Track background
      ctx.beginPath();
      ctx.arc(cx, cy, R, -Math.PI, 0);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 18;
      ctx.lineCap = "round";
      ctx.stroke();

      // Colored arc
      const pct = ((angle + Math.PI) / Math.PI) * 100;
      const color = getColor(pct);
      ctx.beginPath();
      ctx.arc(cx, cy, R, -Math.PI, angle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 18;
      ctx.lineCap = "round";
      ctx.stroke();

      // Tick marks
      for (let i = 0; i <= 10; i++) {
        const a = -Math.PI + (i / 10) * Math.PI;
        const inner = R - 26;
        const outer = R - 14;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Needle
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(R - 30, 0);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // Percentage text
      ctx.font = `bold ${W * 0.12}px 'DM Mono', monospace`;
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(Math.round(pct) + "%", cx, cy - R * 0.28);

      // Label
      ctx.font = `500 ${W * 0.065}px sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText(getLabel(pct), cx, cy - R * 0.28 + W * 0.1);

      // Zone labels
      ctx.font = `${W * 0.045}px sans-serif`;
      ctx.fillStyle = "#ef4444";
      ctx.textAlign = "left";
      ctx.fillText("Anxious", cx - R - 2, cy + 14);
      ctx.fillStyle = "#22d3a5";
      ctx.textAlign = "right";
      ctx.fillText("Confident", cx + R + 2, cy + 14);
    };

    const animate = (ts) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const duration = loading ? 300 : 900;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);

      const from = currentAngleRef.current;
      const angle = from + (targetAngle - from) * ease;
      draw(angle);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        currentAngleRef.current = targetAngle;
      }
    };

    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [targetConfidence, loading]);

  return (
    <div style={{ textAlign: "center" }}>
      <canvas
        ref={canvasRef}
        width={280}
        height={160}
        style={{ width: "100%", maxWidth: 280 }}
      />
    </div>
  );
}

function BatteryBar({ value, color = "#22d3a5" }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        borderRadius: 8,
        height: 8,
        overflow: "hidden",
        marginTop: 4,
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          height: "100%",
          background: color,
          borderRadius: 8,
          transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
    </div>
  );
}

function ChargerCard({ charger, recommended }) {
  return (
    <div
      style={{
        background: recommended
          ? "rgba(34,211,165,0.08)"
          : "rgba(255,255,255,0.04)",
        border: `1px solid ${recommended ? "rgba(34,211,165,0.3)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 12,
        padding: "12px 16px",
        marginBottom: 8,
        position: "relative",
      }}
    >
      {recommended && (
        <span
          style={{
            position: "absolute",
            top: -10,
            right: 12,
            background: "#22d3a5",
            color: "#0a1628",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 99,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Recommended Stop
        </span>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}
          >
            {charger.name}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
            {charger.distance_km} km along route
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#22d3a5",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {charger.power_kw} kW
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
            {charger.wait > 0 ? `~${charger.wait} min wait` : "Available now"}
          </div>
        </div>
      </div>
    </div>
  );
}

function MapPlaceholder({ routeResult, vehicle }) {
  const points = routeResult?.chargers_along_route || [];

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 320,
        background:
          "radial-gradient(ellipse at 30% 40%, rgba(0,196,255,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(34,211,165,0.05) 0%, transparent 60%)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        viewBox="0 0 600 400"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.18 }}
      >
        {[...Array(12)].map((_, i) => (
          <line
            key={i}
            x1={0}
            y1={i * 34}
            x2={600}
            y2={i * 34}
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="0.5"
          />
        ))}
        {[...Array(20)].map((_, i) => (
          <line
            key={i}
            x1={i * 32}
            y1={0}
            x2={i * 32}
            y2={400}
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="0.5"
          />
        ))}
      </svg>

      {routeResult ? (
        <svg viewBox="0 0 600 400" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          {/* Route line */}
          <path
            d="M 80,300 C 160,280 220,200 300,180 C 380,160 460,140 520,100"
            fill="none"
            stroke="rgba(0,196,255,0.6)"
            strokeWidth="3"
            strokeDasharray="8,4"
          />
          <path
            d="M 80,300 C 160,280 220,200 300,180 C 380,160 460,140 520,100"
            fill="none"
            stroke="#00c4ff"
            strokeWidth="2"
          />

          {/* Origin */}
          <circle cx="80" cy="300" r="10" fill="#22d3a5" opacity="0.9" />
          <circle cx="80" cy="300" r="16" fill="none" stroke="#22d3a5" strokeWidth="2" opacity="0.4" />
          <text x="95" y="304" fill="#22d3a5" fontSize="11" fontWeight="600">Origin</text>

          {/* Destination */}
          <circle cx="520" cy="100" r="10" fill="#f59e0b" opacity="0.9" />
          <circle cx="520" cy="100" r="16" fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.4" />
          <text x="530" y="104" fill="#f59e0b" fontSize="11" fontWeight="600">Destination</text>

          {/* Charger pins */}
          {points.map((c, i) => {
            const x = 80 + ((i + 1) / (points.length + 1)) * 440;
            const y = 300 - ((i + 1) / (points.length + 1)) * 200;
            const isRec = routeResult.charging_plan?.recommended_stop?.id === c.id;
            return (
              <g key={c.id}>
                <circle
                  cx={x}
                  cy={y}
                  r={isRec ? 10 : 7}
                  fill={isRec ? "#22d3a5" : "rgba(255,255,255,0.3)"}
                  stroke={isRec ? "#22d3a5" : "rgba(255,255,255,0.5)"}
                  strokeWidth={isRec ? 2 : 1}
                />
                <text x={x} y={y + 4} textAnchor="middle" fill={isRec ? "#0a1628" : "#fff"} fontSize="8" fontWeight="700">
                  ⚡
                </text>
                <text x={x} y={y - 16} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9">
                  {c.power_kw}kW
                </text>
              </g>
            );
          })}
        </svg>
      ) : (
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
          <div style={{ fontSize: 13, letterSpacing: "0.05em" }}>
            Enter route details to visualize
          </div>
          <div style={{ fontSize: 11, marginTop: 4, opacity: 0.6 }}>
            Powered by Mapbox GL • OSRM routing
          </div>
        </div>
      )}

      {routeResult && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            background: "rgba(10,22,40,0.85)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            padding: "8px 14px",
            fontSize: 12,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          <span style={{ color: "#00c4ff", fontWeight: 600 }}>
            {routeResult.distance_km} km
          </span>{" "}
          · SoC on arrival:{" "}
          <span
            style={{
              color: routeResult.remaining_soc > 20 ? "#22d3a5" : "#ef4444",
              fontWeight: 600,
            }}
          >
            {routeResult.remaining_soc.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

export default function VoltPath() {
  const [vehicle, setVehicle] = useState(VEHICLES[0]);
  const [soc, setSoc] = useState(38);
  const [origin, setOrigin] = useState("Connaught Place, Delhi");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [routeResult, setRouteResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("route");

// Geocode a place name to [lat, lng] using OpenStreetMap Nominatim
async function geocode(place) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`
  );
  const data = await res.json();
  if (!data.length) throw new Error(`Location not found: "${place}"`);
  return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
}

const handlePlanRoute = async () => {

  if (!origin || !destination) {
    setError("Please enter both origin and destination.");
    return;
  }

  setError(null);
  setLoading(true);
  setRouteResult(null);

  try {

    // Geocode user-entered place names to coordinates
    console.log("Geocoding origin:", origin);
    const originCoords = await geocode(origin);
    console.log("Origin coords:", originCoords);

    console.log("Geocoding destination:", destination);
    const destinationCoords = await geocode(destination);
    console.log("Destination coords:", destinationCoords);

    const payload = {
      vehicle: vehicle.id,
      soc: soc,
      origin: originCoords,
      destination: destinationCoords
    };

    console.log("Sending route request with payload:", payload);

    const res = await fetch("http://127.0.0.1:8000/route", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error("Backend request failed");
    }

    const data = await res.json();

    console.log("Route API response:", data);

    setRouteResult(data);

  } catch (err) {

    console.error("Route API error:", err);
    setError(err.message || "Failed to compute route. Is the backend running?");

  } finally {

    setLoading(false);

  }
};

  const socColor =
    soc < 20 ? "#ef4444" : soc < 40 ? "#f59e0b" : "#22d3a5";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07111f",
        color: "#e2e8f0",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, select { outline: none; }
        input::placeholder { color: rgba(255,255,255,0.2); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes slideIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .route-card { animation: slideIn 0.4s ease forwards; }
      `}</style>

      {/* Top nav */}
      <nav
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(10,22,40,0.8)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              background: "linear-gradient(135deg, #22d3a5, #00c4ff)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            ⚡
          </div>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            VoltPath
          </span>
          <span
            style={{
              fontSize: 10,
              color: "#22d3a5",
              border: "1px solid rgba(34,211,165,0.3)",
              borderRadius: 4,
              padding: "1px 6px",
              marginLeft: 4,
            }}
          >
            BETA
          </span>
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {["route", "dashboard", "v2g"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? "rgba(34,211,165,0.12)" : "transparent",
                border: "none",
                color: activeTab === tab ? "#22d3a5" : "rgba(255,255,255,0.4)",
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s",
                textTransform: "capitalize",
              }}
            >
              {tab === "route" ? "🗺 Route" : tab === "dashboard" ? "📊 Dashboard" : "⚡ V2G"}
            </button>
          ))}
        </div>
      </nav>

      {activeTab === "route" && (
        <div
          style={{
            display: "flex",
            flex: 1,
            gap: 0,
            height: "calc(100vh - 56px)",
            overflow: "hidden",
          }}
        >
          {/* Left panel */}
          <div
            style={{
              width: 360,
              minWidth: 320,
              background: "#0a1628",
              borderRight: "1px solid rgba(255,255,255,0.06)",
              overflowY: "auto",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {/* Anxiety Meter */}
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16,
                padding: "16px 12px 8px",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  color: "rgba(255,255,255,0.3)",
                  textTransform: "uppercase",
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                Range Confidence
              </div>
              <AnxietyMeter soc={soc} routeResult={routeResult} loading={loading} />
              {routeResult && (
                <div
                  className="route-card"
                  style={{
                    textAlign: "center",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.5)",
                    marginTop: 4,
                    padding: "0 8px 8px",
                  }}
                >
                  Arrive with{" "}
                  <span
                    style={{
                      color:
                        routeResult.remaining_soc > 20 ? "#22d3a5" : "#ef4444",
                      fontWeight: 700,
                    }}
                  >
                    {routeResult.remaining_soc}%
                  </span>{" "}
                  battery remaining
                </div>
              )}
            </div>

            {/* Vehicle selector */}
            <div>
              <label
                style={{
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: "rgba(255,255,255,0.35)",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: 10,
                }}
              >
                Vehicle
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {VEHICLES.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVehicle(v)}
                    style={{
                      background:
                        vehicle.id === v.id
                          ? `rgba(${v.id === vehicle.id ? "34,211,165" : "255,255,255"},0.06)`
                          : "rgba(255,255,255,0.03)",
                      border: `1px solid ${vehicle.id === v.id ? "rgba(34,211,165,0.4)" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: 10,
                      padding: "10px 8px",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontSize: 16, marginBottom: 3 }}>{v.icon}</div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: vehicle.id === v.id ? "#22d3a5" : "#e2e8f0",
                        lineHeight: 1.2,
                      }}
                    >
                      {v.name}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.3)",
                        marginTop: 2,
                      }}
                    >
                      {v.range} km range
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* SoC Slider */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <label
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    color: "rgba(255,255,255,0.35)",
                    textTransform: "uppercase",
                  }}
                >
                  Battery State
                </label>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: socColor,
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {soc}%
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                value={soc}
                step={1}
                onChange={(e) => setSoc(Number(e.target.value))}
                style={{
                  width: "100%",
                  appearance: "none",
                  height: 4,
                  borderRadius: 4,
                  background: `linear-gradient(to right, ${socColor} ${soc}%, rgba(255,255,255,0.1) ${soc}%)`,
                  cursor: "pointer",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 6,
                  fontSize: 10,
                  color: "rgba(255,255,255,0.2)",
                }}
              >
                <span>5%</span>
                <span>
                  ~{Math.round((soc / 100) * vehicle.range)} km available
                </span>
                <span>100%</span>
              </div>
            </div>

            {/* Origin / Destination */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label
                style={{
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: "rgba(255,255,255,0.35)",
                  textTransform: "uppercase",
                }}
              >
                Route
              </label>
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#22d3a5",
                  }}
                />
                <input
                  type="text"
                  placeholder="Current location"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    padding: "11px 12px 11px 34px",
                    color: "#e2e8f0",
                    fontSize: 13,
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "rgba(34,211,165,0.4)")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                  }
                />
              </div>

              <div
                style={{
                  width: 1,
                  height: 8,
                  background: "rgba(255,255,255,0.1)",
                  margin: "0 17px",
                }}
              />

              <div style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: "#f59e0b",
                  }}
                />
                <input
                  type="text"
                  placeholder="Where are you going?"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    padding: "11px 12px 11px 34px",
                    color: "#e2e8f0",
                    fontSize: 13,
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "rgba(245,158,11,0.4)")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                  }
                />
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.25)",
                  paddingLeft: 4,
                }}
              >
                Try: Agra, Jaipur, Chandigarh for long route demo
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "#fca5a5",
                }}
              >
                {error}
              </div>
            )}

            {/* Plan Route button */}
            <button
              onClick={handlePlanRoute}
              disabled={loading}
              style={{
                background: loading
                  ? "rgba(34,211,165,0.3)"
                  : "linear-gradient(135deg, #22d3a5, #00c4ff)",
                border: "none",
                borderRadius: 12,
                padding: "14px",
                color: loading ? "rgba(255,255,255,0.5)" : "#07111f",
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.2s",
                letterSpacing: "-0.01em",
              }}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "rgba(255,255,255,0.8)",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  Computing optimal route...
                </>
              ) : (
                <>⚡ Find My Route</>
              )}
            </button>

            {/* Route result summary */}
            {routeResult && (
              <div className="route-card">
                {/* Trip summary */}
                <div
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 14,
                    padding: 16,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      color: "rgba(255,255,255,0.3)",
                      textTransform: "uppercase",
                      marginBottom: 12,
                    }}
                  >
                    Trip Summary
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    {[
                      { label: "Distance", value: `${routeResult.distance_km} km`, color: "#00c4ff" },
                      { label: "Arrival SoC", value: `${routeResult.remaining_soc}%`, color: routeResult.remaining_soc > 20 ? "#22d3a5" : "#ef4444" },
                      { label: "Chargers Found", value: routeResult.chargers_along_route.length, color: "#c084fc" },
                      { label: "Charging Stop", value: routeResult.charging_plan.charging_needed ? "Required" : "Optional", color: routeResult.charging_plan.charging_needed ? "#f59e0b" : "#22d3a5" },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: "'DM Mono', monospace" }}>
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 11,
                        color: "rgba(255,255,255,0.3)",
                        marginBottom: 4,
                      }}
                    >
                      <span>Departure</span>
                      <span>Arrival</span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        background: "rgba(255,255,255,0.06)",
                        borderRadius: 6,
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          height: "100%",
                          width: `${soc}%`,
                          background: `linear-gradient(to right, ${socColor}, ${routeResult.remaining_soc > 20 ? "#22d3a5" : "#ef4444"})`,
                          borderRadius: 6,
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          left: `${100 - routeResult.remaining_soc}%`,
                          top: 0,
                          height: "100%",
                          width: `${routeResult.remaining_soc}%`,
                          background: routeResult.remaining_soc > 20 ? "rgba(34,211,165,0.3)" : "rgba(239,68,68,0.3)",
                          borderRadius: 6,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 11,
                        fontFamily: "'DM Mono', monospace",
                        marginTop: 3,
                      }}
                    >
                      <span style={{ color: socColor }}>{soc}%</span>
                      <span style={{ color: routeResult.remaining_soc > 20 ? "#22d3a5" : "#ef4444" }}>
                        {routeResult.remaining_soc}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Charger list */}
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    color: "rgba(255,255,255,0.3)",
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  Chargers En Route
                </div>
                {routeResult.chargers_along_route.map((c) => (
                  <ChargerCard
                    key={c.id}
                    charger={c}
                    recommended={
                      routeResult.charging_plan?.recommended_stop?.id === c.id
                    }
                  />
                ))}

                {routeResult.charging_plan.charging_needed && (
                  <div
                    style={{
                      background: "rgba(245,158,11,0.08)",
                      border: "1px solid rgba(245,158,11,0.25)",
                      borderRadius: 10,
                      padding: "12px 14px",
                      marginTop: 8,
                      fontSize: 12,
                      color: "#fcd34d",
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ fontSize: 14 }}>⚠️</span>
                    <span>
                      Charging stop is required to reach your destination safely.
                      Stop at{" "}
                      <strong>
                        {routeResult.charging_plan.recommended_stop?.name}
                      </strong>{" "}
                      for ~25 min.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Map area */}
          <div style={{ flex: 1, position: "relative", background: "#0d1f35" }}>
            <MapView route={routeResult} vehicle={vehicle} />

            {!routeResult && !loading && (
              <div
                style={{
                  position: "absolute",
                  top: 20,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(10,22,40,0.8)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  padding: "8px 16px",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.4)",
                  whiteSpace: "nowrap",
                }}
              >
                🗺 Mapbox GL • Real routing via OSRM
              </div>
            )}

            {loading && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(7,17,31,0.6)",
                  backdropFilter: "blur(4px)",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    border: "3px solid rgba(34,211,165,0.2)",
                    borderTopColor: "#22d3a5",
                    borderRadius: "50%",
                    animation: "spin 0.9s linear infinite",
                  }}
                />
                <div style={{ color: "#22d3a5", fontSize: 14, fontWeight: 500 }}>
                  Computing optimal route...
                </div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
                  SoC propagation · Charger detection · Cost optimization
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "dashboard" && (
        <DashboardPanel />
      )}

      {activeTab === "v2g" && (
        <div
          style={{
            padding: 32,
            maxWidth: 700,
            margin: "0 auto",
            width: "100%",
          }}
        >
          <div style={{ marginBottom: 32 }}>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: "-0.03em",
                marginBottom: 6,
              }}
            >
              V2G Earnings Simulator
            </h1>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
              Vehicle-to-Grid revenue simulation for fleet operators
            </p>
          </div>
          <V2GSimulator />
        </div>
      )}
    </div>
  );
}

function DashboardPanel() {
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState("Delhi");
  const [policyData, setPolicyData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);

  // Fetch state list on mount
  useEffect(() => {
    fetch("http://127.0.0.1:8000/policy/states")
      .then((r) => r.json())
      .then((d) => {
        if (d.states) setStates(d.states);
      })
      .catch((err) => console.error("Failed to load states:", err));
  }, []);

  // Fetch policy data when state changes
  useEffect(() => {
    setDashLoading(true);
    fetch(`http://127.0.0.1:8000/policy?state=${encodeURIComponent(selectedState)}`)
      .then((r) => r.json())
      .then((d) => {
        console.log("Policy data:", d);
        setPolicyData(d);
      })
      .catch((err) => console.error("Policy fetch error:", err))
      .finally(() => setDashLoading(false));
  }, [selectedState]);

  // Fetch XGBoost forecast when state changes
  useEffect(() => {
    fetch(`http://127.0.0.1:8000/forecast?state=${encodeURIComponent(selectedState)}`)
      .then((r) => r.json())
      .then((d) => {
        console.log("Forecast data:", d);
        setForecastData(d);
      })
      .catch((err) => console.error("Forecast fetch error:", err));
  }, [selectedState]);

  const formatNum = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toString();
  };

  const cards = policyData
    ? [
        {
          label: "EVs Registered",
          value: formatNum(policyData.evs_registered),
          delta: `+${policyData.growth_pct}% YoY`,
          c: "#00c4ff",
        },
        {
          label: "Active Chargers",
          value: formatNum(policyData.active_chargers),
          delta: `+${policyData.charger_growth} this year`,
          c: "#22d3a5",
        },
        {
          label: "Vehicle:Charger",
          value: `${policyData.vehicle_charger_ratio}:1`,
          delta: policyData.vehicle_charger_ratio > 200 ? "⚠ Above target" : "✓ On track",
          c: "#f59e0b",
        },
        {
          label: "Charging Deserts",
          value: `${policyData.desert_zones} zones`,
          delta: selectedState,
          c: "#ef4444",
        },
      ]
    : [];

  return (
    <div
      style={{
        padding: 32,
        maxWidth: 900,
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Header + State Selector */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 32,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              marginBottom: 6,
            }}
          >
            Policy Dashboard
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
            EV infrastructure analytics · {selectedState} · Real-time data
          </p>
        </div>

        <div style={{ position: "relative" }}>
          <div
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 6,
            }}
          >
            Select State
          </div>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 10,
              padding: "10px 36px 10px 14px",
              color: "#e2e8f0",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              appearance: "none",
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%2322d3a5' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
              minWidth: 180,
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(34,211,165,0.5)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.15)")}
          >
            {states.map((s) => (
              <option key={s} value={s} style={{ background: "#0a1628", color: "#e2e8f0" }}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading shimmer */}
      {dashLoading && (
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
              width: 28,
              height: 28,
              border: "2px solid rgba(34,211,165,0.2)",
              borderTopColor: "#22d3a5",
              borderRadius: "50%",
              animation: "spin 0.9s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          Loading {selectedState} data...
        </div>
      )}

      {/* Stat Cards */}
      {!dashLoading && policyData && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              marginBottom: 28,
            }}
          >
            {cards.map(({ label, value, delta, c }) => (
              <div
                key={label}
                className="route-card"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 14,
                  padding: "18px 16px",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.35)",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: c,
                    fontFamily: "'DM Mono', monospace",
                    marginBottom: 4,
                  }}
                >
                  {value}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                  {delta}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Demand chart */}
            <div
              className="route-card"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 4,
                  color: "#e2e8f0",
                }}
              >
                Hourly Demand Forecast
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.3)",
                  marginBottom: 16,
                }}
              >
                XGBoost model{forecastData?.model ? ` · R²=${forecastData.model.r2}` : ""} · {selectedState} · {forecastData?.day || "Today"}
              </div>
              {(() => {
                const demandArr = forecastData?.demand || policyData.hourly_demand || [];
                const maxVal = Math.max(...demandArr, 1);
                const peakHour = demandArr.indexOf(Math.max(...demandArr));
                return (
                  <svg viewBox="0 0 300 155" style={{ width: "100%" }}>
                    {demandArr.map((v, i) => {
                      const pct = v / maxVal;
                      const barH = pct * 120;
                      return (
                        <g key={i}>
                          <rect
                            x={i * 12.2 + 2}
                            y={130 - barH}
                            width={9}
                            height={barH}
                            rx={2}
                            fill={pct >= 0.88 ? "#ef4444" : pct >= 0.65 ? "#f59e0b" : "#22d3a5"}
                            opacity={0.8}
                          />
                          {i % 6 === 0 && (
                            <text x={i * 12.2 + 3} y={145} fill="rgba(255,255,255,0.3)" fontSize={7}>
                              {i === 0 ? "12am" : i === 6 ? "6am" : i === 12 ? "12pm" : "6pm"}
                            </text>
                          )}
                        </g>
                      );
                    })}
                    <text x={peakHour * 12.2 - 20} y={15} fill="#ef4444" fontSize={8} fontWeight="600">
                      Peak: {Math.max(...demandArr)} sessions
                    </text>
                  </svg>
                );
              })()}
            </div>

            {/* Priority Zones */}
            <div
              className="route-card"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 4,
                  color: "#e2e8f0",
                }}
              >
                Investment Priority Zones
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.3)",
                  marginBottom: 16,
                }}
              >
                OR-Tools optimization · {selectedState}
              </div>
              {(policyData.priority_zones || []).map(({ zone, score, evs, roi }, i) => (
                <div
                  key={zone}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: i === 0 ? "rgba(34,211,165,0.15)" : "rgba(255,255,255,0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      color: i === 0 ? "#22d3a5" : "rgba(255,255,255,0.3)",
                      fontFamily: "'DM Mono', monospace",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#e2e8f0",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {zone}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                      {evs} EVs registered nearby
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: score > 90 ? "#22d3a5" : score > 80 ? "#f59e0b" : "rgba(255,255,255,0.5)",
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      {score}
                    </div>
                    <div style={{ fontSize: 9, color: "#f59e0b" }}>{roi}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function V2GSimulator() {
  const [fleet, setFleet] = useState(50);
  const [parking, setParking] = useState(6);
  const [simulating, setSimulating] = useState(false);
  const [earnings, setEarnings] = useState(null);
  const [tick, setTick] = useState(0);

  const simulate = async () => {
    setSimulating(true);
    setEarnings(null);
    setTick(0);

    const target = Math.round(fleet * parking * 18.4);
    let current = 0;
    const steps = 40;

    for (let i = 0; i < steps; i++) {
      await new Promise((r) => setTimeout(r, 60));
      current = Math.round((target * (i + 1)) / steps);
      setTick(current);
    }
    setEarnings(target);
    setSimulating(false);
  };

  const monthly = earnings ? earnings * 30 : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 16,
          padding: 24,
        }}
      >
        {[
          { label: "Fleet size (EVs)", value: fleet, set: setFleet, min: 5, max: 500, step: 5, unit: "EVs" },
          { label: "Avg. parking duration", value: parking, set: setParking, min: 1, max: 12, step: 1, unit: "hrs/day" },
        ].map(({ label, value, set, min, max, step, unit }) => (
          <div key={label} style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <label
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.5)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {label}
              </label>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#22d3a5",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {value} {unit}
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={(e) => set(Number(e.target.value))}
              style={{
                width: "100%",
                appearance: "none",
                height: 4,
                borderRadius: 4,
                background: `linear-gradient(to right, #22d3a5 ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) ${((value - min) / (max - min)) * 100}%)`,
                cursor: "pointer",
              }}
            />
          </div>
        ))}

        <button
          onClick={simulate}
          disabled={simulating}
          style={{
            width: "100%",
            background: simulating
              ? "rgba(34,211,165,0.2)"
              : "linear-gradient(135deg, #22d3a5, #00c4ff)",
            border: "none",
            borderRadius: 12,
            padding: "14px",
            color: simulating ? "rgba(255,255,255,0.4)" : "#07111f",
            fontSize: 15,
            fontWeight: 700,
            cursor: simulating ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {simulating ? (
            <>
              <div
                style={{
                  width: 16,
                  height: 16,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              Simulating grid stress event...
            </>
          ) : (
            "⚡ Simulate Grid Stress Event"
          )}
        </button>
      </div>

      {(simulating || earnings !== null) && (
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 16,
            padding: 24,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 20,
            }}
          >
            Daily V2G Earnings · {fleet} vehicles participating
          </div>

          <div
            style={{
              fontSize: 52,
              fontWeight: 800,
              fontFamily: "'DM Mono', monospace",
              color: "#22d3a5",
              letterSpacing: "-0.03em",
              marginBottom: 4,
              transition: "all 0.1s",
            }}
          >
            ₹{(simulating ? tick : earnings).toLocaleString()}
          </div>

          {!simulating && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 12,
                marginTop: 20,
              }}
            >
              {[
                {
                  label: "Per vehicle / day",
                  value: `₹${Math.round(earnings / fleet)}`,
                  c: "#00c4ff",
                },
                {
                  label: "Fleet / month",
                  value: `₹${Math.round(monthly / 1000)}K`,
                  c: "#22d3a5",
                },
                {
                  label: "kWh fed to grid",
                  value: `${Math.round(fleet * parking * 3.2)} kWh`,
                  c: "#c084fc",
                },
              ].map(({ label, value, c }) => (
                <div
                  key={label}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 10,
                    padding: "12px 14px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "rgba(255,255,255,0.3)",
                      marginBottom: 4,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: c,
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!simulating && (
            <div
              style={{
                marginTop: 16,
                padding: "12px 14px",
                background: "rgba(34,211,165,0.06)",
                border: "1px solid rgba(34,211,165,0.15)",
                borderRadius: 10,
                fontSize: 12,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              💡 Based on BEE India V2G guidelines · Tariff: ₹8.2/kWh peak grid rate ·
              Grid stability improved from <span style={{ color: "#ef4444" }}>Critical</span> →{" "}
              <span style={{ color: "#22d3a5" }}>Stable</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}