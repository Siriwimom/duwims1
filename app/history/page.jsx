"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Image from "next/image";

const pageStyle = {
  fontFamily:
    '"Prompt", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  background: "#e5edf8",
  minHeight: "100vh",
  color: "#111827",
  overflowX: "hidden",
};

const outerWrap = {
  width: "100%",
  display: "flex",
  justifyContent: "center",
  overflowX: "hidden",
};

const bodyStyle = {
  width: "100%",
  maxWidth: 1120,
  margin: "22px auto 40px",
  padding: "0 16px 30px",
  boxSizing: "border-box",
};

const cardBase = {
  background: "#f9fafb",
  borderRadius: 24,
  padding: "18px 20px",
  boxShadow: "0 4px 10px rgba(15,23,42,0.12)",
  minWidth: 0,
  boxSizing: "border-box",
};

const SENSOR_OPTIONS = [
  { key: "soil", label: "ความชื้นในดิน", unit: "%" },
  { key: "temp", label: "อุณหภูมิ", unit: "°C" },
  { key: "rh", label: "ความชื้นสัมพัทธ์", unit: "%" },
  { key: "npk", label: "NPK", unit: "" },
  { key: "light", label: "ความเข้มแสง", unit: "lux" },
  { key: "rain", label: "ปริมาณน้ำฝน", unit: "mm" },
  { key: "wind", label: "ความเร็วลม", unit: "m/s" },
  { key: "water", label: "การให้น้ำ", unit: "L" },
];

// ---- Thailand points (ตัวอย่างตำแหน่งบน SVG) ----
const TH_POINTS = [
  { id: "cnx", name: "เชียงใหม่", x: 112, y: 90, value: 18 },
  { id: "lpg", name: "ลำปาง", x: 122, y: 110, value: 22 },
  { id: "kkc", name: "ขอนแก่น", x: 154, y: 170, value: 34 },
  { id: "ubn", name: "อุบลฯ", x: 172, y: 205, value: 49 },
  { id: "bkk", name: "กรุงเทพฯ", x: 142, y: 260, value: 56 },
  { id: "pkn", name: "ประจวบฯ", x: 124, y: 310, value: 44 },
  { id: "pkt", name: "ภูเก็ต", x: 92, y: 360, value: 72 },
  { id: "sri", name: "สงขลา", x: 132, y: 382, value: 61 },
];

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

// map 0..100 -> rgba blue intensity
function blue(v) {
  const alpha = 0.15 + (clamp(v, 0, 100) / 100) * 0.75;
  return `rgba(37,99,235,${alpha})`;
}

