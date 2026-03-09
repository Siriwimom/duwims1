"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const LOGIN_PATH = "/login";
const TOKEN_KEYS = ["AUTH_TOKEN_V1", "token", "pmtool_token", "duwims_token"];
const LANG_KEY = "duwims_lang";

// =========================
// auth helpers
// =========================
function getToken() {
  if (typeof window === "undefined") return null;
  for (const key of TOKEN_KEYS) {
    const v = localStorage.getItem(key);
    if (v) return v;
  }
  return null;
}

function clearToken() {
  if (typeof window === "undefined") return;
  for (const key of TOKEN_KEYS) {
    localStorage.removeItem(key);
  }
}

// =========================
// i18n dictionary
// =========================
export const DUWIMS_DICT = {
  th: {
    dashboard: "แดชบอร์ด",
    history: "ประวัติ & วิเคราะห์",
    management: "จัดการ",
    login: "เข้าสู่ระบบ",
    logout: "ออกจากระบบ",
    langBtn: "TH / EN",

    weather7days: "พยากรณ์อากาศ 7 วันข้างหน้า",
    todayTemperature: "อุณหภูมิปัจจุบัน (วันนี้)",
    basedOnDailyForecast: "อิงจากพยากรณ์รายวันของพื้นที่แปลง",
    todayRainChance: "โอกาสฝนตก (วันนี้)",
    basedOnDailyPrecipitation: "อิงจาก precipitation probability (รายวัน)",
    advice: "คำแนะนำ",
    rain7days: "ปริมาณน้ำฝน (7 วัน)",
    sumFromDailyPrecipitation: "รวมจาก precipitation_sum รายวัน",
    mapAndResourcesAllPlots: "แผนที่และทรัพยากร (ทุกแปลง)",
    overallStatusAllPlots: "สถานะรวม (ทุกแปลง)",
    overallIssuesAllPlots: "ปัญหารวม (ทุกแปลง)",
    loadingForecast: "กำลังโหลดข้อมูลพยากรณ์อากาศ...",
    loadingAllPlots: "กำลังโหลดข้อมูลทุกแปลง...",
    loadingWeatherAdvice: "กำลังโหลดพยากรณ์อากาศ...",
    ready: "พร้อมใช้งาน",
    noIssueFound: "ยังไม่พบปัญหา (ทุกเซนเซอร์สถานะ OK)",
    loadFailed: "โหลดข้อมูลไม่สำเร็จ",
    noPinsInSystem: "ยังไม่มี Pin ในระบบ",
    sensorGroupPrefix: "เซนเซอร์",
    valuePrefix: "ค่า",
    noSensorData: "ยังไม่มีข้อมูลเซนเซอร์",
    plot: "แปลง",
    coordinates: "พิกัด",
    sensorTypes: "ชนิดเซนเซอร์",
    plots: "แปลง",
    plantType: "ประเภทพืช",
    plantedAt: "วันที่เริ่มปลูก",

    addPlantingPlots: "จัดการแปลงปลูก",
    addplantingplots: "จัดการแปลงปลูก",
    addSensor: "เพิ่ม Sensor",
    editAndDelete: "แก้ไข / ลบ",
    polygons: "การจัดการ Polygons",
    back: "ย้อนกลับ",
    addPlot: "+ เพิ่มแปลง",
    deletePlot: "ลบแปลง",
    selectPlot: "แปลง",
    viewMode: "โหมดดูข้อมูล: ต้องกด “ลบ / แก้ไข” ก่อน",
    editMode: "โหมดแก้ไข: สามารถวาด/แก้/ลบ polygon และจัดการข้อมูลได้",
    loading: "กำลังโหลด...",
    save: "บันทึก",
    done: "เสร็จสิ้น",
    plotInfo: "กรอกการจัดการข้อมูลแปลงปลูกพืช",
    caretaker: "ชื่อผู้ดูแล",
    notes: "เพิ่มข้อมูล (หัวข้อเรื่อง + เนื้อหา)",
    noItems: "ยังไม่มีรายการ",
    myLocation: "ตำแหน่งฉัน",
    drawOnMap: "Draw Polygons on a Map",
    delete: "ลบ",
    editDelete: "ลบ / แก้ไข",
    plotDropdownName: "ชื่อที่แสดงในรายการแปลง (Dropdown)",
    plotDetail: "ข้อมูลแปลงปลูก",
    polygonsOfPlot: "Polygons ของแปลง",
    deleteAll: "ลบทั้งหมด",
    noPolygon: "ยังไม่มี polygon — เปิด “ลบ / แก้ไข” แล้ววาดบนแผนที่",
    noteTopic: "หัวข้อเรื่อง",
    noteContent: "เนื้อหา",
    addInfo: "เพิ่มข้อมูล",
    noList: "ยังไม่มีรายการ",
    pleaseEditFirst: "ต้องกด “ลบ / แก้ไข” ก่อน",
    historyAnalytics: "ประวัติ & วิเคราะห์",
    sensorManagement: "จัดการ PIN และ Sensor",
    plotManagement: "จัดการแปลง",
    loadingMap: "กำลังโหลดแผนที่...",

    // History page
    historyFilters: "ฟิลเตอร์ข้อมูลย้อนหลัง",
    historyFiltersDesc: "เลือกช่วงวันที่ / เซนเซอร์ / แปลง เพื่อดูข้อมูลย้อนหลังและกราฟ",
    quickRange: "ช่วงเวลาเร็ว",
    today: "วันนี้",
    last7Days: "7 วันล่าสุด",
    last30Days: "30 วันล่าสุด",
    startDate: "วันที่เริ่มต้น",
    endDate: "วันที่สิ้นสุด",
    sensorType: "ประเภทเซนเซอร์",
    selectSensorType: "เลือกประเภทเซนเซอร์",
    multiSelectAllowed: "เลือกได้หลายตัว",
    clear: "ล้าง",
    selected: "เลือกแล้ว",
    plotsMulti: "แปลง (เลือกได้หลายแปลง)",
    allPlots: "ทุกแปลง",
    selectMultiplePlotsToCompare: "เลือกหลายแปลงเพื่อเทียบกราฟ",
    selectAll: "เลือกทั้งหมด",
    currentValueFirstSelectedPlot: "ค่าปัจจุบัน (แปลงแรกที่เลือก)",
    latestUpdate: "อัปเดตล่าสุด",
    averageAllSelectedPlots: "ค่าเฉลี่ย (รวมทุกแปลงที่เลือก)",
    minimumValue: "ค่าต่ำสุด",
    minimumOfAllSelectedPlots: "ต่ำสุดของทุกแปลงที่เลือก",
    maximumValue: "ค่าสูงสุด",
    maximumOfAllSelectedPlots: "สูงสุดของทุกแปลงที่เลือก",
    weatherHeatMapThailand: "Weather Heat Map (Thailand)",
    weatherHeatMapDesc: "ตัวอย่างแผนที่ประเทศไทย + จุดข้อมูล (rain intensity)",
    range: "ช่วง",
    to: "ถึง",
    legendRainIntensity: "Legend (Rain Intensity)",
    low: "น้อย",
    high: "มาก",
    samplePoints: "จุดข้อมูลตัวอย่าง",
    plotComparisonGraph: "กราฟเปรียบเทียบแปลง",
    plotComparisonLabel: "แปลง",
    graphCompareNote:
      "กราฟนี้เทียบ “แปลง” ด้วย sensor ตัวแรกที่เลือก (เพื่ออ่านง่าย) • แต่ CSV จะ export ทุก sensor ที่เลือก",
    measurementSummarySelectedRange: "สรุปการวัดข้อมูล (เฉลี่ยช่วงที่เลือก)",
    summaryApiNote:
      "แสดงค่าจริงจาก API (ช่วงวันที่ที่เลือก ถ้าไม่มี reading จะ fallback เป็นค่า avg/last จาก summary)",
    soilMoisture: "ความชื้นในดิน",
    temperature: "อุณหภูมิ",
    relativeHumidity: "ความชื้นสัมพัทธ์",
    lightIntensity: "ความเข้มแสง",
    rainAmount: "ปริมาณน้ำฝน",
    windSpeed: "ความเร็วลม",
    irrigation: "การให้น้ำ",
    intensity: "ความเข้ม",

    // Management page / AddSensor / EditAndDelete
    allSensors: "ทุกเซนเซอร์",
    allSensorTypes: "ทุกชนิดเซนเซอร์",
    points: "จุด",
    items: "รายการ",
    airTempHumidity: "อุณหภูมิและความชื้น",
    windMeasure: "วัดความเร็วลม",
    npkConcentration: "ความเข้มข้นธาตุอาหาร (N,P,K)",
    irrigationReady: "การให้น้ำ / ความพร้อมใช้น้ำ",
    auth401: "401: ยังไม่ได้ล็อกอิน หรือ token ไม่ถูกต้อง (กรุณา login ก่อน)",
    loadPlotFailed: "โหลดแปลงไม่สำเร็จ",
    loadDataFailed: "โหลดข้อมูลไม่สำเร็จ",
    selectNode: "เลือก Node",
    allNodes: "ทุก Node",
    airNode: "Node อากาศ",
    soilNode: "Node ดิน",
    pinAndSensorManagement: "จัดการ PIN และ Sensor",
    addPinAndSensor: "+ เพิ่ม PIN และ Sensor",
    plotInformation: "ข้อมูลแปลง",
    sensorLabel: "เซนเซอร์",
    sensorItemsLabel: "รายการเซนเซอร์",
    caretakerLabel: "ผู้ปลูก",
    pinSensorCountLabel: "จำนวน PIN / เซนเซอร์",
    latestLabel: "ล่าสุด",
    timeLabel: "เวลา",
    statusLabel: "สถานะ",
    noSensorInFilter: "ยังไม่มีข้อมูลเซนเซอร์ในเงื่อนไขที่เลือก",
    airShort: "อากาศ",
    soilShort: "ดิน",

    // EditAndDelete page
    editDeleteTitle: "ลบและแก้ไขข้อมูล",
    plotPolygons: "Polygon แปลง",
    sensorPins: "Pin เซนเซอร์",
    plotName: "ชื่อแปลง",
    deletePin: "ลบ PIN",
    editDeleteDescription: "ปรับแก้ Polygon และลบ / เพิ่มตำแหน่ง PIN ของแปลงนี้",
    loadingData: "กำลังโหลดข้อมูล...",
    numberLabel: "number",
    latitude: "ละติจูด",
    longitude: "ลองจิจูด",
    allPlotsLabel: "ทุกแปลง",
    noPinsSystem: "ยังไม่มี PIN ในระบบ",
  },

  en: {
    dashboard: "Dashboard",
    history: "History & Analytics",
    management: "Management",
    login: "Login",
    logout: "Logout",
    langBtn: "TH / EN",

    weather7days: "7-Day Weather Forecast",
    todayTemperature: "Current Temperature (Today)",
    basedOnDailyForecast: "Based on the plot area's daily forecast",
    todayRainChance: "Rain Chance (Today)",
    basedOnDailyPrecipitation: "Based on daily precipitation probability",
    advice: "Advice",
    rain7days: "Rainfall (7 Days)",
    sumFromDailyPrecipitation: "Sum from daily precipitation_sum",
    mapAndResourcesAllPlots: "Map and Resources (All Plots)",
    overallStatusAllPlots: "Overall Status (All Plots)",
    overallIssuesAllPlots: "Overall Issues (All Plots)",
    loadingForecast: "Loading weather forecast...",
    loadingAllPlots: "Loading all plot data...",
    loadingWeatherAdvice: "Loading weather forecast...",
    ready: "Ready",
    noIssueFound: "No issues found (all sensors are OK)",
    loadFailed: "Failed to load data",
    noPinsInSystem: "No pins in the system",
    sensorGroupPrefix: "Sensor",
    valuePrefix: "Value",
    noSensorData: "No sensor data yet",
    plot: "Plot",
    coordinates: "Coordinates",
    sensorTypes: "Sensor Types",
    plots: "Plots",
    plantType: "Plant Type",
    plantedAt: "Planting Date",

    addPlantingPlots: "Add Planting Plots",
    addplantingplots: "Add Planting Plots",
    addSensor: "Add Sensor",
    editAndDelete: "Edit / Delete",
    polygons: "Polygon Management",
    back: "Back",
    addPlot: "+ Add Plot",
    deletePlot: "Delete Plot",
    selectPlot: "Plot",
    viewMode: 'View mode: click "Edit / Delete" first',
    editMode: "Edit mode: you can draw, edit, delete polygons, and manage data",
    loading: "Loading...",
    save: "Save",
    done: "Done",
    plotInfo: "Planting Plot Management",
    caretaker: "Caretaker",
    notes: "Add Information (Topic + Content)",
    noItems: "No items yet",
    myLocation: "My Location",
    drawOnMap: "Draw Polygons on a Map",
    delete: "Delete",
    editDelete: "Edit / Delete",
    plotDropdownName: "Plot Name Shown in Dropdown",
    plotDetail: "Plot Information",
    polygonsOfPlot: "Plot Polygons",
    deleteAll: "Delete All",
    noPolygon: 'No polygon yet — turn on "Edit / Delete" and draw on the map',
    noteTopic: "Topic",
    noteContent: "Content",
    addInfo: "Add Information",
    noList: "No items yet",
    pleaseEditFirst: 'Please click "Edit / Delete" first',
    historyAnalytics: "History & Analytics",
    sensorManagement: "PIN & Sensor Management",
    plotManagement: "Plot Management",
    loadingMap: "Loading map...",

    // History page
    historyFilters: "History Filters",
    historyFiltersDesc:
      "Choose date range, sensors, and plots to view historical data and graphs",
    quickRange: "Quick Range",
    today: "Today",
    last7Days: "Last 7 Days",
    last30Days: "Last 30 Days",
    startDate: "Start Date",
    endDate: "End Date",
    sensorType: "Sensor Type",
    selectSensorType: "Select Sensor Type",
    multiSelectAllowed: "Multiple selection allowed",
    clear: "Clear",
    selected: "Selected",
    plotsMulti: "Plots (multiple selection)",
    allPlots: "All Plots",
    selectMultiplePlotsToCompare: "Select multiple plots to compare",
    selectAll: "Select All",
    currentValueFirstSelectedPlot: "Current Value (First Selected Plot)",
    latestUpdate: "Latest Update",
    averageAllSelectedPlots: "Average (All Selected Plots)",
    minimumValue: "Minimum Value",
    minimumOfAllSelectedPlots: "Minimum across selected plots",
    maximumValue: "Maximum Value",
    maximumOfAllSelectedPlots: "Maximum across selected plots",
    weatherHeatMapThailand: "Weather Heat Map (Thailand)",
    weatherHeatMapDesc: "Thailand map example with sample data points (rain intensity)",
    range: "Range",
    to: "to",
    legendRainIntensity: "Legend (Rain Intensity)",
    low: "Low",
    high: "High",
    samplePoints: "Sample Points",
    plotComparisonGraph: "Plot Comparison Graph",
    plotComparisonLabel: "Plots",
    graphCompareNote:
      "This graph compares plots using the first selected sensor for readability • CSV exports all selected sensors",
    measurementSummarySelectedRange: "Measurement Summary (Average in Selected Range)",
    summaryApiNote:
      "Shows real values from API. If there are no readings in the selected range, it falls back to avg/last from summary",
    soilMoisture: "Soil Moisture",
    temperature: "Temperature",
    relativeHumidity: "Relative Humidity",
    lightIntensity: "Light Intensity",
    rainAmount: "Rainfall",
    windSpeed: "Wind Speed",
    irrigation: "Irrigation",
    intensity: "Intensity",

    // Management page / AddSensor / EditAndDelete
    allSensors: "All Sensors",
    allSensorTypes: "All Sensor Types",
    points: "points",
    items: "items",
    airTempHumidity: "Temperature and Humidity",
    windMeasure: "Wind Speed",
    npkConcentration: "Nutrient Concentration (N,P,K)",
    irrigationReady: "Irrigation / Water Availability",
    auth401: "401: Not logged in or token is invalid (please login first)",
    loadPlotFailed: "Failed to load plots",
    loadDataFailed: "Failed to load data",
    selectNode: "Select Node",
    allNodes: "All Nodes",
    airNode: "Air Node",
    soilNode: "Soil Node",
    pinAndSensorManagement: "PIN & Sensor Management",
    addPinAndSensor: "+ Add PIN & Sensor",
    plotInformation: "Plot Information",
    sensorLabel: "Sensor",
    sensorItemsLabel: "Sensor Items",
    caretakerLabel: "Caretaker",
    pinSensorCountLabel: "PIN / Sensor Count",
    latestLabel: "Latest",
    timeLabel: "Time",
    statusLabel: "Status",
    noSensorInFilter: "No sensor data for the selected conditions",
    airShort: "Air",
    soilShort: "Soil",

    // EditAndDelete page
    editDeleteTitle: "Edit / Delete Data",
    plotPolygons: "Plot Polygons",
    sensorPins: "Sensor Pins",
    plotName: "Plot",
    deletePin: "Delete PIN",
    editDeleteDescription: "Adjust polygons and delete / add PIN positions for this plot",
    loadingData: "Loading data...",
    numberLabel: "number",
    latitude: "Latitude",
    longitude: "Longitude",
    allPlotsLabel: "All Plots",
    noPinsSystem: "No PIN in the system",
  },
};

