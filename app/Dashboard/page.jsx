"use client";

import { useEffect, useMemo, useState } from "react";
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

// ===== GLOBAL STYLES =====
const pageStyle = {
  fontFamily:
    '"Prompt", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  background: "#e5edf8",
  minHeight: "100vh",
  color: "#111827",
};

// ✅ wrapper กัน parent/layout ดันไปขวา + กันจอล้น
const outerWrap = {
  width: "100%",
  display: "flex",
  justifyContent: "center",
  overflowX: "hidden",
};

// ✅ container จริงของหน้า (อย่าใช้ padding ซ้ำหลายชั้นจาก layout)
const bodyStyle = {
  width: "100%",
  maxWidth: 1180,
  margin: "0 auto",
  boxSizing: "border-box",
  paddingTop: 0,
  paddingBottom: 30,
  paddingLeft: 16,
  paddingRight: 16,
};

const cardBase = {
  background: "#f9fafb",
  borderRadius: 24,
  paddingTop: 18,
  paddingRight: 20,
  paddingBottom: 18,
  paddingLeft: 20,
  boxShadow: "0 4px 10px rgba(15,23,42,0.12)",
  minWidth: 0,
  overflow: "hidden",
  boxSizing: "border-box",
};

// ===== PIN CARD STYLES =====
const pinCardBase = {
  borderRadius: 30,
  background: "#dfffee",
  paddingTop: 14,
  paddingRight: 14,
  paddingBottom: 16,
  paddingLeft: 14,
  boxShadow: "0 10px 24px rgba(15,23,42,0.12)",
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minWidth: 0,
  overflow: "hidden",
  boxSizing: "border-box",
};
const pinHeaderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 10,
  gap: 10,
  flexWrap: "wrap",
};
const pinTitleBlock = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 0,
};
const pinTitle = {
  fontSize: 18,
  fontWeight: 700,
};
const pinSubtitle = {
  fontSize: 11,
  color: "#6b7280",
};
const pinStatus = {
  fontSize: 18,
  fontWeight: 700,
  color: "#16a34a",
};
const pinInfoPill = {
  borderRadius: 999,
  background: "#ffffff",
  paddingTop: 6,
  paddingRight: 10,
  paddingBottom: 6,
  paddingLeft: 10,
  fontSize: 11,
  boxShadow: "0 1px 3px rgba(148,163,184,0.35)",
  minWidth: 0,
  overflow: "hidden",
};
const pinInfoLabel = {
  fontSize: 10,
  color: "#6b7280",
  marginBottom: 2,
};
const pinInfoValue = {
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const pinGroupContainer = {
  borderRadius: 22,
  background: "rgba(255,255,255,0.85)",
  paddingTop: 8,
  paddingRight: 10,
  paddingBottom: 10,
  paddingLeft: 10,
  marginBottom: 6,
};
const pinGroupLabel = {
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 4,
};
const pinGroupItem = {
  borderRadius: 999,
  background: "#f9fafb",
  paddingTop: 5,
  paddingRight: 8,
  paddingBottom: 5,
  paddingLeft: 8,
  fontSize: 11,
  boxShadow: "0 1px 2px rgba(148,163,184,0.35)",
  minWidth: 0,
  overflow: "hidden",
};
const pinSensorName = {
  fontWeight: 500,
  marginBottom: 1,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const pinSensorValue = {
  fontSize: 10,
  color: "#6b7280",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

// ===== DATA FUNCTIONS =====
function getPinSensorGroups(pin) {
  let moistureItems;
  if (pin === 3) {
    moistureItems = [
      {
        name: "เซนเซอร์ความชื้นดิน #1",
        value: "ความชื้นดิน - 38 % (เกินเกณฑ์)",
        isAlert: true,
      },
      {
        name: "เซนเซอร์ความชื้นดิน #2",
        value: "ความชื้นดิน - 42 %",
        isAlert: false,
      },
    ];
  } else {
    const moist1 = pin === 1 ? "32 %" : "35 %";
    const moist2 = pin === 1 ? "38 %" : "40 %";
    moistureItems = [
      {
        name: "เซนเซอร์ความชื้นดิน #1",
        value: `ความชื้นดิน - ${moist1}`,
        isAlert: false,
      },
      {
        name: "เซนเซอร์ความชื้นดิน #2",
        value: `ความชื้นดิน - ${moist2}`,
        isAlert: false,
      },
    ];
  }

  return [
    { group: "เซนเซอร์ความชื้นดิน", items: moistureItems },
    {
      group: "เซนเซอร์ อุณหภูมิ",
      items: [
        { name: "เซนเซอร์ อุณหภูมิ #1", value: "อุณหภูมิอากาศ - 31 °C" },
        { name: "เซนเซอร์ อุณหภูมิ #2", value: "อุณหภูมิอากาศ - 32 °C" },
        { name: "เซนเซอร์ อุณหภูมิ #3", value: "อุณหภูมิอากาศ - 33 °C" },
      ],
    },
    {
      group: "เซนเซอร์การให้น้ำ",
      items: [{ name: "เซนเซอร์การให้น้ำ #1", value: "การให้น้ำ 20 kPa" }],
    },
    {
      group: "เซนเซอร์ความชื้นสัมพัทธ์",
      items: [
        {
          name: "เซนเซอร์ความชื้นสัมพัทธ์ #1",
          value: "ความชื้นสัมพัทธ์ - 78 %",
        },
      ],
    },
    {
      group: "เซนเซอร์ NPK",
      items: [
        { name: "เซนเซอร์ NPK #1", value: "ค่าความนำไฟฟ้า - 35 mS/cm" },
        { name: "เซนเซอร์ NPK #2", value: "ค่าความนำไฟฟ้า - 35 mS/cm" },
      ],
    },
    {
      group: "เซนเซอร์ความเร็วลม",
      items: [
        { name: "เซนเซอร์ความเร็วลม #1", value: "ความเร็วลม - 38 m/s" },
        { name: "เซนเซอร์ความเร็วลม #2", value: "ความเร็วลม - 38 m/s" },
      ],
    },
    {
      group: "เซนเซอร์ความเข้มแสง",
      items: [
        {
          name: "เซนเซอร์ความเข้มแสง #1",
          value: "ความเข้มแสง - 38 μmol · m⁻² · s⁻¹",
        },
        {
          name: "เซนเซอร์ความเข้มแสง #2",
          value: "ความเข้มแสง - 38 μmol · m⁻² · s⁻¹",
        },
      ],
    },
  ];
}

// polygon + pin บนแผนที่
const fieldPolygon = [
  [13.35, 101.0],
  [13.35, 101.2],
  [13.25, 101.2],
  [13.25, 101.0],
];

const mapPins = [
  { id: 1, position: [13.32, 101.06], label: "Pin 1" },
  { id: 2, position: [13.31, 101.14], label: "Pin 2" },
  { id: 3, position: [13.29, 101.11], label: "Pin 3" },
];

export default function DashboardPage() {
  const [pinIcon, setPinIcon] = useState(null);
  const [isClient, setIsClient] = useState(false);

  const [vw, setVw] = useState(1280);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth || 1280);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isMobile = vw < 640;
  const isTablet = vw >= 640 && vw < 1024;

  const cardPad = isMobile ? 14 : isTablet ? 16 : 20;
  const cardRadius = isMobile ? 18 : 24;

  const cardBaseR = useMemo(() => {
    return {
      ...cardBase,
      borderRadius: cardRadius,
      paddingTop: cardPad,
      paddingRight: cardPad,
      paddingBottom: cardPad,
      paddingLeft: cardPad,
    };
  }, [cardPad, cardRadius]);

  const mapHeight = isMobile ? 220 : isTablet ? 260 : 260;

  const gridTop = useMemo(() => {
    if (isMobile) {
      return {
        display: "grid",
        gridTemplateColumns: "1fr",
        gridTemplateAreas: `"forecast" "mid" "right"`,
        gap: 12,
      };
    }
    if (isTablet) {
      return {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateAreas: `"forecast forecast" "mid right"`,
        gap: 14,
      };
    }
    return {
      display: "grid",
      gridTemplateColumns: "2fr 1.1fr 1.1fr",
      gridTemplateAreas: `"forecast mid right"`,
      gap: 16,
    };
  }, [isMobile, isTablet]);

  const gridMiddle = useMemo(() => {
    if (isMobile) {
      return {
        display: "grid",
        gridTemplateColumns: "1fr",
        gridTemplateAreas: `"map" "status" "issue"`,
        gap: 12,
      };
    }
    if (isTablet) {
      return {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateAreas: `"map map" "status issue"`,
        gap: 14,
      };
    }
    return {
      display: "grid",
      gridTemplateColumns: "2fr 1.1fr 1.1fr",
      gridTemplateAreas: `"map status issue"`,
      gap: 16,
    };
  }, [isMobile, isTablet]);

  const gridPins = useMemo(() => {
    if (isMobile) return { display: "grid", gridTemplateColumns: "1fr", gap: 12 };
    if (isTablet) return { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 };
    return {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: 16,
      alignItems: "stretch",
      gridAutoRows: "1fr",
    };
  }, [isMobile, isTablet]);

  const gridWeather = useMemo(() => {
  if (isMobile) {
    return {
      display: "grid",
      gridAutoFlow: "column",
      gridAutoColumns: "minmax(120px, 1fr)", // ✅ แต่ละการ์ดกว้างขึ้น ไม่ติดกัน
      gap: 10, // ✅ เพิ่มช่องว่าง
      overflowX: "auto",
      padding: "4px 10px 8px", // ✅ กันชิดขอบซ้ายขวา
      scrollSnapType: "x mandatory",
      WebkitOverflowScrolling: "touch",
    };
  }
  return {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: 10, // ✅ เพิ่มช่องว่าง desktop/tablet ด้วย
  };
}, [isMobile]);


  const pinPillRow = useMemo(() => {
    if (isMobile) {
      return {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 8,
        marginBottom: 12,
      };
    }
    return {
      display: "grid",
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      gap: 8,
      marginBottom: 12,
    };
  }, [isMobile]);

  const pinGroupGrid = useMemo(() => {
    if (isMobile) return { display: "grid", gridTemplateColumns: "1fr", gap: 6 };
    return { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 };
  }, [isMobile]);

  const title18 = { fontSize: isMobile ? 16 : 18, fontWeight: 700 };
  const bigTemp = { fontSize: isMobile ? 24 : 28, fontWeight: 800 };
  const bigNum = { fontSize: isMobile ? 22 : 24, fontWeight: 800 };

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (!isClient) return;
    let mounted = true;
    import("leaflet").then((L) => {
      if (!mounted) return;
      const icon = new L.Icon({
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });
      setPinIcon(icon);
    });
    return () => {
      mounted = false;
    };
  }, [isClient]);

  return (
    <div style={pageStyle}>
      {/* ✅ wrapper ใหม่ กันชิดขวา + กัน overflow */}
      <div style={outerWrap}>
        <main
          style={{
            ...bodyStyle,
            // ✅ มือถือให้ padding เท่ากันสองข้างแบบชัดเจน
            paddingLeft: isMobile ? 14 : 16,
            paddingRight: isMobile ? 14 : 16,
            paddingBottom: isMobile ? 22 : 30,
          }}
          className="du-dashboard"
        >
          {/* ===== แถวบน ===== */}
          <div style={{ ...gridTop, marginBottom: 16 }}>
            {/* พยากรณ์ 7 วัน */}
            <div style={{ ...cardBaseR, gridArea: "forecast" }} className="du-card">
              <div className="du-card-title" style={{ ...title18, marginBottom: 6 }}>
                พยากรณ์อากาศ 7 วันข้างหน้า
              </div>

              <div style={{ marginTop: 8, overflowX: isMobile ? "auto" : "visible" }}>
                <div style={gridWeather} className="du-grid-4">
                  {[
  { day: "จันทร์", temp: "32°", rain: "40%" },
  { day: "อังคาร", temp: "31°", rain: "60%" },
  { day: "พุธ", temp: "30°", rain: "80%" },
  { day: "พฤหัส", temp: "32°", rain: "20%" },
  { day: "ศุกร์", temp: "34°", rain: "10%" },
  { day: "เสาร์", temp: "31°", rain: "50%" },
  { day: "อาทิตย์", temp: "32°", rain: "30%" },
].map((d) => (
  <div
    key={d.day}
    style={{
      background: "#eef3ff",
      borderRadius: 18,
      padding: isMobile ? 10 : 8,       // ✅ เพิ่ม padding
      textAlign: "center",
      minWidth: 0,
      scrollSnapAlign: "start",          // ✅ snap ทีละใบ
      boxShadow: isMobile ? "0 2px 8px rgba(15,23,42,0.10)" : "none",
      border: "1px solid rgba(148,163,184,0.35)", // ✅ แยกการ์ดชัด ไม่ติดกัน
    }}
  >
    <div style={{ fontSize: 13, fontWeight: 700 }}>{d.day}</div>
    <div style={{ fontSize: 22, margin: "6px 0 2px" }}>🌤️</div>
    <div style={{ fontSize: isMobile ? 18 : 18, fontWeight: 800, lineHeight: 1.1 }}>
      {d.temp}
    </div>
    <div style={{ fontSize: 11, color: "#4b5563", marginTop: 4 }}>
      โอกาสฝนตก {d.rain}
    </div>
  </div>
))}

                </div>
              </div>
            </div>

            {/* คอลัมน์กลาง */}
            <div style={{ gridArea: "mid", display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
              <div style={{ ...cardBaseR, background: "#1d4ed8", color: "#ffffff" }} className="du-card">
                <div className="du-card-title" style={{ ...title18, marginBottom: 4 }}>
                  อุณหภูมิปัจจุบัน
                </div>
                <div style={{ ...bigTemp, marginBottom: 4, color: "#bfdbfe" }}>25 – 32 °C</div>
                <div style={{ fontSize: 13, color: "#e0e7ff", lineHeight: 1.5 }}>
                  เหมาะสมกับการเจริญเติบโตของทุเรียน
                </div>
              </div>

              <div style={{ ...cardBaseR, background: "#facc15", color: "#111827" }} className="du-card">
                <div className="du-card-title" style={{ ...title18, marginBottom: 4 }}>
                  โอกาสฝนตก
                </div>
                <div style={{ ...bigNum, marginBottom: 2 }}>40%</div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>ฝนตกเล็กน้อยช่วงบ่าย</div>
              </div>
            </div>

            {/* คอลัมน์ขวา */}
            <div style={{ gridArea: "right", display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
              <div className="du-card" style={{ ...cardBaseR, background: "#ef4444", color: "#ffffff" }}>
                <div className="du-card-title" style={{ ...title18, marginBottom: 8 }}>
                  คำแนะนำ
                </div>
                <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                  ควรเตรียมระบบระบายน้ำในแปลง เนื่องจากคาดว่าจะมีฝนตกหนักในอีก 2–3 วันข้างหน้า
                </p>
              </div>

              <div
                className="du-card"
                style={{
                  ...cardBaseR,
                  background: "linear-gradient(135deg,#16a34a 0%,#22c55e 50%,#4ade80 100%)",
                  color: "#f0fdf4",
                }}
              >
                <div className="du-card-title" style={{ ...title18, marginBottom: 4 }}>
                  ปริมาณน้ำฝน
                </div>
                <div style={{ ...bigNum, marginBottom: 2 }}>152 mm</div>
                <div style={{ fontSize: 12, opacity: 0.95, lineHeight: 1.5 }}>
                  เพียงพอต่อการสะสมในช่วง 7 วันล่าสุด
                </div>
              </div>
            </div>
          </div>

          {/* ===== แถวกลาง ===== */}
          <div style={{ ...gridMiddle, marginBottom: 16 }} className="du-grid-3">
            <div style={{ ...cardBaseR, gridArea: "map" }} className="du-card">
              <div className="du-card-title" style={{ ...title18, marginBottom: 8 }}>
                แผนที่และทรัพยากร
              </div>
              <div
                style={{
                  borderRadius: isMobile ? 18 : 22,
                  overflow: "hidden",
                  boxShadow: "0 8px 18px rgba(15,23,42,0.18)",
                }}
              >
                {isClient && (
                  <MapContainer
                    center={[13.3, 101.1]}
                    zoom={11}
                    scrollWheelZoom={true}
                    style={{ height: mapHeight, width: "100%" }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Polygon
                      positions={fieldPolygon}
                      pathOptions={{
                        color: "#16a34a",
                        weight: 2,
                        fillColor: "#86efac",
                        fillOpacity: 0.4,
                      }}
                    />
                    {pinIcon &&
                      mapPins.map((p) => (
                        <Marker key={p.id} position={p.position} icon={pinIcon}>
                          <Popup>{p.label}</Popup>
                        </Marker>
                      ))}
                  </MapContainer>
                )}
              </div>
            </div>

            <div style={{ ...cardBaseR, gridArea: "status", background: "#dcfce7" }} className="du-card">
              <div className="du-card-title" style={{ ...title18, marginBottom: 10 }}>
                สถานะการทำงานของอุปกรณ์
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: isMobile ? 28 : 32, fontWeight: 800, color: "#15803d" }}>3</span>
                <span style={{ fontSize: 14 }}>เครื่องกำลังทำงาน</span>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span
                  className="du-tag du-badge-success"
                  style={{
                    paddingTop: 4,
                    paddingRight: 10,
                    paddingBottom: 4,
                    paddingLeft: 10,
                    borderRadius: 999,
                    background: "#22c55e",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  ON 3 เครื่อง
                </span>
                <span
                  className="du-tag"
                  style={{
                    paddingTop: 4,
                    paddingRight: 10,
                    paddingBottom: 4,
                    paddingLeft: 10,
                    borderRadius: 999,
                    background: "#e5e7eb",
                    fontSize: 12,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  OFF 0 เครื่อง
                </span>
              </div>
            </div>

            <div style={{ ...cardBaseR, gridArea: "issue", background: "#fed7aa" }} className="du-card">
              <div className="du-card-title" style={{ ...title18, marginBottom: 8 }}>
                ปัญหาพื้นที่
              </div>
              <p style={{ fontSize: 13, marginBottom: 6, lineHeight: 1.55 }}>
                ตรวจพบความชื้นเกินเกณฑ์ที่ PIN 3
              </p>
              <span
                className="du-tag du-badge-danger"
                style={{
                  display: "inline-block",
                  paddingTop: 4,
                  paddingRight: 10,
                  paddingBottom: 4,
                  paddingLeft: 10,
                  borderRadius: 999,
                  background: "#f97316",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                ⚠️ ต้องตรวจสอบระบบให้น้ำ
              </span>
            </div>
          </div>

          {/* ===== แถวล่าง : Pin 1–3 ===== */}
          <div style={gridPins} className="du-grid-3">
            {[1, 2, 3].map((pin) => {
              const groups = getPinSensorGroups(pin);
              const backgroundColor = pin === 3 ? "#FFBABA" : "#dfffee";

              return (
                <div
                  key={pin}
                  style={{
                    ...pinCardBase,
                    background: backgroundColor,
                    borderRadius: isMobile ? 22 : 30,
                    paddingTop: isMobile ? 12 : 14,
                    paddingRight: isMobile ? 12 : 14,
                    paddingBottom: isMobile ? 12 : 16,
                    paddingLeft: isMobile ? 12 : 14,
                  }}
                >
                  <div style={pinHeaderRow}>
                    <div style={pinTitleBlock}>
                      <span style={{ ...pinTitle, fontSize: isMobile ? 16 : 18 }}>
                        ข้อมูล : Pin {pin}
                      </span>
                      <span style={pinSubtitle}>รายละเอียดแปลงและเซนเซอร์</span>
                    </div>
                    <span style={{ ...pinStatus, fontSize: isMobile ? 16 : 18 }}>ON</span>
                  </div>

                  <div style={pinPillRow}>
                    <div style={pinInfoPill}>
                      <div style={pinInfoLabel}>ผู้ดูแล</div>
                      <div style={pinInfoValue}>สมชาย ใจดี</div>
                    </div>
                    <div style={pinInfoPill}>
                      <div style={pinInfoLabel}>ประเภทพืช</div>
                      <div style={pinInfoValue}>ทุเรียน</div>
                    </div>
                    <div style={pinInfoPill}>
                      <div style={pinInfoLabel}>วันที่เริ่มปลูก</div>
                      <div style={pinInfoValue}>15/8/2568</div>
                    </div>
                    <div style={pinInfoPill}>
                      <div style={pinInfoLabel}>จำนวนเซนเซอร์</div>
                      <div style={pinInfoValue}>6 ชนิด</div>
                    </div>
                  </div>

                  <div style={{ flex: 1, overflow: "auto" }}>
                    {groups.map((g) => (
                      <div key={g.group} style={pinGroupContainer}>
                        <div style={pinGroupLabel}>{g.group}</div>

                        <div style={pinGroupGrid}>
                          {g.items.map((it) => {
                            const isAlert = !!it.isAlert;
                            const itemStyle = {
                              ...pinGroupItem,
                              background: isAlert ? "#fef9c3" : "#f9fafb",
                              boxShadow: isAlert ? "0 0 0 1px #facc15" : pinGroupItem.boxShadow,
                            };
                            const nameStyle = {
                              ...pinSensorName,
                              color: isAlert ? "#b91c1c" : "#111827",
                            };
                            const valueStyle = {
                              ...pinSensorValue,
                              color: isAlert ? "#b91c1c" : "#6b7280",
                              fontWeight: isAlert ? 600 : 400,
                            };
                            return (
                              <div key={it.name} style={itemStyle}>
                                <div style={nameStyle}>{it.name}</div>
                                <div style={valueStyle}>{it.value}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
