"use client";

import { useDuwimsT } from "@/app/TopBar";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";

// ============================
// ✅ Load react-leaflet in ONE bundle
// ============================
const LeafletBundle = dynamic(
  async () => {
    const RL = await import("react-leaflet");
    return function LeafletMapBundle(props) {
      const {
        center,
        height,
        allMapPoints,
        polygonsAll,
        mapPinsForMap,
        pinIcon,
        onMapCreated,
      } = props;

      const { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } = RL;

      function FitToAllInner({ points = [] }) {
        const map = useMap();

        useEffect(() => {
          let cancelled = false;

          (async () => {
            try {
              const L = await import("leaflet");
              if (cancelled || !map) return;

              const valid = (points || [])
                .map((p) => [Number(p?.[0]), Number(p?.[1])])
                .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));

              if (!valid.length) return;

              const bounds = L.latLngBounds(
                valid.map((p) => L.latLng(p[0], p[1]))
              );
              map.fitBounds(bounds.pad(0.12), { animate: false });
            } catch {
              // ignore
            }
          })();

          return () => {
            cancelled = true;
          };
        }, [map, points]);

        return null;
      }

      return (
        <MapContainer
          center={center}
          zoom={12}
          scrollWheelZoom={true}
          attributionControl={false}
          style={{ height, width: "100%" }}
          whenCreated={onMapCreated}
        >
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <FitToAllInner points={allMapPoints} />

          {(polygonsAll || []).map((poly) => (
            <Polygon
              key={poly.id}
              positions={poly.coords}
              pathOptions={{
                color: poly.color || "#16a34a",
                weight: 2,
                fillColor: "#86efac",
                fillOpacity: 0.4,
              }}
            />
          ))}

          {pinIcon &&
            (mapPinsForMap || []).map((p) => (
              <Marker key={p.id} position={p.position} icon={pinIcon}>
                <Popup>{p.label}</Popup>
              </Marker>
            ))}
        </MapContainer>
      );
    };
  },
  { ssr: false }
);

// ============================
// ✅ API CONFIG
// ============================
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

// ============================
// ===== GLOBAL STYLES =====
// ============================
const pageStyle = {
  fontFamily:
    '"Prompt", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  background: "#e5edf8",
  minHeight: "100vh",
  color: "#111827",
};

const outerWrap = {
  width: "100%",
  display: "flex",
  justifyContent: "center",
  overflowX: "hidden",
  minHeight: "100vh",
};

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
  borderRadius: 18,
  paddingTop: 18,
  paddingRight: 20,
  paddingBottom: 18,
  paddingLeft: 20,
  boxShadow: "0 4px 10px rgba(15,23,42,0.12)",
  minWidth: 0,
  overflow: "hidden",
  boxSizing: "border-box",
};

const pinCardBase = {
  borderRadius: 20,
  background: "#dfffee",
  paddingTop: 12,
  paddingRight: 12,
  paddingBottom: 12,
  paddingLeft: 12,
  boxShadow: "0 10px 24px rgba(15,23,42,0.12)",
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minWidth: 0,
  overflow: "hidden",
  boxSizing: "border-box",
  border: "1px solid rgba(148,163,184,0.25)",
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
  gap: 3,
  minWidth: 0,
  flex: 1,
};

const pinTitle = {
  fontSize: 16,
  fontWeight: 500,
  lineHeight: 1.35,
  wordBreak: "normal",
  overflowWrap: "break-word",
  whiteSpace: "normal",
};

const pinSubtitle = {
  fontSize: 12,
  color: "#4b5563",
  lineHeight: 1.4,
  wordBreak: "normal",
  overflowWrap: "break-word",
  whiteSpace: "normal",
};

const pinStatus = {
  fontSize: 13,
  fontWeight: 600,
  color: "#ffffff",
  background: "#16a34a",
  padding: "5px 11px",
  borderRadius: 10,
  minWidth: 54,
  textAlign: "center",
};

const pinInfoPill = {
  borderRadius: 10,
  background: "#ffffff",
  paddingTop: 7,
  paddingRight: 10,
  paddingBottom: 7,
  paddingLeft: 10,
  fontSize: 12,
  boxShadow: "0 1px 3px rgba(148,163,184,0.20)",
  minWidth: 0,
  overflow: "hidden",
  border: "1px solid #e5e7eb",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  minHeight: 0,
};

const pinInfoLabel = {
  fontSize: 11,
  color: "#6b7280",
  marginBottom: 2,
  fontWeight: 400,
  lineHeight: 1.3,
  whiteSpace: "normal",
  wordBreak: "normal",
};

const pinInfoValue = {
  fontSize: 12,
  fontWeight: 400,
  whiteSpace: "normal",
  wordBreak: "normal",
  overflowWrap: "break-word",
  lineHeight: 1.35,
};

const pinGroupContainer = {
  borderRadius: 12,
  background: "rgba(255,255,255,0.92)",
  paddingTop: 9,
  paddingRight: 10,
  paddingBottom: 10,
  paddingLeft: 10,
  marginBottom: 8,
  border: "1px solid #e5e7eb",
};

const pinGroupLabel = {
  fontSize: 12,
  fontWeight: 500,
  marginBottom: 7,
};

const pinGroupItem = {
  borderRadius: 10,
  background: "#f9fafb",
  paddingTop: 7,
  paddingRight: 9,
  paddingBottom: 7,
  paddingLeft: 9,
  fontSize: 12,
  boxShadow: "0 1px 2px rgba(148,163,184,0.18)",
  minWidth: 0,
  overflow: "hidden",
  border: "1px solid #e5e7eb",
};

const pinSensorName = {
  fontWeight: 500,
  marginBottom: 3,
  whiteSpace: "normal",
  wordBreak: "normal",
  overflowWrap: "break-word",
  lineHeight: 1.4,
  fontSize: 12,
};

const pinSensorValue = {
  fontSize: 12,
  color: "#6b7280",
  whiteSpace: "normal",
  wordBreak: "normal",
  overflowWrap: "break-word",
  lineHeight: 1.45,
};

