"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// ✅ import react-leaflet แบบก้อนเดียว
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

    // ✅ หาศูนย์กลางจาก pins/polygons (ไม่ใช้ mock/demo)
    function computeCenter(pins, polygons) {
      // 1) center จาก pins
      if (Array.isArray(pins) && pins.length) {
        const pts = pins
          .map((p) => p?.latLng)
          .filter((x) => Array.isArray(x) && x.length === 2 && Number.isFinite(x[0]) && Number.isFinite(x[1]));
        if (pts.length) {
          const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
          const lng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
          return [lat, lng];
        }
      }

      // 2) center จาก polygons
      if (Array.isArray(polygons) && polygons.length) {
        const pts = [];
        for (const poly of polygons) {
          const coords = poly?.coords;
          if (!Array.isArray(coords)) continue;
          for (const p of coords) {
            if (Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])) pts.push(p);
          }
        }
        if (pts.length) {
          const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
          const lng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
          return [lat, lng];
        }
      }

      // 3) default center แบบกลาง ๆ (ไม่ใช่ mock polygon)
      return [13.7563, 100.5018];
    }

    // ✅ component สำหรับ render map
    function LeafletMaps({ polygons, pins, styles }) {
      const { MapContainer, TileLayer, Polygon, Marker, Popup } = RL;
      const center = computeCenter(pins, polygons);

      return (
        <>
          {/* Polygon แปลง */}
          <div style={styles.mapCard}>
            <div style={styles.mapTitle}>Polygon แปลง ({(polygons || []).length})</div>
            <MapContainer center={center} zoom={11} scrollWheelZoom style={{ height: 230, width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {(polygons || []).map((poly) => (
                <Polygon
                  key={poly.key}
                  positions={poly.coords}
                  pathOptions={{
                    color: poly.color || "#16a34a",
                    fillColor: poly.fillColor || "#86efac",
                    fillOpacity: 0.35,
                    weight: 2,
                  }}
                />
              ))}
            </MapContainer>
          </div>

          {/* Pin เซนเซอร์ (วาด polygon ขอบแปลงด้วย) */}
          <div style={styles.mapCard}>
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
            <div style={styles.mapTitle}>Pin เซนเซอร์ ({(pins || []).length})</div>
            <MapContainer center={center} zoom={11} scrollWheelZoom style={{ height: 230, width: "100%" }}>
=======
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
            <div style={styles.mapTitle}>
              Pin เซนเซอร์ ({(pins || []).length})
            </div>
            <MapContainer
              center={center}
              zoom={11}
              scrollWheelZoom
              style={{ height: 230, width: "100%" }}
            >
>>>>>>> Stashed changes
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {(polygons || []).map((poly) => (
                <Polygon
                  key={`pins-${poly.key}`}
                  positions={poly.coords}
                  pathOptions={{
                    color: poly.color || "#16a34a",
                    fillColor: poly.fillColor || "#86efac",
                    fillOpacity: 0.18,
                    weight: 2,
                  }}
                />
              ))}

              {(pins || []).map((p) => (
                <Marker key={p.id} position={p.latLng}>
                  <Popup>{p.plotLabel ? `${p.plotLabel} — PIN #${p.number}` : `PIN #${p.number}`}</Popup>
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

const pageStyle = {
  fontFamily: '"Prompt", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  headerTitle: { fontSize: 16, fontWeight: 800, color: "#000" },

  topGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3,minmax(0,1fr))",
    gap: 10,
  },

  fieldCard: {
    borderRadius: 18,
    background: "linear-gradient(135deg,rgba(255,255,255,0.96),rgba(224,242,254,0.96))",
    padding: "10px 12px 12px",
    fontSize: 12,
    boxShadow: "0 4px 10px rgba(15,23,42,0.15)",
    color: "#000",
  },
  fieldLabel: { fontSize: 11, fontWeight: 800, marginBottom: 4, display: "block", color: "#000" },
  fieldSelect: { width: "100%", borderRadius: 14, border: "none", padding: "6px 10px", fontSize: 12, background: "#fff", outline: "none", color: "#000" },

  bottomPanel: { borderRadius: 26, background: "#dffff3", padding: "18px 20px 20px", boxShadow: "0 14px 32px rgba(15,23,42,0.12)", color: "#000" },
  bottomHeaderRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 6 },
  bottomTitle: { fontSize: 14, fontWeight: 700, color: "#000" },
  deleteAllBtn: { borderRadius: 999, border: "none", padding: "6px 14px", fontSize: 12, background: "#ef4444", color: "#fff", cursor: "pointer" },
  bottomSub: { fontSize: 11, color: "#000", marginBottom: 10 },

  infoGrid: { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10, marginBottom: 14 },
  infoLabel: { fontSize: 11, color: "#000", fontWeight: 700 },
  infoBox: { borderRadius: 12, background: "#ffffff", border: "1px solid #c7f0df", padding: "6px 10px", fontSize: 12, color: "#000" },

  mapCard: { borderRadius: 22, overflow: "hidden", background: "#ffffff", boxShadow: "0 10px 24px rgba(15,23,42,0.15)", marginBottom: 14, color: "#000" },
  mapTitle: { fontSize: 13, fontWeight: 700, padding: "10px 14px 4px", color: "#000" },
  mapLoading: { height: 230, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#000", background: "#f8fafc" },

  pinRow: { display: "grid", gridTemplateColumns: "140px 1fr 1fr 60px", gap: 8, alignItems: "center", padding: "8px 10px", background: "#e5f5ff", borderRadius: 18, marginBottom: 6, fontSize: 13, color: "#000" },

  deleteBtn: { borderRadius: 999, border: "none", width: 34, height: 34, background: "#111827", color: "#ffffff", cursor: "pointer" },

  pinNumberBox: { display: "flex", alignItems: "center", gap: 8, color: "#000" },
  pinIconCircle: { width: 28, height: 28, borderRadius: 999, background: "#ffffff", display: "grid", placeItems: "center", border: "1px solid rgba(15,23,42,0.08)" },
  pinLabel: { fontWeight: 800, fontSize: 12, color: "#000" },
  pinCoord: { fontSize: 12, color: "#000" },

<<<<<<< Updated upstream
  panelBox: { borderRadius: 18, background: "rgba(255,255,255,0.95)", padding: "12px 14px", boxShadow: "0 10px 24px rgba(15,23,42,0.12)", color: "#000", marginTop: 10 },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" },
  input: { width: "100%", borderRadius: 12, border: "1px solid rgba(15,23,42,0.12)", padding: "8px 10px", fontSize: 12, background: "#fff", outline: "none", color: "#000" },
  btnDark: { borderRadius: 999, border: "none", padding: "9px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", background: "#111827", color: "#fff", whiteSpace: "nowrap" },
=======
  // panels
  panelBox: {
    borderRadius: 18,
    background: "rgba(255,255,255,0.95)",
    padding: "12px 14px",
    boxShadow: "0 10px 24px rgba(15,23,42,0.12)",
    color: "#000",
    marginTop: 10,
  },
  row3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr auto",
    gap: 8,
    alignItems: "end",
  },
  input: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.12)",
    padding: "8px 10px",
    fontSize: 12,
    background: "#fff",
    outline: "none",
    color: "#000",
  },
  btnDark: {
    borderRadius: 999,
    border: "none",
    padding: "9px 14px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    background: "#111827",
    color: "#fff",
    whiteSpace: "nowrap",
  },
  btnLight: {
    borderRadius: 999,
    border: "1px solid rgba(15,23,42,0.18)",
    padding: "7px 12px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    background: "#ffffff",
    color: "#111827",
    whiteSpace: "nowrap",
  },
>>>>>>> Stashed changes
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}
function setToken(t) {
  localStorage.setItem("token", t);
}
function clearToken() {
  localStorage.removeItem("token");
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
  } catch {}

  if (!res.ok) {
    const msg = json?.message || json?.error || text || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return json || {};
}

function fmtDate(plantedAt) {
  if (!plantedAt) return "-";
  try {
    const d = new Date(plantedAt);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch {}
  return String(plantedAt);
}

function pinToUi(pinDoc, plotLabel) {
  const lat = typeof pinDoc.lat === "number" ? pinDoc.lat : Number(pinDoc.lat);
  const lng = typeof pinDoc.lng === "number" ? pinDoc.lng : Number(pinDoc.lng);
  return {
    id: pinDoc.id || String(pinDoc._id || ""),
    number: pinDoc.number,
    lat: String(lat),
    lon: String(lng),
    latLng: [lat, lng],
    plotLabel,
  };
}

export default function EditAndDelete() {
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

  // filters
  const [selectedPlot, setSelectedPlot] = useState("all");
  const [nodeCategory, setNodeCategory] = useState("all");
  const [selectedSensorType, setSelectedSensorType] = useState("soil_moisture");

  // auth
  const [authed, setAuthed] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authMsg, setAuthMsg] = useState("");

  // data
  const [plots, setPlots] = useState([]);
  const [polygons, setPolygons] = useState([]);
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    setAuthed(!!getToken());
  }, [hydrated]);

  const plotOptions = useMemo(() => {
    const base = [{ value: "all", label: "ทุกแปลง" }];
    const dyn = (plots || []).map((p) => ({
      value: String(p.id || p._id),
      label: p.plotName || p.name || `แปลง ${String(p.id || p._id).slice(-4)}`,
    }));
    return [...base, ...dyn];
  }, [plots]);

  const nodeOptions = useMemo(
    () => [
      { value: "all", label: "ทุก Node" },
      { value: "air", label: "อากาศ" },
      { value: "soil", label: "ดิน" },
    ],
    []
  );

  const AIR_SENSOR_OPTIONS = useMemo(
    () => [
      { value: "temp_rh", label: "อุณหภูมิและความชื้น" },
      { value: "wind", label: "วัดความเร็วลม" },
      { value: "ppfd", label: "ความเข้มแสง" },
      { value: "rain", label: "ปริมาณน้ำฝน" },
      { value: "npk", label: "ความเข้้มข้นธาตุอาหาร (N,P,K)" },
    ],
    []
  );
  const SOIL_SENSOR_OPTIONS = useMemo(
    () => [
      { value: "irrigation", label: "การให้น้ำ / ความพร้อมใช้น้ำ" },
      { value: "soil_moisture", label: "ความชื้ื้นในดิน" },
    ],
    []
  );

  const sensorOptions = useMemo(() => {
    if (nodeCategory === "air") return AIR_SENSOR_OPTIONS;
    if (nodeCategory === "soil") return SOIL_SENSOR_OPTIONS;
    return [{ value: "all", label: "ทุกเซนเซอร์" }, ...AIR_SENSOR_OPTIONS, ...SOIL_SENSOR_OPTIONS];
  }, [nodeCategory, AIR_SENSOR_OPTIONS, SOIL_SENSOR_OPTIONS]);

  useEffect(() => {
    const exists = sensorOptions.some((x) => x.value === selectedSensorType);
    if (exists) return;
    if (nodeCategory === "air") setSelectedSensorType("temp_rh");
    else if (nodeCategory === "soil") setSelectedSensorType("soil_moisture");
    else setSelectedSensorType("soil_moisture");
  }, [sensorOptions, selectedSensorType, nodeCategory]);

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

  // ===== login =====
  const doLogin = async () => {
    setAuthMsg("");
    setErrMsg("");
    try {
      if (!loginEmail || !loginPassword) return setAuthMsg("กรอก email และ password ก่อน");

      const j = await apiFetchJson("/auth/login", {
        method: "POST",
        body: { email: loginEmail, password: loginPassword },
        auth: false,
      });

      if (!j?.token) return setAuthMsg("Login ไม่สำเร็จ (ไม่มี token กลับมา)");
      setToken(j.token);
      setAuthed(true);
      setAuthMsg("Login สำเร็จ ✅");
      await loadPlots();
    } catch (e) {
      setAuthed(false);
      setAuthMsg(String(e.message || e));
    }
  };

  // ===== load plots =====
  const loadPlots = useCallback(async () => {
    setLoading(true);
    setErrMsg("");
    try {
      const j = await apiFetchJson("/api/plots");
      setPlots(j.items || []);
    } catch (e) {
      setErrMsg(String(e.message || e));
      if (e?.status === 401) {
        clearToken();
        setAuthed(false);
        setAuthMsg("Token หมดอายุ/ไม่ถูกต้อง กรุณา Login ใหม่");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || !authed) return;
    loadPlots();
  }, [hydrated, authed, loadPlots]);

  // ===== load map data (✅ ดึง polygon “ทั้งหมด” แล้ว) =====
  const loadMapData = useCallback(async () => {
    if (!hydrated || !authed) return;
    setLoading(true);
    setErrMsg("");

    try {
      const loadOnePlot = async (plot) => {
        const plotId = String(plot.id || plot._id);

        const plotLabel = plot.plotName ? `แปลง ${plot.plotName}` : plot.name ? `แปลง ${plot.name}` : `แปลง ${String(plotId).slice(-4)}`;

        const [polyRes, pinRes] = await Promise.all([
          apiFetchJson(`/api/plots/${encodeURIComponent(plotId)}/polygons`),
          apiFetchJson(`/api/pins?plotId=${encodeURIComponent(plotId)}&nodeCategory=${encodeURIComponent(nodeCategory)}&sensorType=all`),
        ]);

<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
        const polyItems = Array.isArray(polyRes.items) ? polyRes.items : [];
        const polys = polyItems
          .filter((x) => (Array.isArray(x?.coords) || Array.isArray(x?.coordinates)) && (x.coords || x.coordinates).length >= 3)
=======
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
        // ✅ polygon: เอา “ทั้งหมด” ของ plot นี้
        const polyItems = Array.isArray(polyRes.items) ? polyRes.items : [];
        const polys = polyItems
          .filter((x) => (Array.isArray(x?.coords) || Array.isArray(x?.coordinates)) && (x.coords || x.coordinates).length)
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
          .map((x) => {
            const coords = Array.isArray(x.coords) ? x.coords : x.coordinates;
            const id = String(x.id || x._id || "");
            return {
              key: `${plotId}:${id || Math.random().toString(16).slice(2)}`,
              plotId,
              coords,
              color: x.color || "#16a34a",
              fillColor: x.color ? x.color : "#86efac",
            };
          });

        const pinItems = (Array.isArray(pinRes.items) ? pinRes.items : []).map((p) => pinToUi(p, plotLabel));
        return { polys, pinItems };
      };

      if (selectedPlot === "all") {
        const all = [...(plots || [])];
        const results = await Promise.all(all.map((p) => loadOnePlot(p)));
        setPolygons(results.flatMap((r) => r.polys));
        setPins(results.flatMap((r) => r.pinItems));
      } else {
        const plot = (plots || []).find((p) => String(p.id || p._id) === String(selectedPlot));
        if (!plot) {
          setPolygons([]);
          setPins([]);
          return;
        }
        const { polys, pinItems } = await loadOnePlot(plot);
        setPolygons(polys);
        setPins(pinItems);
      }
    } catch (e) {
      setErrMsg(String(e.message || e));
      if (e?.status === 401) {
        clearToken();
        setAuthed(false);
        setAuthMsg("Token หมดอายุ/ไม่ถูกต้อง กรุณา Login ใหม่");
      }
    } finally {
      setLoading(false);
    }
  }, [hydrated, authed, plots, selectedPlot, nodeCategory]);

  useEffect(() => {
    if (!hydrated || !authed) return;
    loadMapData();
  }, [hydrated, authed, plots, selectedPlot, nodeCategory, selectedSensorType, loadMapData]);

  const currentPlotInfo = useMemo(() => {
<<<<<<< Updated upstream
    if (selectedPlot === "all") return { name: "ทุกแปลง", caretaker: "-", plantType: "-", startDate: "-" };
    const p = (plots || []).find((x) => String(x.id || x._id) === String(selectedPlot));
=======
    if (selectedPlot === "all")
      return {
        name: "ทุกแปลง",
        caretaker: "-",
        plantType: "-",
        startDate: "-",
      };
    const p = (plots || []).find((x) => x.id === selectedPlot);
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
    if (!p) return { name: "-", caretaker: "-", plantType: "-", startDate: "-" };
    return {
      name: p.plotName || p.name || `แปลง ${String(p.id || p._id).slice(-4)}`,
      caretaker: p.caretaker || p.ownerName || "-",
      plantType: p.plantType || p.cropType || "-",
      startDate: fmtDate(p.plantedAt),
    };
  }, [selectedPlot, plots]);

  // delete pin
  const handleDeletePin = async (pinId) => {
    setErrMsg("");
    try {
      setPins((prev) => prev.filter((p) => p.id !== pinId));
      await apiFetchJson(`/api/pins/${encodeURIComponent(pinId)}`, { method: "DELETE" });
      await loadMapData();
    } catch (e) {
      setErrMsg(String(e.message || e));
      loadMapData();
    }
  };

  // delete all (pins+polygons)
  const handleDeleteAll = async () => {
    setErrMsg("");
    setLoading(true);
    try {
      if (selectedPlot === "all") {
        await Promise.all(
          (plots || []).map((p) =>
            Promise.all([
              apiFetchJson(`/api/plots/${encodeURIComponent(String(p.id || p._id))}/pins`, { method: "DELETE" }),
              apiFetchJson(`/api/plots/${encodeURIComponent(String(p.id || p._id))}/polygons`, { method: "DELETE" }),
            ])
          )
        );
      } else {
        await apiFetchJson(`/api/plots/${encodeURIComponent(selectedPlot)}/pins`, { method: "DELETE" });
        await apiFetchJson(`/api/plots/${encodeURIComponent(selectedPlot)}/polygons`, { method: "DELETE" });
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
      <main style={bodyStyle}>
        {/* HEADER + FILTERS */}
        <section style={styles.headerPanel}>
          <div style={styles.headerRow}>
            <div style={styles.headerTitle}>การจัดการ PIN และ Sensor</div>
<<<<<<< Updated upstream
            {/* ✅ เอาปุ่มออกแล้ว: Logout / + เพิ่ม PIN / SAVE */}
=======

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {authed ? (
                <button type="button" style={styles.btnLight} onClick={doLogout}>
                  Logout
                </button>
              ) : null}
              {/* ✅ เอาปุ่ม + เพิ่ม PIN ออก ตามที่ขอ */}
            </div>
>>>>>>> Stashed changes
          </div>

          {!authed ? (
            <div style={styles.panelBox}>
              <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 8 }}>เข้าสู่ระบบเพื่อใช้งาน API</div>
              <div style={styles.row3}>
                <div>
                  <div style={styles.fieldLabel}>Email</div>
                  <input style={styles.input} value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="email@example.com" />
                </div>
                <div>
                  <div style={styles.fieldLabel}>Password</div>
                  <input style={styles.input} type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <button type="button" style={styles.btnDark} onClick={doLogin}>
                  Login
                </button>
              </div>
<<<<<<< Updated upstream
              {authMsg ? <div style={{ marginTop: 8, fontSize: 12, fontWeight: 800 }}>{authMsg}</div> : null}
=======
              {authMsg ? (
                <div style={{ marginTop: 8, fontSize: 12, fontWeight: 800 }}>
                  {authMsg}
                </div>
              ) : null}
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
            </div>
          ) : null}

          <div style={topGridStyle}>
            <div style={styles.fieldCard}>
              <label style={styles.fieldLabel}>แปลง</label>
              <select value={selectedPlot} onChange={(e) => setSelectedPlot(e.target.value)} style={styles.fieldSelect} disabled={!authed}>
                {plotOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.fieldCard}>
              <label style={styles.fieldLabel}>เลือก Node</label>
              <select value={nodeCategory} onChange={(e) => setNodeCategory(e.target.value)} style={styles.fieldSelect} disabled={!authed}>
                {nodeOptions.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.fieldCard}>
              <label style={styles.fieldLabel}>ชนิดเซนเซอร์</label>
              <select value={selectedSensorType} onChange={(e) => setSelectedSensorType(e.target.value)} style={styles.fieldSelect} disabled={!authed}>
                {sensorOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {errMsg ? <div style={{ marginTop: 10, fontSize: 12, color: "#b91c1c", fontWeight: 800 }}>{errMsg}</div> : null}
        </section>

        {/* MAIN PANEL */}
        <section style={styles.bottomPanel}>
          <div style={styles.bottomHeaderRow}>
            <div style={styles.bottomTitle}>ข้อมูลแปลง</div>
            <button style={styles.deleteAllBtn} type="button" onClick={handleDeleteAll} disabled={!authed || loading}>
              ลบทั้งหมด
            </button>
          </div>

<<<<<<< Updated upstream
          <div style={styles.bottomSub}>แสดง Polygon ทั้งหมด + ลบตำแหน่ง PIN ของแปลงนี้</div>
=======
          <div style={styles.bottomSub}>
            ปรับแก้ Polygon และลบตำแหน่ง PIN ของแปลงนี้
          </div>
>>>>>>> Stashed changes

          <div style={infoGridStyle}>
            <div>
              <div style={styles.infoLabel}>ชื่อแปลง</div>
              <div style={styles.infoBox}>{currentPlotInfo.name}</div>
            </div>
            <div>
              <div style={styles.infoLabel}>ผู้ดูแล</div>
              <div style={styles.infoBox}>{currentPlotInfo.caretaker}</div>
            </div>
            <div>
              <div style={styles.infoLabel}>ประเภทพืช</div>
              <div style={styles.infoBox}>{currentPlotInfo.plantType}</div>
            </div>
            <div>
              <div style={styles.infoLabel}>วันที่เริ่มปลูก</div>
              <div style={styles.infoBox}>{currentPlotInfo.startDate}</div>
            </div>
          </div>

          {/* Maps */}
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
          ) : !authed ? (
            <>
              <div style={styles.mapCard}>
                <div style={styles.mapTitle}>Polygon แปลง</div>
                <div style={styles.mapLoading}>กรุณา Login เพื่อแสดงข้อมูล</div>
              </div>
              <div style={styles.mapCard}>
                <div style={styles.mapTitle}>Pin เซนเซอร์</div>
                <div style={styles.mapLoading}>กรุณา Login เพื่อแสดงข้อมูล</div>
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

          {/* Pins list */}
          {authed &&
            pins.map((p) => (
              <div key={p.id} style={pinRowStyle}>
                <div style={styles.pinNumberBox}>
                  <div style={styles.pinIconCircle}>📍</div>
                  <div>
                    <div style={styles.pinLabel}>
<<<<<<< Updated upstream
                      number #{p.number} {selectedPlot === "all" ? `(${p.plotLabel || "-"})` : ""}
=======
                      number #{p.number}{" "}
                      {selectedPlot === "all" ? `(${p.plotLabel || "-"})` : ""}
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
                    </div>
                  </div>
                </div>
                <div style={styles.pinCoord}>ละติจูด&nbsp;&nbsp;{p.lat}</div>
                <div style={styles.pinCoord}>ลองจิจูด&nbsp;&nbsp;{p.lon}</div>
                <button style={styles.deleteBtn} type="button" onClick={() => handleDeletePin(p.id)}>
                  🗑️
                </button>
              </div>
            ))}
        </section>
      </main>
    </div>
  );
}