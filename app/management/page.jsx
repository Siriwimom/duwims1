"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "../TopBar";

// --- แผนที่ (React Leaflet) ---
import { MapContainer, TileLayer, Marker, Popup, Polygon } from "react-leaflet";
import L from "leaflet";

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
};

const bodyStyle = {
  maxWidth: 1120,
  margin: "22px auto 40px",
  padding: "0 16px 30px",
};

const styles = {
  // PANEL / FRAME หลัก
  mainPanel: {
    borderRadius: 24,
    background: "#ffffff",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.16)",
    padding: "18px 22px 22px",
  },

  // BAR ด้านบน (gradient + ปุ่ม)
  headerBar: {
    borderRadius: 20,
    padding: "8px 14px",
    background:
      "linear-gradient(90deg,#0f766e 0%,#22c55e 35%,#2dd4bf 65%,#fb7185 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "#f9fafb",
  },
  headerButtons: {
    display: "flex",
    gap: 10,
  },
  headerBtn: {
    borderRadius: 999,
    padding: "8px 18px",
    fontSize: 13,
    fontWeight: 500,
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 10px rgba(15,23,42,0.25)",
  },
  btnPink: { background: "#ff6b81", color: "#ffffff" },
  btnOrange: { background: "#ffb347", color: "#111827" },
  btnYellow: { background: "#ffe45e", color: "#111827" },

  // กล่อง 4 คอลัมน์ด้านบน
  topGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
    marginTop: 6,
  },
  columnCard: {
    borderRadius: 18,
    background:
      "linear-gradient(135deg,#e0f2fe 0%,#e0f7ff 45%,#d1fae5 100%)",
    padding: "10px 10px 8px",
    fontSize: 12,
  },
  columnHeader: {
    fontSize: 12,
    fontWeight: 600,
    color: "#1f2933",
    marginBottom: 4,
  },
  columnTable: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: "0 5px",
    fontSize: 12,
  },
  columnTh: {
    textAlign: "left",
    padding: "2px 6px 4px",
    color: "#6b7280",
    fontWeight: 500,
    fontSize: 11,
  },
  columnTd: {
    padding: "5px 8px",
  },
  rowPill: {
    borderRadius: 999,
    cursor: "pointer",
  },
  rowPillSelected: {
    borderRadius: 999,
    cursor: "pointer",
    background: "linear-gradient(90deg,#c7ebff,#e0e7ff)",
    boxShadow: "0 2px 6px rgba(148,163,184,0.7)",
  },

  // MAP
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

  // PANEL ล่าง
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
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
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
  const [selectedField, setSelectedField] = useState(1);
  const router = useRouter();

  // polygon แทนขอบเขตแปลง (ลองเปลี่ยนเป็นพิกัดสวนจริงของ Pat ได้)
  const fieldPolygon = [
    [13.35, 101.0],
    [13.35, 101.2],
    [13.25, 101.2],
    [13.25, 101.0],
  ];

  // ตำแหน่ง sensor แต่ละตัว
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
      
      <main className="du-management" style={bodyStyle}>
        {/* PANEL บนสุด */}
        <section style={styles.mainPanel}>
          {/* แถบ gradient ด้านบน */}
          <div style={styles.headerBar}>
            <div style={styles.headerTitle}>ตัวกรองและเครื่องมือ</div>
            <div style={styles.headerButtons}>
              <button
                style={{ ...styles.headerBtn, ...styles.btnPink }}
                onClick={() => router.push("/addplantingplots")}
              >
                + เพิ่มแปลง
              </button>
              <button
                style={{ ...styles.headerBtn, ...styles.btnOrange }}
                onClick={() => router.push("/AddSensor")}
              >
                + เพิ่ม PIN และ Sensor
              </button>
              <button
                style={{ ...styles.headerBtn, ...styles.btnYellow }}
                onClick={() => router.push("/EditandDelete")}
              >
                ลบ / แก้ไข
              </button>
            </div>
          </div>

          {/* 4 กล่องด้านบน */}
          <div style={styles.topGrid}>
            {/* แปลง */}
            <div style={styles.columnCard}>
              <div style={styles.columnHeader}>แปลง</div>
              <table style={styles.columnTable}>
                <thead>
                  <tr>
                    <th style={styles.columnTh}>ลำดับ</th>
                    <th style={styles.columnTh}>ชื่อแปลง</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map((id) => (
                    <tr
                      key={id}
                      style={
                        id === selectedField
                          ? styles.rowPillSelected
                          : styles.rowPill
                      }
                      onClick={() => setSelectedField(id)}
                    >
                      <td style={styles.columnTd}>{id}</td>
                      <td style={styles.columnTd}>
                        {id === 1 ? "แปลง A" : id === 2 ? "แปลง B" : "แปลง C"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Node */}
            <div style={styles.columnCard}>
              <div style={styles.columnHeader}>เลือก Node</div>
              <table style={styles.columnTable}>
                <thead>
                  <tr>
                    <th style={styles.columnTh}>Node</th>
                    <th style={styles.columnTh}>ชื่อ Node</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={styles.rowPillSelected}>
                    <td style={styles.columnTd}>1</td>
                    <td style={styles.columnTd}>จัน</td>
                  </tr>
                  <tr style={styles.rowPill}>
                    <td style={styles.columnTd}>2</td>
                    <td style={styles.columnTd}>ภา</td>
                  </tr>
                  <tr style={styles.rowPill}>
                    <td style={styles.columnTd}>3</td>
                    <td style={styles.columnTd}>ส้ม</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ชนิดเซนเซอร์ */}
            <div style={styles.columnCard}>
              <div style={styles.columnHeader}>ชนิดเซนเซอร์</div>
              <table style={styles.columnTable}>
                <thead>
                  <tr>
                    <th style={styles.columnTh}>ลำดับ</th>
                    <th style={styles.columnTh}>ชนิดค่า</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={styles.rowPillSelected}>
                    <td style={styles.columnTd}>1</td>
                    <td style={styles.columnTd}>ความชื้นในดิน</td>
                  </tr>
                  <tr style={styles.rowPill}>
                    <td style={styles.columnTd}>2</td>
                    <td style={styles.columnTd}>ความชื้นสัมพัทธ์</td>
                  </tr>
                  <tr style={styles.rowPill}>
                    <td style={styles.columnTd}>3</td>
                    <td style={styles.columnTd}>การให้น้ำ</td>
                  </tr>
                  <tr style={styles.rowPill}>
                    <td style={styles.columnTd}>4</td>
                    <td style={styles.columnTd}>NPK</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ตำแหน่ง */}
            <div style={styles.columnCard}>
              <div style={styles.columnHeader}>ดึงข้อมูล</div>
              <table style={styles.columnTable}>
                <thead>
                  <tr>
                    <th style={styles.columnTh}>Pin เซนเซอร์</th>
                    <th style={styles.columnTh}>Polygon แปลง</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={styles.rowPillSelected}>
                    <td style={styles.columnTd}>Pin Sensor</td>
                    <td style={styles.columnTd}>แปลง A</td>
                  </tr>
                  <tr style={styles.rowPill}>
                    <td style={styles.columnTd}>Pin Sensor</td>
                    <td style={styles.columnTd}>แปลง B</td>
                  </tr>
                  <tr style={styles.rowPill}>
                    <td style={styles.columnTd}>Pin Sensor</td>
                    <td style={styles.columnTd}>แปลง C</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* แผนที่จริง */}
          <div style={styles.mapTitle}>แผนที่และทรัพยากร</div>
          <div style={styles.mapWrapper}>
            <MapContainer
              center={[13.3, 101.1]} // center แถวจังหวัดสวน
              zoom={11}
              scrollWheelZoom={true}
              style={{ height: 280, width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* ขอบเขตแปลง */}
              <Polygon
                positions={fieldPolygon}
                pathOptions={{
                  color: "#16a34a",
                  fillColor: "#86efac",
                  fillOpacity: 0.4,
                }}
              />

              {/* เซนเซอร์แต่ละตัว */}
              {sensorPositions.map((pos, i) => (
                <Marker key={i} position={pos} icon={pinIcon}>
                  <Popup>Sensor #{i + 1}</Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </section>

        {/* PANEL ล่าง – สีเขียวอ่อน */}
        <section style={styles.bottomPanel}>
          <div style={styles.bottomHeader}>ข้อมูลแปลง: แปลง A</div>
          <div style={styles.bottomSub}>
            รายละเอียดของแปลงและตำแหน่งเซนเซอร์
          </div>

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