// ============================
// ✅ Helpers
// ============================
function safeNum(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function formatThaiDate(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear() + 543;
  return `${dd}/${mm}/${yyyy}`;
}

function formatDateByLang(d, lang = "th") {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  if (lang === "en") return dt.toLocaleDateString("en-GB");
  return formatThaiDate(d);
}

function prettyTs(ts, lang = "th") {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);

  if (lang === "en") {
    return d.toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear() + 543;
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function getStoredToken() {
  try {
    return (
      localStorage.getItem("AUTH_TOKEN_V1") ||
      localStorage.getItem("token") ||
      localStorage.getItem("pmtool_token") ||
      localStorage.getItem("duwims_token") ||
      ""
    );
  } catch {
    return "";
  }
}

function firstNonEmpty(...values) {
  for (const v of values) {
    if (v === 0) return 0;
    if (v === false) return false;
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}

function pickPlotName(obj = {}) {
  return firstNonEmpty(
    obj.plotName,
    obj.name,
    obj.alias,
    obj.dropdownName,
    obj.displayName,
    obj.plotLabel,
    obj.label
  );
}

function pickPlantType(obj = {}) {
  return firstNonEmpty(
    obj.plantType,
    obj.cropType,
    obj.plant_name,
    obj.crop_name,
    obj.type,
    obj.crop
  );
}

function pickPlantedAt(obj = {}) {
  return firstNonEmpty(
    obj.plantedAt,
    obj.startDate,
    obj.startedAt,
    obj.plantDate,
    obj.datePlanted,
    obj.createdAt
  );
}

function pickCaretaker(obj = {}) {
  return firstNonEmpty(
    obj.caretakerName,
    obj.caretaker,
    obj.ownerName,
    obj.managerName,
    obj.nickname,
    obj.userNickname,
    obj.createdByName,
    obj.createdByNickname
  );
}

function pickNodeId(obj = {}) {
  return firstNonEmpty(obj.nodeId, obj.node, obj.nodeName, obj.nodeLabel);
}

function mergePlotMeta(plot = {}, pin = {}) {
  return {
    id: String(firstNonEmpty(plot.id, plot._id, pin.plotId, pin.plot_id, "")),
    plotName: pickPlotName(plot) || pickPlotName(pin) || "",
    plantType: pickPlantType(plot) || pickPlantType(pin) || "",
    plantedAt: pickPlantedAt(plot) || pickPlantedAt(pin) || "",
    caretakerName: pickCaretaker(plot) || pickCaretaker(pin) || "",
    nodeId: pickNodeId(pin) || pickNodeId(plot) || "",
    rawPlot: plot,
    rawPin: pin,
  };
}

function normalizeText(v) {
  return String(v || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[_-]+/g, " ");
}

function extractLastReadingValue(sensor = {}) {
  const candidates = [
    sensor?.lastReading?.value,
    sensor?.lastValue,
    sensor?.value,
    sensor?.reading,
    sensor?.currentValue,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function extractSensorUnit(sensor = {}, sensorTypeMeta = {}) {
  return firstNonEmpty(
    sensor?.lastReading?.unit,
    sensor?.unit,
    sensorTypeMeta?.unit,
    ""
  );
}

// ============================
// ✅ Backend-aligned group definitions
// ============================
const SENSOR_TYPE_INFO = {
  soil_moisture: {
    key: "soil_moisture",
    label: "soil_moisture",
    unit: "%",
    labelTh: "เซนเซอร์ ความชื้นในดิน",
    labelEn: "Sensor Soil Moisture",
  },
  temp_rh: {
    key: "temp_rh",
    label: "temp_rh",
    unit: "",
    labelTh: "เซนเซอร์ อุณหภูมิและความชื้น",
    labelEn: "Sensor Temperature & Humidity",
  },
  wind: {
    key: "wind",
    label: "wind",
    unit: "",
    labelTh: "เซนเซอร์ ความเร็วลม",
    labelEn: "Sensor Wind Speed",
  },
  ppfd: {
    key: "ppfd",
    label: "ppfd",
    unit: "Lux",
    labelTh: "เซนเซอร์ ความเข้มแสง",
    labelEn: "Sensor Light Intensity",
  },
  rain: {
    key: "rain",
    label: "rain",
    unit: "mm",
    labelTh: "เซนเซอร์ ปริมาณน้ำฝน",
    labelEn: "Sensor Rainfall",
  },
  npk: {
    key: "npk",
    label: "npk",
    unit: "mg/kg",
    labelTh: "เซนเซอร์ NPK",
    labelEn: "Sensor NPK",
  },
  irrigation: {
    key: "irrigation",
    label: "irrigation",
    unit: "",
    labelTh: "เซนเซอร์ การให้น้ำ / ความพร้อมใช้น้ำ",
    labelEn: "Sensor Irrigation / Available Water",
  },
};

const GROUP_ORDER = [
  "soil_moisture",
  "temp_rh",
  "wind",
  "ppfd",
  "rain",
  "npk",
  "irrigation",
];

function getDefaultSensorTypes() {
  return GROUP_ORDER.map((key) => SENSOR_TYPE_INFO[key]).filter(Boolean);
}

function getGroupLabel(sensorType, lang = "th") {
  const info = SENSOR_TYPE_INFO[sensorType];
  if (!info) return sensorType || "-";
  return lang === "en" ? info.labelEn : info.labelTh;
}

// ============================
// ✅ Thresholds aligned to backend payload
// ============================
function detectBackendMetric(sensor = {}) {
  const sensorType = String(sensor?.sensorType || "").trim();
  const name = normalizeText(sensor?.name);
  const unit = normalizeText(sensor?.unit);

  if (sensorType === "temp_rh") {
    if (
      name.includes("temp") ||
      name.includes("temperature") ||
      name.includes("อุณหภูมิ")
    ) {
      return "temperature";
    }
    if (
      name.includes("humidity") ||
      name.includes("rh") ||
      name.includes("ความชื้น")
    ) {
      return "humidity";
    }
    return "temp_rh_unknown";
  }

  if (sensorType === "npk") {
    if (
      name === "n" ||
      name.includes("ไนโตรเจน") ||
      name.includes("nitrogen")
    )
      return "nitrogen";
    if (
      name === "p" ||
      name.includes("ฟอสฟอรัส") ||
      name.includes("phosphorus") ||
      name.includes("phosphate")
    )
      return "phosphorus";
    if (
      name === "k" ||
      name.includes("โพแทสเซียม") ||
      name.includes("potassium")
    )
      return "potassium";
    return "npk_unknown";
  }

  if (sensorType === "irrigation") {
    if (
      name.includes("available water") ||
      name.includes("awc") ||
      name.includes("ความพร้อมใช้น้ำ")
    ) {
      return "availableWater";
    }
    if (
      name.includes("irrigation") ||
      name.includes("watering") ||
      name.includes("การให้น้ำ")
    ) {
      return "irrigation";
    }
    return "irrigation_unknown";
  }

  if (sensorType === "wind") return unit.includes("m/s") ? "wind_mps" : "wind";
  if (sensorType === "ppfd") return "lightIntensity";

  if (sensorType === "rain") {
    if (
      name.includes("month") ||
      name.includes("monthly") ||
      name.includes("เดือน")
    ) {
      return "rainfall_monthly";
    }
    return "rainfall_unknown";
  }

  if (sensorType === "soil_moisture") {
    if (
      unit.includes("kpa") ||
      name.includes("tension") ||
      name.includes("tensiometer")
    ) {
      return "soilTension";
    }
    return "soilMoisturePercent";
  }

  return null;
}

const METRIC_RULES = {
  temperature: {
    min: 15,
    max: 40,
    unit: "°C",
    labelTh: "อุณหภูมิ",
    labelEn: "Temperature",
  },
  humidity: {
    min: 40,
    max: 90,
    unit: "%",
    labelTh: "ความชื้น",
    labelEn: "Humidity",
  },
  wind_mps: {
    max: 20 / 3.6,
    unit: "m/s",
    labelTh: "ความเร็วลม",
    labelEn: "Wind Speed",
  },
  wind: {
    max: 20,
    unit: "กม./ชม.",
    labelTh: "ความเร็วลม",
    labelEn: "Wind Speed",
  },
  lightIntensity: {
    min: 10000,
    max: 80000,
    idealMin: 40000,
    idealMax: 60000,
    unit: "Lux",
    labelTh: "ความเข้มแสง",
    labelEn: "Light Intensity",
  },
  rainfall_monthly: {
    idealMin: 100,
    idealMax: 200,
    max: 300,
    unit: "mm/month",
    labelTh: "ปริมาณน้ำฝน",
    labelEn: "Rainfall",
  },
  soilTension: {
    min: -70,
    max: -10,
    unit: "kPa",
    labelTh: "ความชื้นในดิน",
    labelEn: "Soil Moisture",
  },
  irrigation: {
    min: 50,
    max: 200,
    unit: "L/day",
    labelTh: "การให้น้ำ",
    labelEn: "Irrigation",
  },
  availableWater: {
    min: 60,
    max: 80,
    unit: "%",
    labelTh: "ความพร้อมใช้น้ำ",
    labelEn: "Available Water",
  },
  nitrogen: {
    min: 30,
    max: 200,
    idealMin: 50,
    idealMax: 100,
    unit: "mg/kg",
    labelTh: "N",
    labelEn: "N",
  },
  phosphorus: {
    min: 15,
    max: 100,
    idealMin: 25,
    idealMax: 50,
    unit: "mg/kg",
    labelTh: "P",
    labelEn: "P",
  },
  potassium: {
    min: 80,
    max: 300,
    idealMin: 100,
    idealMax: 200,
    unit: "mg/kg",
    labelTh: "K",
    labelEn: "K",
  },
};

function getMetricLabel(metric, lang = "th", fallback = "-") {
  const rule = METRIC_RULES[metric];
  if (!rule) return fallback;
  return lang === "en" ? rule.labelEn : rule.labelTh;
}

function formatThresholdHint(rule, lang = "th") {
  if (!rule) return "";

  const unit = rule.unit ? ` ${rule.unit}` : "";
  const hasMin = rule.min !== undefined;
  const hasMax = rule.max !== undefined;
  const hasIdeal =
    rule.idealMin !== undefined && rule.idealMax !== undefined;

  if (lang === "en") {
    const parts = [];
    if (hasIdeal)
      parts.push(`Normal ${rule.idealMin} - ${rule.idealMax}${unit}`);
    if (hasMin) parts.push(`Min ${rule.min}${unit}`);
    if (hasMax) parts.push(`Max ${rule.max}${unit}`);
    return parts.join(" • ");
  }

  const parts = [];
  if (hasIdeal) parts.push(`ช่วงปกติ ${rule.idealMin} - ${rule.idealMax}${unit}`);
  if (hasMin) parts.push(`ห้ามต่ำกว่า ${rule.min}${unit}`);
  if (hasMax) parts.push(`ห้ามสูงกว่า ${rule.max}${unit}`);
  return parts.join(" • ");
}

function evaluateSensorThreshold(sensor = {}, sensorTypeMeta = {}, lang = "th") {
  const metric = detectBackendMetric(sensor);
  const value = extractLastReadingValue(sensor);
  const actualUnit = extractSensorUnit(sensor, sensorTypeMeta);
  const rule = METRIC_RULES[metric] || null;

  if (!metric || !rule || !Number.isFinite(value)) {
    return {
      metric,
      abnormal: false,
      reason: "",
      value,
      unit: actualUnit,
      rule,
    };
  }

  let abnormal = false;
  let reason = "";

  if (rule.min !== undefined && value < rule.min) {
    abnormal = true;
    reason =
      lang === "en"
        ? `Too low (< ${rule.min} ${rule.unit || actualUnit || ""})`
        : `ต่ำเกิน (< ${rule.min} ${rule.unit || actualUnit || ""})`;
  }

  if (rule.max !== undefined && value > rule.max) {
    abnormal = true;
    reason =
      lang === "en"
        ? `Too high (> ${rule.max} ${rule.unit || actualUnit || ""})`
        : `สูงเกิน (> ${rule.max} ${rule.unit || actualUnit || ""})`;
  }

  return {
    metric,
    abnormal,
    reason: reason.trim(),
    value,
    unit: actualUnit || rule.unit || "",
    rule,
  };
}

function getSensorAlertSummary(sensor = {}, sensorTypeMeta = {}, lang = "th") {
  const result = evaluateSensorThreshold(sensor, sensorTypeMeta, lang);
  if (!result.metric || !result.abnormal) return null;

  const label = getMetricLabel(
    result.metric,
    lang,
    sensor?.name || sensor?.sensorType || "-"
  );

  return {
    metric: result.metric,
    label,
    text: `${label} ${result.reason}`,
    abnormal: true,
    reason: result.reason || "",
  };
}

function isOfflineStatus(v) {
  const s = String(v || "").trim().toUpperCase();
  return (
    s === "OFF" ||
    s === "OFFLINE" ||
    s === "DISCONNECTED" ||
    s === "DISCONNECT" ||
    s === "NO SIGNAL" ||
    s === "INACTIVE" ||
    s === "0" ||
    s === "FALSE"
  );
}

function isOnlineStatus(v) {
  const s = String(v || "").trim().toUpperCase();
  return (
    s === "ON" ||
    s === "ONLINE" ||
    s === "CONNECTED" ||
    s === "ACTIVE" ||
    s === "1" ||
    s === "TRUE"
  );
}

function isPinOnline(pin = {}, sensors = []) {
  const pinCandidates = [
    pin?.status,
    pin?.deviceStatus,
    pin?.connectionStatus,
    pin?.powerStatus,
    pin?.isOnline,
    pin?.online,
  ];

  if (pinCandidates.some(isOfflineStatus)) return false;
  if (pinCandidates.some(isOnlineStatus)) return true;

  if (!sensors.length) return true;

  const onlineCount = sensors.filter((s) =>
    [s?.deviceStatus, s?.connectionStatus, s?.powerStatus, s?.isOnline].some(
      isOnlineStatus
    )
  ).length;

  const offlineCount = sensors.filter((s) =>
    [s?.deviceStatus, s?.connectionStatus, s?.powerStatus, s?.isOnline].some(
      isOfflineStatus
    )
  ).length;

  if (onlineCount > 0) return true;
  if (offlineCount === sensors.length && sensors.length > 0) return false;

  return true;
}

// ============================
// ✅ API fetch
// ============================
async function apiFetch(path, { method = "GET", token = "", body } = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data?.message || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

// ============================
// ✅ Weather
// ============================
function toWeekday(dateStr, lang = "th") {
  const d = new Date(dateStr);
  const thDays = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];
  const enDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (lang === "en" ? enDays : thDays)[d.getDay()];
}

function centroidOfPolygon(coords) {
  if (!Array.isArray(coords) || coords.length < 3) return null;
  let sumLat = 0;
  let sumLng = 0;
  let n = 0;
  for (const pair of coords) {
    const lat = Number(pair?.[0]);
    const lng = Number(pair?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    sumLat += lat;
    sumLng += lng;
    n += 1;
  }
  return n ? [sumLat / n, sumLng / n] : null;
}

function weatherEmoji(pop) {
  const p = safeNum(pop, 0);
  if (p >= 70) return "🌧️";
  if (p >= 40) return "🌦️";
  return "🌤️";
}

async function fetchForecast7Days(lat, lng) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lng)}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum` +
    `&forecast_days=7` +
    `&timezone=Asia%2FBangkok`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`weather failed (${res.status})`);
  const j = await res.json();

  const t = j?.daily?.time || [];
  const tmax = j?.daily?.temperature_2m_max || [];
  const tmin = j?.daily?.temperature_2m_min || [];
  const pop = j?.daily?.precipitation_probability_max || [];
  const psum = j?.daily?.precipitation_sum || [];

  return t.map((dateStr, i) => ({
    date: dateStr,
    tempMax: Math.round(Number(tmax[i] ?? 0)),
    tempMin: Math.round(Number(tmin[i] ?? 0)),
    rainChance: Number(pop[i] ?? 0),
    rainSum: Number(psum[i] ?? 0),
  }));
}

// ============================
// ✅ Polygon parser
// ============================
function maybeSwapLngLat(pair) {
  const a = Number(pair?.[0]);
  const b = Number(pair?.[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (Math.abs(a) > 90 && Math.abs(b) <= 90) return [b, a];
  return [a, b];
}

function normalizePairList(list) {
  if (!Array.isArray(list)) return null;

  if (list.length && typeof list[0] === "object" && !Array.isArray(list[0])) {
    const out = list
      .map((p) => {
        const lat = Number(p?.lat);
        const lng = Number(p?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return [lat, lng];
      })
      .filter(Boolean);
    return out.length >= 3 ? out : null;
  }

  const out = list.map((p) => maybeSwapLngLat(p)).filter(Boolean);
  return out.length >= 3 ? out : null;
}

function extractRingsFromAny(raw) {
  if (!raw) return [];

  if (
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    raw.type &&
    raw.coordinates
  ) {
    raw = raw.coordinates;
  }

  if (!Array.isArray(raw)) return [];

  const direct = normalizePairList(raw);
  if (direct) return [direct];

  if (
    Array.isArray(raw[0]) &&
    Array.isArray(raw[0][0]) &&
    typeof raw[0][0][0] === "number"
  ) {
    const outer = normalizePairList(raw[0]);
    return outer ? [outer] : [];
  }

  if (
    Array.isArray(raw[0]) &&
    Array.isArray(raw[0][0]) &&
    Array.isArray(raw[0][0][0]) &&
    typeof raw[0][0][0][0] === "number"
  ) {
    const rings = [];
    for (const poly of raw) {
      const outer = normalizePairList(poly?.[0]);
      if (outer) rings.push(outer);
    }
    return rings;
  }

  const rings = [];
  for (const item of raw) {
    const r1 = normalizePairList(item);
    if (r1) rings.push(r1);
    else if (Array.isArray(item?.[0])) {
      const r2 = normalizePairList(item?.[0]);
      if (r2) rings.push(r2);
    }
  }
  return rings;
}

function normalizePolygons(items, plotId = "", plotName = "") {
  const list = Array.isArray(items) ? items : [];
  const out = [];

  for (let idx = 0; idx < list.length; idx++) {
    const p = list[idx];
    const baseId = String(p?.id || p?._id || `poly-${plotId}-${idx}`);

    const sources = [
      p?.coords,
      p?.coordinates,
      p?.latlngs,
      p?.points,
      p?.geometry,
      p?.geojson,
    ].filter(Boolean);
    if (!sources.length) sources.push(p);

    let rings = [];
    for (const src of sources) {
      const r = extractRingsFromAny(src);
      if (r && r.length) {
        rings = r;
        break;
      }
    }

    for (let r = 0; r < rings.length; r++) {
      out.push({
        id: rings.length > 1 ? `${baseId}-${r + 1}` : baseId,
        plotId: String(plotId),
        plotName: String(plotName || ""),
        name: p?.name || p?.plotName || "",
        color: p?.color || "#16a34a",
        coords: rings[r],
      });
    }
  }

  return out;
}

// ============================
// ✅ Build groups from backend sensorType
// ============================
function buildGroupsFromSensors(
  sensors = [],
  sensorTypeMap = new Map(),
  t,
  lang = "th"
) {
  const noSensorData = t("noSensorData", "ยังไม่มีข้อมูลเซนเซอร์");
  const groups = new Map();

  for (const key of GROUP_ORDER) {
    groups.set(key, {
      groupKey: key,
      group: getGroupLabel(key, lang),
      items: [],
    });
  }

  for (const s of sensors) {
    const sensorType = String(s?.sensorType || "").trim();
    if (!groups.has(sensorType)) continue;

    const st = sensorTypeMap.get(s.sensorType) || {
      label: s.sensorType,
      unit: s.unit || "",
    };

    const evalResult = evaluateSensorThreshold(s, st, lang);
    const rawValue = firstNonEmpty(
      s?.lastReading?.value,
      s?.lastValue,
      s?.value,
      s?.reading,
      s?.currentValue,
      ""
    );

    const displayUnit = extractSensorUnit(s, st) || evalResult.unit || "";
    const hasDisplayValue =
      rawValue !== "" && rawValue !== null && rawValue !== undefined;

    const lastV = hasDisplayValue
      ? `${rawValue}${displayUnit ? ` ${displayUnit}` : ""}`
      : "-";

    const thresholdAlert = !!evalResult.abnormal;

    const fallbackName =
      sensorType === "npk" && evalResult.metric
        ? getMetricLabel(evalResult.metric, lang, st.label || sensorType)
        : sensorType === "temp_rh" && evalResult.metric
        ? getMetricLabel(evalResult.metric, lang, st.label || sensorType)
        : sensorType === "irrigation" && evalResult.metric
        ? getMetricLabel(evalResult.metric, lang, st.label || sensorType)
        : s?.name || st.label || sensorType;

    const itemName = firstNonEmpty(
      s?.name,
      s?.sensorName,
      s?.label,
      fallbackName
    );

    groups.get(sensorType).items.push({
      name: itemName,
      value: `${lang === "en" ? "Value" : "ค่า"}: ${lastV}`,
      isAlert: thresholdAlert,
      abnormalReason: thresholdAlert ? evalResult.reason : "",
      thresholdHint: evalResult.rule
        ? formatThresholdHint(evalResult.rule, lang)
        : "",
      currentValueNumber: evalResult.value,
      currentValueUnit: displayUnit,
      metric: evalResult.metric,
    });
  }

  const out = [];
  for (const key of GROUP_ORDER) {
    const g = groups.get(key);
    if (!g.items.length) {
      g.items.push({
        name: "—",
        value: noSensorData,
        isAlert: false,
        abnormalReason: "",
        thresholdHint: "",
        currentValueNumber: null,
        currentValueUnit: "",
        metric: null,
      });
    } else if (key === "npk") {
      const order = { nitrogen: 1, phosphorus: 2, potassium: 3 };
      g.items.sort(
        (a, b) => (order[a.metric] || 99) - (order[b.metric] || 99)
      );
    }
    out.push(g);
  }

  return out;
}

function pinHasThresholdAlert(
  sensors = [],
  sensorTypeMap = new Map(),
  lang = "th"
) {
  for (const s of sensors) {
    const st = sensorTypeMap.get(s.sensorType) || {
      label: s.sensorType,
      unit: s.unit || "",
    };
    if (evaluateSensorThreshold(s, st, lang).abnormal) return true;
  }
  return false;
}

function buildOverallIssueSummary(
  sensorsByPinId = {},
  sensorTypeMap = new Map(),
  lang = "th"
) {
  const summaries = [];
  const npkParts = [];

  for (const pid of Object.keys(sensorsByPinId || {})) {
    const arr = sensorsByPinId?.[pid] || [];

    for (const s of arr) {
      const st = sensorTypeMap.get(s.sensorType) || {
        label: s.sensorType,
        unit: s.unit || "",
      };

      const info = getSensorAlertSummary(s, st, lang);
      if (!info || !info.abnormal) continue;

      if (
        info.metric === "nitrogen" ||
        info.metric === "phosphorus" ||
        info.metric === "potassium"
      ) {
        npkParts.push(info.text);
      } else {
        summaries.push(info.text);
      }
    }
  }

  const uniqueSummaries = [...new Set(summaries)];
  const uniqueNpkParts = [...new Set(npkParts)];

  if (uniqueNpkParts.length) {
    uniqueSummaries.unshift(`NPK: ${uniqueNpkParts.join(", ")}`);
  }

  return uniqueSummaries;
}

export default function DashboardAllPlotsPage() {
  const router = useRouter();
  const { t, lang } = useDuwimsT();

  const [isClient, setIsClient] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const [pinIcon, setPinIcon] = useState(null);

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
  const cardRadius = isMobile ? 14 : 18;

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

  const mapHeight = isMobile ? 240 : isTablet ? 300 : 320;

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
    if (isMobile)
      return { display: "grid", gridTemplateColumns: "1fr", gap: 12 };
    if (isTablet)
      return {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 14,
      };
    return {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 16,
      alignItems: "stretch",
    };
  }, [isMobile, isTablet]);

  const gridWeather = useMemo(() => {
    if (isMobile) {
      return {
        display: "grid",
        gridAutoFlow: "column",
        gridAutoColumns: "minmax(120px, 1fr)",
        gap: 10,
        overflowX: "auto",
        padding: "4px 10px 8px",
        scrollSnapType: "x mandatory",
        WebkitOverflowScrolling: "touch",
      };
    }
    return {
      display: "grid",
      gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
      gap: 10,
    };
  }, [isMobile]);

  const pinPillRow = useMemo(() => {
    return {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "repeat(5, minmax(0, 1fr))",
      gap: 6,
      marginBottom: 10,
    };
  }, [isMobile]);

  const pinGroupGrid = useMemo(() => {
    return {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
      gap: 8,
    };
  }, [isMobile]);

  const title18 = { fontSize: isMobile ? 16 : 18, fontWeight: 600 };
  const bigTemp = { fontSize: isMobile ? 22 : 26, fontWeight: 600 };
  const bigNum = { fontSize: isMobile ? 20 : 22, fontWeight: 600 };

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (!isClient) return;
    let mounted = true;

    import("leaflet").then((L) => {
      if (!mounted) return;

      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });

      const icon = new L.Icon({
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      setPinIcon(icon);
    });

    return () => {
      mounted = false;
    };
  }, [isClient]);

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [cacheTs, setCacheTs] = useState(null);
  const [forecastDays, setForecastDays] = useState([]);
  const [plots, setPlots] = useState([]);
  const [sensorTypes, setSensorTypes] = useState(getDefaultSensorTypes());
  const [polygonsAll, setPolygonsAll] = useState([]);
  const [pinsAll, setPinsAll] = useState([]);
  const [sensorsByPinId, setSensorsByPinId] = useState({});

  const sensorTypeMap = useMemo(() => {
    const m = new Map();
    for (const st of sensorTypes || []) m.set(st.key, st);
    return m;
  }, [sensorTypes]);

  useEffect(() => {
    if (!isClient) return;
    const tk = getStoredToken();
    if (!tk) {
      router.replace("/login");
      return;
    }
    setToken(tk);
  }, [isClient, router]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      setLoadError("");

      try {
        // ✅ backend ไม่มี /api/sensor-types
        // ใช้ map ใน frontend แทน
        const sensorTypesLocal = getDefaultSensorTypes();
        if (cancelled) return;
        setSensorTypes(sensorTypesLocal);

        // ✅ โหลด plots
        const pl = await apiFetch("/api/plots", { token });
        if (cancelled) return;

        const plotItems = (pl?.items || [])
          .map((p) => ({
            ...p,
            id: String(firstNonEmpty(p._id, p.id, "")),
            plotName: pickPlotName(p),
            plantType: pickPlantType(p),
            plantedAt: pickPlantedAt(p),
            caretakerName: pickCaretaker(p),
          }))
          .filter((p) => p.id);

        setPlots(plotItems);

        // ✅ backend มี /api/plots/:plotId/polygon
        const polygonPromises = plotItems.map((p) =>
          apiFetch(`/api/plots/${p.id}/polygon`, { token }).then((res) => ({
            plotId: p.id,
            plotName: p.plotName,
            item: res?.item || null,
          }))
        );

        // ✅ backend มี /api/plots/:plotId/pins
        const pinPromises = plotItems.map((p) =>
          apiFetch(`/api/plots/${p.id}/pins`, { token }).then((res) => ({
            plotId: p.id,
            plotName: p.plotName,
            items: res?.items || [],
          }))
        );

        // ✅ backend มี /api/sensors?plotId=...&sensorType=all
        const sensorPromises = plotItems.map((p) =>
          apiFetch(
            `/api/sensors?plotId=${encodeURIComponent(p.id)}&sensorType=all`,
            { token }
          ).then((res) => ({
            plotId: p.id,
            plotName: p.plotName,
            items: res?.items || [],
          }))
        );

        const [polygonByPlot, pinsByPlot, sensorsByPlotArr] = await Promise.all([
          Promise.all(polygonPromises),
          Promise.all(pinPromises),
          Promise.all(sensorPromises),
        ]);
        if (cancelled) return;

        // ✅ polygon
        const allPolys = [];
        for (const pp of polygonByPlot) {
          const polyItem = pp?.item;
          if (!polyItem) continue;

          const normalized = normalizePolygons(
            [polyItem],
            pp.plotId,
            pp.plotName
          );
          allPolys.push(...normalized);
        }
        setPolygonsAll(allPolys);

        // ✅ pins
        const allPins = [];
        for (const pr of pinsByPlot) {
          const plotMeta =
            plotItems.find((p) => String(p.id) === String(pr.plotId)) || null;

          const pinsNorm = (pr.items || [])
            .map((x) => {
              const merged = mergePlotMeta(plotMeta || {}, x || {});
              return {
                ...x,
                id: String(firstNonEmpty(x._id, x.id, "")),
                plotId: String(
                  firstNonEmpty(pr.plotId, x.plotId, x.plot_id, merged.id, "")
                ),
                plotName: merged.plotName || pr.plotName || "",
                plotMetaMerged: merged,
                number: safeNum(
                  firstNonEmpty(x.number, x.pinNumber, x.no, 0),
                  0
                ),
                lat: Number(firstNonEmpty(x.lat, x.latitude)),
                lng: Number(firstNonEmpty(x.lng, x.longitude)),
                nodeId: firstNonEmpty(
                  x.nodeId,
                  x.node,
                  x.nodeName,
                  merged.nodeId,
                  null
                ),
                nodeName: firstNonEmpty(x.nodeName, ""),
                status: firstNonEmpty(
                  x.status,
                  x.deviceStatus,
                  x.connectionStatus,
                  x.powerStatus,
                  ""
                ),
                isOnline: firstNonEmpty(x.isOnline, x.online, ""),
              };
            })
            .filter(
              (p) => p.id && Number.isFinite(p.lat) && Number.isFinite(p.lng)
            );

          allPins.push(...pinsNorm);
        }
        setPinsAll(allPins);

        // ✅ sensorsByPinId
        const pinMap = {};
        for (const sr of sensorsByPlotArr) {
          const sensors = (sr.items || []).map((x, idx) => ({
            ...x,
            id: String(firstNonEmpty(x._id, x.id, `sensor-${idx}`)),
            pinId: x.pinId ? String(x.pinId) : null,
            plotId: x.plotId ? String(x.plotId) : sr.plotId,
            nodeId: x.nodeId ? String(x.nodeId) : null,
            nodeName: firstNonEmpty(x.nodeName, ""),
            nodeType: firstNonEmpty(x.nodeType, ""),
            sensorType: firstNonEmpty(x.sensorType, ""),
            name: firstNonEmpty(
              x.name,
              x.sensorName,
              x.label,
              x.displayName,
              ""
            ),
            status: firstNonEmpty(x.status, ""),
            deviceStatus: firstNonEmpty(x.deviceStatus, ""),
            connectionStatus: firstNonEmpty(x.connectionStatus, ""),
            powerStatus: firstNonEmpty(x.powerStatus, ""),
            number: firstNonEmpty(x.number, x.order, x.index, ""),
          }));

          for (const s of sensors) {
            const pid = s.pinId || "__no_pin__";
            if (!pinMap[pid]) pinMap[pid] = [];
            pinMap[pid].push(s);
          }
        }
        setSensorsByPinId(pinMap);

        setCacheTs(new Date().toISOString());
      } catch (e) {
        if (!cancelled) {
          if (e?.status === 401) router.replace("/login");
          setLoadError(e?.message || t("loadFailed", "โหลดข้อมูลไม่สำเร็จ"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [token, router, t]);

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      try {
        let latLng = null;

        for (const p of polygonsAll || []) {
          const c = centroidOfPolygon(p?.coords);
          if (c) {
            latLng = c;
            break;
          }
        }

        if (!latLng) {
          const firstPin = (pinsAll || []).find(
            (p) =>
              Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))
          );
          if (firstPin) latLng = [Number(firstPin.lat), Number(firstPin.lng)];
        }

        if (!latLng) latLng = [13.736717, 100.523186];

        const days = await fetchForecast7Days(latLng[0], latLng[1]);
        if (!cancelled) setForecastDays(days);
      } catch {
        if (!cancelled) setForecastDays([]);
      }
    }

    loadWeather();

    return () => {
      cancelled = true;
    };
  }, [polygonsAll, pinsAll]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const id = requestAnimationFrame(() => {
      try {
        mapRef.current.invalidateSize(false);
      } catch {
        // ignore
      }
    });
    return () => cancelAnimationFrame(id);
  }, [mapReady, vw, polygonsAll, pinsAll]);

  const allMapPoints = useMemo(() => {
    const pts = [];
    for (const poly of polygonsAll || []) {
      for (const c of poly?.coords || []) pts.push(c);
    }
    for (const p of pinsAll || []) pts.push([Number(p.lat), Number(p.lng)]);
    return pts.filter((x) => Array.isArray(x) && x.length === 2);
  }, [polygonsAll, pinsAll]);

  const mapCenter = useMemo(() => {
    const any = allMapPoints?.[0];
    if (
      any &&
      Number.isFinite(Number(any[0])) &&
      Number.isFinite(Number(any[1]))
    ) {
      return [Number(any[0]), Number(any[1])];
    }
    return [13.736717, 100.523186];
  }, [allMapPoints]);

  const plotMetaMap = useMemo(() => {
    const m = new Map();
    for (const p of plots || []) {
      m.set(String(p.id), mergePlotMeta(p, {}));
    }
    return m;
  }, [plots]);

  const mapPinsForMap = useMemo(() => {
    return (pinsAll || [])
      .slice()
      .sort((a, b) => safeNum(a.number, 0) - safeNum(b.number, 0))
      .map((p) => ({
        id: p.id,
        position: [Number(p.lat), Number(p.lng)],
        label: `${p.plotName || p.plotId} • Pin ${safeNum(p.number, 0)}`,
        number: safeNum(p.number, 0),
      }));
  }, [pinsAll]);

  const pinCards = useMemo(() => {
    return (pinsAll || [])
      .slice()
      .sort((a, b) => safeNum(a.number, 0) - safeNum(b.number, 0));
  }, [pinsAll]);

  const daysUI = useMemo(() => {
    if (forecastDays?.length) {
      return forecastDays.map((d) => ({
        day: toWeekday(d.date, lang),
        temp: `${safeNum(d.tempMax, 0)}°`,
        rain: `${safeNum(d.rainChance, 0)}%`,
        emoji: weatherEmoji(d.rainChance),
      }));
    }
    return [];
  }, [forecastDays, lang]);

  const today = forecastDays?.[0] || null;
  const tempRangeText = today
    ? `${safeNum(today.tempMin, 0)} – ${safeNum(today.tempMax, 0)} °C`
    : "—";
  const rainChanceToday = today ? safeNum(today.rainChance, 0) : 0;

  const rainSum7 = useMemo(() => {
    if (!forecastDays?.length) return null;
    const sum = forecastDays.reduce((acc, d) => acc + safeNum(d.rainSum, 0), 0);
    return Math.round(sum);
  }, [forecastDays]);

  const adviceText = useMemo(() => {
    if (!forecastDays?.length)
      return t("loadingWeatherAdvice", "กำลังโหลดพยากรณ์อากาศ...");

    const next3 = forecastDays.slice(0, 3).map((d) => safeNum(d.rainChance, 0));
    const max3 = Math.max(...next3);

    if (lang === "en") {
      if (max3 >= 70)
        return "High chance of rain in the next 2–3 days. Prepare drainage and inspect water paths in the plot.";
      if (max3 >= 40)
        return "Moderate chance of rain. Monitor soil moisture and adjust irrigation timing accordingly.";
      return "Low chance of rain. Suitable for planned irrigation and routine soil-moisture checks.";
    }

    if (max3 >= 70)
      return "มีโอกาสฝนสูงใน 2–3 วันข้างหน้า ควรเตรียมระบบระบายน้ำ/ตรวจร่องน้ำในแปลง";
    if (max3 >= 40)
      return "ช่วงนี้มีโอกาสฝนปานกลาง ควรเฝ้าระวังความชื้นดินและปรับรอบให้น้ำให้เหมาะสม";
    return "ฝนค่อนข้างน้อย เหมาะกับการจัดการให้น้ำตามแผน และตรวจความชื้นดินเป็นระยะ";
  }, [forecastDays, lang, t]);

  const pinCount = (pinsAll || []).length;
  const plotCount = (plots || []).length;
  const polyCount = (polygonsAll || []).length;

  const issueSummaryList = useMemo(() => {
    return buildOverallIssueSummary(sensorsByPinId, sensorTypeMap, lang);
  }, [sensorsByPinId, sensorTypeMap, lang]);

  const issueCount = issueSummaryList.length;

  const onlinePinsCount = useMemo(() => {
    return pinCards.filter((pin) =>
      isPinOnline(pin, sensorsByPinId?.[String(pin.id)] || [])
    ).length;
  }, [pinCards, sensorsByPinId]);

  const offlinePinsCount = Math.max(pinCount - onlinePinsCount, 0);

  const statusText = useMemo(() => {
    const updatedPrefix = lang === "en" ? "System update" : "อัปเดตจากระบบ";
    const updatedAtPrefix = lang === "en" ? "Updated" : "อัปเดต";
    return `${updatedPrefix}${
      cacheTs ? ` • ${updatedAtPrefix}: ${prettyTs(cacheTs, lang)}` : ""
    }`;
  }, [cacheTs, lang]);

  return (
    <div style={pageStyle}>
      <div style={outerWrap}>
        <main
          style={{
            ...bodyStyle,
            paddingLeft: isMobile ? 14 : 16,
            paddingRight: isMobile ? 14 : 16,
            paddingBottom: isMobile ? 22 : 30,
          }}
          className="du-dashboard"
        >
          <div style={{ ...gridTop, marginBottom: 16 }}>
            <div
              style={{ ...cardBaseR, gridArea: "forecast" }}
              className="du-card"
            >
              <div
                className="du-card-title"
                style={{ ...title18, marginBottom: 6 }}
              >
                {t("weather7days", "พยากรณ์อากาศ 7 วันข้างหน้า")}
              </div>

              <div
                style={{
                  marginTop: 8,
                  overflowX: isMobile ? "auto" : "visible",
                }}
              >
                <div style={gridWeather}>
                  {daysUI.map((d, idx) => (
                    <div
                      key={`${d.day}-${idx}`}
                      style={{
                        background: "#eef3ff",
                        borderRadius: 12,
                        padding: isMobile ? 10 : 8,
                        textAlign: "center",
                        minWidth: 0,
                        scrollSnapAlign: "start",
                        boxShadow: isMobile
                          ? "0 2px 8px rgba(15,23,42,0.10)"
                          : "none",
                        border: "1px solid rgba(148,163,184,0.35)",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {d.day}
                      </div>
                      <div style={{ fontSize: 22, margin: "6px 0 2px" }}>
                        {d.emoji}
                      </div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          lineHeight: 1.1,
                        }}
                      >
                        {d.temp}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#4b5563",
                          marginTop: 4,
                        }}
                      >
                        {lang === "en"
                          ? `Rain chance ${d.rain}`
                          : `โอกาสฝนตก ${d.rain}`}
                      </div>
                    </div>
                  ))}

                  {!daysUI.length && (
                    <div style={{ padding: 10, color: "#6b7280", fontSize: 12 }}>
                      {loading
                        ? t("loading", "กำลังโหลด...")
                        : loadError
                        ? loadError
                        : t(
                            "loadingForecast",
                            "กำลังโหลดข้อมูลพยากรณ์อากาศ..."
                          )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div
              style={{
                gridArea: "mid",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minWidth: 0,
              }}
            >
              <div
                style={{ ...cardBaseR, background: "#1d4ed8", color: "#ffffff" }}
              >
                <div style={{ ...title18, marginBottom: 4 }}>
                  {t("todayTemperature", "อุณหภูมิปัจจุบัน (วันนี้)")}
                </div>
                <div
                  style={{
                    ...bigTemp,
                    marginBottom: 4,
                    color: "#bfdbfe",
                  }}
                >
                  {tempRangeText}
                </div>
                <div style={{ fontSize: 13, color: "#e0e7ff", lineHeight: 1.5 }}>
                  {forecastDays?.length
                    ? t(
                        "basedOnDailyForecast",
                        "อิงจากพยากรณ์รายวันของพื้นที่แปลง"
                      )
                    : t("loading", "กำลังโหลด...")}
                </div>
              </div>

              <div
                style={{ ...cardBaseR, background: "#facc15", color: "#111827" }}
              >
                <div style={{ ...title18, marginBottom: 4 }}>
                  {t("todayRainChance", "โอกาสฝนตก (วันนี้)")}
                </div>
                <div style={{ ...bigNum, marginBottom: 2 }}>
                  {forecastDays?.length ? `${rainChanceToday}%` : "—"}
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                  {t(
                    "basedOnDailyPrecipitation",
                    "อิงจาก precipitation probability (รายวัน)"
                  )}
                </div>
              </div>
            </div>

            <div
              style={{
                gridArea: "right",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minWidth: 0,
              }}
            >
              <div
                style={{ ...cardBaseR, background: "#ef4444", color: "#ffffff" }}
              >
                <div style={{ ...title18, marginBottom: 8 }}>
                  {t("advice", "คำแนะนำ")}
                </div>
                <p
                  style={{
                    fontSize: 14,
                    margin: 0,
                    lineHeight: 1.6,
                    fontWeight: 400,
                  }}
                >
                  {adviceText}
                </p>
              </div>

              <div
                style={{
                  ...cardBaseR,
                  background:
                    "linear-gradient(135deg,#16a34a 0%,#22c55e 50%,#4ade80 100%)",
                  color: "#f0fdf4",
                }}
              >
                <div style={{ ...title18, marginBottom: 4 }}>
                  {t("rain7days", "ปริมาณน้ำฝน (7 วัน)")}
                </div>
                <div style={{ ...bigNum, marginBottom: 2 }}>
                  {rainSum7 === null ? "—" : `${rainSum7} mm`}
                </div>
                <div style={{ fontSize: 12, opacity: 0.95, lineHeight: 1.5 }}>
                  {t("sumFromDailyPrecipitation", "รวมจาก precipitation_sum รายวัน")}
                </div>
              </div>
            </div>
          </div>

          <div style={{ ...gridMiddle, marginBottom: 16 }}>
            <div style={{ ...cardBaseR, gridArea: "map" }}>
              <div style={{ ...title18, marginBottom: 8 }}>
                {t("mapAndResourcesAllPlots", "แผนที่และทรัพยากร (ทุกแปลง)")}
              </div>

              <div
                style={{
                  borderRadius: 14,
                  overflow: "hidden",
                  boxShadow: "0 8px 18px rgba(15,23,42,0.18)",
                  minHeight: mapHeight,
                  background: "#dbeafe",
                }}
              >
                {isClient && pinIcon ? (
                  <LeafletBundle
                    center={mapCenter}
                    height={mapHeight}
                    allMapPoints={allMapPoints}
                    polygonsAll={polygonsAll}
                    mapPinsForMap={mapPinsForMap}
                    pinIcon={pinIcon}
                    onMapCreated={(map) => {
                      mapRef.current = map;
                      setMapReady(true);
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: mapHeight,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#475569",
                      fontSize: 13,
                    }}
                  >
                    {t("loading", "กำลังโหลด...")}
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                ...cardBaseR,
                gridArea: "status",
                background: "linear-gradient(135deg,#22c55e 0%,#34d399 100%)",
                color: "#ffffff",
              }}
            >
              <div style={{ ...title18, marginBottom: 10 }}>
                {lang === "en" ? "Device Status" : "สถานะการทำงาน"}
              </div>

              <div
                style={{
                  fontSize: 12,
                  opacity: 0.95,
                  marginBottom: 10,
                  lineHeight: 1.5,
                }}
              >
                {statusText}
              </div>

              <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>
                ON {onlinePinsCount} {lang === "en" ? "device(s)" : "เครื่อง"}
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 18,
                  fontWeight: 600,
                  lineHeight: 1.2,
                }}
              >
                OFF {offlinePinsCount} {lang === "en" ? "device(s)" : "เครื่อง"}
              </div>
            </div>

            <div
              style={{
                ...cardBaseR,
                gridArea: "issue",
                background: "linear-gradient(135deg,#f59e0b 0%,#fde68a 100%)",
              }}
            >
              <div style={{ ...title18, marginBottom: 8 }}>
                {lang === "en" ? "Field Issues" : "ปัญหาที่พบ"}
              </div>

              <div
                style={{
                  fontSize: 13,
                  marginBottom: 8,
                  lineHeight: 1.6,
                  fontWeight: 400,
                }}
              >
                {issueCount > 0 ? (
                  <>
                    <div style={{ marginBottom: 6, fontWeight: 600 }}>
                      {lang === "en"
                        ? `Found ${issueCount} issue group(s)`
                        : `ตรวจพบความผิดปกติ ${issueCount} กลุ่ม`}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {issueSummaryList.map((msg, idx) => (
                        <div
                          key={`${msg}-${idx}`}
                          style={{
                            background: "rgba(255,255,255,0.55)",
                            border: "1px solid rgba(245,158,11,0.45)",
                            borderRadius: 10,
                            padding: "6px 10px",
                            color: "#7c2d12",
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          • {msg}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  t("noIssueFound", "ยังไม่พบปัญหา (ทุกเซนเซอร์ปกติ)")
                )}
              </div>
            </div>
          </div>

          <div style={{ ...cardBaseR, marginBottom: 16 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 12,
                  padding: "10px 12px",
                }}
              >
                <div style={{ fontSize: 11, color: "#6b7280" }}>
                  {lang === "en" ? "Plots" : "จำนวนแปลง"}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{plotCount}</div>
              </div>

              <div
                style={{
                  background: "#ecfdf5",
                  border: "1px solid #bbf7d0",
                  borderRadius: 12,
                  padding: "10px 12px",
                }}
              >
                <div style={{ fontSize: 11, color: "#6b7280" }}>
                  {lang === "en" ? "Polygons" : "จำนวน Polygon"}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{polyCount}</div>
              </div>

              <div
                style={{
                  background: "#fefce8",
                  border: "1px solid #fde68a",
                  borderRadius: 12,
                  padding: "10px 12px",
                }}
              >
                <div style={{ fontSize: 11, color: "#6b7280" }}>
                  {lang === "en" ? "Pins" : "จำนวน Pin"}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{pinCount}</div>
              </div>
            </div>
          </div>

          <div style={gridPins}>
            {pinCards.map((pin) => {
              const pinId = String(pin.id || "__no_pin__");
              const pinNumber = safeNum(pin.number, 0);

              const sensors = sensorsByPinId?.[pinId] || [];
              const groups = buildGroupsFromSensors(
                sensors,
                sensorTypeMap,
                t,
                lang
              );

              const isOnline = isPinOnline(pin, sensors);
              const hasAlert = pinHasThresholdAlert(sensors, sensorTypeMap, lang);

              const backgroundColor = !isOnline
                ? "#e5e7eb"
                : hasAlert
                ? "#f1caca"
                : "#cfe9e2";

              const sensorGroupCount = new Set(
                sensors
                  .map((s) => String(s.sensorType || "").trim())
                  .filter(Boolean)
              ).size;

              const plotMeta = mergePlotMeta(
                plotMetaMap.get(String(pin.plotId)) || {},
                pin.plotMetaMerged || pin || {}
              );

              return (
                <div
                  key={pinId}
                  style={{
                    ...pinCardBase,
                    background: backgroundColor,
                    borderRadius: isMobile ? 16 : 20,
                    paddingTop: isMobile ? 11 : 12,
                    paddingRight: isMobile ? 11 : 12,
                    paddingBottom: isMobile ? 11 : 12,
                    paddingLeft: isMobile ? 11 : 12,
                    border: !isOnline
                      ? "1.5px solid #9ca3af"
                      : hasAlert
                      ? "1.5px solid #ef4444"
                      : "1px solid rgba(148,163,184,0.25)",
                    boxShadow: hasAlert
                      ? "0 12px 28px rgba(239,68,68,0.12)"
                      : "0 10px 24px rgba(15,23,42,0.10)",
                  }}
                >
                  <div style={pinHeaderRow}>
                    <div style={pinTitleBlock}>
                      <span
                        style={{ ...pinTitle, fontSize: isMobile ? 15 : 16 }}
                      >
                        {lang === "en" ? "Data" : "ข้อมูล"} :{" "}
                        {plotMeta.plotName ? `${plotMeta.plotName} • ` : ""}Pin{" "}
                        {pinNumber}
                      </span>
                      <span style={pinSubtitle}>
                        {lang === "en"
                          ? "Details of connected sensors"
                          : "รายละเอียดของอุปกรณ์และเซนเซอร์"}
                      </span>
                    </div>

                    <span
                      style={{
                        ...pinStatus,
                        background: !isOnline ? "#6b7280" : "#16a34a",
                        color: "#ffffff",
                        fontSize: isMobile ? 12 : 13,
                      }}
                    >
                      {!isOnline ? "OFF" : "ON"}
                    </span>
                  </div>

                  {!isOnline && (
                    <div
                      style={{
                        marginBottom: 10,
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: "#f3f4f6",
                        border: "1px solid #d1d5db",
                        color: "#374151",
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      {lang === "en"
                        ? "Device is offline or not sending data"
                        : "อุปกรณ์ปิดอยู่หรือไม่ได้ส่งข้อมูล"}
                    </div>
                  )}

                  <div style={pinPillRow}>
                    <div style={pinInfoPill}>
                      <div style={pinInfoLabel}>
                        {lang === "en" ? "Location" : "พิกัด"}
                      </div>
                      <div style={pinInfoValue}>
                        {Number.isFinite(Number(pin.lat))
                          ? Number(pin.lat).toFixed(5)
                          : "-"}
                        ,{" "}
                        {Number.isFinite(Number(pin.lng))
                          ? Number(pin.lng).toFixed(5)
                          : "-"}
                      </div>
                    </div>

                    <div style={pinInfoPill}>
                      <div style={pinInfoLabel}>
                        {lang === "en" ? "Plant Type" : "ประเภทพืช"}
                      </div>
                      <div style={pinInfoValue}>{plotMeta.plantType || "—"}</div>
                    </div>

                    <div style={pinInfoPill}>
                      <div style={pinInfoLabel}>
                        {lang === "en" ? "Planting Date" : "วันที่เริ่มปลูก"}
                      </div>
                      <div style={pinInfoValue}>
                        {formatDateByLang(plotMeta.plantedAt, lang)}
                      </div>
                    </div>

                    <div style={pinInfoPill}>
                      <div style={pinInfoLabel}>
                        {lang === "en" ? "Sensor Types" : "จำนวนเซนเซอร์"}
                      </div>
                      <div style={pinInfoValue}>
                        {lang === "en"
                          ? `${sensorGroupCount || 0} groups`
                          : `${sensorGroupCount || 0} กลุ่ม`}
                      </div>
                    </div>

                    <div style={pinInfoPill}>
                      <div style={pinInfoLabel}>
                        {lang === "en" ? "Caretaker" : "ผู้ดูแล"}
                      </div>
                      <div style={pinInfoValue}>
                        {plotMeta.caretakerName || "—"}
                      </div>
                    </div>
                  </div>

                  <div style={{ flex: 1, overflow: "auto" }}>
                    {groups.map((g) => (
                      <div key={`${pinId}-${g.groupKey}`} style={pinGroupContainer}>
                        <div style={pinGroupLabel}>{g.group}</div>

                        <div style={pinGroupGrid}>
                          {g.items.map((it, idx) => {
                            const isAlertItem = !!it.isAlert;

                            const itemStyle = {
                              ...pinGroupItem,
                              background: isAlertItem ? "#f2d74d" : "#f3f4f6",
                              boxShadow: "none",
                              border: isAlertItem
                                ? "1px solid #eab308"
                                : "1px solid #e5e7eb",
                            };

                            const nameStyle = {
                              ...pinSensorName,
                              color: isAlertItem ? "#7c2d12" : "#111827",
                              fontWeight: isAlertItem ? 700 : 500,
                            };

                            const valueStyle = {
                              ...pinSensorValue,
                              color: isAlertItem ? "#dc2626" : "#6b7280",
                              fontWeight: isAlertItem ? 700 : 400,
                            };

                            return (
                              <div
                                key={`${pinId}-${g.groupKey}-${it.name}-${idx}`}
                                style={itemStyle}
                              >
                                <div style={nameStyle}>{it.name}</div>

                                <div style={valueStyle}>{it.value}</div>

                                {!!it.abnormalReason && (
                                  <div
                                    style={{
                                      marginTop: 4,
                                      fontSize: 11,
                                      color: "#dc2626",
                                      fontWeight: 700,
                                      lineHeight: 1.35,
                                    }}
                                  >
                                    {it.abnormalReason}
                                  </div>
                                )}

                                {!!it.thresholdHint && (
                                  <div
                                    style={{
                                      marginTop: 3,
                                      fontSize: 10,
                                      color: isAlertItem ? "#7c2d12" : "#6b7280",
                                      lineHeight: 1.35,
                                    }}
                                  >
                                    {it.thresholdHint}
                                  </div>
                                )}
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

            {!pinCards.length && (
              <div
                style={{
                  ...cardBaseR,
                  gridColumn: "1 / -1",
                  color: "#6b7280",
                  fontSize: 13,
                }}
              >
                {t("noPinsInSystem", "ยังไม่มี Pin ในระบบ")}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}