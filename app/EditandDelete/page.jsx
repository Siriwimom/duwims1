"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import L from "leaflet";

// --- dynamic import React-Leaflet เฉพาะฝั่ง client ---
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Polygon = dynamic(
  () => import("react-leaflet").then((m) => m.Polygon),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);

const pinIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const pageStyle = {
  fontFamily:
    '"Prompt", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  background: "#e5edf8",
  minHeight: "100vh",
  color: "#111827",
  padding: "22px 0 30px",
};

const bodyStyle = {
  maxWidth: 1120,
  margin: "0 auto",
  padding: "0 16px",
};

const styles = {
  // header gradient
  headerPanel: {
    borderRadius: 24,
    padding: "16px 20px 18px",
    background: "linear-gradient(135deg,#40B596,#676FC7)",
    color: "#fff",
    marginBottom: 18,
    boxShadow: "0 16px 36px rgba(15,23,42,0.18)",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 700,
  },
  headerDangerBtn: {
    borderRadius: 999,
    border: "none",
    padding: "8px 18px",
    fontSize: 13,
    fontWeight: 500,
    background: "#ef4444",
    color: "#fff",
    cursor: "pointer",
    boxShadow: "0 4px 10px rgba(15,23,42,0.25)",
  },

  // grid ในกล่องตัวกรอง
  topGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: 10,
  },
  fieldCard: {
    borderRadius: 18,
    background:
      "linear-gradient(135deg,rgba(255,255,255,0.96),rgba(224,242,254,0.96))",
    padding: "10px 12px 12px",
    fontSize: 12,
    color: "#0f172a",
    boxShadow: "0 4px 10px rgba(15,23,42,0.15)",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#1f2937",
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
    background: "rgba(255,255,255,0.95)",
    boxShadow: "0 1px 3px rgba(148,163,184,0.6) inset",
    cursor: "pointer",
  },

  // main bottom panel
  bottomPanel: {
    borderRadius: 26,
    background: "#dffff3",
    padding: "18px 20px 20px",
    boxShadow: "0 14px 32px rgba(15,23,42,0.12)",
  },
  bottomHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  bottomTitle: { fontSize: 14, fontWeight: 600 },
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
    color: "#6b7280",
    marginBottom: 10,
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: 10,
    marginBottom: 14,
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

  mapCard: {
    borderRadius: 22,
    overflow: "hidden",
    background: "#ffffff",
    boxShadow: "0 10px 24px rgba(15,23,42,0.15)",
    marginBottom: 14,
  },
  mapTitle: {
    fontSize: 13,
    fontWeight: 600,
    padding: "10px 14px 4px",
  },

  // pin list
  pinRow: {
    display: "grid",
    gridTemplateColumns: "140px 1fr 1fr 60px",
    gap: 8,
    alignItems: "center",
    padding: "6px 10px",
    background: "#e5f5ff",
    borderRadius: 18,
    marginBottom: 6,
    fontSize: 13,
  },
  pinNumberBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  pinIconCircle: {
    width: 26,
    height: 26,
    borderRadius: "999px",
    background: "#d1fae5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 15,
    color: "#16a34a",
  },
  pinLabel: {
    fontWeight: 500,
  },
  pinCoord: {
    fontSize: 12,
    color: "#4b5563",
  },
  deleteBtn: {
    borderRadius: 999,
    border: "none",
    width: 34,
    height: 34,
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 16,
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
    fontWeight: 600,
    background: "linear-gradient(135deg,#6366f1,#3b82f6)",
    color: "#fff",
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(59,130,246,0.5)",
  },
};

// initial data สำหรับใช้กับ useState
const initialPins = [
  { id: 1, lat: "50.50759149432365", lon: "3.1261322928973054" },
  { id: 2, lat: "50.50759149432365", lon: "3.1261322928973054" },
  { id: 3, lat: "50.50759149432365", lon: "3.1261322928973054" },
  { id: 4, lat: "50.50759149432365", lon: "3.1261322928973054" },
  { id: 5, lat: "50.50759149432365", lon: "3.1261322928973054" },
];

