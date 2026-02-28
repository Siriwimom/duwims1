"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

/* =========================
   ✅ CONFIG
========================= */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
const TOKEN_KEYS = ["token", "AUTH_TOKEN_V1", "duwims_token"];

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

async function apiFetchJson(path, { method = "GET", body, auth = true } = {}) {
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
    // @ts-ignore
    err.status = res.status;
    // @ts-ignore
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

/* =========================
   ✅ Leaflet (one bundle)
========================= */
const LeafletClient = dynamic(
  async () => {
    const RL = await import("react-leaflet");
    const L = await import("leaflet");

    // ✅ Fix default icon path for Next
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyL = L;
    if (anyL?.Icon?.Default) {
      anyL.Icon.Default.mergeOptions({
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });
    }

    function normalizeLatLngPair(p) {
      if (!Array.isArray(p) || p.length !== 2) return null;
      const lat = typeof p[0] === "number" ? p[0] : Number(p[0]);
      const lng = typeof p[1] === "number" ? p[1] : Number(p[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return [lat, lng];
    }

    function normalizePolygonCoords(coords) {
      if (!Array.isArray(coords)) return null;
      const out = coords.map(normalizeLatLngPair).filter(Boolean);
      return out.length >= 3 ? out : null;
    }

    function computeCenter(pins, polygons) {
      if (Array.isArray(pins) && pins.length) {
        const pts = pins.map((p) => p?.latLng).map(normalizeLatLngPair).filter(Boolean);
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

    function LeafletMaps({ polygons, pins, styles }) {
      const { MapContainer, TileLayer, Polygon, Marker, Popup } = RL;

      const safePolys = (polygons || [])
        .map((p) => {
          const coords = normalizePolygonCoords(p?.coords);
          if (!coords) return null;
          return { key: p.key, coords };
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
            sensorType: p.sensorType || "",
          };
        })
        .filter(Boolean);

      const center = computeCenter(safePins, safePolys);

      return (
        <>
          <div style={styles.mapCard}>
            <div style={styles.mapTitle}>Polygon แปลง</div>
            <MapContainer center={center} zoom={11} scrollWheelZoom style={{ height: 230, width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {safePolys.map((poly) => (
                <Polygon
                  key={poly.key}
                  positions={poly.coords}
                  pathOptions={{ color: "#16a34a", fillColor: "#86efac", fillOpacity: 0.4, weight: 2 }}
                />
              ))}
            </MapContainer>
          </div>

          <div style={styles.mapCard}>
            <div style={styles.mapTitle}>Pin เซนเซอร์</div>
            <MapContainer center={center} zoom={11} scrollWheelZoom style={{ height: 230, width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {safePolys.map((poly) => (
                <Polygon
                  key={`pins-${poly.key}`}
                  positions={poly.coords}
                  pathOptions={{ color: "#16a34a", fillColor: "#86efac", fillOpacity: 0.35, weight: 2 }}
                />
              ))}
              {safePins.map((p) => (
                <Marker key={p.id} position={p.latLng}>
                  <Popup>
                    {p.plotLabel ? `${p.plotLabel} — PIN #${p.number}` : `PIN #${p.number}`}
                    {p.sensorType ? ` (${p.sensorType})` : ""}
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
   ✅ STYLES (เหมือนตัวอย่าง)
========================= */
const pageStyle = {
  fontFamily: '"Prompt", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  background: "#e5edf8",
  minHeight: "100vh",
  color: "#000",
  padding: "22px 0 30px",
};
const bodyStyle = { maxWidth: 1120, margin: "0 auto", padding: "0 16px", color: "#000" };

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
  headerTitle: { fontSize: 16, fontWeight: 800, color: "#000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },

  topGrid: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 },

  fieldCard: {
    borderRadius: 18,
    background: "linear-gradient(135deg,rgba(255,255,255,0.96),rgba(224,242,254,0.96))",
    padding: "10px 12px 12px",
    fontSize: 12,
    boxShadow: "0 4px 10px rgba(15,23,42,0.15)",
    color: "#000",
  },
  fieldLabel: { fontSize: 11, fontWeight: 800, marginBottom: 4, display: "block", color: "#000" },
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
  bottomHeaderRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 6 },
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

  infoGrid: { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10, marginBottom: 14 },
  infoLabel: { fontSize: 11, color: "#000", fontWeight: 700 },
  infoBox: { borderRadius: 12, background: "#ffffff", border: "1px solid #c7f0df", padding: "6px 10px", fontSize: 12, color: "#000" },

  mapCard: { borderRadius: 22, overflow: "hidden", background: "#ffffff", boxShadow: "0 10px 24px rgba(15,23,42,0.15)", marginBottom: 14, color: "#000" },
  mapTitle: { fontSize: 13, fontWeight: 700, padding: "10px 14px 4px", color: "#000" },
  mapLoading: { height: 230, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#000", background: "#f8fafc" },

  pinRow: { display: "grid", gridTemplateColumns: "140px 1fr 1fr 60px", gap: 8, alignItems: "center", padding: "8px 10px", background: "#e5f5ff", borderRadius: 18, marginBottom: 6, fontSize: 13, color: "#000" },
  deleteBtn: { borderRadius: 999, border: "none", width: 34, height: 34, background: "#111827", color: "#ffffff", cursor: "pointer" },

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
  pinIconCircle: { width: 28, height: 28, borderRadius: 999, background: "#ffffff", display: "grid", placeItems: "center", border: "1px solid rgba(15,23,42,0.08)" },
  pinLabel: { fontWeight: 800, fontSize: 12, color: "#000" },
  pinCoord: { fontSize: 12, color: "#000" },
};

/* =========================
   ✅ SENSOR OPTION RULES (ตามที่สั่ง)
   - เลือก Node = air -> เหลือ temp_rh, wind, ppfd, rain
   - เลือก Node = soil -> เหลือ npk, irrigation, soil_moisture
   - เลือก Node = all -> แสดงทั้งหมด
========================= */
const SENSOR_ALL = [
  { value: "temp_rh", label: "อุณหภูมิและความชื้น" },
  { value: "wind", label: "วัดความเร็วลม" },
  { value: "ppfd", label: "ความเข้มแสง" },
  { value: "rain", label: "ปริมาณน้ำฝน" },
  { value: "npk", label: "ความเข้มข้นธาตุอาหาร (N,P,K)" },
  { value: "irrigation", label: "การให้น้ำ / ความพร้อมใช้น้ำ" },
  { value: "soil_moisture", label: "ความชื้นในดิน" },
];

const SENSOR_BY_NODE = {
  all: SENSOR_ALL,
  air: SENSOR_ALL.filter((s) => ["temp_rh", "wind", "ppfd", "rain"].includes(s.value)),
  soil: SENSOR_ALL.filter((s) => ["npk", "irrigation", "soil_moisture"].includes(s.value)),
};

/* =========================
   ✅ PAGE
   - (1) เพิ่มปุ่ม "<" ไปหน้า /management
   - (2) ลบปุ่ม + เพิ่ม PIN และ Sensor ออก
   - (3) sensorOptions เปลี่ยนตาม nodeCategory + auto-correct ค่า selectedSensorType
========================= */
export default function EditAndDelete() {
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // responsive
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
      gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))",
    };
  }, [isMobile, isTablet]);

  const infoGridStyle = useMemo(() => {
    return {
      ...styles.infoGrid,
      gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))",
    };
  }, [isMobile, isTablet]);

  const pinRowStyle = useMemo(() => {
    return { ...styles.pinRow, gridTemplateColumns: isMobile ? "1fr" : "140px 1fr 1fr 60px" };
  }, [isMobile]);

  // filters
  const [selectedPlot, setSelectedPlot] = useState("all");
  const [nodeCategory, setNodeCategory] = useState("all");
  const [selectedSensorType, setSelectedSensorType] = useState("soil_moisture");

  const nodeOptions = useMemo(
    () => [
      { value: "all", label: "ทุก Node" },
      { value: "air", label: "อากาศ" },
      { value: "soil", label: "ดิน" },
    ],
    []
  );

  // ✅ sensorOptions เปลี่ยนตาม nodeCategory (ตามที่สั่ง)
  const sensorOptions = useMemo(() => {
    return SENSOR_BY_NODE[nodeCategory] || SENSOR_BY_NODE.all;
  }, [nodeCategory]);

  // ✅ ถ้าเปลี่ยน node แล้ว selectedSensorType ไม่อยู่ใน list => set เป็นตัวแรก
  useEffect(() => {
    const ok = sensorOptions.some((s) => s.value === selectedSensorType);
    if (!ok) setSelectedSensorType(sensorOptions[0]?.value || "soil_moisture");
  }, [sensorOptions, selectedSensorType]);

  // data
  const [plots, setPlots] = useState([]);
  const [polygons, setPolygons] = useState([]);
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const plotOptions = useMemo(() => {
    const base = [{ value: "all", label: "ทุกแปลง" }];
    const dyn = (plots || []).map((p) => ({
      value: String(p.id || p._id || ""),
      label: p.plotName || p.name || p.alias || `แปลง ${String(p.id || p._id || "").slice(-4)}`,
    }));
    return [...base, ...dyn].filter((x) => x.value);
  }, [plots]);

  const currentPlotInfo = useMemo(() => {
    if (selectedPlot === "all") return { name: "ทุกแปลง", caretaker: "-", plantType: "-", plantedAt: "-" };

    const p = (plots || []).find((x) => String(x.id || x._id) === String(selectedPlot));
    if (!p) return { name: "-", caretaker: "-", plantType: "-", plantedAt: "-" };

    return {
      name: p.plotName || p.name || p.alias || "-",
      caretaker: p.caretaker || p.ownerName || "-",
      plantType: p.plantType || p.cropType || "-",
      plantedAt: p.plantedAt || "-",
    };
  }, [selectedPlot, plots]);

  const makePlotLabel = (p) => {
    const id = String(p?.id || p?._id || "");
    const name = p?.plotName || p?.name || p?.alias || (id ? id.slice(-4) : "");
    return name ? `แปลง ${name}` : "แปลง";
  };

  const polyToUi = (polyDoc, plotLabel, plotId) => {
    const coords = Array.isArray(polyDoc?.coords) ? polyDoc.coords : null;
    if (!coords || coords.length < 3) return null;
    const pid = String(polyDoc?.id || polyDoc?._id || "").trim() || `${plotId}-poly-${Math.random()}`;
    return { key: `${plotId}:${pid}`, plotId: String(plotId), plotLabel, coords };
  };

  const pinToUi = (pinDoc, plotLabel, plotId) => {
    const lat = typeof pinDoc?.lat === "number" ? pinDoc.lat : Number(pinDoc?.lat);
    const lng = typeof pinDoc?.lng === "number" ? pinDoc.lng : Number(pinDoc?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const id =
      String(pinDoc?.id || pinDoc?._id || "").trim() ||
      `${plotId}-pin-${pinDoc?.number ?? ""}-${lat}-${lng}`;

    // ส่ง sensorType มาจาก backend ถ้ามี (ใช้โชว์ใน popup)
    const st = String(pinDoc?.sensorType || pinDoc?.type || pinDoc?.sensor_type || "").trim();

    return {
      id,
      number: pinDoc?.number ?? "-",
      lat: String(lat),
      lon: String(lng),
      latLng: [lat, lng],
      plotLabel,
      plotId: String(plotId),
      sensorType: st,
    };
  };

  // auth guard
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
        .map((p) => ({ ...p, id: String(p.id || p._id || "") }))
        .filter((p) => p.id);
      setPlots(items);
    } catch (e) {
      setErrMsg(String(e.message || e));
      // @ts-ignore
      if (e?.status === 401) {
        clearToken();
        router.replace("/login");
      }
    }
  }, [router]);

  // ✅ ดึง “ครบ” (polygon + pins) ทุกแปลง/แปลงที่เลือก
  // ✅ สำคัญ: pins ใช้ sensorType=all เสมอ เพื่อไม่ให้โดนกรองหาย
  const loadMapData = useCallback(async () => {
    setLoading(true);
    setErrMsg("");

    try {
      // ensure plots
      let plotItems = plots;
      if (!plotItems?.length) {
        const j = await apiFetchJson("/api/plots");
        plotItems = normalizeList(j)
          .map((p) => ({ ...p, id: String(p.id || p._id || "") }))
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

          const [polyRes, pinRes] = await Promise.all([
            apiFetchJson(`/api/plots/${encodeURIComponent(plotId)}/polygons`),
            apiFetchJson(
              `/api/pins?plotId=${encodeURIComponent(plotId)}&nodeCategory=${encodeURIComponent(nodeCategory)}&sensorType=all`
            ),
          ]);

          const polys = normalizeList(polyRes).map((x) => polyToUi(x, plotLabel, plotId)).filter(Boolean);
          const pinItems = normalizeList(pinRes).map((x) => pinToUi(x, plotLabel, plotId)).filter(Boolean);

          return { polys, pinItems };
        })
      );

      setPolygons(results.flatMap((r) => r.polys));
      setPins(results.flatMap((r) => r.pinItems).sort((a, b) => safeNum(a.number, 0) - safeNum(b.number, 0)));
    } catch (e) {
      setErrMsg(String(e.message || e));
      // @ts-ignore
      if (e?.status === 401) {
        clearToken();
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [plots, selectedPlot, nodeCategory, router]);

  useEffect(() => {
    if (!hydrated) return;
    loadPlots();
  }, [hydrated, loadPlots]);

  useEffect(() => {
    if (!hydrated) return;
    loadMapData();
  }, [hydrated, selectedPlot, nodeCategory, selectedSensorType, loadMapData]);

  const handleDeletePin = async (pinId) => {
    setErrMsg("");
    try {
      setPins((prev) => prev.filter((p) => p.id !== pinId));
      await apiFetchJson(`/api/pins/${encodeURIComponent(pinId)}`, { method: "DELETE" });
      await loadMapData();
    } catch (e) {
      setErrMsg(String(e.message || e));
      await loadMapData();
    }
  };

  const handleDeleteAll = async () => {
    setErrMsg("");
    setLoading(true);
    try {
      if (selectedPlot === "all") {
        await Promise.all(
          (plots || []).map((p) =>
            Promise.all([
              apiFetchJson(`/api/plots/${encodeURIComponent(String(p.id))}/pins`, { method: "DELETE" }),
              apiFetchJson(`/api/plots/${encodeURIComponent(String(p.id))}/polygons`, { method: "DELETE" }),
            ])
          )
        );
      } else {
        await Promise.all([
          apiFetchJson(`/api/plots/${encodeURIComponent(selectedPlot)}/pins`, { method: "DELETE" }),
          apiFetchJson(`/api/plots/${encodeURIComponent(selectedPlot)}/polygons`, { method: "DELETE" }),
        ]);
      }
      setPins([]);
      setPolygons([]);
      await loadMapData();
    } catch (e) {
      setErrMsg(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <main style={bodyStyle} className="du-edit-delete">
        {/* HEADER + FILTERS */}
        <section style={{ ...styles.headerPanel, color: "#000" }}>
          <div style={styles.headerRow}>
            {/* (1) เพิ่ม "<" กดไปหน้า management */}
            <div style={styles.headerTitleWrap}>
              <button
                type="button"
                style={styles.backBtn}
                onClick={() => router.push("/management")}
                title="กลับไปหน้า management"
                aria-label="Back to management"
              >
                {"<"}
              </button>
              <div style={styles.headerTitle}>ลบและแก้ไขข้อมูล</div>
            </div>

            {/* (2) ลบปุ่ม + เพิ่ม PIN และ Sensor ออกแล้ว */}
          </div>

          <div style={topGridStyle}>
            <div style={styles.fieldCard}>
              <label style={styles.fieldLabel}>แปลง</label>
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
              <label style={styles.fieldLabel}>เลือก Node</label>
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
          </div>

          {errMsg ? (
            <div style={{ marginTop: 10, fontSize: 12, color: "#b91c1c", fontWeight: 800 }}>
              {errMsg}
            </div>
          ) : null}
        </section>

        {/* MAIN PANEL */}
        <section style={styles.bottomPanel}>
          <div style={styles.bottomHeaderRow}>
            <div style={styles.bottomTitle}>ข้อมูลแปลง</div>
            <button style={styles.deleteAllBtn} type="button" onClick={handleDeleteAll} disabled={loading}>
              ลบทั้งหมด
            </button>
          </div>

          <div style={styles.bottomSub}>ปรับแก้ Polygon และลบ / เพิ่มตำแหน่ง PIN ของแปลงนี้</div>

          <div style={infoGridStyle}>
            <div>
              <div style={styles.infoLabel}>ชื่อแปลง</div>
              <div style={styles.infoBox}>{selectedPlot === "all" ? "ทุกแปลง" : currentPlotInfo.name || "-"}</div>
            </div>
            <div>
              <div style={styles.infoLabel}>ผู้ดูแล</div>
              <div style={styles.infoBox}>{currentPlotInfo.caretaker || "-"}</div>
            </div>
            <div>
              <div style={styles.infoLabel}>ประเภทพืช</div>
              <div style={styles.infoBox}>{currentPlotInfo.plantType || "-"}</div>
            </div>
            <div>
              <div style={styles.infoLabel}>วันที่เริ่มปลูก</div>
              <div style={styles.infoBox}>{currentPlotInfo.plantedAt || "-"}</div>
            </div>
          </div>

          {!hydrated ? (
            <>
              <div style={styles.mapCard}>
                <div style={styles.mapTitle}>Polygon แปลง</div>
                <div style={styles.mapLoading}>Loading map...</div>
              </div>
              <div style={styles.mapCard}>
                <div style={styles.mapTitle}>Pin เซนเซอร์</div>
                <div style={styles.mapLoading}>Loading map...</div>
              </div>
            </>
          ) : loading ? (
            <>
              <div style={styles.mapCard}>
                <div style={styles.mapTitle}>Polygon แปลง</div>
                <div style={styles.mapLoading}>Loading data...</div>
              </div>
              <div style={styles.mapCard}>
                <div style={styles.mapTitle}>Pin เซนเซอร์</div>
                <div style={styles.mapLoading}>Loading data...</div>
              </div>
            </>
          ) : (
            <LeafletClient polygons={polygons} pins={pins} styles={styles} />
          )}

          {(pins || []).map((p, idx) => (
            <div key={p.id || idx} style={pinRowStyle}>
              <div style={styles.pinNumberBox}>
                <div style={styles.pinIconCircle}>📍</div>
                <div>
                  <div style={styles.pinLabel}>
                    number #{p.number} {selectedPlot === "all" ? `(${p.plotLabel || "-"})` : ""}
                  </div>
                </div>
              </div>
              <div style={styles.pinCoord}>ละติจูด&nbsp;&nbsp;{p.lat}</div>
              <div style={styles.pinCoord}>ลองจิจูด&nbsp;&nbsp;{p.lon}</div>
              <button style={styles.deleteBtn} type="button" onClick={() => handleDeletePin(p.id)} title="ลบ PIN">
                🗑️
              </button>
            </div>
          ))}

          {!loading && !pins.length ? (
            <div style={{ marginTop: 10, fontSize: 12, fontWeight: 800, color: "#6b7280" }}>
              ยังไม่มี PIN ในระบบ
            </div>
          ) : null}

          <button style={styles.saveBtn} type="button" onClick={() => loadMapData()} disabled={loading}>
            SAVE
          </button>
        </section>
      </main>
    </div>
  );
}