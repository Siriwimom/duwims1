"use client";

import "leaflet/dist/leaflet.css";

import React, { useEffect, useMemo, useState } from "react";
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
  overflowX: "hidden",
};

const bodyStyle = {
  width: "100%",
  maxWidth: 1180,
  margin: "0 auto",
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
  mapLoading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    color: "#64748b",
    background: "#f8fafc",
  },

  bottomPanel: {
    marginTop: 22,
    borderRadius: 26,
    background: "#dffff3",
    padding: "18px 22px 22px",
    boxShadow: "0 12px 32px rgba(15,23,42,0.14)",
  },
  bottomHeaderWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 2,
  },
  bottomHeader: {
    fontSize: 14,
    fontWeight: 600,
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

  chipBtn: {
    border: "none",
    borderRadius: 999,
    padding: "6px 12px",
    fontSize: 12,
    cursor: "pointer",
    background: "#111827",
    color: "#fff",
    boxShadow: "0 4px 10px rgba(15,23,42,0.18)",
    whiteSpace: "nowrap",
  },
};

const sensors = ["เซนเซอร์ #1", "เซนเซอร์ #2", "เซนเซอร์ #3", "เซนเซอร์ #4", "เซนเซอร์ #5", "เซนเซอร์ #6"];

export default function ManagementPage() {
  const [pinIcon, setPinIcon] = useState(null);

  // ✅ กัน error ใน dev/StrictMode: render map หลัง client ready เท่านั้น
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // ✅ breakpoint
  const [vw, setVw] = useState(1280);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setVw(window.innerWidth || 1280);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isMobile = vw < 640;

  const [mapH, setMapH] = useState(280);
  useEffect(() => {
    if (typeof window === "undefined") return;
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

  // ✅ Leaflet icon
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

  const plots = useMemo(
    () => [
      {
        value: "A",
        label: "แปลง A – ทุเรียนล่าง",
        meta: {
          farmer: "สมหมาย ใจดี",
          plant: "ทุเรียนหมอนทอง",
          plantedAt: "15/06/2568",
          sensorCount: "6 เครื่อง",
        },
      },
      {
        value: "B",
        label: "แปลง B – ทุเรียนบน",
        meta: {
          farmer: "คุณสมชาย สวนทุเรียน",
          plant: "ทุเรียนหมอนทอง",
          plantedAt: "11/02/2568",
          sensorCount: "6 เครื่อง",
        },
      },
      {
        value: "C",
        label: "แปลง C",
        meta: {
          farmer: "-",
          plant: "-",
          plantedAt: "-",
          sensorCount: "0 เครื่อง",
        },
      },
    ],
    []
  );

  // ✅ ลบ “เลือก Node” ออกทั้งชุด -> ไม่ต้องมี selectedNode แล้ว
  const [selectedPlot, setSelectedPlot] = useState("A");
  const [nodeCategory, setNodeCategory] = useState("air"); // air | soil
  const [selectedSensorType, setSelectedSensorType] = useState("rh"); // default ความชื้นสัมพัทธ์
  const [fetchMode, setFetchMode] = useState("pin");

  const sensorOptions = useMemo(() => {
    if (nodeCategory === "air") {
      return [
        { value: "temp_rh", label: "อุณหภูมิและความชื้น" },
        { value: "wind", label: "วัดความเร็วลม" },
        { value: "ppfd", label: "ความเข้มแสง" },
        { value: "rain", label: "ปริมาณน้ำฝน" },
        { value: "npk", label: "ความเข้้มข้นธาตุอาหาร (N,P,K)" },
        { value: "rh", label: "ความชื้นสัมพัทธ์" }, // เผื่ออยากเก็บไว้ในอากาศด้วย
      ];
    }
    return [
      { value: "irrigation", label: "การให้น้ำ / ความพร้อมใช้น้ำ" },
      { value: "soil_moisture", label: "ความชื้ื้นในดิน" },
      { value: "uplink", label: "อ่านค่า sensor ส่งข้อมูล" },
    ];
  }, [nodeCategory]);

  useEffect(() => {
    const ok = sensorOptions.some((x) => x.value === selectedSensorType);
    if (!ok) setSelectedSensorType(sensorOptions[0]?.value ?? "");
  }, [sensorOptions, selectedSensorType]);

  const selectedPlotObj = useMemo(
    () => plots.find((p) => p.value === selectedPlot) || plots[0],
    [plots, selectedPlot]
  );

  const mapKey = `${selectedPlot}-${nodeCategory}-${selectedSensorType}-${fetchMode}`;

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

  const sensorSubText = useMemo(() => {
    switch (selectedSensorType) {
      case "temp_rh":
        return "อุณหภูมิ: 29°C • ความชื้น: 65%";
      case "wind":
        return "ความเร็วลม: 2.4 m/s";
      case "ppfd":
        return "ความเข้มแสง: 820 µmol/m²/s";
      case "rain":
        return "ปริมาณน้ำฝน: 0.0 mm";
      case "npk":
        return "N: 12 • P: 8 • K: 10";
      case "rh":
        return "ความชื้นสัมพัทธ์: 65%";
      case "irrigation":
        return "การให้น้ำ: ทำงาน";
      case "soil_moisture":
        return "ความชื้นในดิน: 32%";
      case "uplink":
        return "สถานะ: ส่งข้อมูลล่าสุด 2 นาทีที่แล้ว";
      default:
        return "-";
    }
  }, [selectedSensorType]);

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

          {/* ✅ ลบ “เลือก Node” ออกทั้งก้อนแล้ว */}
          <div style={styles.topGrid}>
            <div style={styles.dropdownCard}>
              <label style={styles.fieldLabel}>แปลง</label>
              <select
                value={selectedPlot}
                onChange={(e) => setSelectedPlot(e.target.value)}
                style={styles.fieldSelect}
              >
                {plots.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.dropdownCard}>
              <label style={styles.fieldLabel}>Node ประเภท</label>
              <select
                value={nodeCategory}
                onChange={(e) => setNodeCategory(e.target.value)}
                style={styles.fieldSelect}
              >
                <option value="air">Node อากาศ</option>
                <option value="soil">Node ดิน</option>
              </select>
            </div>

            <div style={styles.dropdownCard}>
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

            <div style={styles.dropdownCard}>
              <label style={styles.fieldLabel}>ดึงข้อมูล</label>
              <select
                value={fetchMode}
                onChange={(e) => setFetchMode(e.target.value)}
                style={styles.fieldSelect}
              >
                <option value="pin">จากตำแหน่ง PIN เซนเซอร์</option>
                <option value="polygon">จาก Polygon แปลง</option>
              </select>
            </div>
          </div>

          <div style={styles.mapTitle}>แผนที่และทรัพยากร</div>

          <div style={styles.mapWrapper}>
            {!hydrated ? (
              <div style={{ ...styles.mapLoading, height: mapH }}>Loading map...</div>
            ) : (
              <MapContainer
                key={`map-${mapKey}`}
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
            )}
          </div>
        </section>

        <section style={styles.bottomPanel}>
          <div style={styles.bottomHeaderWrap}>
            <div style={styles.bottomHeader}>
              ข้อมูลแปลง: {selectedPlotObj?.label || `แปลง ${selectedPlot}`}
            </div>
            <button style={styles.chipBtn} type="button">
              ประเภท Node: {nodeCategory === "air" ? "อากาศ" : "ดิน"}
            </button>
          </div>

          <div style={styles.bottomSub}>
            โหมด:{" "}
            {fetchMode === "pin"
              ? "จากตำแหน่ง PIN เซนเซอร์"
              : "จาก Polygon แปลง"}{" "}
            • เซนเซอร์:{" "}
            {sensorOptions.find((x) => x.value === selectedSensorType)?.label || "-"}
          </div>

          <div style={styles.infoGrid}>
            <div>
              <div style={styles.infoLabel}>ผู้ปลูก</div>
              <div style={styles.infoBox}>{selectedPlotObj.meta.farmer}</div>
            </div>
            <div>
              <div style={styles.infoLabel}>ประเภทพืช</div>
              <div style={styles.infoBox}>{selectedPlotObj.meta.plant}</div>
            </div>
            <div>
              <div style={styles.infoLabel}>วันที่เริ่มปลูก</div>
              <div style={styles.infoBox}>{selectedPlotObj.meta.plantedAt}</div>
            </div>
            <div>
              <div style={styles.infoLabel}>จำนวนเซนเซอร์</div>
              <div style={styles.infoBox}>{selectedPlotObj.meta.sensorCount}</div>
            </div>
          </div>

          <div style={styles.sensorList}>
            {sensors.map((s, i) => (
              <div key={i} style={styles.sensorItem}>
                <div style={styles.sensorIconCircle}>📍</div>
                <div>
                  <div style={styles.sensorTextMain}>{s}</div>
                  <div style={styles.sensorTextSub}>{sensorSubText}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