export default function HistoryPage() {
  const dropdownRef = useRef(null);

  // responsive breakpoint
  const [vw, setVw] = useState(1280);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth || 1280);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isMobile = vw < 640;
  const isTablet = vw >= 640 && vw < 1024;

  // quick range state
  const [quickRange, setQuickRange] = useState("7 วันล่าสุด");

  // dropdown (checkbox) state
  const [sensorDropdownOpen, setSensorDropdownOpen] = useState(false);
  const [selectedSensors, setSelectedSensors] = useState(["soil"]);

  const [startDate, setStartDate] = useState("2025-09-01");
  const [endDate, setEndDate] = useState("2025-09-30");
  const [plot, setPlot] = useState("all");

  const toggleSensor = (key) => {
    setSelectedSensors((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      return [...prev, key];
    });
  };

  // ปิด dropdown เมื่อคลิกนอกกล่อง
  const onRootClick = (e) => {
    if (!sensorDropdownOpen) return;
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setSensorDropdownOpen(false);
    }
  };

  // ข้อมูลตัวอย่างค่าความชื้นดินรายชั่วโมง
  const soilSeries = [
    { time: "08:00", value: 68 },
    { time: "10:00", value: 72 },
    { time: "12:00", value: 78 },
    { time: "14:00", value: 81 },
    { time: "16:00", value: 76 },
    { time: "18:00", value: 70 },
    { time: "20:00", value: 65 },
  ];

  const stats = useMemo(() => {
    const values = soilSeries.map((p) => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const avgVal =
      Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) /
      10;
    const lastPoint = soilSeries[soilSeries.length - 1];
    const currentVal = lastPoint.value;

    return { minVal, maxVal, avgVal, lastPoint, currentVal };
  }, [soilSeries]);

  const selectedSensorNames = useMemo(() => {
    return selectedSensors
      .map((k) => SENSOR_OPTIONS.find((s) => s.key === k)?.label)
      .filter(Boolean);
  }, [selectedSensors]);

  const dropdownLabel = useMemo(() => {
    if (selectedSensorNames.length === 0) return "เลือกประเภทเซนเซอร์";
    if (selectedSensorNames.length === 1) return selectedSensorNames[0];
    return `${selectedSensorNames[0]} +${selectedSensorNames.length - 1}`;
  }, [selectedSensorNames]);

  // responsive card padding
  const cardPad = isMobile ? 14 : isTablet ? 16 : 20;
  const cardRadius = isMobile ? 18 : 24;
  const cardR = useMemo(() => {
    return {
      ...cardBase,
      borderRadius: cardRadius,
      padding: `${cardPad}px`,
    };
  }, [cardPad, cardRadius]);

  const grid2 = isMobile
    ? { display: "grid", gridTemplateColumns: "1fr", gap: 12 }
    : { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 };

  const summaryGrid = useMemo(() => {
    if (isMobile) return { display: "grid", gridTemplateColumns: "1fr", gap: 12, marginBottom: 16 };
    if (isTablet) return { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12, marginBottom: 16 };
    return { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 16 };
  }, [isMobile, isTablet]);

  const heatGrid = useMemo(() => {
    // ✅ มือถือ: map อยู่บน legend กันโดนบีบ
    if (isMobile) return { display: "grid", gridTemplateColumns: "1fr", gap: 12 };
    return { display: "grid", gridTemplateColumns: "1fr 260px", gap: 12 };
  }, [isMobile]);

  return (
    <div style={pageStyle} onClick={onRootClick}>
      <div style={outerWrap}>
        <main
          style={{
            ...bodyStyle,
            paddingLeft: isMobile ? 12 : 16,
            paddingRight: isMobile ? 12 : 16,
            marginTop: isMobile ? 14 : 22,
          }}
          className="du-history"
        >
          {/* ===== FILTER PANEL ===== */}
          <div
            className="du-card"
            style={{
              ...cardR,
              marginBottom: 16,
              background: "linear-gradient(135deg,#40B596,#676FC7)",
              color: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 10,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div
                className="du-card-title"
                style={{ color: "#fff", fontSize: isMobile ? 16 : 18, fontWeight: 700 }}
              >
                ฟิลเตอร์ข้อมูลย้อนหลัง
              </div>
              <span style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.4 }}>
                เลือกช่วงวันที่ / เซนเซอร์ / แปลง เพื่อดูข้อมูลย้อนหลังและกราฟ
              </span>
            </div>

            {/* quick chips */}
            <div style={{ marginBottom: 10, fontSize: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
              <span style={{ marginRight: 2 }}>ช่วงเวลาเร็ว:</span>
              {["วันนี้", "7 วันล่าสุด", "30 วันล่าสุด"].map((l) => {
                const active = quickRange === l;
                return (
                  <button
                    key={l}
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuickRange(l);
                    }}
                    style={{
                      borderRadius: 999,
                      border: "none",
                      padding: "6px 10px",
                      fontSize: 11,
                      cursor: "pointer",
                      background: active ? "#facc15" : "rgba(255,255,255,0.18)",
                      color: "#0f172a",
                      fontWeight: 800,
                      boxShadow: active ? "0 6px 16px rgba(0,0,0,0.18)" : "none",
                      transform: active ? "translateY(-1px)" : "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {l}
                  </button>
                );
              })}
            </div>

            {/* dates */}
            <div style={{ ...grid2, marginBottom: 8 }}>
              <div className="du-field" style={{ fontSize: 13, minWidth: 0 }}>
                <label style={{ display: "block", marginBottom: 4, color: "#fff" }}>
                  วันที่เริ่มต้น
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: "100%",              // ✅ สำคัญ
                    maxWidth: "100%",
                    borderRadius: 14,
                    border: "none",
                    padding: "8px 10px",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div className="du-field" style={{ fontSize: 13, minWidth: 0 }}>
                <label style={{ display: "block", marginBottom: 4, color: "#fff" }}>
                  วันที่สิ้นสุด
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    width: "100%",              // ✅ สำคัญ
                    maxWidth: "100%",
                    borderRadius: 14,
                    border: "none",
                    padding: "8px 10px",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* sensor dropdown + plot */}
            <div style={grid2}>
              {/* sensor */}
              <div className="du-field" style={{ fontSize: 13, minWidth: 0 }}>
                <label style={{ display: "block", marginBottom: 4, color: "#fff" }}>
                  ประเภทเซนเซอร์
                </label>

                <div ref={dropdownRef} style={{ position: "relative", minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSensorDropdownOpen((v) => !v);
                    }}
                    style={{
                      width: "100%",
                      borderRadius: 14,
                      border: "none",
                      padding: "10px 10px",
                      fontSize: 13,
                      background: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        color: "#111827",
                        fontWeight: 800,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {dropdownLabel}
                    </span>
                    <span style={{ color: "#64748b", fontSize: 12 }}>
                      {sensorDropdownOpen ? "▲" : "▼"}
                    </span>
                  </button>

                  {sensorDropdownOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: "absolute",
                        zIndex: 50,
                        top: "calc(100% + 8px)",
                        left: 0,
                        right: 0,
                        background: "#ffffff",
                        borderRadius: 16,
                        border: "1px solid rgba(15,23,42,0.12)",
                        boxShadow: "0 18px 40px rgba(15,23,42,0.18)",
                        padding: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 8,
                          gap: 10,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>
                          เลือกได้หลายตัว
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedSensors([])}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#b91c1c",
                            fontWeight: 900,
                            cursor: "pointer",
                            fontSize: 12,
                            whiteSpace: "nowrap",
                          }}
                        >
                          ล้าง
                        </button>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile
                            ? "1fr"
                            : "repeat(2,minmax(0,1fr))",
                          gap: 8,
                        }}
                      >
                        {SENSOR_OPTIONS.map((s) => {
                          const checked = selectedSensors.includes(s.key);
                          return (
                            <label
                              key={s.key}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "8px 10px",
                                borderRadius: 12,
                                cursor: "pointer",
                                border: "1px solid rgba(15,23,42,0.08)",
                                background: checked ? "#eef2ff" : "#fff",
                                minWidth: 0,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSensor(s.key)}
                              />
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "#0f172a",
                                  fontWeight: 800,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {s.label}
                              </span>
                              <span style={{ fontSize: 11, color: "#64748b", marginLeft: "auto" }}>
                                {s.unit}
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => setSensorDropdownOpen(false)}
                          style={{
                            borderRadius: 999,
                            border: "none",
                            padding: "8px 12px",
                            background: "#0f172a",
                            color: "#fff",
                            fontWeight: 900,
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 6, fontSize: 11, opacity: 0.95 }}>
                  เลือกแล้ว:{" "}
                  {selectedSensorNames.length ? selectedSensorNames.join(", ") : "—"}
                </div>
              </div>

              {/* plot */}
              <div className="du-field" style={{ fontSize: 13, minWidth: 0 }}>
                <label style={{ display: "block", marginBottom: 4, color: "#fff" }}>
                  แปลง
                </label>
                <select
                  value={plot}
                  onChange={(e) => setPlot(e.target.value)}
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    border: "none",
                    padding: "10px 10px",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="1">แปลง 1</option>
                  <option value="2">แปลง 2</option>
                  <option value="3">แปลง 3</option>
                </select>
              </div>
            </div>
          </div>

          {/* ===== SUMMARY BADGE ROW ===== */}
          <section style={summaryGrid}>
            {[
              {
                title: "ค่าปัจจุบัน",
                value: `${stats.currentVal}%`,
                sub: `อัปเดตล่าสุด ${stats.lastPoint.time}`,
                bg: "linear-gradient(135deg,#dbeafe 0%,#eff6ff 45%,#ffffff 100%)",
                titleColor: "#64748b",
                valueColor: "#1d4ed8",
              },
              {
                title: "ค่าเฉลี่ยช่วงที่เลือก",
                value: `${stats.avgVal}%`,
                sub: "ความชื้นเฉลี่ยของเซนเซอร์นี้",
                bg: "linear-gradient(135deg,#dcfce7 0%,#ecfdf5 45%,#ffffff 100%)",
                titleColor: "#166534",
                valueColor: "#16a34a",
              },
              {
                title: "ค่าต่ำสุด",
                value: `${stats.minVal}%`,
                sub: "ช่วงที่ดินค่อนข้างแห้ง",
                bg: "linear-gradient(135deg,#fef9c3 0%,#fffbeb 45%,#ffffff 100%)",
                titleColor: "#92400e",
                valueColor: "#f97316",
              },
              {
                title: "ค่าสูงสุด",
                value: `${stats.maxVal}%`,
                sub: "ถ้าเกิน 80% อาจต้องชะลอการให้น้ำ",
                bg: "linear-gradient(135deg,#fee2e2 0%,#fef2f2 45%,#ffffff 100%)",
                titleColor: "#b91c1c",
                valueColor: "#dc2626",
              },
            ].map((b) => (
              <div
                key={b.title}
                style={{
                  ...cardR,
                  padding: "12px 14px",
                  borderRadius: 18,
                  background: b.bg,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: b.titleColor,
                    marginBottom: 4,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {b.title}
                </div>
                <div style={{ fontSize: isMobile ? 22 : 24, fontWeight: 900, color: b.valueColor }}>
                  {b.value}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#6b7280",
                    marginTop: 2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {b.sub}
                </div>
              </div>
            ))}
          </section>

          {/* ===== WEATHER HEAT MAP: THAILAND MAP ===== */}
          <div
            className="du-card"
            style={{
              ...cardR,
              marginBottom: 16,
              background: "linear-gradient(180deg,#f0f9ff 0%,#eef2ff 45%,#ffffff 100%)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 900 }}>
                  Weather Heat Map (Thailand)
                </div>
                <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.4 }}>
                  ตัวอย่างแผนที่ประเทศไทย + จุดข้อมูล (rain intensity)
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>
                ช่วง: <b>{quickRange}</b> • {startDate} ถึง {endDate}
              </div>
            </div>

            <div
              style={{
                borderRadius: 18,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                padding: 12,
                minWidth: 0,
              }}
            >
              <div style={heatGrid}>
                {/* Map (Ventusky embed) */}
<div
  style={{
    borderRadius: 16,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#f8fafc",
    overflow: "hidden",
    minWidth: 0,
  }}
>
  <div style={{ width: "100%", height: isMobile ? 360 : 540, position: "relative" }}>
    <iframe
      title="Ventusky"
      src="https://embed.ventusky.com/"
      width="100%"
      height="100%"
      style={{ border: "none" }}
      loading="lazy"
      allowFullScreen
    />
  </div>
</div>




                {/* Legend + list */}
                <div
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(15,23,42,0.08)",
                    background: "#ffffff",
                    padding: 12,
                    minWidth: 0,
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 8 }}>
                    Legend (Rain Intensity)
                  </div>

                  <div
                    style={{
                      height: 12,
                      borderRadius: 999,
                      background:
                        "linear-gradient(90deg, rgba(37,99,235,0.15), rgba(37,99,235,0.90))",
                      border: "1px solid rgba(15,23,42,0.10)",
                      marginBottom: 6,
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      color: "#64748b",
                      marginBottom: 10,
                    }}
                  >
                    <span>น้อย</span>
                    <span>มาก</span>
                  </div>

                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>
                    จุดข้อมูลตัวอย่าง
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    {TH_POINTS.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 10px",
                          borderRadius: 12,
                          border: "1px solid rgba(15,23,42,0.08)",
                          background: "#f8fafc",
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 999,
                            background: blue(p.value),
                            border: "1px solid rgba(15,23,42,0.18)",
                            flex: "0 0 auto",
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 900,
                              color: "#0f172a",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {p.name}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>
                            intensity: <b>{p.value}</b>/100
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== GRAPH SECTION ===== */}
          <div
            className="du-card"
            style={{
              ...cardR,
              marginBottom: 16,
              background: "linear-gradient(180deg,#e0f2fe 0%,#eff6ff 35%,#ffffff 100%)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 8,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 900 }}>
                  กราฟแสดงค่าตามเวลา
                </div>
                <p style={{ fontSize: 12, marginTop: 2, color: "#4b5563" }}>
                  {selectedSensorNames.length ? selectedSensorNames.join(", ") : "—"} • แปลง{" "}
                  {plot === "all" ? "ทั้งหมด" : plot}
                </p>
              </div>

              <button
                style={{
                  borderRadius: 999,
                  padding: "8px 12px",
                  fontSize: 12,
                  border: "none",
                  background: "#b91c1c",
                  color: "#fff",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: "0 6px 16px rgba(185,28,28,0.20)",
                }}
                onClick={() => alert("EXPORT CSV1 (ตัวอย่าง)")}
              >
                EXPORT CSV1
              </button>
            </div>

            <div
              style={{
                borderRadius: 18,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                padding: "10px 12px 6px",
                overflow: "hidden",
              }}
            >
              <svg viewBox="0 0 100 60" preserveAspectRatio="none" style={{ width: "100%", height: 220 }}>
                {[10, 20, 30, 40, 50].map((y) => (
                  <line key={y} x1="6" x2="98" y1={y} y2={y} stroke="#e5edf7" strokeWidth="0.4" />
                ))}
                <line x1="6" x2="6" y1="6" y2="54" stroke="#cbd5e1" strokeWidth="0.6" />
                {[
                  { y: 50, t: "20" },
                  { y: 40, t: "30" },
                  { y: 30, t: "40" },
                  { y: 20, t: "50" },
                  { y: 10, t: "60" },
                ].map((p) => (
                  <text key={p.y} x="2" y={p.y + 1.5} fontSize="2" fill="#94a3b8">
                    {p.t}
                  </text>
                ))}
                <text x="2" y="7" fontSize="3" fill="#94a3b8">
                  %
                </text>

                <defs>
                  <linearGradient id="moistBlue" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
                  </linearGradient>
                </defs>

                <polygon
                  fill="url(#moistBlue)"
                  points="
                    6,32  12,20  18,23  24,21  30,24  36,22  42,19  48,24
                    54,22 60,25  66,23  72,26  78,21  84,24  90,22 96,27
                    96,54 6,54
                  "
                />

                <polyline
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="
                    6,32  12,20  18,23  24,21  30,24  36,22  42,19  48,24
                    54,22 60,25  66,23  72,26  78,21  84,24  90,22 96,27
                  "
                />
              </svg>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 4,
                  padding: "0 4px",
                  gap: 6,
                }}
              >
                {["21 ส.ค.", "22 ส.ค.", "23 ส.ค.", "24 ส.ค.", "25 ส.ค.", "26 ส.ค.", "27 ส.ค.", "28 ส.ค."].map(
                  (d) => (
                    <span
                      key={d}
                      style={{
                        fontSize: 10,
                        color: "#94a3b8",
                        transform: isMobile ? "rotate(-20deg)" : "rotate(-30deg)",
                        transformOrigin: "left top",
                        display: "inline-block",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {d}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          {/* ===== SUMMARY TABLE (WITH BORDER) ===== */}
          <div className="du-card" style={cardR}>
            <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 900, marginBottom: 10 }}>
              สรุปการวัดข้อมูล
            </div>

            {/* ✅ ทำให้ “เลื่อนได้” */}
            <div
              style={{
                borderRadius: 16,
                overflowX: "auto",
                overflowY: "hidden",
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <table
                className="du-table"
                style={{
                  width: "100%",
                  minWidth: 980, // ✅ บังคับความกว้างให้มีอะไรให้เลื่อน
                  fontSize: 13,
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    {[
                      "แปลง",
                      "ความชื้นในดิน (%)",
                      "อุณหภูมิ (°C)",
                      "ความชื้นสัมพัทธ์ (%)",
                      "NPK",
                      "ความเข้มแสง (lux)",
                      "ปริมาณน้ำฝน (mm)",
                      "ความเร็วลม (m/s)",
                      "การให้น้ำ (L)",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 8px",
                          borderBottom: "1px solid #e5e7eb",
                          borderRight: "1px solid #e5e7eb",
                          fontWeight: 900,
                          color: "#0f172a",
                          textAlign: "center",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {[
                    {
                      plot: "แปลง 1",
                      soil: 74,
                      temp: 30.8,
                      rh: 78,
                      npk: 21.4,
                      light: "18,200",
                      rain: 6.2,
                      wind: 2.3,
                      water: 120,
                      bg: "#f9fafb",
                    },
                    {
                      plot: "แปลง 2",
                      soil: 69,
                      temp: 31.6,
                      rh: 74,
                      npk: 19.8,
                      light: "21,450",
                      rain: 2.8,
                      wind: 1.7,
                      water: 95,
                      bg: "#eef2ff",
                    },
                    {
                      plot: "แปลง 3",
                      soil: 62,
                      temp: 32.4,
                      rh: 70,
                      npk: 17.9,
                      light: "24,100",
                      rain: 0.0,
                      wind: 3.1,
                      water: 80,
                      bg: "#fef9c3",
                    },
                  ].map((row) => (
                    <tr key={row.plot} style={{ background: row.bg }}>
                      {[
                        row.plot,
                        row.soil,
                        row.temp,
                        row.rh,
                        row.npk,
                        row.light,
                        row.rain,
                        row.wind,
                        row.water,
                      ].map((cell, idx) => (
                        <td
                          key={idx}
                          style={{
                            padding: "9px 8px",
                            borderBottom: "1px solid #e5e7eb",
                            borderRight: "1px solid #e5e7eb",
                            textAlign: idx === 0 ? "left" : "center",
                            fontWeight: idx === 0 ? 900 : 700,
                            color: "#0f172a",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>
              * ค่าเป็น mockup ตัวอย่าง (สามารถเปลี่ยนเป็นค่าเฉลี่ยช่วงที่เลือกจาก API ได้)
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
