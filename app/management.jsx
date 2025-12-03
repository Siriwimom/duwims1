"use client";

import React, { useState } from "react";

const styles = {
  page: {
    fontFamily:
      '"Prompt", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    background: "#f3f6fb",
    minHeight: "100vh",
    color: "#111827",
  },

  // NAVBAR ด้านบน
  navbar: {
    background: "#0b8f4a",
    color: "#ffffff",
    padding: "10px 28px",
    display: "flex",
    alignItems: "center",
  },
  logoWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  logoIconCircle: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    color: "#16a34a",
  },
  logoText: {
    fontWeight: 700,
    fontSize: 18,
  },
  navTabs: {
    marginLeft: "auto",
    display: "flex",
    gap: 18,
  },
  navTab: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 14px",
    borderRadius: 999,
    fontSize: 13,
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
    color: "#e5e7eb",
  },
  navTabActive: {
    background: "#ffffff",
    color: "#166534",
  },
  navTabIconCircle: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
  },

  // BODY
  body: {
    maxWidth: 1120,
    margin: "22px auto 40px",
    padding: "0 16px 30px",
  },

  // PANEL บนสุด
  mainPanel: {
    borderRadius: 24,
    background: "#ffffff",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.16)",
    padding: "18px 22px 22px",
  },
  mainHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  labelChip: {
    background: "#22c55e",
    color: "#ffffff",
    borderRadius: 999,
    padding: "6px 16px",
    fontSize: 13,
    fontWeight: 600,
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
  },
  btnPink: { background: "#ff6b81", color: "#ffffff" },
  btnOrange: { background: "#ffb347", color: "#111827" },
  btnYellow: { background: "#ffe45e", color: "#111827" },

  // 4 กล่องด้านบน
  topGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
    marginTop: 6,
  },
  columnCard: {
    borderRadius: 16,
    background: "#f3fbff",
    padding: "8px 10px 6px",
    border: "1px solid #e0f2ff",
    fontSize: 12,
  },
  columnHeader: {
    fontSize: 12,
    fontWeight: 600,
    color: "#4b5563",
    marginBottom: 4,
  },
  columnTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
  },
  columnTh: {
    textAlign: "left",
    padding: "4px 6px",
    color: "#6b7280",
    fontWeight: 500,
  },
  columnTd: {
    padding: "4px 6px",
  },
  rowPill: {
    borderRadius: 10,
  },
  rowPillSelected: {
    borderRadius: 10,
    background: "#c7ebff",
  },

  // หัวข้อแผนที่
  mapTitle: {
    fontSize: 14,
    fontWeight: 600,
    marginTop: 18,
    marginBottom: 8,
  },

  // กล่องแผนที่ (เลียนแบบรูป)
  mapWrapper: {
    borderRadius: 28,
    overflow: "hidden",
    border: "1px solid #d1d5db",
    height: 260,
  },
  mapInner: {
    width: "100%",
    height: "100%",
    background:
      "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 45%, #a5f3fc 75%, #e5f9e0 100%)",
    position: "relative",
  },
  mapPolygon: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "55%",
    height: "55%",
    transform: "translate(-50%, -50%)",
    borderRadius: "48% 50% 52% 46%",
    border: "3px solid #16a34a",
    background: "rgba(74, 222, 128, 0.4)",
  },
  mapPin: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: "#16a34a",
    boxShadow: "0 0 8px rgba(22,163,74,0.8)",
  },

  // PANEL ล่าง สีเขียวอ่อน
  bottomPanel: {
    marginTop: 18,
    borderRadius: 24,
    background: "#dffff3",
    padding: "18px 22px 22px",
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

  // รายการเซนเซอร์
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

  // placeholder แท็บอื่น
  placeholder: {
    borderRadius: 24,
    background: "#ffffff",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
    padding: "26px 22px",
    fontSize: 14,
    maxWidth: 1120,
    margin: "22px auto 40px",
  },
};

