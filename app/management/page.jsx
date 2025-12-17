"use client";

import "leaflet/dist/leaflet.css";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), {
  ssr: false,
});
const Polygon = dynamic(
  () => import("react-leaflet").then((m) => m.Polygon),
  { ssr: false }
);

const pageStyle = {
  fontFamily:
    '"Prompt", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  background: "#e5edf8",
  minHeight: "100vh",
  color: "#111827",
  overflowX: "hidden", // ✅ กันล้นดันขวา
};

/* ✅ FIX: center page */
const bodyStyle = {
  width: "100%",
  maxWidth: 1180,        // สำคัญ
  margin: "0 auto",     // สำคัญ
  padding: "22px 16px 40px",
  boxSizing: "border-box",
  overflowX: "hidden",
};

const styles = {
  mainPanel: {
    borderRadius: 24,
    background: "#ffffff",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.16)",
    padding: "18px 22px 22px",
  },

  headerBar: {
    borderRadius: 20,
    padding: "8px 14px",
    background: "linear-gradient(135deg,#40B596,#676FC7)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 10,
    flexWrap: "wrap",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "#f9fafb",
    whiteSpace: "nowrap",
  },
  headerButtons: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  headerBtn: {
    borderRadius: 999,
    padding: "8px 18px",
    fontSize: 13,
    fontWeight: 500,
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 10px rgba(15,23,42,0.25)",
    whiteSpace: "nowrap",
  },
  btnPink: { background: "#ff6b81", color: "#ffffff" },
  btnOrange: { background: "#ffb347", color: "#111827" },
  btnYellow: { background: "#ffe45e", color: "#111827" },

  topGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
    marginTop: 6,
  },
  dropdownCard: {
    borderRadius: 18,
    background:
      "linear-gradient(135deg,#e0f2fe 0%,#e0f7ff 45%,#d1fae5 100%)",
    padding: "10px",
    fontSize: 12,
    boxShadow: "0 4px 10px rgba(15,23,42,0.15)",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#1f2933",
    marginBottom: 4,
    display: "block",
  },
  fieldSelect: {
    width: "100%",
    borderRadius: 14,
    border: "none",
    padding: "6px 10px",
    fontSize: 12,
    outline: "none",
    color: "#0f172a",
    background: "rgba(255,255,255,0.96)",
    boxShadow: "0 1px 3px rgba(148,163,184,0.6) inset",
    cursor: "pointer",
  },

  mapTitle: {
    fontSize: 14,
    fontWeight: 600,
    marginTop: 18,
    marginBottom: 8,
  },
  mapWrapper: {
    borderRadius: 28,
    overflow: "hidden",
    background: "#ffffff",
    boxShadow: "0 8px 24px rgba(15,23,42,0.18)",
  },

  bottomPanel: {
    marginTop: 22,
    borderRadius: 26,
    background: "#dffff3",
    padding: "18px 22px 22px",
    boxShadow: "0 12px 32px rgba(15,23,42,0.14)",
  },
  bottomHeader: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 2,
  },
  bottomSub: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 12,
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 3,
  },
  infoBox: {
    borderRadius: 12,
    background: "#ffffff",
    border: "1px solid #c7f0df",
    padding: "6px 10px",
    fontSize: 12,
  },

  sensorList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  sensorItem: {
    borderRadius: 999,
    background: "#ffffff",
    padding: "7px 10px",
    display: "flex",
    alignItems: "center",
    boxShadow: "0 1px 4px rgba(148, 163, 184, 0.45)",
  },
  sensorIconCircle: {
    width: 26,
    height: 26,
    borderRadius: "999px",
    background: "#d1fae5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    fontSize: 15,
    color: "#16a34a",
    flex: "0 0 auto",
  },
  sensorTextMain: {
    fontSize: 13,
    fontWeight: 500,
  },
  sensorTextSub: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
};

const sensors = [
  "เซนเซอร์ความชื้นดิน #1",
  "เซนเซอร์ความชื้นดิน #2",
  "เซนเซอร์ความชื้นดิน #3",
  "เซนเซอร์ความชื้นดิน #4",
  "เซนเซอร์ความชื้นดิน #5",
  "เซนเซอร์ความชื้นดิน #6",
];

