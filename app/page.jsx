"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";

// --- dynamic import React-Leaflet (client only) ---
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Polygon = dynamic(() => import("react-leaflet").then((m) => m.Polygon), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });

// ✅ Fit bounds helper component (client only)
const FitToAll = dynamic(
  async () => {
    const RL = await import("react-leaflet");
    const { useMap } = RL;

    return function FitToAllInner({ points = [] }) {
      const map = useMap();
      useEffect(() => {
        let cancelled = false;
        (async () => {
          try {
            const L = await import("leaflet");
            if (cancelled) return;

            const valid = (points || [])
              .map((p) => [Number(p?.[0]), Number(p?.[1])])
              .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));

            if (!valid.length) return;

            const bounds = L.latLngBounds(valid.map((p) => L.latLng(p[0], p[1])));
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
    };
  },
  { ssr: false }
);

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
const outerWrap = { width: "100%", display: "flex", justifyContent: "center", overflowX: "hidden", minHeight: "100vh" };
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
// ✅ Robust polygon parser (fix missing polygons)
// ============================
function maybeSwapLngLat(pair) {
  const a = Number(pair?.[0]);
  const b = Number(pair?.[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (Math.abs(a) > 90 && Math.abs(b) <= 90) return [b, a]; // swap if looks like [lng,lat]
  return [a, b]; // assume [lat,lng]
}
function normalizePairList(list) {
  if (!Array.isArray(list)) return null;

  // [{lat,lng}, ...]
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

  // [[x,y], ...]
  const out = list.map((p) => maybeSwapLngLat(p)).filter(Boolean);
  return out.length >= 3 ? out : null;
}
function extractRingsFromAny(raw) {
  if (!raw) return [];

  // GeoJSON object
  if (typeof raw === "object" && !Array.isArray(raw) && raw.type && raw.coordinates) {
    raw = raw.coordinates;
  }

  if (!Array.isArray(raw)) return [];

  // direct ring: [[lat,lng],...]
  const direct = normalizePairList(raw);
  if (direct) return [direct];

  // Polygon: [ [ [lng,lat],... ], ... ]
  if (Array.isArray(raw[0]) && Array.isArray(raw[0][0]) && typeof raw[0][0][0] === "number") {
    const outer = normalizePairList(raw[0]);
    return outer ? [outer] : [];
  }

  // MultiPolygon: [ [ [ [lng,lat],... ] ], ... ]
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

  // fallback: try each item
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

    const sources = [p?.coords, p?.coordinates, p?.latlngs, p?.points, p?.geometry, p?.geojson].filter(Boolean);
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

export default function DashboardAllPlotsPage() {
  const router = useRouter();

  const [isClient, setIsClient] = useState(false);
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

  const mapHeight = isMobile ? 240 : isTablet ? 300 : 320;

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
    return { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, alignItems: "stretch" };
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

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [cacheTs, setCacheTs] = useState(null);

  const [forecastDays, setForecastDays] = useState([]);

  // ✅ ALL PLOTS
  const [plots, setPlots] = useState([]);
  const [sensorTypes, setSensorTypes] = useState([]);
  const sensorTypeMap = useMemo(() => {
    const m = new Map();
    for (const t of sensorTypes || []) m.set(t.key, t);
    return m;
  }, [sensorTypes]);

  // ✅ ALL polygons + ALL pins across all plots
  const [polygonsAll, setPolygonsAll] = useState([]); // [{id, plotId, plotName, coords, color}]
  const [pinsAll, setPinsAll] = useState([]); // [{id, plotId, plotName, number, lat, lng}]
  const [sensorsByPinId, setSensorsByPinId] = useState({}); // pinId -> sensors[]

  // ============================
  // ✅ Mount: token + redirect
  // ============================
  useEffect(() => {
    if (!isClient) return;
    const tk = getStoredToken();
    if (!tk) {
      router.replace("/login");
      return;
    }
    setToken(tk);
  }, [isClient, router]);

  // ============================
  // ✅ Load everything (ALL plots)
  // ============================
  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    async function loadAll() {
      setLoading(true);
      setLoadError("");
      try {
        // 1) sensor types
        const st = await apiFetch("/api/sensor-types", { token });
        if (cancelled) return;
        setSensorTypes(st?.items || []);

        // 2) plots
        const pl = await apiFetch("/api/plots", { token });
        if (cancelled) return;
        const plotItems = (pl?.items || [])
          .map((p) => ({
            ...p,
            id: String(p.id || p._id || ""),
            plotName: p.plotName || p.name || p.alias || "",
          }))
          .filter((p) => p.id);
        setPlots(plotItems);

        // 3) polygons + pins + sensors for each plot (Promise.all)
        const polyPromises = plotItems.map((p) =>
          apiFetch(`/api/plots/${p.id}/polygons`, { token }).then((res) => ({
            plotId: p.id,
            plotName: p.plotName,
            items: res?.items || [],
          }))
        );

        const pinPromises = plotItems.map((p) =>
          apiFetch(`/api/dashboard/pins?plotId=${encodeURIComponent(p.id)}`, { token }).then((res) => ({
            plotId: p.id,
            plotName: p.plotName,
            items: res?.items || [],
          }))
        );

        const sensorPromises = plotItems.map((p) =>
          apiFetch(`/api/sensors?plotId=${encodeURIComponent(p.id)}&sensorType=all`, { token }).then((res) => ({
            plotId: p.id,
            plotName: p.plotName,
            items: res?.items || [],
          }))
        );

        const [polysByPlot, pinsByPlot, sensorsByPlot] = await Promise.all([
          Promise.all(polyPromises),
          Promise.all(pinPromises),
          Promise.all(sensorPromises),
        ]);
        if (cancelled) return;

        // normalize polygons
        const allPolys = [];
        for (const pp of polysByPlot) {
          const normalized = normalizePolygons(pp.items, pp.plotId, pp.plotName);
          allPolys.push(...normalized);
        }
        setPolygonsAll(allPolys);

        // normalize pins
        const allPins = [];
        for (const pr of pinsByPlot) {
          const pinsNorm = (pr.items || [])
            .map((x) => ({
              ...x,
              id: String(x.id || x._id || ""),
              plotId: pr.plotId,
              plotName: pr.plotName,
              number: safeNum(x.number, 0),
              lat: Number(x.lat),
              lng: Number(x.lng),
              nodeId: x.nodeId ? String(x.nodeId) : null,
            }))
            .filter((p) => p.id && Number.isFinite(p.lat) && Number.isFinite(p.lng));
          allPins.push(...pinsNorm);
        }
        setPinsAll(allPins);

        // normalize sensors map by pin
        const pinMap = {};
        for (const sr of sensorsByPlot) {
          const sensors = (sr.items || []).map((x) => ({
            ...x,
            id: String(x.id || x._id || ""),
            pinId: x.pinId ? String(x.pinId) : null,
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
          setLoadError(e?.message || "โหลดข้อมูลไม่สำเร็จ");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  // ============================
  // ✅ Weather effect
  // ============================
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
          const firstPin = (pinsAll || []).find((p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)));
          if (firstPin) latLng = [Number(firstPin.lat), Number(firstPin.lng)];
        }

        if (!latLng) latLng = [13.736717, 100.523186]; // fallback only for weather

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

  // ============================
  // ✅ Derived UI (ALL)
  // ============================
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
    if (any && Number.isFinite(Number(any[0])) && Number.isFinite(Number(any[1]))) return [Number(any[0]), Number(any[1])];
    return [13.736717, 100.523186];
  }, [allMapPoints]);

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

  // ✅ show ALL pins as cards (no slice)
  const pinCards = useMemo(() => {
    return (pinsAll || []).slice().sort((a, b) => safeNum(a.number, 0) - safeNum(b.number, 0));
  }, [pinsAll]);

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

  const pinCount = (pinsAll || []).length;
  const plotCount = (plots || []).length;
  const polyCount = (polygonsAll || []).length;

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
    return `อัปเดตจากระบบ${cacheTs ? ` • อัปเดต: ${prettyTs(cacheTs)}` : ""}`;
  }, [cacheTs]);

  const daysUI = useMemo(() => {
    if (forecastDays?.length) {
      return forecastDays.map((d) => ({
        day: d.day,
        temp: `${safeNum(d.tempMax, 0)}°`,
        rain: `${safeNum(d.rainChance, 0)}%`,
        emoji: weatherEmoji(d.rainChance),
      }));
    }
    return [];
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
          {/* ===== Header Bar REMOVED (ผู้ใช้/แปลง/Logout ถูกลบออกทั้งหมด) ===== */}

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
                  {!daysUI.length && (
                    <div style={{ padding: 10, color: "#6b7280", fontSize: 12 }}>
                      {loading ? "กำลังโหลด..." : loadError ? loadError : "กำลังโหลดข้อมูลพยากรณ์อากาศ..."}
                    </div>
                  )}
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
                แผนที่และทรัพยากร (ทุกแปลง)
              </div>
              <div style={{ borderRadius: isMobile ? 18 : 22, overflow: "hidden", boxShadow: "0 8px 18px rgba(15,23,42,0.18)" }}>
                {isClient && (
                  <MapContainer center={mapCenter} zoom={12} scrollWheelZoom={true} style={{ height: mapHeight, width: "100%" }}>
                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    {/* ✅ Fit ให้เห็นทุกแปลงทั้งหมด */}
                    <FitToAll points={allMapPoints} />

                    {/* ✅ polygons ทุกแปลง */}
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

                    {/* ✅ pins ทุกแปลง */}
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
                สถานะรวม (ทุกแปลง)
              </div>
              <div style={{ fontSize: 12, color: "#166534", marginBottom: 6 }}>{statusText}</div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span style={{ padding: "4px 10px", borderRadius: 999, background: "#22c55e", color: "#fff", fontSize: 12, fontWeight: 600 }}>
                  แปลง {plotCount}
                </span>
                <span style={{ padding: "4px 10px", borderRadius: 999, background: "#22c55e", color: "#fff", fontSize: 12, fontWeight: 600 }}>
                  Pins {pinCount}
                </span>
                <span style={{ padding: "4px 10px", borderRadius: 999, background: "#22c55e", color: "#fff", fontSize: 12, fontWeight: 600 }}>
                  Polygons {polyCount}
                </span>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "#166534" }}>
                {loading ? "กำลังโหลดข้อมูลทุกแปลง..." : loadError ? `ผิดพลาด: ${loadError}` : "พร้อมใช้งาน"}
              </div>
            </div>

            <div style={{ ...cardBaseR, gridArea: "issue", background: "#fed7aa" }} className="du-card">
              <div className="du-card-title" style={{ ...title18, marginBottom: 8 }}>
                ปัญหารวม (ทุกแปลง)
              </div>
              <p style={{ fontSize: 13, marginBottom: 6, lineHeight: 1.55 }}>
                {issueCount > 0 ? `พบเซนเซอร์ผิดปกติ ${issueCount} รายการ` : "ยังไม่พบปัญหา (ทุกเซนเซอร์สถานะ OK)"}
              </p>
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: issueCount > 0 ? "#f97316" : "#22c55e",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {issueCount > 0 ? "⚠️ ต้องตรวจสอบ" : "✅ ปกติ"}
              </span>
            </div>
          </div>

          {/* ===== Bottom Row: Pin Cards (ALL PLOTS, ALL PINS) ===== */}
          <div style={gridPins} className="du-grid-3">
            {pinCards.map((pin) => {
              const pinId = String(pin.id || "__no_pin__");
              const pinNumber = safeNum(pin.number, 0);

              const sensors = sensorsByPinId?.[pinId] || [];
              const groups = buildGroupsFromSensors(sensors, sensorTypeMap);

              const hasAlert = sensors.some((s) => String(s.status || "").toUpperCase() !== "OK");
              const backgroundColor = hasAlert ? "#FFBABA" : "#dfffee";
              const sensorTypeCount = new Set(sensors.map((s) => s.sensorType).filter(Boolean)).size;

              const plotMeta = plots.find((p) => String(p.id) === String(pin.plotId)) || null;

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
                      <span style={{ ...pinTitle, fontSize: isMobile ? 16 : 18 }}>
                        {pin.plotName ? `${pin.plotName} • ` : ""}Pin {pinNumber}
                      </span>
                      <span style={pinSubtitle}>
                        พิกัด {Number(pin.lat).toFixed ? Number(pin.lat).toFixed(5) : pin.lat},{" "}
                        {Number(pin.lng).toFixed ? Number(pin.lng).toFixed(5) : pin.lng}
                      </span>
                    </div>
                    <span style={{ ...pinStatus, fontSize: isMobile ? 16 : 18 }}>{hasAlert ? "WARN" : "ON"}</span>
                  </div>

                  <div style={pinPillRow}>
                    <div style={pinInfoPill}>
                      <div style={pinInfoLabel}>แปลง</div>
                      <div style={pinInfoValue}>{pin.plotName || pin.plotId || "—"}</div>
                    </div>
                    <div style={pinInfoPill}>
                      <div style={pinInfoLabel}>พืช</div>
                      <div style={pinInfoValue}>{plotMeta?.plantType || plotMeta?.cropType || "—"}</div>
                    </div>
                    <div style={pinInfoPill}>
                      <div style={pinInfoLabel}>เริ่มปลูก</div>
                      <div style={pinInfoValue}>{formatThaiDate(plotMeta?.plantedAt) || "-"}</div>
                    </div>
                    <div style={pinInfoPill}>
                      <div style={pinInfoLabel}>ชนิดเซนเซอร์</div>
                      <div style={pinInfoValue}>{`${sensorTypeCount || 0} ชนิด`}</div>
                    </div>
                  </div>

                  <div style={{ flex: 1, overflow: "auto" }}>
                    {groups.map((g) => (
                      <div key={`${pinId}-${g.group}`} style={pinGroupContainer}>
                        <div style={pinGroupLabel}>{g.group}</div>
                        <div style={pinGroupGrid}>
                          {g.items.map((it) => {
                            const isAlertItem = !!it.isAlert;
                            const itemStyle = {
                              ...pinGroupItem,
                              background: isAlertItem ? "#fef9c3" : "#f9fafb",
                              boxShadow: isAlertItem ? "0 0 0 1px #facc15" : pinGroupItem.boxShadow,
                            };
                            const nameStyle = { ...pinSensorName, color: isAlertItem ? "#b91c1c" : "#111827" };
                            const valueStyle = {
                              ...pinSensorValue,
                              color: isAlertItem ? "#b91c1c" : "#6b7280",
                              fontWeight: isAlertItem ? 600 : 400,
                            };
                            return (
                              <div key={`${pinId}-${g.group}-${it.name}`} style={itemStyle}>
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

            {!pinCards.length && (
              <div style={{ ...cardBaseR, gridColumn: "1 / -1", color: "#6b7280", fontSize: 13 }} className="du-card">
                ยังไม่มี Pin ในระบบ
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}