const sensors = [
  "สวนตรวจความชื้นดิน #1",
  "สวนตรวจความชื้นดิน #2",
  "สวนตรวจความชื้นดิน #3",
  "สวนตรวจความชื้นดิน #4",
  "สวนตรวจความชื้นดิน #5",
  "สวนตรวจความชื้นดิน #6",
];

function ManagementPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedField, setSelectedField] = useState(1);

  const navbar = (
    <header style={styles.navbar}>
      <div style={styles.logoWrap}>
        <div style={styles.logoIconCircle}>🌱</div>
        <div style={styles.logoText}>DuWIMS</div>
      </div>
      <div style={styles.navTabs}>
        <div
          style={{
            ...styles.navTab,
            ...(activeTab === "dashboard" ? styles.navTabActive : {}),
          }}
          onClick={() => setActiveTab("dashboard")}
        >
          <div style={styles.navTabIconCircle}>🏠</div>
          <span>Dashboard</span>
        </div>
        <div
          style={{
            ...styles.navTab,
            ...(activeTab === "history" ? styles.navTabActive : {}),
          }}
          onClick={() => setActiveTab("history")}
        >
          <div style={styles.navTabIconCircle}>📊</div>
          <span>History &amp; Analytics</span>
        </div>
        <div
          style={{
            ...styles.navTab,
            ...(activeTab === "management" ? styles.navTabActive : {}),
          }}
          onClick={() => setActiveTab("management")}
        >
          <div style={styles.navTabIconCircle}>🛠️</div>
          <span>Management</span>
        </div>
      </div>
    </header>
  );

  const dashboard = (
    <main style={styles.body}>
      {/* PANEL บนสุด */}
      <section style={styles.mainPanel}>
        <div style={styles.mainHeaderRow}>
          <div style={styles.labelChip}>ตัวตรวจและแปลงเครื่องมือ</div>
          <div style={styles.headerButtons}>
            <button
              style={{ ...styles.headerBtn, ...styles.btnPink }}
              onClick={() => {}}
            >
              + เพิ่มแปลง
            </button>
            <button
              style={{ ...styles.headerBtn, ...styles.btnOrange }}
              onClick={() => {}}
            >
              + เพิ่ม PIN และ Sensor
            </button>
            <button
              style={{ ...styles.headerBtn, ...styles.btnYellow }}
              onClick={() => {}}
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
                      {id === 1 ? "ทุเรียนล่าง" : id === 2 ? "ทุเรียนบน" : "ทุเรียน B"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Site Node */}
          <div style={styles.columnCard}>
            <div style={styles.columnHeader}>Site Node</div>
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

          {/* ชนิดค่า */}
          <div style={styles.columnCard}>
            <div style={styles.columnHeader}>ชนิดค่า</div>
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
            <div style={styles.columnHeader}>ตำแหน่ง</div>
            <table style={styles.columnTable}>
              <thead>
                <tr>
                  <th style={styles.columnTh}>Pin Sensor</th>
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

        {/* แผนที่ */}
        <div style={styles.mapTitle}>แผนที่และทรัพย์การ</div>
        <div style={styles.mapWrapper}>
          <div style={styles.mapInner}>
            <div style={styles.mapPolygon} />
            <div style={{ ...styles.mapPin, top: "38%", left: "40%" }} />
            <div style={{ ...styles.mapPin, top: "45%", left: "55%" }} />
            <div style={{ ...styles.mapPin, top: "55%", left: "47%" }} />
            <div style={{ ...styles.mapPin, top: "60%", left: "60%" }} />
          </div>
        </div>
      </section>

      {/* PANEL ล่าง สีเขียวอ่อน */}
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
            <div style={styles.infoBox}>6 ตัว</div>
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
  );

  const placeholder = (label) => (
    <div style={styles.placeholder}>{label}</div>
  );

  return (
    <div style={styles.page}>
      {navbar}
      {activeTab === "dashboard" && dashboard}
      {activeTab === "history" && placeholder("History & Analytics")}
      {activeTab === "management" && placeholder("Management")}
    </div>
  );
}

export default ManagementPage;