// =========================
// i18n helpers
// =========================
export function getDuwimsLang() {
  if (typeof window === "undefined") return "th";
  return localStorage.getItem(LANG_KEY) === "en" ? "en" : "th";
}

export function setDuwimsLang(lang) {
  const next = lang === "en" ? "en" : "th";

  try {
    localStorage.setItem(LANG_KEY, next);
  } catch {}

  try {
    document.documentElement.lang = next;
    document.documentElement.setAttribute("data-duwims-lang", next);
  } catch {}

  try {
    window.dispatchEvent(new CustomEvent("duwims:lang", { detail: { lang: next } }));
  } catch {}

  return next;
}

export function translateDuwims(key, fallback, lang) {
  const current = lang === "en" ? "en" : "th";
  const table = DUWIMS_DICT[current] || DUWIMS_DICT.th;
  return table?.[key] ?? fallback ?? key;
}

export function useDuwimsT() {
  const [lang, setLang] = useState("th");

  useEffect(() => {
    const current = getDuwimsLang();
    setLang(current);
    setDuwimsLang(current);

    const onLang = (e) => {
      const next = e?.detail?.lang === "en" ? "en" : "th";
      setLang(next);
    };

    const onStorage = (e) => {
      if (e.key === LANG_KEY) {
        setLang(getDuwimsLang());
      }
    };

    window.addEventListener("duwims:lang", onLang);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("duwims:lang", onLang);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const t = useMemo(() => {
    return (key, fallback) => translateDuwims(key, fallback, lang);
  }, [lang]);

  return { lang, setLang, t };
}

// =========================
// TopBar component
// =========================
export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, t } = useDuwimsT();

  const activeTab =
    pathname === "/"
      ? "dashboard"
      : pathname.startsWith("/history")
      ? "history"
      : pathname.startsWith("/management")
      ? "management"
      : "";

  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authed, setAuthed] = useState(false);

  const menuRef = useRef(null);

  useEffect(() => {
    setAuthed(!!getToken());
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (TOKEN_KEYS.includes(e.key)) setAuthed(!!getToken());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1024);
      if (w >= 768) setMenuOpen(false);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const tabs = useMemo(
    () => [
      { key: "dashboard", href: "/", icon: "🏠", label: t("dashboard") },
      { key: "history", href: "/history", icon: "📚", label: t("history") },
      { key: "management", href: "/management", icon: "🛠", label: t("management") },
    ],
    [t]
  );

  const pillStyle = (active) => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: isTablet ? "8px 14px" : "8px 22px",
    borderRadius: 999,
    fontSize: 14,
    cursor: "pointer",
    background: active ? "#ffffff" : "transparent",
    color: active ? "#166534" : "rgba(255,255,255,0.9)",
    boxShadow: active ? "0 6px 14px rgba(0,0,0,0.18)" : "none",
    whiteSpace: "nowrap",
    userSelect: "none",
  });

  const actionBtnStyle = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "none",
    borderRadius: 999,
    padding: isTablet ? "8px 12px" : "8px 16px",
    fontSize: 13,
    cursor: "pointer",
    background: "rgba(255,255,255,0.16)",
    color: "#fff",
    whiteSpace: "nowrap",
    userSelect: "none",
  };

  const actionBtnSolidStyle = {
    ...actionBtnStyle,
    background: "#ffffff",
    color: "#166534",
    boxShadow: "0 6px 14px rgba(0,0,0,0.18)",
    fontWeight: 800,
  };

  const toggleLang = () => {
    const next = lang === "th" ? "en" : "th";
    setDuwimsLang(next);
  };

  const handleLogout = () => {
    clearToken();
    setAuthed(false);
    setMenuOpen(false);
    router.push(LOGIN_PATH);
  };

  return (
    <header
      style={{
        width: "100%",
        background: "#0b8f4a",
        color: "#ffffff",
        position: "sticky",
        top: 0,
        zIndex: 80,
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: isMobile ? "10px 14px" : "10px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              color: "#16a34a",
            }}
          >
            🌱
          </div>
          <span style={{ fontWeight: 700, fontSize: isMobile ? 18 : 20 }}>DuWIMS</span>
        </div>

        {!isMobile && (
          <>
            <nav
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: isTablet ? 10 : 16,
                alignItems: "center",
              }}
            >
              {tabs.map((tItem) => {
                const active = activeTab === tItem.key;
                return (
                  <Link key={tItem.key} href={tItem.href} style={{ textDecoration: "none" }}>
                    <div style={pillStyle(active)}>
                      <span style={{ fontSize: 16 }}>{tItem.icon}</span>
                      <span
                        style={{
                          maxWidth: isTablet ? 170 : "none",
                          overflow: isTablet ? "hidden" : "visible",
                          textOverflow: isTablet ? "ellipsis" : "clip",
                        }}
                      >
                        {tItem.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button type="button" onClick={toggleLang} style={actionBtnStyle} title="Change language">
                🌐 <span>{t("langBtn")}</span>
              </button>

              {authed ? (
                <button type="button" onClick={handleLogout} style={actionBtnSolidStyle} title="Logout">
                  🚪 <span>{t("logout")}</span>
                </button>
              ) : (
                <Link href={LOGIN_PATH} style={{ textDecoration: "none" }}>
                  <div style={actionBtnSolidStyle} title="Login">
                    🔐 <span>{t("login")}</span>
                  </div>
                </Link>
              )}
            </div>
          </>
        )}

        {isMobile && (
          <div style={{ marginLeft: "auto", position: "relative" }} ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                border: "none",
                background: "rgba(255,255,255,0.16)",
                color: "#fff",
                borderRadius: 12,
                padding: "8px 10px",
                cursor: "pointer",
              }}
            >
              {menuOpen ? "✖" : "☰"}
            </button>

            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 10px)",
                  width: 270,
                  background: "#ffffff",
                  borderRadius: 16,
                  boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
                  padding: 10,
                }}
              >
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <button
                    type="button"
                    onClick={toggleLang}
                    style={{
                      flex: 1,
                      border: "1px solid rgba(15,23,42,0.12)",
                      background: "#f8fafc",
                      borderRadius: 12,
                      padding: "10px 12px",
                      cursor: "pointer",
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    🌐 {t("langBtn")}
                  </button>

                  {authed ? (
                    <button
                      type="button"
                      onClick={handleLogout}
                      style={{
                        flex: 1,
                        border: "none",
                        background: "#0f172a",
                        color: "#fff",
                        borderRadius: 12,
                        padding: "10px 12px",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                    >
                      🚪 {t("logout")}
                    </button>
                  ) : (
                    <Link href={LOGIN_PATH} style={{ flex: 1, textDecoration: "none" }}>
                      <div
                        style={{
                          textAlign: "center",
                          border: "none",
                          background: "#0f172a",
                          color: "#fff",
                          borderRadius: 12,
                          padding: "10px 12px",
                          cursor: "pointer",
                          fontWeight: 900,
                        }}
                      >
                        🔐 {t("login")}
                      </div>
                    </Link>
                  )}
                </div>

                {tabs.map((tItem) => {
                  const active = activeTab === tItem.key;
                  return (
                    <Link key={tItem.key} href={tItem.href} style={{ textDecoration: "none" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: 12,
                          background: active ? "#eef2ff" : "#fff",
                          color: "#0f172a",
                          fontWeight: active ? 900 : 700,
                        }}
                      >
                        <span>{tItem.icon}</span>
                        <span>{tItem.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}