"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// --- dynamic import React-Leaflet เฉพาะฝั่ง client ---
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
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);
const Polygon = dynamic(
  () => import("react-leaflet").then((m) => m.Polygon),
  { ssr: false }
);

export default function AddSensor() {
  const [baseUrl, setBaseUrl] = useState("");
  const [pinIcon, setPinIcon] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  // สร้าง Leaflet Icon แบบ client-side เท่านั้น
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

  const styles = {
    page: {
      fontFamily:
        '"Prompt", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      background: "#e5edf8",
      minHeight: "100vh",
      color: "#111827",
      padding: "22px 0 30px",
    },
    body: {
      maxWidth: 1120,
      margin: "0 auto",
      padding: "0 16px",
    },

    // แถบด้านบน gradient + กล่องฟิลเตอร์
    topPanel: {
      borderRadius: 24,
      padding: "16px 20px 18px",
      background: "linear-gradient(135deg,#40B596,#676FC7)",
      color: "#fff",
      marginBottom: 18,
      boxShadow: "0 16px 36px rgba(15,23,42,0.18)",
    },
    topHeaderRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    topTitle: {
      fontSize: 16,
      fontWeight: 700,
    },
    topBtn: {
      borderRadius: 999,
      border: "none",
      padding: "8px 18px",
      fontSize: 13,
      fontWeight: 500,
      background: "#ffffff",
      color: "#1f2937",
      cursor: "pointer",
      boxShadow: "0 4px 10px rgba(15,23,42,0.25)",
    },
    filterGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(4,minmax(0,1fr))",
      gap: 10,
      marginTop: 4,
    },
    filterCard: {
      borderRadius: 16,
      background:
        "linear-gradient(135deg,rgba(255,255,255,0.95),rgba(224,242,254,0.95))",
      padding: "8px 10px 6px",
      fontSize: 12,
      color: "#0f172a",
    },
    filterLabel: {
      fontSize: 11,
      fontWeight: 600,
      color: "#64748b",
      marginBottom: 4,
    },
    filterSelect: {
      width: "100%",
      borderRadius: 12,
      border: "none",
      padding: "5px 8px",
      fontSize: 12,
      background: "#e0f2fe",
    },

    // PANEL ข้อมูลแปลง + แผนที่ + แถว PIN
    plotPanel: {
      borderRadius: 26,
      background: "#dffff3",
      padding: "18px 20px 20px",
      marginBottom: 18,
      boxShadow: "0 14px 32px rgba(15,23,42,0.12)",
    },
    plotHeaderRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    plotTitle: {
      fontSize: 14,
      fontWeight: 600,
    },
    plotSub: {
      fontSize: 11,
      color: "#6b7280",
      marginBottom: 10,
    },
    editBtn: {
      borderRadius: 999,
      border: "none",
      padding: "5px 12px",
      fontSize: 12,
      background: "#facc15",
      cursor: "pointer",
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
      marginBottom: 10,
    },
    mapTitle: {
      fontSize: 13,
      fontWeight: 600,
      padding: "10px 14px 4px",
    },

    pinMetaRow: {
      marginTop: 6,
      borderRadius: 16,
      background: "#fef9c3",
      padding: "8px 10px",
      display: "grid",
      gridTemplateColumns: "auto 1fr 1.2fr 1.2fr",
      gap: 8,
      fontSize: 12,
      alignItems: "center",
    },
    pinMetaBtn: {
      borderRadius: 999,
      width: 28,
      height: 28,
      border: "none",
      background: "#ffffff",
      cursor: "pointer",
      fontSize: 18,
      fontWeight: 600,
      boxShadow: "0 2px 6px rgba(148,163,184,0.7)",
    },
    pinMetaBox: {
      borderRadius: 12,
      background: "#ffffff",
      padding: "5px 8px",
      fontSize: 12,
      display: "flex",
      alignItems: "center",
      gap: 6,
    },
    pinMetaLabel: {
      fontSize: 11,
      color: "#6b7280",
    },

    // PANEL PIN ล่างสีชมพู
    pinPanel: {
      borderRadius: 26,
      background: "#ffe4f4",
      padding: "16px 18px 18px",
      boxShadow: "0 14px 32px rgba(244,114,182,0.3)",
      marginBottom: 16,
    },
    pinHeaderRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    pinTitle: {
      fontSize: 14,
      fontWeight: 600,
    },
    addSensorBtn: {
      borderRadius: 999,
      border: "none",
      padding: "6px 12px",
      fontSize: 12,
      background: "#f9a8d4",
      cursor: "pointer",
    },
    sensorRow: {
      borderRadius: 16,
      background: "#ffffff",
      padding: "8px 10px",
      marginBottom: 6,
      display: "grid",
      gridTemplateColumns: "1.1fr 1.5fr",
      gap: 8,
      alignItems: "center",
      boxShadow: "0 1px 4px rgba(148,163,184,0.4)",
    },
    sensorLeft: {
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    sensorIcon: {
      width: 26,
      height: 26,
      borderRadius: "999px",
      background: "#e0f2fe",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 16,
      color: "#2563eb",
    },
    sensorLabelMain: {
      fontSize: 12,
      fontWeight: 500,
    },
    sensorLabelSub: {
      fontSize: 11,
      color: "#6b7280",
    },
    sensorRight: {
      fontSize: 11,
      color: "#4b5563",
      lineHeight: 1.45,
    },

    saveBtn: {
      marginTop: 10,
      display: "block",
      marginLeft: "auto",
      marginRight: "auto",
      borderRadius: 999,
      border: "none",
      padding: "8px 40px",
      fontSize: 13,
      fontWeight: 600,
      background: "linear-gradient(135deg,#6366f1,#a855f7)",
      color: "#fff",
      cursor: "pointer",
      boxShadow: "0 8px 20px rgba(99,102,241,0.5)",
    },
  };

  // polygon แทนขอบเขตแปลง A (ลองเปลี่ยนพิกัดจริงได้)
  const fieldPolygon = [
    [13.35, 101.0],
    [13.35, 101.2],
    [13.25, 101.2],
    [13.25, 101.0],
  ];

  const pinPosition = [13.3, 101.12];

  return (
    <div style={styles.page}>
      <div style={styles.body} className="du-add-sensor">
        {/* TOP gradient filter panel */}
        <section style={styles.topPanel}>
          <div style={styles.topHeaderRow}>
            <div style={styles.topTitle}>การจัดการ PIN และ Sensor</div>
            <button style={styles.topBtn}>+ เพิ่ม PIN และ Sensor</button>
          </div>

          <div style={styles.filterGrid}>
            <div style={styles.filterCard}>
              <div style={styles.filterLabel}>แปลง</div>
              <select style={styles.filterSelect} defaultValue="A">
                <option value="all">ทุกแปลง</option>
                <option value="A">แปลง A</option>
                <option value="B">แปลง B</option>
                <option value="C">แปลง C</option>
              </select>
            </div>

            <div style={styles.filterCard}>
              <div style={styles.filterLabel}>เลือก Node</div>
              <select style={styles.filterSelect} defaultValue="all">
                <option value="all">ทุก Node</option>
                <option value="1">Node 1</option>
                <option value="2">Node 2</option>
                <option value="3">Node 3</option>
              </select>
            </div>

            <div style={styles.filterCard}>
              <div style={styles.filterLabel}>ชนิดเซนเซอร์</div>
              <select style={styles.filterSelect} defaultValue="soil">
                <option value="soil">ความชื้นดิน</option>
                <option value="temp">อุณหภูมิ</option>
                <option value="rh">ความชื้นสัมพัทธ์</option>
                <option value="npk">NPK</option>
              </select>
            </div>

            <div style={styles.filterCard}>
              <div style={styles.filterLabel}>ดึงข้อมูล</div>
              <select style={styles.filterSelect} defaultValue="pin">
                <option value="soil">ความชื้นดิน</option>
                <option value="pin">Pin เซนเซอร์</option>
                <option value="polygon">Polygon แปลง</option>
              </select>
            </div>
          </div>
        </section>

        {/* PANEL ข้อมูลแปลง + แผนที่ + PIN meta */}
        <section style={styles.plotPanel}>
          <div style={styles.plotHeaderRow}>
            <div style={styles.plotTitle}>ข้อมูลแปลง: แปลง A</div>
            <button style={styles.editBtn}>ลบ / แก้ไข</button>
          </div>
          <div style={styles.plotSub}>รายละเอียดแปลงและข้อมูลพื้นฐาน</div>

          <div style={styles.infoGrid}>
            <div>
              <div style={styles.infoLabel}>ชื่อแปลง</div>
              <div style={styles.infoBox}>แปลง A</div>
            </div>
            <div>
              <div style={styles.infoLabel}>ประเภทพืช</div>
              <div style={styles.infoBox}>ทุเรียนหมอนทอง</div>
            </div>
            <div>
              <div style={styles.infoLabel}>วันที่เริ่มปลูก</div>
              <div style={styles.infoBox}>11/02/2568</div>
            </div>
            <div>
              <div style={styles.infoLabel}>จำนวนเซนเซอร์</div>
              <div style={styles.infoBox}>6 เครื่อง</div>
            </div>
          </div>

          {/* แผนที่ polygon + pin */}
          <div style={styles.mapCard}>
            <div style={styles.mapTitle}>Pin เซนเซอร์ชุดนี้ต้องการวัด</div>
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
              {pinIcon && (
                <Marker position={pinPosition} icon={pinIcon}>
                  <Popup>Pin เซนเซอร์ #1</Popup>
                </Marker>
              )}
            </MapContainer>
          </div>

          {/* แถวข้อมูล PIN (เหลือง) */}
          <div style={styles.pinMetaRow}>
            <button style={styles.pinMetaBtn}>+</button>
            <div style={styles.pinMetaBox}>
              <div style={styles.pinMetaLabel}>number</div>
              <div>#1</div>
            </div>
            <div style={styles.pinMetaBox}>
              <div style={styles.pinMetaLabel}>ละติจูด</div>
              <div>51.50759149432365</div>
            </div>
            <div style={styles.pinMetaBox}>
              <div style={styles.pinMetaLabel}>ลองจิจูด</div>
              <div>3.2613226229073554</div>
            </div>
          </div>
        </section>

        {/* PANEL PIN details (ชมพู) */}
        <section style={styles.pinPanel}>
          <div style={styles.pinHeaderRow}>
            <div style={styles.pinTitle}>Pin number #1</div>
            <button style={styles.addSensorBtn}>+ เพิ่มเซนเซอร์</button>
          </div>

          <div style={styles.sensorRow}>
            <div style={styles.sensorLeft}>
              <div style={styles.sensorIcon}>📍</div>
              <div>
                <div style={styles.sensorLabelMain}>ชื่อเซนเซอร์</div>
                <div style={styles.sensorLabelSub}>เซนเซอร์วัดความชื้น</div>
              </div>
            </div>
            <div style={styles.sensorRight}>
              <strong>แผนที่จุดที่ #1</strong>
              <br />
              เซนเซอร์จุดที่ 1
            </div>
          </div>

          <div style={styles.sensorRow}>
            <div style={styles.sensorLeft}>
              <div style={styles.sensorIcon}>📍</div>
              <div>
                <div style={styles.sensorLabelMain}>
                  เซนเซอร์ความชื้นดิน #1
                </div>
                <div style={styles.sensorLabelSub}>ความชื้นดิน ~ 32%</div>
              </div>
            </div>
            <div style={styles.sensorRight}>
              <strong>เซนเซอร์ดินจุดที่ #2</strong>
              <br />
              ความชื้นดิน ~ 32%
            </div>
          </div>

          <div style={styles.sensorRow}>
            <div style={styles.sensorLeft}>
              <div style={styles.sensorIcon}>📍</div>
              <div>
                <div style={styles.sensorLabelMain}>เซนเซอร์อุณหภูมิ</div>
                <div style={styles.sensorLabelSub}>อุณหภูมิ ~ 29°C</div>
              </div>
            </div>
            <div style={styles.sensorRight}>
              <strong>เซนเซอร์อุณหภูมิ #2</strong>
              <br />
              NPK ~ 45 ppm
            </div>
          </div>

          <div style={styles.sensorRow}>
            <div style={styles.sensorLeft}>
              <div style={styles.sensorIcon}>📍</div>
              <div>
                <div style={styles.sensorLabelMain}>เซนเซอร์การให้น้ำ</div>
                <div style={styles.sensorLabelSub}>อัตราการให้น้ำ ~ 7%</div>
              </div>
            </div>
            <div style={styles.sensorRight}>
              <strong>เซนเซอร์ NPK #1</strong>
              <br />
              เซนเซอร์ NPK#2 – ความลึก 35–37cm
            </div>
          </div>

          <div style={styles.sensorRow}>
            <div style={styles.sensorLeft}>
              <div style={styles.sensorIcon}>📍</div>
              <div>
                <div style={styles.sensorLabelMain}>เซนเซอร์ NPK</div>
                <div style={styles.sensorLabelSub}>ค่าปัจจุบัน ~ 23%</div>
              </div>
            </div>
            <div style={styles.sensorRight}>
              <strong>เซนเซอร์ NPK#3</strong>
              <br />
              ความลึก ~ 35cm
            </div>
          </div>

          <button style={styles.saveBtn}>SAVE</button>
        </section>
      </div>
    </div>
  );
}
