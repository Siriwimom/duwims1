"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";

// --- dynamic import React-Leaflet เฉพาะฝั่ง client ---
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Polygon = dynamic(() => import("react-leaflet").then((m) => m.Polygon), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });

// ============================
// ✅ API CONFIG
// ============================
// .env.local (Next):
// NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

// ============================
// ===== GLOBAL STYLES =====
// ============================
const pageStyle = {
  fontFamily: '"Prompt", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  background: "#e5edf8",
  minHeight: "100vh",
  color: "#111827",
};
const outerWrap = { width: "100%", display: "flex", justifyContent: "center", overflowX: "hidden" };
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
const pinTitleBlock = { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 };
const pinTitle = { fontSize: 18, fontWeight: 700 };
const pinSubtitle = { fontSize: 11, color: "#6b7280" };
const pinStatus = { fontSize: 18, fontWeight: 700, color: "#16a34a" };
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
const pinInfoLabel = { fontSize: 10, color: "#6b7280", marginBottom: 2 };
const pinInfoValue = { fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const pinGroupContainer = {
  borderRadius: 22,
  background: "rgba(255,255,255,0.85)",
  paddingTop: 8,
  paddingRight: 10,
  paddingBottom: 10,
  paddingLeft: 10,
  marginBottom: 6,
};
const pinGroupLabel = { fontSize: 12, fontWeight: 600, marginBottom: 4 };
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
const pinSensorName = { fontWeight: 500, marginBottom: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const pinSensorValue = { fontSize: 10, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

// ============================
// ✅ LocalStorage keys
// ============================
const LS_TOKEN = "token";
const LS_LAST_PLOT_ID = "lastPlotId";
const LS_DASH_CACHE_V1 = "duwims_dashboard_cache_v1";

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
function prettyTs(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear() + 543;
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}
function getStoredToken() {
  try {
    return localStorage.getItem(LS_TOKEN) || "";
  } catch {
    return "";
  }
}
function setStoredToken(token) {
  try {
    localStorage.setItem(LS_TOKEN, token);
  } catch {}
}
function clearStoredToken() {
  try {
    localStorage.removeItem(LS_TOKEN);
  } catch {}
}
function safeJsonParse(s, fallback = null) {
  try {
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
}
function loadCache() {
  try {
    const raw = localStorage.getItem(LS_DASH_CACHE_V1);
    return safeJsonParse(raw, null);
  } catch {
    return null;
  }
}
function saveCache(payload) {
  try {
    localStorage.setItem(LS_DASH_CACHE_V1, JSON.stringify(payload));
  } catch {}
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
// ✅ Weather (Open-Meteo) 7 days
// ============================
function toThaiWeekday(dateStr) {
  const d = new Date(dateStr);
  const days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];
  return days[d.getDay()];
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
    day: toThaiWeekday(dateStr),
    tempMax: Math.round(Number(tmax[i] ?? 0)),
    tempMin: Math.round(Number(tmin[i] ?? 0)),
    rainChance: Number(pop[i] ?? 0),
    rainSum: Number(psum[i] ?? 0),
  }));
}

// ============================
// ✅ DEMO fallback
// ============================
const DEMO_PLOT = {
  id: "__demo__",
  plotName: "แปลงตัวอย่าง (Demo)",
  caretaker: "สมชาย ใจดี",
  plantType: "ทุเรียน",
  plantedAt: null,
};
const DEMO_POLYGON = [
  [13.35, 101.0],
  [13.35, 101.2],
  [13.25, 101.2],
  [13.25, 101.0],
];
const DEMO_PINS = [
  { id: "demo-pin-1", number: 1, lat: 13.32, lng: 101.06 },
  { id: "demo-pin-2", number: 2, lat: 13.31, lng: 101.14 },
  { id: "demo-pin-3", number: 3, lat: 13.29, lng: 101.11 },
];
function getDemoGroups(pinNumber) {
  let moistureItems;
  if (pinNumber === 3) {
    moistureItems = [
      { name: "เซนเซอร์ความชื้นดิน #1", value: "ความชื้นดิน - 38 % (เกินเกณฑ์)", isAlert: true },
      { name: "เซนเซอร์ความชื้นดิน #2", value: "ความชื้นดิน - 42 %", isAlert: false },
    ];
  } else {
    const moist1 = pinNumber === 1 ? "32 %" : "35 %";
    const moist2 = pinNumber === 1 ? "38 %" : "40 %";
    moistureItems = [
      { name: "เซนเซอร์ความชื้นดิน #1", value: `ความชื้นดิน - ${moist1}`, isAlert: false },
      { name: "เซนเซอร์ความชื้นดิน #2", value: `ความชื้นดิน - ${moist2}`, isAlert: false },
    ];
  }
  return [
    { group: "เซนเซอร์ความชื้นดิน", items: moistureItems },
    {
      group: "เซนเซอร์ อุณหภูมิ",
      items: [
        { name: "เซนเซอร์ อุณหภูมิ #1", value: "อุณหภูมิอากาศ - 31 °C" },
        { name: "เซนเซอร์ อุณหภูมิ #2", value: "อุณหภูมิอากาศ - 32 °C" },
      ],
    },
    { group: "เซนเซอร์การให้น้ำ", items: [{ name: "เซนเซอร์การให้น้ำ #1", value: "การให้น้ำ 20 kPa" }] },
  ];
}

// ============================
// ✅ Build groups from backend sensors
// ============================
function buildGroupsFromSensors(sensors = [], sensorTypeMap = new Map()) {
  const groups = new Map();
  for (const s of sensors) {
    const st = sensorTypeMap.get(s.sensorType) || { label: s.sensorType, unit: s.unit || "" };
    const groupLabel = `เซนเซอร์ ${st.label || s.sensorType}`.trim();

    const lastV =
      s?.lastReading?.value !== null && s?.lastReading?.value !== undefined
        ? `${s.lastReading.value}${st.unit ? " " + st.unit : s.unit ? " " + s.unit : ""}`
        : "-";

    const isAlert = String(s.status || "").toUpperCase() !== "OK";
    const item = { name: s.name || st.label || s.sensorType, value: `ค่า - ${lastV}`, isAlert };

    if (!groups.has(groupLabel)) groups.set(groupLabel, []);
    groups.get(groupLabel).push(item);
  }

  const out = [];
  for (const [group, items] of groups.entries()) out.push({ group, items });

  if (!out.length) {
    return [{ group: "เซนเซอร์", items: [{ name: "—", value: "ยังไม่มีข้อมูลเซนเซอร์", isAlert: false }] }];
  }
  return out;
}

export default function DashboardPage() {
  const router = useRouter();

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
      return { display: "grid", gridTemplateColumns: "1fr", gridTemplateAreas: `"forecast" "mid" "right"`, gap: 12 };
    }
    if (isTablet) {
      return { display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateAreas: `"forecast forecast" "mid right"`, gap: 14 };
    }
    return { display: "grid", gridTemplateColumns: "2fr 1.1fr 1.1fr", gridTemplateAreas: `"forecast mid right"`, gap: 16 };
  }, [isMobile, isTablet]);

  const gridMiddle = useMemo(() => {
    if (isMobile) {
      return { display: "grid", gridTemplateColumns: "1fr", gridTemplateAreas: `"map" "status" "issue"`, gap: 12 };
    }
    if (isTablet) {
      return { display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateAreas: `"map map" "status issue"`, gap: 14 };
    }
    return { display: "grid", gridTemplateColumns: "2fr 1.1fr 1.1fr", gridTemplateAreas: `"map status issue"`, gap: 16 };
  }, [isMobile, isTablet]);

  const gridPins = useMemo(() => {
    if (isMobile) return { display: "grid", gridTemplateColumns: "1fr", gap: 12 };
    if (isTablet) return { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 };
    return { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, alignItems: "stretch", gridAutoRows: "1fr" };
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
    return { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 10 };
  }, [isMobile]);

  const pinPillRow = useMemo(() => {
    if (isMobile) return { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginBottom: 12 };
    return { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginBottom: 12 };
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
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });
      setPinIcon(icon);
    });
    return () => {
      mounted = false;
    };
  }, [isClient]);

  // ============================
  // ✅ Auth + Data state
  // ============================
  const [token, setToken] = useState("");
  const [me, setMe] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [forecastDays, setForecastDays] = useState([]);

  const [plots, setPlots] = useState([DEMO_PLOT]);
  const [selectedPlotId, setSelectedPlotId] = useState("__demo__");
  const selectedPlot = useMemo(() => plots.find((p) => String(p.id) === String(selectedPlotId)) || DEMO_PLOT, [plots, selectedPlotId]);

  const [polygons, setPolygons] = useState([{ id: "demo-poly", coords: DEMO_POLYGON, color: "#16a34a" }]);
  const [pins, setPins] = useState(DEMO_PINS);
  const [sensorTypes, setSensorTypes] = useState([]);
  const sensorTypeMap = useMemo(() => {
    const m = new Map();
    for (const t of sensorTypes || []) m.set(t.key, t);
    return m;
  }, [sensorTypes]);

  const [sensorsByPinId, setSensorsByPinId] = useState({});
  const [mode, setMode] = useState("demo"); // demo | cache | live
  const [cacheTs, setCacheTs] = useState(null);

  // ============================
  // ✅ Mount: token + cache + lastPlot
  // ============================
  useEffect(() => {
    if (!isClient) return;

    const tk = getStoredToken();
    if (tk) setToken(tk);

    const lastPlot = (() => {
      try {
        return localStorage.getItem(LS_LAST_PLOT_ID) || "";
      } catch {
        return "";
      }
    })();

    const cache = loadCache();
    if (cache?.data) {
      setCacheTs(cache.ts || null);
      const cachedPlots = Array.isArray(cache.data.plots) ? cache.data.plots : [];
      const mergedPlots = [DEMO_PLOT, ...cachedPlots.filter((p) => p && p.id)];
      setPlots(mergedPlots.length ? mergedPlots : [DEMO_PLOT]);

      const nextId =
        (lastPlot && mergedPlots.some((p) => String(p.id) === String(lastPlot)) && lastPlot) ||
        (cachedPlots?.[0]?.id || "__demo__");

      setSelectedPlotId(nextId);

      setSensorTypes(Array.isArray(cache.data.sensorTypes) ? cache.data.sensorTypes : []);

      const perPlot = cache.data.byPlot?.[String(nextId)] || null;
      if (perPlot) {
        setPolygons(perPlot.polygons || []);
        setPins(perPlot.pins || []);
        setSensorsByPinId(perPlot.sensorsByPinId || {});
      }

      setMode("cache");
    } else {
      setMode("demo");
    }

    if (lastPlot) setSelectedPlotId(lastPlot);
  }, [isClient]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_LAST_PLOT_ID, String(selectedPlotId));
    } catch {}
  }, [selectedPlotId]);

  // verify /me
  useEffect(() => {
    if (!token) {
      setMe(null);
      return;
    }
    let cancelled = false;
    apiFetch("/me", { token })
      .then((d) => {
        if (!cancelled) setMe(d?.user || null);
      })
      .catch(() => {
        if (!cancelled) setMe(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // ============================
  // ✅ Redirect if no token (optional)
  // ถ้าคุณอยากให้ dashboard เข้าได้เฉพาะ login ให้เปิดบรรทัดนี้
  // ============================
  // useEffect(() => {
  //   if (isClient && !token) router.replace("/login");
  // }, [isClient, token, router]);

  function onLogout() {
    clearStoredToken();
    setToken("");
    setMe(null);
    setLoadError("");
    router.push("/login"); // ✅ logout แล้วเด้งไป login
  }

  // ============================
  // ✅ Load plots + sensor-types after login
  // ============================
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function loadAfterLogin() {
      setLoading(true);
      setLoadError("");
      try {
        const st = await apiFetch("/api/sensor-types", { token });
        if (cancelled) return;
        setSensorTypes(st?.items || []);

        const pl = await apiFetch("/api/plots", { token });
        if (cancelled) return;
        const items = (pl?.items || []).map((p) => ({ ...p, id: String(p.id || p._id || "") }));

        setPlots([DEMO_PLOT, ...items]);

        const valid = items.some((p) => String(p.id) === String(selectedPlotId));
        if (!valid) setSelectedPlotId(items?.[0]?.id || "__demo__");

        setMode("live");

        const cache = loadCache()?.data || { plots: [], byPlot: {}, sensorTypes: [] };
        const ts = new Date().toISOString();
        saveCache({ ts, data: { ...cache, plots: items, sensorTypes: st?.items || [] } });
        setCacheTs(ts);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e?.message || "โหลดข้อมูลไม่สำเร็จ");
          setMode(loadCache()?.data ? "cache" : "demo");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAfterLogin();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ============================
  // ✅ Load plot data (polygons/pins/sensors)
  // ============================
  useEffect(() => {
    if (selectedPlotId === "__demo__") {
      setPolygons([{ id: "demo-poly", coords: DEMO_POLYGON, color: "#16a34a" }]);
      setPins(DEMO_PINS);
      setSensorsByPinId({});
      if (!token) setMode(loadCache()?.data ? "cache" : "demo");
      return;
    }

    if (!token) {
      const cache = loadCache();
      const perPlot = cache?.data?.byPlot?.[String(selectedPlotId)] || null;
      if (perPlot) {
        setPolygons(perPlot.polygons || []);
        setPins(perPlot.pins || []);
        setSensorsByPinId(perPlot.sensorsByPinId || {});
        setCacheTs(cache.ts || null);
        setMode("cache");
      } else {
        setSelectedPlotId("__demo__");
      }
      return;
    }

    let cancelled = false;
    async function loadPlotLive() {
      setLoading(true);
      setLoadError("");
      try {
        const poly = await apiFetch(`/api/plots/${selectedPlotId}/polygons`, { token });
        if (cancelled) return;
        const polyItems = poly?.items || [];
        setPolygons(polyItems);

        const pinsRes = await apiFetch(`/api/dashboard/pins?plotId=${encodeURIComponent(selectedPlotId)}`, { token });
        if (cancelled) return;
        const pinsRaw = (pinsRes?.items || []).map((x) => ({
          ...x,
          id: String(x.id || x._id || ""),
          number: safeNum(x.number, 0),
          lat: Number(x.lat),
          lng: Number(x.lng),
          nodeId: x.nodeId ? String(x.nodeId) : null,
        }));
        setPins(pinsRaw);

        const sensorsRes = await apiFetch(`/api/sensors?plotId=${encodeURIComponent(selectedPlotId)}&sensorType=all`, { token });
        if (cancelled) return;
        const sensors = (sensorsRes?.items || []).map((x) => ({
          ...x,
          id: String(x.id || x._id || ""),
          pinId: x.pinId ? String(x.pinId) : null,
        }));

        const map = {};
        for (const ss of sensors) {
          const pid = ss.pinId || "__no_pin__";
          if (!map[pid]) map[pid] = [];
          map[pid].push(ss);
        }
        setSensorsByPinId(map);

        setMode("live");

        const cache = loadCache()?.data || { plots: [], byPlot: {}, sensorTypes: sensorTypes || [] };
        const newByPlot = { ...(cache.byPlot || {}) };
        newByPlot[String(selectedPlotId)] = { polygons: polyItems, pins: pinsRaw, sensorsByPinId: map };
        const ts = new Date().toISOString();
        saveCache({ ts, data: { ...cache, byPlot: newByPlot, sensorTypes: sensorTypes || cache.sensorTypes || [] } });
        setCacheTs(ts);
      } catch (e) {
        if (!cancelled) {
          if (e?.status === 401) router.replace("/login");
          setLoadError(e?.message || "โหลดข้อมูลแปลงไม่สำเร็จ");
          setMode(loadCache()?.data ? "cache" : "demo");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPlotLive();
    return () => {
      cancelled = true;
    };
  }, [token, selectedPlotId, sensorTypes, router]);

  // ============================
  // ✅ Weather effect
  // ============================
  useEffect(() => {
    let cancelled = false;
    async function loadWeather() {
      try {
        const latestPoly = polygons?.[0];
        let latLng = centroidOfPolygon(latestPoly?.coords);

        if (!latLng) {
          const firstPin = (pins || []).find((p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)));
          if (firstPin) latLng = [Number(firstPin.lat), Number(firstPin.lng)];
        }
        if (!latLng) latLng = centroidOfPolygon(DEMO_POLYGON) || [13.3, 101.1];

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
  }, [polygons, pins, selectedPlotId]);

  // ============================
  // ✅ Derived UI
  // ============================
  const mapPolygonPositions = useMemo(() => {
    const latest = polygons?.[0];
    const coords = latest?.coords;
    if (Array.isArray(coords) && coords.length >= 3) return coords;
    return DEMO_POLYGON;
  }, [polygons]);

  const mapPinsForMap = useMemo(() => {
    const list = (pins || []).filter((p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)));
    if (list.length) {
      return list
        .slice()
        .sort((a, b) => safeNum(a.number, 0) - safeNum(b.number, 0))
        .map((p) => ({
          id: p.id,
          position: [Number(p.lat), Number(p.lng)],
          label: `Pin ${safeNum(p.number, 0)}`,
          number: safeNum(p.number, 0),
        }));
    }
    return DEMO_PINS.map((p) => ({ id: p.id, position: [p.lat, p.lng], label: `Pin ${p.number}`, number: p.number }));
  }, [pins]);

  const pinCards = useMemo(() => {
    const list = (pins || []).filter((p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)));
    if (list.length) return list.slice().sort((a, b) => safeNum(a.number, 0) - safeNum(b.number, 0)).slice(0, 3);
    return DEMO_PINS;
  }, [pins]);

  // Correct top cards
  const today = forecastDays?.[0] || null;
  const tempRangeText = today ? `${safeNum(today.tempMin, 0)} – ${safeNum(today.tempMax, 0)} °C` : "—";
  const rainChanceToday = today ? safeNum(today.rainChance, 0) : 0;
  const rainSum7 = useMemo(() => {
    if (!forecastDays?.length) return null;
    const sum = forecastDays.reduce((acc, d) => acc + safeNum(d.rainSum, 0), 0);
    return Math.round(sum);
  }, [forecastDays]);

  const adviceText = useMemo(() => {
    if (!forecastDays?.length) return "กำลังโหลดพยากรณ์อากาศ...";
    const next3 = forecastDays.slice(0, 3).map((d) => safeNum(d.rainChance, 0));
    const max3 = Math.max(...next3);
    if (max3 >= 70) return "มีโอกาสฝนสูงใน 2–3 วันข้างหน้า ควรเตรียมระบบระบายน้ำ/ตรวจร่องน้ำในแปลง";
    if (max3 >= 40) return "ช่วงนี้มีโอกาสฝนปานกลาง ควรเฝ้าระวังความชื้นดินและปรับรอบให้น้ำให้เหมาะสม";
    return "ฝนค่อนข้างน้อย เหมาะกับการจัดการให้น้ำตามแผน และตรวจความชื้นดินเป็นระยะ";
  }, [forecastDays]);

  const pinCount = (pins || []).length;

  const issueCount = useMemo(() => {
    const allPins = Object.keys(sensorsByPinId || {});
    let n = 0;
    for (const pid of allPins) {
      const arr = sensorsByPinId?.[pid] || [];
      for (const s of arr) {
        if (String(s.status || "").toUpperCase() !== "OK") n += 1;
      }
    }
    return n;
  }, [sensorsByPinId]);

  const statusText = useMemo(() => {
    if (mode === "live") return "อัปเดตจากระบบ";
    if (mode === "cache") return `แสดงข้อมูลล่าสุดจากเครื่อง${cacheTs ? ` • อัปเดต: ${prettyTs(cacheTs)}` : ""}`;
    return "โหมด Demo";
  }, [mode, cacheTs]);

  const daysUI = useMemo(() => {
    if (forecastDays?.length) {
      return forecastDays.map((d) => ({
        day: d.day,
        temp: `${safeNum(d.tempMax, 0)}°`,
        rain: `${safeNum(d.rainChance, 0)}%`,
        emoji: weatherEmoji(d.rainChance),
      }));
    }
    return [
      { day: "จันทร์", temp: "32°", rain: "40%", emoji: "🌤️" },
      { day: "อังคาร", temp: "31°", rain: "60%", emoji: "🌦️" },
      { day: "พุธ", temp: "30°", rain: "80%", emoji: "🌧️" },
      { day: "พฤหัส", temp: "32°", rain: "20%", emoji: "🌤️" },
      { day: "ศุกร์", temp: "34°", rain: "10%", emoji: "🌤️" },
      { day: "เสาร์", temp: "31°", rain: "50%", emoji: "🌦️" },
      { day: "อาทิตย์", temp: "32°", rain: "30%", emoji: "🌤️" },
    ];
  }, [forecastDays]);

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
          {/* ===== Header Bar ===== */}
          <div style={{ ...cardBaseR, marginBottom: 16 }} className="du-card">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginRight: 6 }}>
                เชื่อม Backend:{" "}
                <span style={{ fontWeight: 800, color: token ? "#16a34a" : "#ef4444" }}>
                  {token ? "พร้อมใช้งาน" : mode === "cache" ? "ออฟไลน์ (ใช้ข้อมูลเก่า)" : "โหมด Demo"}
                </span>
              </div>

              <div style={{ flex: 1, minWidth: 220, color: "#6b7280", fontSize: 12 }}>
                API: {API_BASE_URL}
                {loading ? " • กำลังโหลด..." : ""}
                {loadError ? ` • ${loadError}` : ""}
                {" • Weather: Open-Meteo (frontend)"}
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ fontSize: 12, color: "#374151" }}>{me?.email ? `ผู้ใช้: ${me.email}` : "ผู้ใช้: -"}</div>
                <button
                  onClick={onLogout}
                  style={{
                    border: "none",
                    borderRadius: 999,
                    padding: "8px 12px",
                    background: "#111827",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Logout
                </button>
              </div>
            </div>

            {/* ✅ Select plot */}
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <div style={{ fontSize: 12, color: "#374151", fontWeight: 700 }}>แปลง:</div>
              <select
                value={selectedPlotId}
                onChange={(e) => setSelectedPlotId(e.target.value)}
                style={{
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.6)",
                  padding: "8px 12px",
                  outline: "none",
                  background: "#fff",
                  fontWeight: 700,
                  minWidth: 260,
                }}
              >
                {plots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.plotName || p.name || p.alias || p.id}
                  </option>
                ))}
              </select>

              <div style={{ fontSize: 12, color: "#6b7280" }}>
                ผู้ดูแล: {selectedPlot?.caretaker || selectedPlot?.ownerName || "-"} • พืช:{" "}
                {selectedPlot?.plantType || selectedPlot?.cropType || "-"} • เริ่มปลูก:{" "}
                {formatThaiDate(selectedPlot?.plantedAt) || "-"}
              </div>
            </div>
          </div>

          {/* ===== Top Row ===== */}
          <div style={{ ...gridTop, marginBottom: 16 }}>
            <div style={{ ...cardBaseR, gridArea: "forecast" }} className="du-card">
              <div className="du-card-title" style={{ ...title18, marginBottom: 6 }}>
                พยากรณ์อากาศ 7 วันข้างหน้า
              </div>

              <div style={{ marginTop: 8, overflowX: isMobile ? "auto" : "visible" }}>
                <div style={gridWeather} className="du-grid-4">
                  {daysUI.map((d) => (
                    <div
                      key={d.day}
                      style={{
                        background: "#eef3ff",
                        borderRadius: 18,
                        padding: isMobile ? 10 : 8,
                        textAlign: "center",
                        minWidth: 0,
                        scrollSnapAlign: "start",
                        boxShadow: isMobile ? "0 2px 8px rgba(15,23,42,0.10)" : "none",
                        border: "1px solid rgba(148,163,184,0.35)",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{d.day}</div>
                      <div style={{ fontSize: 22, margin: "6px 0 2px" }}>{d.emoji}</div>
                      <div style={{ fontSize: isMobile ? 18 : 18, fontWeight: 800, lineHeight: 1.1 }}>{d.temp}</div>
                      <div style={{ fontSize: 11, color: "#4b5563", marginTop: 4 }}>โอกาสฝนตก {d.rain}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ gridArea: "mid", display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
              <div style={{ ...cardBaseR, background: "#1d4ed8", color: "#ffffff" }} className="du-card">
                <div className="du-card-title" style={{ ...title18, marginBottom: 4 }}>
                  อุณหภูมิปัจจุบัน (วันนี้)
                </div>
                <div style={{ ...bigTemp, marginBottom: 4, color: "#bfdbfe" }}>{tempRangeText}</div>
                <div style={{ fontSize: 13, color: "#e0e7ff", lineHeight: 1.5 }}>
                  {forecastDays?.length ? "อิงจากพยากรณ์รายวันของพื้นที่แปลง" : "กำลังโหลด..."}
                </div>
              </div>

              <div style={{ ...cardBaseR, background: "#facc15", color: "#111827" }} className="du-card">
                <div className="du-card-title" style={{ ...title18, marginBottom: 4 }}>
                  โอกาสฝนตก (วันนี้)
                </div>
                <div style={{ ...bigNum, marginBottom: 2 }}>{forecastDays?.length ? `${rainChanceToday}%` : "—"}</div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>อิงจาก precipitation probability (รายวัน)</div>
              </div>
            </div>

            <div style={{ gridArea: "right", display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
              <div className="du-card" style={{ ...cardBaseR, background: "#ef4444", color: "#ffffff" }}>
                <div className="du-card-title" style={{ ...title18, marginBottom: 8 }}>
                  คำแนะนำ
                </div>
                <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6 }}>{adviceText}</p>
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
                  ปริมาณน้ำฝน (7 วัน)
                </div>
                <div style={{ ...bigNum, marginBottom: 2 }}>{rainSum7 === null ? "—" : `${rainSum7} mm`}</div>
                <div style={{ fontSize: 12, opacity: 0.95, lineHeight: 1.5 }}>รวมจาก precipitation_sum รายวัน</div>
              </div>
            </div>
          </div>

          {/* ===== Middle Row ===== */}
          <div style={{ ...gridMiddle, marginBottom: 16 }} className="du-grid-3">
            <div style={{ ...cardBaseR, gridArea: "map" }} className="du-card">
              <div className="du-card-title" style={{ ...title18, marginBottom: 8 }}>
                แผนที่และทรัพยากร
              </div>
              <div style={{ borderRadius: isMobile ? 18 : 22, overflow: "hidden", boxShadow: "0 8px 18px rgba(15,23,42,0.18)" }}>
                {isClient && (
                  <MapContainer center={[13.3, 101.1]} zoom={11} scrollWheelZoom={true} style={{ height: mapHeight, width: "100%" }}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Polygon positions={mapPolygonPositions} pathOptions={{ color: "#16a34a", weight: 2, fillColor: "#86efac", fillOpacity: 0.4 }} />
                    {pinIcon &&
                      mapPinsForMap.map((p) => (
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
              <div style={{ fontSize: 12, color: "#166534", marginBottom: 6 }}>{statusText}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: isMobile ? 28 : 32, fontWeight: 800, color: "#15803d" }}>{pinCount}</span>
                <span style={{ fontSize: 14 }}>จุดวัด (Pins) ในแปลง</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ padding: "4px 10px", borderRadius: 999, background: "#22c55e", color: "#fff", fontSize: 12, fontWeight: 600 }}>
                  พบ {pinCount} จุด
                </span>
                <span style={{ padding: "4px 10px", borderRadius: 999, background: "#e5e7eb", fontSize: 12, fontWeight: 500 }}>
                  (Online/Offline จริงต้องมีข้อมูลจาก Node)
                </span>
              </div>
            </div>

            <div style={{ ...cardBaseR, gridArea: "issue", background: "#fed7aa" }} className="du-card">
              <div className="du-card-title" style={{ ...title18, marginBottom: 8 }}>
                ปัญหาพื้นที่
              </div>
              <p style={{ fontSize: 13, marginBottom: 6, lineHeight: 1.55 }}>
                {mode === "demo"
                  ? "โหมดตัวอย่าง (ยังไม่ได้ดึงข้อมูลเซนเซอร์จริง)"
                  : issueCount > 0
                  ? `พบเซนเซอร์ผิดปกติ ${issueCount} รายการ`
                  : "ยังไม่พบปัญหา (ทุกเซนเซอร์สถานะ OK)"}
              </p>
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: mode === "demo" ? "#9ca3af" : issueCount > 0 ? "#f97316" : "#22c55e",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {mode === "demo" ? "ℹ️ DEMO" : issueCount > 0 ? "⚠️ ต้องตรวจสอบ" : "✅ ปกติ"}
              </span>
            </div>
          </div>

          {/* ===== Bottom Row: Pin Cards ===== */}
          <div style={gridPins} className="du-grid-3">
            {pinCards.map((pin) => {
              const pinId = String(pin.id || "__no_pin__");
              const pinNumber = safeNum(pin.number, 0);

              const sensors = sensorsByPinId?.[pinId] || [];
              const groups = mode === "demo" ? getDemoGroups(pinNumber) : buildGroupsFromSensors(sensors, sensorTypeMap);

              const hasAlert = mode !== "demo" && sensors.some((s) => String(s.status || "").toUpperCase() !== "OK");
              const backgroundColor = hasAlert ? "#FFBABA" : "#dfffee";

              const sensorTypeCount = mode === "demo" ? 6 : new Set(sensors.map((s) => s.sensorType).filter(Boolean)).size;

              return (
                <div
                  key={pinId}
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
                      <span style={{ ...pinTitle, fontSize: isMobile ? 16 : 18 }}>ข้อมูล : Pin {pinNumber}</span>
                      <span style={pinSubtitle}>
                        พิกัด {Number(pin.lat).toFixed ? Number(pin.lat).toFixed(5) : pin.lat},{" "}
                        {Number(pin.lng).toFixed ? Number(pin.lng).toFixed(5) : pin.lng}
                      </span>
                    </div>
                    <span style={{ ...pinStatus, fontSize: isMobile ? 16 : 18 }}>{mode === "demo" ? "DEMO" : hasAlert ? "WARN" : "ON"}</span>
                  </div>

                  <div style={pinPillRow}>
                    <div style={pinInfoPill}>
                      <div style={pinInfoLabel}>ผู้ดูแล</div>
                      <div style={pinInfoValue}>{selectedPlot?.caretaker || selectedPlot?.ownerName || "—"}</div>
                    </div>
                    <div style={pinInfoPill}>
                      <div style={pinInfoLabel}>ประเภทพืช</div>
                      <div style={pinInfoValue}>{selectedPlot?.plantType || selectedPlot?.cropType || "—"}</div>
                    </div>
                    <div style={pinInfoPill}>
                      <div style={pinInfoLabel}>วันที่เริ่มปลูก</div>
                      <div style={pinInfoValue}>{formatThaiDate(selectedPlot?.plantedAt) || "-"}</div>
                    </div>
                    <div style={pinInfoPill}>
                      <div style={pinInfoLabel}>จำนวนเซนเซอร์</div>
                      <div style={pinInfoValue}>{mode === "demo" ? "6 ชนิด" : `${sensorTypeCount} ชนิด`}</div>
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
                            const nameStyle = { ...pinSensorName, color: isAlert ? "#b91c1c" : "#111827" };
                            const valueStyle = { ...pinSensorValue, color: isAlert ? "#b91c1c" : "#6b7280", fontWeight: isAlert ? 600 : 400 };
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