export default function ManagementPage() {
  const [pinIcon, setPinIcon] = useState(null);

  /* ✅ breakpoint */
  const [vw, setVw] = useState(1280);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth || 1280);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isMobile = vw < 640;

  const [mapH, setMapH] = useState(280);
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (w < 640) setMapH(220);
      else if (w < 1024) setMapH(260);
      else setMapH(280);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  useEffect(() => {
    let mounted = true;
    import("leaflet").then((L) => {
      if (!mounted) return;
      const icon = new L.Icon({
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        shadowSize: [41, 41],
      });
      setPinIcon(icon);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const fieldPolygon = [
    [13.35, 101.0],
    [13.35, 101.2],
    [13.25, 101.2],
    [13.25, 101.0],
  ];

  const sensorPositions = [
    [13.33, 101.08],
    [13.33, 101.15],
    [13.3, 101.12],
    [13.29, 101.18],
    [13.28, 101.1],
    [13.27, 101.16],
  ];

  return (
    <div style={pageStyle}>
      <main
        className="du-management"
        style={{
          ...bodyStyle,
          paddingLeft: isMobile ? 12 : 16,
          paddingRight: isMobile ? 12 : 16,
          paddingTop: isMobile ? 14 : 22,
        }}
      >
        <section style={styles.mainPanel}>
          <div style={styles.headerBar}>
            <div style={styles.headerTitle}>ตัวกรองและเครื่องมือ</div>

            <div style={styles.headerButtons}>
              <a href="./addplantingplots">
                <button style={{ ...styles.headerBtn, ...styles.btnPink }}>
                  + เพิ่มแปลง
                </button>
              </a>
              <a href="./AddSensor">
                <button style={{ ...styles.headerBtn, ...styles.btnOrange }}>
                  + เพิ่ม PIN และ Sensor
                </button>
              </a>
              <a href="./EditandDelete">
                <button style={{ ...styles.headerBtn, ...styles.btnYellow }}>
                  ลบ / แก้ไข
                </button>
              </a>
            </div>
          </div>

          <div style={styles.topGrid}>
            <div style={styles.dropdownCard}>
              <label style={styles.fieldLabel}>แปลง</label>
              <select defaultValue="A" style={styles.fieldSelect}>
                <option value="A">แปลง A – ทุเรียนล่าง</option>
                <option value="B">แปลง B – ทุเรียนบน</option>
                <option value="C">แปลง C</option>
              </select>
            </div>

            <div style={styles.dropdownCard}>
              <label style={styles.fieldLabel}>เลือก Node</label>
              <select defaultValue="1" style={styles.fieldSelect}>
                <option value="1">Node 1 – จัน</option>
                <option value="2">Node 2 – ภา</option>
                <option value="3">Node 3 – ส้ม</option>
              </select>
            </div>

            <div style={styles.dropdownCard}>
              <label style={styles.fieldLabel}>ชนิดเซนเซอร์</label>
              <select defaultValue="soil" style={styles.fieldSelect}>
                <option value="soil">ความชื้นในดิน</option>
                <option value="rh">ความชื้นสัมพัทธ์</option>
                <option value="water">การให้น้ำ</option>
                <option value="npk">NPK</option>
              </select>
            </div>

            <div style={styles.dropdownCard}>
              <label style={styles.fieldLabel}>ดึงข้อมูล</label>
              <select defaultValue="pin" style={styles.fieldSelect}>
                <option value="pin">จากตำแหน่ง PIN เซนเซอร์</option>
                <option value="polygon">จาก Polygon แปลง</option>
              </select>
            </div>
          </div>

          <div style={styles.mapTitle}>แผนที่และทรัพยากร</div>
          <div style={styles.mapWrapper}>
            <MapContainer
              center={[13.3, 101.1]}
              zoom={11}
              scrollWheelZoom
              style={{ height: mapH, width: "100%" }}
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
              {pinIcon &&
                sensorPositions.map((pos, i) => (
                  <Marker key={i} position={pos} icon={pinIcon}>
                    <Popup>Sensor #{i + 1}</Popup>
                  </Marker>
                ))}
            </MapContainer>
          </div>
        </section>

        <section style={styles.bottomPanel}>
          <div style={styles.bottomHeader}>ข้อมูลแปลง: แปลง A</div>
          <div style={styles.bottomSub}>รายละเอียดของแปลงและตำแหน่งเซนเซอร์</div>

          <div style={styles.infoGrid}>
            <div>
              <div style={styles.infoLabel}>ผู้ปลูก</div>
              <div style={styles.infoBox}>สมหมาย ใจดี</div>
            </div>
            <div>
              <div style={styles.infoLabel}>ประเภทพืช</div>
              <div style={styles.infoBox}>ทุเรียนหมอนทอง</div>
            </div>
            <div>
              <div style={styles.infoLabel}>วันที่เริ่มปลูก</div>
              <div style={styles.infoBox}>15/06/2568</div>
            </div>
            <div>
              <div style={styles.infoLabel}>จำนวนเซนเซอร์</div>
              <div style={styles.infoBox}>6 เครื่อง</div>
            </div>
          </div>

          <div style={styles.sensorList}>
            {sensors.map((s, i) => (
              <div key={i} style={styles.sensorItem}>
                <div style={styles.sensorIconCircle}>📍</div>
                <div>
                  <div style={styles.sensorTextMain}>{s}</div>
                  <div style={styles.sensorTextSub}>ความชื้นในดิน: 32%</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
