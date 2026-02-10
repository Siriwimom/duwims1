"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// ✅ import react-leaflet แบบก้อนเดียว (ลด race จาก dynamic หลายตัว)
const LeafletClient = dynamic(
  async () => {
    const RL = await import("react-leaflet");
    const L = await import("leaflet");

    // ✅ Fix default icon path for Next (กัน marker icon หาย/undefined)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyL = L;
    if (anyL?.Icon?.Default) {
      anyL.Icon.Default.mergeOptions({
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });
    }

    // ✅ component สำหรับ render map (อยู่ใน client แน่นอน)
    function LeafletMaps({ fieldPolygon, pinPositions, styles }) {
      const { MapContainer, TileLayer, Polygon, Marker, Popup } = RL;

      return (
        <>
          {/* Polygon แปลง */}
          <div style={styles.mapCard}>
            <div style={styles.mapTitle}>Polygon แปลง</div>
            <MapContainer
              center={[13.3, 101.1]}
              zoom={11}
              scrollWheelZoom
              style={{ height: 230, width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Polygon
                positions={fieldPolygon}
                pathOptions={{
                  color: "#16a34a",
                  fillColor: "#86efac",
                  fillOpacity: 0.4,
                }}
              />
            </MapContainer>
          </div>

          {/* Pin เซนเซอร์ */}
          <div style={styles.mapCard}>
            <div style={styles.mapTitle}>Pin เซนเซอร์</div>
            <MapContainer
              center={[13.3, 101.1]}
              zoom={11}
              scrollWheelZoom
              style={{ height: 230, width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Polygon
                positions={fieldPolygon}
                pathOptions={{
                  color: "#16a34a",
                  fillColor: "#86efac",
                  fillOpacity: 0.35,
                }}
              />
              {pinPositions.map((pos, i) => (
                <Marker key={i} position={pos}>
                  <Popup>PIN #{i + 1}</Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </>
      );
    }

    return LeafletMaps;
  },
  { ssr: false }
);

const pageStyle = {
  fontFamily:
    '"Prompt", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  background: "#e5edf8",
  minHeight: "100vh",
  color: "#000",
  padding: "22px 0 30px",
};

const bodyStyle = {
  maxWidth: 1120,
  margin: "0 auto",
  padding: "0 16px",
  color: "#000",
};

// initial data
const initialPins = [
  { id: 1, lat: "50.50759149432365", lon: "3.1261322928973054" },
  { id: 2, lat: "50.50759149432365", lon: "3.1261322928973054" },
  { id: 3, lat: "50.50759149432365", lon: "3.1261322928973054" },
  { id: 4, lat: "50.50759149432365", lon: "3.1261322928973054" },
  { id: 5, lat: "50.50759149432365", lon: "3.1261322928973054" },
];

// ✅ styles (บังคับสีดำ)
const styles = {
  headerPanel: {
    borderRadius: 24,
    padding: "16px 20px 18px",
    background: "linear-gradient(135deg,#40B596,#676FC7)",
    color: "#000",
    marginBottom: 18,
    boxShadow: "0 16px 36px rgba(15,23,42,0.18)",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  headerTitle: { fontSize: 16, fontWeight: 800, color: "#000" },

  topGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3,minmax(0,1fr))",
    gap: 10,
  },

  fieldCard: {
    borderRadius: 18,
    background:
      "linear-gradient(135deg,rgba(255,255,255,0.96),rgba(224,242,254,0.96))",
    padding: "10px 12px 12px",
    fontSize: 12,
    boxShadow: "0 4px 10px rgba(15,23,42,0.15)",
    color: "#000",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 800,
    marginBottom: 4,
    display: "block",
    color: "#000",
  },
  fieldSelect: {
    width: "100%",
    borderRadius: 14,
    border: "none",
    padding: "6px 10px",
    fontSize: 12,
    background: "#fff",
    outline: "none",
    color: "#000",
  },

  bottomPanel: {
    borderRadius: 26,
    background: "#dffff3",
    padding: "18px 20px 20px",
    boxShadow: "0 14px 32px rgba(15,23,42,0.12)",
    color: "#000",
  },
  bottomHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  bottomTitle: { fontSize: 14, fontWeight: 700, color: "#000" },
  deleteAllBtn: {
    borderRadius: 999,
    border: "none",
    padding: "6px 14px",
    fontSize: 12,
    background: "#ef4444",
    color: "#fff",
    cursor: "pointer",
  },
  bottomSub: {
    fontSize: 11,
    color: "#000",
    marginBottom: 10,
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: 10,
    marginBottom: 14,
  },
  infoLabel: { fontSize: 11, color: "#000", fontWeight: 700 },
  infoBox: {
    borderRadius: 12,
    background: "#ffffff",
    border: "1px solid #c7f0df",
    padding: "6px 10px",
    fontSize: 12,
    color: "#000",
  },

  mapCard: {
    borderRadius: 22,
    overflow: "hidden",
    background: "#ffffff",
    boxShadow: "0 10px 24px rgba(15,23,42,0.15)",
    marginBottom: 14,
    color: "#000",
  },
  mapTitle: {
    fontSize: 13,
    fontWeight: 700,
    padding: "10px 14px 4px",
    color: "#000",
  },
  mapLoading: {
    height: 230,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    color: "#000",
    background: "#f8fafc",
  },

  pinRow: {
    display: "grid",
    gridTemplateColumns: "140px 1fr 1fr 60px",
    gap: 8,
    alignItems: "center",
    padding: "8px 10px",
    background: "#e5f5ff",
    borderRadius: 18,
    marginBottom: 6,
    fontSize: 13,
    color: "#000",
  },

  deleteBtn: {
    borderRadius: 999,
    border: "none",
    width: 34,
    height: 34,
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
  },

  saveBtn: {
    marginTop: 12,
    display: "block",
    marginLeft: "auto",
    marginRight: "auto",
    borderRadius: 999,
    border: "none",
    padding: "8px 40px",
    fontSize: 13,
    fontWeight: 700,
    background: "linear-gradient(135deg,#6366f1,#3b82f6)",
    color: "#fff",
    cursor: "pointer",
  },

  pinNumberBox: { display: "flex", alignItems: "center", gap: 8, color: "#000" },
  pinIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 999,
    background: "#ffffff",
    display: "grid",
    placeItems: "center",
    border: "1px solid rgba(15,23,42,0.08)",
  },
  pinLabel: { fontWeight: 800, fontSize: 12, color: "#000" },
  pinCoord: { fontSize: 12, color: "#000" },
};

export default function EditAndDelete() {
  const [pins, setPins] = useState(initialPins);

  // ✅ สำคัญ: รอ hydrated ก่อน render Leaflet (กัน appendChild undefined)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // ✅ responsive แบบไม่ทำให้ map race ตอน mount
  const [width, setWidth] = useState(1200);
  useEffect(() => {
    if (!hydrated) return;
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [hydrated]);

  const isMobile = width <= 640;
  const isTablet = width > 640 && width <= 1024;

  // =========================
  // ✅ FILTER STATES (ตามคำสั่ง)
  // - แปลง: มี "ทุกแปลง"
  // - Node ประเภท: มี "ทุก Node"
  // - ชนิดเซนเซอร์: มี "ทุกเซนเซอร์" + รายการครบ
  // - ค่าเริ่มต้น: ทุกแปลง / ทุก Node / ความชื้ื้นในดิน
  // =========================
  const [selectedPlot, setSelectedPlot] = useState("all");
  const [nodeCategory, setNodeCategory] = useState("all");
  const [selectedSensorType, setSelectedSensorType] = useState("soil_moisture");

  const plotOptions = useMemo(
    () => [
      { value: "all", label: "ทุกแปลง" },
      { value: "A", label: "แปลง A" },
      { value: "B", label: "แปลง B" },
      { value: "C", label: "แปลง C" },
    ],
    []
  );

  const nodeOptions = useMemo(
    () => [
      { value: "all", label: "ทุก Node" },
      { value: "air", label: "อากาศ" },
      { value: "soil", label: "ดิน" },
    ],
    []
  );

  // ✅ ชนิดเซนเซอร์: ทุกเซนเซอร์ + ครบตามที่สั่ง
  const sensorOptions = useMemo(
    () => [
      { value: "all", label: "ทุกเซนเซอร์" },
      { value: "temp_rh", label: "อุณหภูมิและความชื้น" },
      { value: "wind", label: "วัดความเร็วลม" },
      { value: "ppfd", label: "ความเข้มแสง" },
      { value: "rain", label: "ปริมาณน้ำฝน" },
      { value: "npk", label: "ความเข้้มข้นธาตุอาหาร (N,P,K)" },
      { value: "irrigation", label: "การให้น้ำ / ความพร้อมใช้น้ำ" },
      { value: "soil_moisture", label: "ความชื้ื้นในดิน" },
    ],
    []
  );

  // ✅ ให้ค่าชนิดเซนเซอร์ยัง valid เสมอ
  useEffect(() => {
    const ok = sensorOptions.some((x) => x.value === selectedSensorType);
    if (!ok) setSelectedSensorType("soil_moisture");
  }, [sensorOptions, selectedSensorType]);

  // ✅ ปรับ grid ตามจอ (ไม่ไปยุ่งกับ map init)
  const topGridStyle = useMemo(() => {
    return {
      ...styles.topGrid,
      gridTemplateColumns: isMobile
        ? "1fr"
        : isTablet
        ? "repeat(2,minmax(0,1fr))"
        : "repeat(3,minmax(0,1fr))",
    };
  }, [isMobile, isTablet]);

  const infoGridStyle = useMemo(() => {
    return {
      ...styles.infoGrid,
      gridTemplateColumns: isMobile
        ? "1fr"
        : isTablet
        ? "repeat(2,minmax(0,1fr))"
        : "repeat(4,minmax(0,1fr))",
    };
  }, [isMobile, isTablet]);

  const pinRowStyle = useMemo(() => {
    return {
      ...styles.pinRow,
      gridTemplateColumns: isMobile ? "1fr" : "140px 1fr 1fr 60px",
    };
  }, [isMobile]);

  const fieldPolygon = [
    [13.35, 101.0],
    [13.35, 101.2],
    [13.25, 101.2],
    [13.25, 101.0],
  ];

  const pinPositions = [
    [13.34, 101.08],
    [13.33, 101.15],
    [13.3, 101.12],
    [13.29, 101.18],
    [13.28, 101.1],
  ];

  const handleDeletePin = (id) => {
    setPins((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div style={pageStyle}>
      <main style={bodyStyle} className="du-edit-delete">
        {/* HEADER + FILTERS */}
        <section style={{ ...styles.headerPanel, color: "#000" }}>
          {/* ✅ เปลี่ยนหัวข้อเป็น "การจัดการ PIN และ Sensor" + ปุ่ม "+ เพิ่ม PIN และ Sensor" */}
          <div style={styles.headerRow}>
            <div style={styles.headerTitle}>การจัดการ PIN และ Sensor</div>
            <button
              type="button"
              style={{
                borderRadius: 999,
                border: "none",
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                background: "#ffffff",
                color: "#111827",
                boxShadow: "0 10px 18px rgba(15,23,42,0.18)",
              }}
            >
              + เพิ่ม PIN และ Sensor
            </button>
          </div>

          <div style={topGridStyle}>
            {/* แปลง */}
            <div style={styles.fieldCard}>
              <label style={styles.fieldLabel}>แปลง</label>
              <select
                value={selectedPlot}
                onChange={(e) => setSelectedPlot(e.target.value)}
                style={styles.fieldSelect}
              >
                {plotOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* เลือก Node */}
            <div style={styles.fieldCard}>
              <label style={styles.fieldLabel}>เลือก Node</label>
              <select
                value={nodeCategory}
                onChange={(e) => setNodeCategory(e.target.value)}
                style={styles.fieldSelect}
              >
                {nodeOptions.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>

            {/* ชนิดเซนเซอร์ */}
            <div style={styles.fieldCard}>
              <label style={styles.fieldLabel}>ชนิดเซนเซอร์</label>
              <select
                value={selectedSensorType}
                onChange={(e) => setSelectedSensorType(e.target.value)}
                style={styles.fieldSelect}
              >
                {sensorOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* MAIN PANEL */}
        <section style={styles.bottomPanel}>
          <div style={styles.bottomHeaderRow}>
            <div style={styles.bottomTitle}>ข้อมูลแปลง</div>
            <button style={styles.deleteAllBtn} type="button" onClick={() => setPins([])}>
              ลบทั้งหมด
            </button>
          </div>

          <div style={styles.bottomSub}>ปรับแก้ Polygon และลบ / เพิ่มตำแหน่ง PIN ของแปลงนี้</div>

          <div style={infoGridStyle}>
            <div>
              <div style={styles.infoLabel}>ชื่อแปลง</div>
              <div style={styles.infoBox}>
                {selectedPlot === "all" ? "ทุกแปลง" : `แปลง ${selectedPlot}`}
              </div>
            </div>
            <div>
              <div style={styles.infoLabel}>ผู้ดูแล</div>
              <div style={styles.infoBox}>คุณสมชาย สวนทุเรียน</div>
            </div>
            <div>
              <div style={styles.infoLabel}>ประเภทพืช</div>
              <div style={styles.infoBox}>ทุเรียนหมอนทอง</div>
            </div>
            <div>
              <div style={styles.infoLabel}>วันที่เริ่มปลูก</div>
              <div style={styles.infoBox}>11/02/2568</div>
            </div>
          </div>

          {/* ✅ render map หลัง hydrated เท่านั้น */}
          {!hydrated ? (
            <>
              <div style={styles.mapCard}>
                <div style={styles.mapTitle}>Polygon แปลง</div>
                <div style={styles.mapLoading}>Loading map...</div>
              </div>
              <div style={styles.mapCard}>
                <div style={styles.mapTitle}>Pin เซนเซอร์</div>
                <div style={styles.mapLoading}>Loading map...</div>
              </div>
            </>
          ) : (
            <LeafletClient
              fieldPolygon={fieldPolygon}
              pinPositions={pinPositions}
              styles={styles}
            />
          )}

          {/* รายการ PIN ด้านล่าง */}
          {pins.map((p) => (
            <div key={p.id} style={pinRowStyle}>
              <div style={styles.pinNumberBox}>
                <div style={styles.pinIconCircle}>📍</div>
                <div>
                  <div style={styles.pinLabel}>number #{p.id}</div>
                </div>
              </div>
              <div style={styles.pinCoord}>ละติจูด&nbsp;&nbsp;{p.lat}</div>
              <div style={styles.pinCoord}>ลองจิจูด&nbsp;&nbsp;{p.lon}</div>
              <button
                style={styles.deleteBtn}
                type="button"
                onClick={() => handleDeletePin(p.id)}
              >
                🗑️
              </button>
            </div>
          ))}

          <button style={styles.saveBtn} type="button">
            SAVE
          </button>
        </section>
      </main>
    </div>
  );
}
