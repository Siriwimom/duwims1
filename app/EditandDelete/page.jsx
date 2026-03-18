"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { useDuwimsT } from "@/app/TopBar";

/* =========================
   CONFIG
========================= */
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

const TOKEN_KEYS = ["AUTH_TOKEN_V1", "token", "duwims_token"];

function getToken() {
  if (typeof window === "undefined") return "";
  for (const k of TOKEN_KEYS) {
    const t = localStorage.getItem(k);
    if (t && String(t).trim()) return String(t).trim();
  }
  return "";
}

function clearToken() {
  if (typeof window === "undefined") return;
  for (const k of TOKEN_KEYS) localStorage.removeItem(k);
}

async function apiFetchJson(
  path,
  { method = "GET", body, auth = true } = {}
) {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg = json?.message || json?.error || text || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = json;
    throw err;
  }

  return json ?? {};
}

function normalizeList(j) {
  if (Array.isArray(j?.items)) return j.items;
  if (Array.isArray(j?.data)) return j.data;
  if (Array.isArray(j)) return j;
  return [];
}

function safeNum(x, fb = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fb;
}

function isBackendId(v) {
  return typeof v === "string" && String(v).trim().length > 0;
}

function normalizeText(v) {
  return String(v || "").trim().toLowerCase();
}

function getPinNodes(pin, category = "all") {
  const air = Array.isArray(pin?.node_air) ? pin.node_air : [];
  const soil = Array.isArray(pin?.node_soil) ? pin.node_soil : [];

  if (category === "air") return air;
  if (category === "soil") return soil;
  return [...air, ...soil];
}

function sensorMatches(sensor, sensorType) {
  if (sensorType === "all") return true;

  const type = normalizeText(sensor?.sensorType);
  const name = normalizeText(sensor?.name);

  if (sensorType === "temp") {
    return (
      type === "temp" ||
      type === "temperature" ||
      type === "temp_rh" ||
      name.includes("temp") ||
      name.includes("temperature") ||
      name.includes("อุณหภูมิ")
    );
  }

  if (sensorType === "humidity") {
    return (
      type === "humidity" ||
      type === "humid" ||
      type === "rh" ||
      type === "temp_rh" ||
      name.includes("humidity") ||
      name.includes("humid") ||
      name.includes("rh") ||
      name.includes("ความชื้น")
    );
  }

  if (sensorType === "wind") {
    return (
      type === "wind" ||
      type === "wind_speed" ||
      name.includes("wind") ||
      name.includes("ลม")
    );
  }

  if (sensorType === "ppfd") {
    return (
      type === "ppfd" ||
      type === "light" ||
      name.includes("ppfd") ||
      name.includes("light") ||
      name.includes("แสง")
    );
  }

  if (sensorType === "rain") {
    return (
      type === "rain" ||
      name.includes("rain") ||
      name.includes("ฝน")
    );
  }

  if (sensorType === "npk") {
    return type === "npk" || name.includes("npk");
  }

  if (sensorType === "irrigation") {
    return (
      type === "irrigation" ||
      type === "water_level" ||
      name.includes("irrigation") ||
      name.includes("water") ||
      name.includes("ให้น้ำ")
    );
  }

  if (sensorType === "soil_moisture") {
    return (
      type === "soil_moisture" ||
      name.includes("soil moisture") ||
      name.includes("ความชื้นในดิน")
    );
  }

  return type === normalizeText(sensorType);
}

function hasSensorInNode(pin, nodeCategory, sensorType) {
  const nodes = getPinNodes(pin, nodeCategory);
  if (!nodes.length) return false;

  if (sensorType === "all") return true;

  return nodes.some((node) => {
    const sensors = Array.isArray(node?.sensors) ? node.sensors : [];
    return sensors.some((s) => sensorMatches(s, sensorType));
  });
}

function getPinDisplayNodeName(pin, category = "all") {
  const nodes = getPinNodes(pin, category);
  if (!nodes.length) return "-";

  const firstNamed = nodes.find((n) => String(n?.nodeName || "").trim());
  if (firstNamed?.nodeName) return firstNamed.nodeName;

  const firstUid = nodes.find((n) => String(n?.uid || "").trim());
  if (firstUid?.uid) return firstUid.uid;

  return "-";
}

