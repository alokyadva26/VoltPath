import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function CoverageAnalytics() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/state-ev-vs-chargers")
      .then((res) => res.json())
      .then((json) => {
        setData(json.states || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching analytics:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
        Loading Analytics...
      </div>
    );
  }

  // Define Top 5 High Gap and Top 5 Low Gap
  const sortedByGap = [...data].filter(s => s.chargers > 0).sort((a, b) => b.gap_score - a.gap_score);
  const top5HighDesc = sortedByGap.slice(0, 5);
  // Low gap = better coverage. Filter out 0 gap
  const top5LowAsc = [...data].filter(s => s.gap_score > 0).sort((a, b) => a.gap_score - b.gap_score).slice(0, 5);

  // Take top 15 states by EV count for the chart so it's not overcrowded
  const chartData = [...data]
    .sort((a, b) => b.ev_count - a.ev_count)
    .slice(0, 15);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: "rgba(15, 23, 42, 0.9)",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "12px",
          borderRadius: "8px",
          color: "#fff",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5)"
        }}>
          <p style={{ margin: "0 0 8px", fontWeight: "bold", fontSize: "14px" }}>{label}</p>
          <p style={{ margin: 0, color: "#38bdf8", fontSize: "12px" }}>
            EVs: {payload[0].value.toLocaleString()}
          </p>
          <p style={{ margin: 0, color: "#22d3a5", fontSize: "12px" }}>
            Chargers: {payload[1].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderRankingListItem = (item, type) => {
    const isCritical = item.gap_score > 300;
    const isMedium = item.gap_score > 150 && !isCritical;
    const gapColor = type === 'high' 
      ? (isCritical ? "#ef4444" : "#f59e0b") 
      : "#22d3a5";

    return (
      <div key={item.state} style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 12px",
        background: "rgba(255,255,255,0.02)",
        borderRadius: "8px",
        marginBottom: "8px",
        border: "1px solid rgba(255,255,255,0.03)"
      }}>
        <div>
          <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "13px" }}>{item.state}</div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
            {item.ev_count.toLocaleString()} EVs · {item.chargers.toLocaleString()} chargers
          </div>
        </div>
        <div style={{
          background: `${gapColor}22`,
          color: gapColor,
          padding: "4px 8px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: 700,
          border: `1px solid ${gapColor}44`
        }}>
          {item.gap_score} GAP
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginTop: "24px" }}>
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: "16px",
        padding: "24px",
        marginBottom: "24px"
      }}>
        <h3 style={{ margin: "0 0 4px", fontSize: "18px", color: "#f8fafc" }}>EV Cars vs Charging Stations</h3>
        <p style={{ margin: "0 0 24px", fontSize: "13px", color: "#94a3b8" }}>Top 15 states by EV adoption. Comparing vehicle counts to available infrastructure.</p>
        
        <div style={{ width: "100%", height: 350 }}>
          <ResponsiveContainer>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis 
                dataKey="state" 
                tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} 
                axisLine={false}
                tickLine={false}
                angle={-45}
                textAnchor="end"
              />
              <YAxis 
                yAxisId="left" 
                tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Legend wrapperStyle={{ paddingTop: "20px", fontSize: "12px", color: "rgba(255,255,255,0.7)" }} />
              <Bar yAxisId="left" name="Registered EVs" dataKey="ev_count" fill="#38bdf8" radius={[4, 4, 0, 0]} animationDuration={1000} />
              <Bar yAxisId="right" name="Active Chargers" dataKey="chargers" fill="#22d3a5" radius={[4, 4, 0, 0]} animationDuration={1200} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Top 5 High Gap */}
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: "16px",
          padding: "24px"
        }}>
          <h4 style={{ margin: "0 0 4px", fontSize: "15px", color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{color: "#ef4444"}}>🚨</span> Top 5 Critical Gap
          </h4>
          <p style={{ margin: "0 0 20px", fontSize: "12px", color: "#94a3b8" }}>Highest demand relative to infrastructure</p>
          <div>
            {top5HighDesc.map(item => renderRankingListItem(item, 'high'))}
          </div>
        </div>

        {/* Top 5 Low Gap */}
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: "16px",
          padding: "24px"
        }}>
          <h4 style={{ margin: "0 0 4px", fontSize: "15px", color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{color: "#22d3a5"}}>✅</span> Top 5 Best Coverage
          </h4>
          <p style={{ margin: "0 0 20px", fontSize: "12px", color: "#94a3b8" }}>Lowest demand relative to infrastructure</p>
          <div>
            {top5LowAsc.map(item => renderRankingListItem(item, 'low'))}
          </div>
        </div>
      </div>
    </div>
  );
}