export default function EditDelete() {
  // ใช้ state เก็บ list ของ PIN
  const [pins, setPins] = useState(initialPins);

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

  // ฟังก์ชันลบ PIN ตาม id
  const handleDeletePin = (id) => {
    setPins((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div style={pageStyle}>
      <main style={bodyStyle} className="du-edit-delete">
        {/* HEADER + FILTERS */}
        <section style={styles.headerPanel}>
          <div style={styles.headerRow}>
            <div style={styles.headerTitle}>ตัวกรองและเครื่องมือ</div>
            <button style={styles.headerDangerBtn}>ลบ / แก้ไข</button>
          </div>

          {/* dropdown filters */}
          <div style={styles.topGrid}>
            {/* เลือกแปลง */}
            <div style={styles.fieldCard}>
              <label style={styles.fieldLabel}>แปลง</label>
              <select defaultValue="A" style={styles.fieldSelect}>
                <option value="A">ทุเรียนล่าง (แปลง A)</option>
                <option value="B">ทุเรียนบน (แปลง B)</option>
                <option value="C">แปลง C</option>
              </select>
            </div>

            {/* เลือก Node */}
            <div style={styles.fieldCard}>
              <label style={styles.fieldLabel}>เลือก Node</label>
              <select defaultValue="1" style={styles.fieldSelect}>
                <option value="1">Node 1 – จัน</option>
                <option value="2">Node 2 – ภา</option>
                <option value="3">Node 3 – ส้ม</option>
              </select>
            </div>

            {/* ชนิดเซนเซอร์ */}
            <div style={styles.fieldCard}>
              <label style={styles.fieldLabel}>ชนิดเซนเซอร์</label>
              <select defaultValue="soil" style={styles.fieldSelect}>
                <option value="soil">ความชื้นดิน</option>
                <option value="rh">ความชื้นสัมพัทธ์</option>
                <option value="water">การให้น้ำ</option>
                <option value="npk">NPK</option>
              </select>
            </div>

            {/* ดึงข้อมูลจากอะไร */}
            <div style={styles.fieldCard}>
              <label style={styles.fieldLabel}>ดึงข้อมูล</label>
              <select defaultValue="pin" style={styles.fieldSelect}>
                <option value="pin">ตามตำแหน่ง PIN เซนเซอร์</option>
                <option value="polygon">ตาม Polygon แปลง</option>
              </select>
            </div>
          </div>
        </section>

        {/* MAIN PANEL: polygon + pins + list */}
        <section style={styles.bottomPanel}>
          <div style={styles.bottomHeaderRow}>
            <div style={styles.bottomTitle}>ข้อมูลแปลง: แปลง A</div>
            <button
              style={styles.deleteAllBtn}
              onClick={() => setPins([])}
            >
              ลบทั้งหมด
            </button>
          </div>
          <div style={styles.bottomSub}>
            ปรับแก้ Polygon และลบ / เพิ่มตำแหน่ง PIN ของแปลงนี้
          </div>

          {/* info row */}
          <div style={styles.infoGrid}>
            <div>
              <div style={styles.infoLabel}>ชื่อแปลง</div>
              <div style={styles.infoBox}>แปลง A</div>
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

          {/* Polygon แปลง */}
          <div style={styles.mapCard}>
            <div style={styles.mapTitle}>Polygon แปลง</div>
            <MapContainer
              center={[13.3, 101.1]}
              zoom={11}
              scrollWheelZoom={true}
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
              scrollWheelZoom={true}
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
                <Marker key={i} position={pos} icon={pinIcon}>
                  <Popup>PIN #{i + 1}</Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* รายการ PIN ด้านล่าง */}
          {pins.map((p) => (
            <div key={p.id} style={styles.pinRow}>
              <div style={styles.pinNumberBox}>
                <div style={styles.pinIconCircle}>📍</div>
                <div>
                  <div style={styles.pinLabel}>number #{p.id}</div>
                </div>
              </div>
              <div style={styles.pinCoord}>
                ละติจูด&nbsp;&nbsp;{p.lat}
              </div>
              <div style={styles.pinCoord}>
                ลองจิจูด&nbsp;&nbsp;{p.lon}
              </div>
              <button
                style={styles.deleteBtn}
                onClick={() => handleDeletePin(p.id)}
              >
                🗑️
              </button>
            </div>
          ))}

          <button style={styles.saveBtn}>SAVE</button>
        </section>
      </main>
    </div>
  );
}