/* =========================
   Leaflet
========================= */
const LeafletClient = dynamic(
  async () => {
    const RL = await import("react-leaflet");
    const LModule = await import("leaflet");
    const L = LModule?.default || LModule;

    if (L?.Icon?.Default) {
      L.Icon.Default.mergeOptions({
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });
    }

    function normalizeLatLngPair(p) {
      if (Array.isArray(p) && p.length >= 2) {
        const lat = Number(p[0]);
        const lng = Number(p[1]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
      }

      if (p && typeof p === "object") {
        const lat = Number(p.lat);
        const lng = Number(p.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
      }

      return null;
    }

    function normalizePolygonCoords(coords) {
      if (!Array.isArray(coords)) return null;
      const out = coords.map(normalizeLatLngPair).filter(Boolean);
      return out.length >= 3 ? out : null;
    }

    function computeCenter(pins, polygons) {
      if (Array.isArray(pins) && pins.length) {
        const pts = pins
          .map((p) => p?.latLng)
          .map(normalizeLatLngPair)
          .filter(Boolean);

        if (pts.length) {
          const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
          const lng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
          return [lat, lng];
        }
      }

      if (Array.isArray(polygons) && polygons.length) {
        const pts = [];
        for (const poly of polygons) {
          const coords = normalizePolygonCoords(poly?.coords);
          if (!coords) continue;
          for (const p of coords) pts.push(p);
        }

        if (pts.length) {
          const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
          const lng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
          return [lat, lng];
        }
      }

      return [13.7563, 100.5018];
    }

    function LeafletMaps({ polygons, pins, styles, t }) {
      const { MapContainer, TileLayer, Polygon, Marker, Popup } = RL;

      const safePolys = (polygons || [])
        .map((p) => {
          const coords = normalizePolygonCoords(p?.coords);
          if (!coords) return null;
          return { key: p.key, coords, color: p.color || "#16a34a" };
        })
        .filter(Boolean);

      const safePins = (pins || [])
        .map((p) => {
          const latLng = normalizeLatLngPair(p?.latLng);
          if (!latLng) return null;
          return {
            id: p.id,
            number: p.number,
            latLng,
            plotLabel: p.plotLabel || "",
            nodeName: p.nodeName || "",
          };
        })
        .filter(Boolean);

      const center = computeCenter(safePins, safePolys);

      return (
        <>
          <div style={styles.mapCard}>
            <div style={styles.mapTitle}>
              {t("polygonsOfPlot", "Plot Polygons")}
            </div>
            <MapContainer
              center={center}
              zoom={11}
              scrollWheelZoom
              style={{ height: 230, width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {safePolys.map((poly) => (
                <Polygon
                  key={poly.key}
                  positions={poly.coords}
                  pathOptions={{
                    color: poly.color,
                    fillColor: poly.color,
                    fillOpacity: 0.22,
                    weight: 2,
                  }}
                />
              ))}
            </MapContainer>
          </div>

          <div style={styles.mapCard}>
            <div style={styles.mapTitle}>{t("sensorPinsMap", "Sensor Pins")}</div>
            <MapContainer
              center={center}
              zoom={11}
              scrollWheelZoom
              style={{ height: 230, width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {safePolys.map((poly) => (
                <Polygon
                  key={`pins-${poly.key}`}
                  positions={poly.coords}
                  pathOptions={{
                    color: poly.color,
                    fillColor: poly.color,
                    fillOpacity: 0.16,
                    weight: 2,
                  }}
                />
              ))}
              {safePins.map((p) => (
                <Marker key={p.id} position={p.latLng}>
                  <Popup>
                    {p.plotLabel
                      ? `${p.plotLabel} — PIN #${p.number}`
                      : `PIN #${p.number}`}
                    {p.nodeName ? ` (${p.nodeName})` : ""}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </>
      );
    }

    return LeafletMaps;
  },
  { ssr: false }
);

/* =========================
   STYLES
========================= */
const pageStyle = {
  fontFamily:
    '"Prompt", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  background: "#e5edf8",
  minHeight: "100vh",
  color: "#000",
  padding: "22px 0 30px",
};

const bodyStyle = {
  maxWidth: 1120,
  margin: "0 auto",
  padding: "0 16px",
  color: "#000",
};

const styles = {
  headerPanel: {
    borderRadius: 24,
    padding: "16px 20px 18px",
    background: "linear-gradient(135deg,#40B596,#676FC7)",
    color: "#000",
    marginBottom: 18,
    boxShadow: "0 16px 36px rgba(15,23,42,0.18)",
  },
  headerRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  headerTitleWrap: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    border: "none",
    background: "rgba(255,255,255,0.95)",
    color: "#111827",
    cursor: "pointer",
    boxShadow: "0 10px 18px rgba(15,23,42,0.18)",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: "#000",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  topGrid: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 },

  fieldCard: {
    borderRadius: 18,
    background:
      "linear-gradient(135deg,rgba(255,255,255,0.96),rgba(224,242,254,0.96))",
    padding: "10px 12px 12px",
    fontSize: 12,
    boxShadow: "0 4px 10px rgba(15,23,42,0.15)",
    color: "#000",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 800,
    marginBottom: 4,
    display: "block",
    color: "#000",
  },
  fieldSelect: {
    width: "100%",
    borderRadius: 14,
    border: "none",
    padding: "6px 10px",
    fontSize: 12,
    background: "#fff",
    outline: "none",
    color: "#000",
  },

  bottomPanel: {
    borderRadius: 26,
    background: "#dffff3",
    padding: "18px 20px 20px",
    boxShadow: "0 14px 32px rgba(15,23,42,0.12)",
    color: "#000",
  },
  bottomHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  bottomTitle: { fontSize: 14, fontWeight: 700, color: "#000" },
  deleteAllBtn: {
    borderRadius: 999,
    border: "none",
    padding: "6px 14px",
    fontSize: 12,
    background: "#ef4444",
    color: "#fff",
    cursor: "pointer",
  },
  bottomSub: { fontSize: 11, color: "#000", marginBottom: 10 },

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: 10,
    marginBottom: 14,
  },
  infoLabel: { fontSize: 11, color: "#000", fontWeight: 700 },
  infoBox: {
    borderRadius: 12,
    background: "#ffffff",
    border: "1px solid #c7f0df",
    padding: "6px 10px",
    fontSize: 12,
    color: "#000",
  },

  mapCard: {
    borderRadius: 22,
    overflow: "hidden",
    background: "#ffffff",
    boxShadow: "0 10px 24px rgba(15,23,42,0.15)",
    marginBottom: 14,
    color: "#000",
  },
  mapTitle: { fontSize: 13, fontWeight: 700, padding: "10px 14px 4px", color: "#000" },
  mapLoading: {
    height: 230,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    color: "#000",
    background: "#f8fafc",
  },

  pinRow: {
    display: "grid",
    gridTemplateColumns: "140px 1fr 1fr 1fr 60px",
    gap: 8,
    alignItems: "center",
    padding: "8px 10px",
    background: "#e5f5ff",
    borderRadius: 18,
    marginBottom: 6,
    fontSize: 13,
    color: "#000",
  },
  deleteBtn: {
    borderRadius: 999,
    border: "none",
    width: 34,
    height: 34,
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
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
    fontWeight: 700,
    background: "linear-gradient(135deg,#6366f1,#3b82f6)",
    color: "#fff",
    cursor: "pointer",
  },

  pinNumberBox: { display: "flex", alignItems: "center", gap: 8, color: "#000" },
  pinIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 999,
    background: "#ffffff",
    display: "grid",
    placeItems: "center",
    border: "1px solid rgba(15,23,42,0.08)",
  },
  pinLabel: { fontWeight: 800, fontSize: 12, color: "#000" },
  pinCoord: { fontSize: 12, color: "#000" },
};

const SENSOR_ALL = [
  { value: "all", labelKey: "allSensorTypes", fallback: "ทุกชนิดเซนเซอร์" },
  { value: "temp", labelKey: "temperature", fallback: "อุณหภูมิ" },
  { value: "humidity", labelKey: "humidity", fallback: "ความชื้นสัมพัทธ์" },
  { value: "wind", labelKey: "windMeasure", fallback: "วัดความเร็วลม" },
  { value: "ppfd", labelKey: "lightIntensity", fallback: "ความเข้มแสง" },
  { value: "rain", labelKey: "rainAmount", fallback: "ปริมาณน้ำฝน" },
  { value: "npk", labelKey: "npkConcentration", fallback: "ความเข้มข้นธาตุอาหาร (N,P,K)" },
  { value: "irrigation", labelKey: "irrigationReady", fallback: "การให้น้ำ / ความพร้อมใช้น้ำ" },
  { value: "soil_moisture", labelKey: "soilMoisture", fallback: "ความชื้นในดิน" },
];

const SENSOR_BY_NODE = {
  all: SENSOR_ALL,
  air: SENSOR_ALL.filter((s) =>
    ["all", "temp", "humidity", "wind", "ppfd", "rain"].includes(s.value)
  ),
  soil: SENSOR_ALL.filter((s) =>
    ["all", "npk", "irrigation", "soil_moisture"].includes(s.value)
  ),
};

export default function EditAndDeletePage() {
  const router = useRouter();
  const { t } = useDuwimsT();

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [width, setWidth] = useState(1200);
  useEffect(() => {
    if (!hydrated) return;
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [hydrated]);

  const isMobile = width <= 640;
  const isTablet = width > 640 && width <= 1024;

  const topGridStyle = useMemo(() => {
    return {
      ...styles.topGrid,
      gridTemplateColumns: isMobile
        ? "1fr"
        : isTablet
        ? "repeat(2,minmax(0,1fr))"
        : "repeat(3,minmax(0,1fr))",
    };
  }, [isMobile, isTablet]);

  const infoGridStyle = useMemo(() => {
    return {
      ...styles.infoGrid,
      gridTemplateColumns: isMobile
        ? "1fr"
        : isTablet
        ? "repeat(2,minmax(0,1fr))"
        : "repeat(4,minmax(0,1fr))",
    };
  }, [isMobile, isTablet]);

  const pinRowStyle = useMemo(() => {
    return {
      ...styles.pinRow,
      gridTemplateColumns: isMobile ? "1fr" : "140px 1fr 1fr 1fr 60px",
    };
  }, [isMobile]);

  const [selectedPlot, setSelectedPlot] = useState("all");
  const [nodeCategory, setNodeCategory] = useState("all");
  const [selectedSensorType, setSelectedSensorType] = useState("all");

  const nodeOptions = useMemo(
    () => [
      { value: "all", label: t("allNodes", "ทุก Node") },
      { value: "air", label: t("airShort", "อากาศ") },
      { value: "soil", label: t("soilShort", "ดิน") },
    ],
    [t]
  );

  const sensorOptions = useMemo(() => {
    return (SENSOR_BY_NODE[nodeCategory] || SENSOR_BY_NODE.all).map((s) => ({
      value: s.value,
      label: t(s.labelKey, s.fallback),
    }));
  }, [nodeCategory, t]);

  useEffect(() => {
    const ok = sensorOptions.some((s) => s.value === selectedSensorType);
    if (!ok) setSelectedSensorType(sensorOptions[0]?.value || "all");
  }, [sensorOptions, selectedSensorType]);

  const [plots, setPlots] = useState([]);
  const [polygons, setPolygons] = useState([]);
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const plotOptions = useMemo(() => {
    const base = [{ value: "all", label: t("allPlots", "ทุกแปลง") }];
    const dyn = (plots || []).map((p) => ({
      value: String(p.id || ""),
      label:
        p.plotName ||
        p.name ||
        p.alias ||
        `${t("plot", "แปลง")} ${String(p.id || "").slice(-4)}`,
    }));
    return [...base, ...dyn].filter((x) => x.value);
  }, [plots, t]);

  const currentPlotInfo = useMemo(() => {
    if (selectedPlot === "all") {
      return {
        name: t("allPlots", "ทุกแปลง"),
        caretaker: "-",
        plantType: "-",
        plantedAt: "-",
      };
    }

    const p = (plots || []).find((x) => String(x.id) === String(selectedPlot));
    if (!p) return { name: "-", caretaker: "-", plantType: "-", plantedAt: "-" };

    return {
      name: p.plotName || p.name || p.alias || "-",
      caretaker: p.caretaker || p.ownerName || "-",
      plantType: p.plantType || p.cropType || "-",
      plantedAt: p.plantedAt || "-",
    };
  }, [selectedPlot, plots, t]);

  const makePlotLabel = (p) => {
    const id = String(p?.id || "");
    return (
      p?.plotName ||
      p?.name ||
      p?.alias ||
      (id ? `${t("plot", "แปลง")} ${id.slice(-4)}` : t("plot", "แปลง"))
    );
  };

  const polyToUi = (polygonDoc, plotLabel, plotId) => {
    const coords = Array.isArray(polygonDoc?.coords) ? polygonDoc.coords : [];
    if (coords.length < 3) return null;

    const pid =
      String(polygonDoc?.id || "").trim() ||
      `${plotId}-poly-${Math.random().toString(36).slice(2, 8)}`;

    return {
      key: `${plotId}:${pid}`,
      plotId: String(plotId),
      plotLabel,
      coords,
      color: polygonDoc?.color || "#16a34a",
    };
  };

  const pinToUi = (pinDoc, plotLabel, plotId, filterCategory = "all") => {
    const lat = Number(pinDoc?.lat);
    const lng = Number(pinDoc?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const id =
      String(pinDoc?.id || "").trim() ||
      `${plotId}-pin-${pinDoc?.number ?? ""}-${lat}-${lng}`;

    return {
      id,
      number: pinDoc?.number ?? "-",
      lat: String(lat),
      lon: String(lng),
      latLng: [lat, lng],
      plotLabel,
      plotId: String(plotId),
      pinName: pinDoc?.pinName || "",
      node_air: Array.isArray(pinDoc?.node_air) ? pinDoc.node_air : [],
      node_soil: Array.isArray(pinDoc?.node_soil) ? pinDoc.node_soil : [],
      nodeName: getPinDisplayNodeName(pinDoc, filterCategory),
    };
  };

  useEffect(() => {
    if (!hydrated) return;
    const tk = getToken();
    if (!tk) router.replace("/login");
  }, [hydrated, router]);

  const loadPlots = useCallback(async () => {
    setErrMsg("");
    try {
      const j = await apiFetchJson("/api/plots");
      const items = normalizeList(j)
        .map((p) => ({ ...p, id: String(p.id || "") }))
        .filter((p) => p.id);
      setPlots(items);
    } catch (e) {
      setErrMsg(String(e.message || e));
      if (e?.status === 401) {
        clearToken();
        router.replace("/login");
      }
    }
  }, [router]);

  const loadMapData = useCallback(async () => {
    setLoading(true);
    setErrMsg("");

    try {
      let plotItems = plots;

      if (!plotItems?.length) {
        const j = await apiFetchJson("/api/plots");
        plotItems = normalizeList(j)
          .map((p) => ({ ...p, id: String(p.id || "") }))
          .filter((p) => p.id);
        setPlots(plotItems);
      }

      const targets =
        selectedPlot === "all"
          ? plotItems
          : plotItems.filter((p) => String(p.id) === String(selectedPlot));

      const results = await Promise.all(
        (targets || []).map(async (plot) => {
          const plotId = String(plot.id);
          const plotLabel = makePlotLabel(plot);

          const [polygonRes, fullRes] = await Promise.all([
            apiFetchJson(`/api/plots/${encodeURIComponent(plotId)}/polygon`),
            apiFetchJson(`/api/plots/${encodeURIComponent(plotId)}/full`),
          ]);

          const polyItem = polygonRes?.item || null;
          const fullItem = fullRes?.item || null;

          const fullPins = Array.isArray(fullItem?.polygon?.pins)
            ? fullItem.polygon.pins
            : [];

          const polys = [];
          const mappedPoly = polyToUi(polyItem, plotLabel, plotId);
          if (mappedPoly) polys.push(mappedPoly);

          const pinItems = fullPins
            .filter((pin) => hasSensorInNode(pin, nodeCategory, selectedSensorType))
            .map((pin) => pinToUi(pin, plotLabel, plotId, nodeCategory))
            .filter(Boolean);

          return { polys, pinItems };
        })
      );

      setPolygons(results.flatMap((r) => r.polys));
      setPins(
        results
          .flatMap((r) => r.pinItems)
          .sort((a, b) => safeNum(a.number, 0) - safeNum(b.number, 0))
      );
    } catch (e) {
      setErrMsg(String(e.message || e));
      if (e?.status === 401) {
        clearToken();
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [plots, selectedPlot, nodeCategory, selectedSensorType, router, t]);

  useEffect(() => {
    if (!hydrated) return;
    loadPlots();
  }, [hydrated, loadPlots]);

  useEffect(() => {
    if (!hydrated) return;
    loadMapData();
  }, [hydrated, selectedPlot, nodeCategory, selectedSensorType, loadMapData]);

  const handleDeletePin = async (pinId) => {
    if (!isBackendId(String(pinId))) return;

    setErrMsg("");
    try {
      setPins((prev) => prev.filter((p) => p.id !== pinId));
      await apiFetchJson(`/api/pins/${encodeURIComponent(pinId)}`, {
        method: "DELETE",
      });
      await loadMapData();
    } catch (e) {
      setErrMsg(String(e.message || e));
      await loadMapData();
    }
  };

  const clearOnePlotPolygonAndPins = async (plotId) => {
    const currentPlot = plots.find((p) => String(p.id) === String(plotId));
    const currentPolygon = currentPlot?.polygon || {};

    await apiFetchJson(`/api/plots/${encodeURIComponent(plotId)}/polygon`, {
      method: "PUT",
      body: {
        id: currentPolygon?.id,
        color: currentPolygon?.color || "#2563eb",
        coords: [],
        pins: [],
      },
    });
  };

  const handleDeleteAll = async () => {
    setErrMsg("");
    setLoading(true);

    try {
      if (selectedPlot === "all") {
        await Promise.all(
          (plots || []).map((p) => clearOnePlotPolygonAndPins(String(p.id)))
        );
      } else {
        await clearOnePlotPolygonAndPins(String(selectedPlot));
      }

      setPins([]);
      setPolygons([]);
      await loadMapData();
      await loadPlots();
    } catch (e) {
      setErrMsg(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <main style={bodyStyle} className="du-edit-delete">
        <section style={{ ...styles.headerPanel, color: "#000" }}>
          <div style={styles.headerRow}>
            <div style={styles.headerTitleWrap}>
              <button
                type="button"
                style={styles.backBtn}
                onClick={() => router.push("/management")}
                title={t("back", "Back")}
                aria-label="Back to management"
              >
                {"<"}
              </button>
              <div style={styles.headerTitle}>
                {t("editAndDelete", "แก้ไข / ลบ")}
              </div>
            </div>
          </div>

          <div style={topGridStyle}>
            <div style={styles.fieldCard}>
              <label style={styles.fieldLabel}>{t("plot", "แปลง")}</label>
              <select
                value={selectedPlot}
                onChange={(e) => setSelectedPlot(e.target.value)}
                style={styles.fieldSelect}
              >
                {plotOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.fieldCard}>
              <label style={styles.fieldLabel}>
                {t("selectNode", "เลือก Node")}
              </label>
              <select
                value={nodeCategory}
                onChange={(e) => setNodeCategory(e.target.value)}
                style={styles.fieldSelect}
              >
                {nodeOptions.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.fieldCard}>
              <label style={styles.fieldLabel}>
                {t("sensorType", "ประเภทเซนเซอร์")}
              </label>
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
          </div>

          {errMsg ? (
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: "#b91c1c",
                fontWeight: 800,
              }}
            >
              {errMsg}
            </div>
          ) : null}
        </section>

        <section style={styles.bottomPanel}>
          <div style={styles.bottomHeaderRow}>
            <div style={styles.bottomTitle}>
              {t("plotInformation", "ข้อมูลแปลง")}
            </div>
            <button
              style={styles.deleteAllBtn}
              type="button"
              onClick={handleDeleteAll}
              disabled={loading}
            >
              {t("deleteAll", "ลบทั้งหมด")}
            </button>
          </div>

          <div style={styles.bottomSub}>
            {t(
              "editDeleteDesc",
              "ปรับแก้ Polygon และลบ / เพิ่มตำแหน่ง PIN ของแปลงนี้"
            )}
          </div>

          <div style={infoGridStyle}>
            <div>
              <div style={styles.infoLabel}>{t("plot", "แปลง")}</div>
              <div style={styles.infoBox}>
                {selectedPlot === "all"
                  ? t("allPlots", "ทุกแปลง")
                  : currentPlotInfo.name || "-"}
              </div>
            </div>
            <div>
              <div style={styles.infoLabel}>{t("caretaker", "ชื่อผู้ดูแล")}</div>
              <div style={styles.infoBox}>{currentPlotInfo.caretaker || "-"}</div>
            </div>
            <div>
              <div style={styles.infoLabel}>{t("plantType", "ประเภทพืช")}</div>
              <div style={styles.infoBox}>{currentPlotInfo.plantType || "-"}</div>
            </div>
            <div>
              <div style={styles.infoLabel}>{t("plantedAt", "วันที่เริ่มปลูก")}</div>
              <div style={styles.infoBox}>{currentPlotInfo.plantedAt || "-"}</div>
            </div>
          </div>

          {!hydrated ? (
            <>
              <div style={styles.mapCard}>
                <div style={styles.mapTitle}>
                  {t("polygonsOfPlot", "Plot Polygons")}
                </div>
                <div style={styles.mapLoading}>
                  {t("loadingMap", "Loading map...")}
                </div>
              </div>
              <div style={styles.mapCard}>
                <div style={styles.mapTitle}>{t("sensorPinsMap", "Sensor Pins")}</div>
                <div style={styles.mapLoading}>
                  {t("loadingMap", "Loading map...")}
                </div>
              </div>
            </>
          ) : loading ? (
            <>
              <div style={styles.mapCard}>
                <div style={styles.mapTitle}>
                  {t("polygonsOfPlot", "Plot Polygons")}
                </div>
                <div style={styles.mapLoading}>{t("loading", "Loading...")}</div>
              </div>
              <div style={styles.mapCard}>
                <div style={styles.mapTitle}>{t("sensorPinsMap", "Sensor Pins")}</div>
                <div style={styles.mapLoading}>{t("loading", "Loading...")}</div>
              </div>
            </>
          ) : (
            <LeafletClient polygons={polygons} pins={pins} styles={styles} t={t} />
          )}

          {(pins || []).map((p, idx) => (
            <div key={p.id || idx} style={pinRowStyle}>
              <div style={styles.pinNumberBox}>
                <div style={styles.pinIconCircle}>📍</div>
                <div>
                  <div style={styles.pinLabel}>
                    {t("numberLabel", "number")} #{p.number}{" "}
                    {selectedPlot === "all" ? `(${p.plotLabel || "-"})` : ""}
                  </div>
                </div>
              </div>

              <div style={styles.pinCoord}>
                {t("latitude", "ละติจูด")} {p.lat}
              </div>
              <div style={styles.pinCoord}>
                {t("longitude", "ลองจิจูด")} {p.lon}
              </div>
              <div style={styles.pinCoord}>
                {t("selectNode", "Node")} {p.nodeName || "-"}
              </div>

              <button
                style={styles.deleteBtn}
                type="button"
                onClick={() => handleDeletePin(p.id)}
                title={t("delete", "ลบ")}
                disabled={!isBackendId(String(p.id))}
              >
                🗑️
              </button>
            </div>
          ))}

          {!loading && !pins.length ? (
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                fontWeight: 800,
                color: "#6b7280",
              }}
            >
              {t("noPinsInSystem", "ยังไม่มี Pin ในระบบ")}
            </div>
          ) : null}

          <button
            style={styles.saveBtn}
            type="button"
            onClick={() => loadMapData()}
            disabled={loading}
          >
            {t("save", "บันทึก")}
          </button>
        </section>
      </main>
    </div>
  );
}