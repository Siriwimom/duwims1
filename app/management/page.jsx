"use client";

import { useDuwimsT } from "@/app/TopBar";
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

  errorBar: {
    marginTop: 10,
    borderRadius: 14,
    padding: "8px 10px",
    background: "#fee2e2",
    color: "#7f1d1d",
    fontSize: 12,
    border: "1px solid #fecaca",
  },
};

function getToken() {
  if (typeof window === "undefined") return "";
  return (
    window.localStorage.getItem("AUTH_TOKEN_V1") ||
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("authToken") ||
    window.localStorage.getItem("pmtool_token") ||
    window.localStorage.getItem("duwims_token") ||
    ""
  );
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

async function apiFetch(path, { method = "GET", body } = {}) {
  const token = getToken();
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text || "Invalid JSON from server" };
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}

function fmtTs(ts, lang = "th") {
  if (!ts) return "-";
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return String(ts);
    return d.toLocaleString(lang === "en" ? "en-US" : "th-TH");
  } catch {
    return String(ts);
  }
}

function safeNum(v) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function ManagementPage() {
  const { t, lang } = useDuwimsT();

  const [pinIcon, setPinIcon] = useState(null);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

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

  const [plots, setPlots] = useState([
    {
      value: "all",
      label: t("allPlots", "ทุกแปลง"),
      meta: { farmer: "-", plant: "-", plantedAt: "-", sensorCount: "-" },
      raw: null,
    },
  ]);

  const [selectedPlot, setSelectedPlot] = useState("all");
  const [nodeCategory, setNodeCategory] = useState("all");
  const [selectedSensorType, setSelectedSensorType] = useState("all");

  const [polygons, setPolygons] = useState([]);
  const [pins, setPins] = useState([]);
  const [sensorsAll, setSensorsAll] = useState([]);

  const [loadingPlots, setLoadingPlots] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const sensorOptions = useMemo(() => {
    const AIR = [
      { value: "temp_rh", label: t("airTempHumidity", "อุณหภูมิและความชื้น") },
      { value: "wind", label: t("windMeasure", "วัดความเร็วลม") },
      { value: "ppfd", label: t("lightIntensity", "ความเข้มแสง") },
      { value: "rain", label: t("rainAmount", "ปริมาณน้ำฝน") },
    ];
    const SOIL = [
      { value: "soil_moisture", label: t("soilMoisture", "ความชื้ื้นในดิน") },
      { value: "npk", label: t("npkConcentration", "ความเข้้มข้นธาตุอาหาร (N,P,K)") },
      { value: "irrigation", label: t("irrigationReady", "การให้น้ำ / ความพร้อมใช้น้ำ") },
    ];

    if (nodeCategory === "all")
      return [{ value: "all", label: t("allSensors", "ทุกเซนเซอร์") }, ...AIR, ...SOIL];
    if (nodeCategory === "air")
      return [{ value: "all", label: t("allSensors", "ทุกเซนเซอร์") }, ...AIR];
    return [{ value: "all", label: t("allSensors", "ทุกเซนเซอร์") }, ...SOIL];
  }, [nodeCategory, t]);

  useEffect(() => {
    const ok = sensorOptions.some((x) => x.value === selectedSensorType);
    if (ok) return;
    setSelectedSensorType("all");
  }, [sensorOptions, selectedSensorType]);

  useEffect(() => {
    let cancelled = false;

    async function loadPlots() {
      setLoadingPlots(true);
      setErrorMsg("");
      try {
        const data = await apiFetch("/plots");
        const items = Array.isArray(data?.items) ? data.items : [];

        const mapped = items.map((p) => {
          const id = String(p.id || p._id || "");
          const plotName = p.plotName || p.name || "-";
          const alias = p.alias || plotName || `${t("plot", "แปลง")} ${id}`;
          const caretaker = p.caretaker || p.ownerName || "-";
          const plantType = p.plantType || p.cropType || "-";
          const plantedAt = p.plantedAt || "-";

          return {
            value: id,
            label: alias,
            meta: {
              farmer: caretaker,
              plant: plantType,
              plantedAt,
              sensorCount: "-",
            },
            raw: p,
          };
        });

        const allRow = {
          value: "all",
          label: t("allPlots", "ทุกแปลง"),
          meta: { farmer: "-", plant: "-", plantedAt: "-", sensorCount: "-" },
          raw: null,
        };

        const nextPlots = [allRow, ...mapped];

        if (!cancelled) {
          setPlots(nextPlots);
          if (!nextPlots.some((x) => x.value === selectedPlot))
            setSelectedPlot("all");
        }
      } catch (e) {
        if (!cancelled) {
          setErrorMsg(
            e?.status === 401
              ? t(
                  "auth401",
                  "401: ยังไม่ได้ล็อกอิน หรือ token ไม่ถูกต้อง (กรุณา login ก่อน)"
                )
              : `${t("loadPlotFailed", "โหลดแปลงไม่สำเร็จ")}: ${e.message || "error"}`
          );
        }
      } finally {
        if (!cancelled) setLoadingPlots(false);
      }
    }

    loadPlots();
    return () => (cancelled = true);
  }, [selectedPlot, t]);

  const selectedPlotObj = useMemo(
    () => plots.find((p) => p.value === selectedPlot) || plots[0],
    [plots, selectedPlot]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoadingData(true);
      setErrorMsg("");

      try {
        const plotIds =
          selectedPlot === "all"
            ? plots.filter((p) => p.value !== "all").map((p) => p.value)
            : [selectedPlot];

        if (!plotIds.length) {
          if (!cancelled) {
            setPolygons([]);
            setPins([]);
            setSensorsAll([]);
          }
          return;
        }

        const jobs = plotIds.map(async (plotId) => {
          const [polyRes, pinRes, sensorRes] = await Promise.all([
            apiFetch(`/plots/${encodeURIComponent(plotId)}/polygons`),
            apiFetch(
              `/pins?plotId=${encodeURIComponent(plotId)}&nodeCategory=${encodeURIComponent(
                nodeCategory
              )}&sensorType=all`
            ),
            apiFetch(
              `/sensors?plotId=${encodeURIComponent(
                plotId
              )}&nodeCategory=${encodeURIComponent(nodeCategory)}&sensorType=all`
            ),
          ]);

          const polys = (Array.isArray(polyRes?.items) ? polyRes.items : [])
            .map((x) => ({
              id: String(x.id || x._id || x.polygonId || Math.random()),
              plotId,
              color: x.color || "#2563eb",
              coords: Array.isArray(x.coords) ? x.coords : [],
            }))
            .filter((p) => Array.isArray(p.coords) && p.coords.length >= 3);

          const pinItems = (Array.isArray(pinRes?.items) ? pinRes.items : [])
            .map((p) => ({
              id: String(p.id || p._id || ""),
              plotId: String(p.plotId || plotId),
              number: safeNum(p.number) ?? 0,
              lat: safeNum(p.lat),
              lng: safeNum(p.lng),
              nodeId: p.nodeId ? String(p.nodeId) : null,
            }))
            .filter(
              (p) =>
                Number.isFinite(p.lat) &&
                Number.isFinite(p.lng) &&
                p.lat >= -90 &&
                p.lat <= 90 &&
                p.lng >= -180 &&
                p.lng <= 180
            )
            .sort((a, b) => (a.number || 0) - (b.number || 0));

          const sensorItems = (Array.isArray(sensorRes?.items)
            ? sensorRes.items
            : []
          ).map((s) => ({
            id: String(s.id || s._id || ""),
            plotId,
            sensorType: s.sensorType || "",
            name: s.name || s.sensorType || "Sensor",
            unit: s.unit || "",
            status: s.status || "",
            nodeId: s.nodeId ? String(s.nodeId) : null,
            pinId: s.pinId ? String(s.pinId) : null,
            lastReading: s.lastReading || null,
          }));

          return { plotId, polys, pinItems, sensorItems };
        });

        const results = await Promise.all(jobs);

        const mergedPolys = results.flatMap((r) => r.polys);
        const mergedPins = results.flatMap((r) => r.pinItems);
        const mergedSensorsAll = results.flatMap((r) => r.sensorItems);

        if (cancelled) return;

        setPolygons(mergedPolys);
        setPins(mergedPins);
        setSensorsAll(mergedSensorsAll);

        setPlots((prev) =>
          prev.map((p) => {
            if (p.value === "all") {
              return {
                ...p,
                meta: {
                  ...p.meta,
                  sensorCount: `${mergedPins.length} PIN • ${mergedSensorsAll.length} Sensors`,
                },
              };
            }
            const pid = p.value;
            const pc = mergedPins.filter((x) => x.plotId === pid).length;
            const sc = mergedSensorsAll.filter((x) => x.plotId === pid).length;
            return {
              ...p,
              meta: { ...p.meta, sensorCount: `${pc} PIN • ${sc} Sensors` },
            };
          })
        );
      } catch (e) {
        if (!cancelled) {
          setErrorMsg(
            e?.status === 401
              ? t(
                  "auth401",
                  "401: ยังไม่ได้ล็อกอิน หรือ token ไม่ถูกต้อง (กรุณา login ก่อน)"
                )
              : `${t("loadDataFailed", "โหลดข้อมูลไม่สำเร็จ")}: ${e.message || "error"}`
          );
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }

    if (plots.length >= 1) loadAll();

    return () => {
      cancelled = true;
    };
  }, [selectedPlot, nodeCategory, plots, t]);

  const sensorsShown = useMemo(() => {
    if (selectedSensorType === "all") return sensorsAll;
    return sensorsAll.filter((s) => String(s.sensorType) === String(selectedSensorType));
  }, [sensorsAll, selectedSensorType]);

  const mapCenter = useMemo(() => {
    if (polygons.length && polygons[0]?.coords?.length) {
      const pts = polygons[0].coords;
      const lat =
        pts.reduce((sum, p) => sum + Number(p?.[0] || 0), 0) / pts.length;
      const lng =
        pts.reduce((sum, p) => sum + Number(p?.[1] || 0), 0) / pts.length;
      if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    }

    if (pins.length) {
      const lat = pins.reduce((sum, p) => sum + p.lat, 0) / pins.length;
      const lng = pins.reduce((sum, p) => sum + p.lng, 0) / pins.length;
      if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    }

    return [13.3, 101.1];
  }, [polygons, pins]);

  const mapKey = `${selectedPlot}-${nodeCategory}-${selectedSensorType}-${polygons.length}-${pins.length}-${sensorsAll.length}-${pinIcon ? 1 : 0}`;

  const pinCountText = useMemo(() => `${pins.length} ${t("points", "จุด")}`, [pins.length, t]);
  const sensorCountText = useMemo(
    () => `${sensorsShown.length} ${t("items", "รายการ")}`,
    [sensorsShown.length, t]
  );

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
            <div style={styles.headerTitle}>{t("sensorManagement", "จัดการ PIN และ Sensor")}</div>

            <div style={styles.headerButtons}>
              <a href="./addplantingplots">
                <button style={{ ...styles.headerBtn, ...styles.btnPink }}>
                  {t("addPlot", "+ เพิ่มแปลง")}
                </button>
              </a>

              <a href="./AddSensor">
                <button style={{ ...styles.headerBtn, ...styles.btnOrange }}>
                  {lang === "en" ? "+ Add PIN & Sensor" : "+ เพิ่ม PIN และ Sensor"}
                </button>
              </a>

              <a href="./EditandDelete">
                <button style={{ ...styles.headerBtn, ...styles.btnYellow }}>
                  {t("editDelete", "ลบ / แก้ไข")}
                </button>
              </a>
            </div>
          </div>

          <div style={styles.topGrid}>
            <div style={styles.dropdownCard}>
              <label style={styles.fieldLabel}>
                {t("plot", "แปลง")} {loadingPlots ? `• ${t("loading", "กำลังโหลด...")}` : ""}
              </label>
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
              <label style={styles.fieldLabel}>{lang === "en" ? "Select Node" : "เลือก Node"}</label>
              <select
                value={nodeCategory}
                onChange={(e) => setNodeCategory(e.target.value)}
                style={styles.fieldSelect}
              >
                <option value="all">{lang === "en" ? "All Nodes" : "ทุก Node"}</option>
                <option value="air">{lang === "en" ? "Air Node" : "Node อากาศ"}</option>
                <option value="soil">{lang === "en" ? "Soil Node" : "Node ดิน"}</option>
              </select>
            </div>

            <div style={styles.dropdownCard}>
              <label style={styles.fieldLabel}>{lang === "en" ? "Sensor Type" : "ชนิดเซนเซอร์"}</label>
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

          {errorMsg ? <div style={styles.errorBar}>{errorMsg}</div> : null}

          <div style={styles.mapTitle}>{t("mapAndResourcesAllPlots", "แผนที่และทรัพยากร (ทุกแปลง)")}</div>

          <div style={styles.mapWrapper}>
            {!hydrated ? (
              <div style={{ ...styles.mapLoading, height: mapH }}>
                {t("loadingMap", "กำลังโหลดแผนที่...")}
              </div>
            ) : (
              <MapContainer
                key={`map-${mapKey}`}
                center={mapCenter}
                zoom={13}
                scrollWheelZoom
                style={{ height: mapH, width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {polygons.map((poly) => (
                  <Polygon
                    key={`${poly.plotId}-${poly.id}`}
                    positions={poly.coords}
                    pathOptions={{
                      color: poly.color || "#2563eb",
                      fillColor: poly.color || "#2563eb",
                      fillOpacity: 0.22,
                    }}
                  />
                ))}

                {pinIcon &&
                  pins.map((p) => (
                    <Marker
                      key={`${p.plotId}-${p.id}`}
                      position={[p.lat, p.lng]}
                      icon={pinIcon}
                    >
                      <Popup>
                        <div style={{ fontSize: 12 }}>
                          <div style={{ fontWeight: 700 }}>
                            PIN #{p.number || "-"}
                          </div>
                          <div>
                            lat: {p.lat.toFixed(6)} <br />
                            lng: {p.lng.toFixed(6)}
                          </div>
                          <div style={{ marginTop: 6, color: "#64748b" }}>
                            plotId: {p.plotId}
                          </div>
                          {p.nodeId ? (
                            <div style={{ marginTop: 2, color: "#64748b" }}>
                              nodeId: {p.nodeId}
                            </div>
                          ) : null}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
              </MapContainer>
            )}
          </div>
        </section>

        <section style={styles.bottomPanel}>
          <div style={styles.bottomHeaderWrap}>
            <div style={styles.bottomHeader}>
              {lang === "en" ? "Plot Information" : "ข้อมูลแปลง"}: {selectedPlotObj?.label || `${t("plot", "แปลง")} ${selectedPlot}`}
            </div>
            <button style={styles.chipBtn} type="button">
              Node:{" "}
              {nodeCategory === "all"
                ? lang === "en"
                  ? "All Nodes"
                  : "ทุก Node"
                : nodeCategory === "air"
                ? lang === "en"
                  ? "Air"
                  : "อากาศ"
                : lang === "en"
                ? "Soil"
                : "ดิน"}
            </button>
          </div>

          <div style={styles.bottomSub}>
            {lang === "en" ? "Sensor" : "เซนเซอร์"}:{" "}
            {sensorOptions.find((x) => x.value === selectedSensorType)?.label || "-"}
            {" • "}
            PIN: {pinCountText}
            {" • "}
            {lang === "en" ? "Sensor Items" : "รายการเซนเซอร์"}: {sensorCountText}
          </div>

          <div style={styles.infoGrid}>
            <div>
              <div style={styles.infoLabel}>{lang === "en" ? "Caretaker" : "ผู้ปลูก"}</div>
              <div style={styles.infoBox}>
                {selectedPlotObj?.meta?.farmer || "-"}
              </div>
            </div>
            <div>
              <div style={styles.infoLabel}>{t("plantType", "ประเภทพืช")}</div>
              <div style={styles.infoBox}>
                {selectedPlotObj?.meta?.plant || "-"}
              </div>
            </div>
            <div>
              <div style={styles.infoLabel}>{t("plantedAt", "วันที่เริ่มปลูก")}</div>
              <div style={styles.infoBox}>
                {selectedPlotObj?.meta?.plantedAt || "-"}
              </div>
            </div>
            <div>
              <div style={styles.infoLabel}>{lang === "en" ? "PIN / Sensor Count" : "จำนวน PIN / เซนเซอร์"}</div>
              <div style={styles.infoBox}>
                {selectedPlotObj?.meta?.sensorCount || "-"}
              </div>
            </div>
          </div>

          <div style={styles.sensorList}>
            {sensorsShown.length === 0 ? (
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {t("noSensorData", "ยังไม่มีข้อมูลเซนเซอร์")}
              </div>
            ) : (
              sensorsShown.map((s) => {
                const lr = s.lastReading || null;
                const hasVal =
                  lr &&
                  lr.value !== undefined &&
                  lr.value !== null &&
                  !Number.isNaN(Number(lr.value));
                const valText = hasVal
                  ? `${Number(lr.value)}${s.unit ? ` ${s.unit}` : ""}`
                  : "-";
                const timeText = lr?.ts ? fmtTs(lr.ts, lang) : "-";

                return (
                  <div key={`${s.plotId}-${s.id}`} style={styles.sensorItem}>
                    <div style={styles.sensorIconCircle}>📍</div>
                    <div style={{ width: "100%" }}>
                      <div style={styles.sensorTextMain}>
                        {s.name}{" "}
                        <span style={{ fontSize: 11, color: "#6b7280" }}>
                          ({s.sensorType || "-"})
                        </span>
                      </div>
                      <div style={styles.sensorTextSub}>
                        {lang === "en" ? "Latest" : "ล่าสุด"}: {valText} • {lang === "en" ? "Time" : "เวลา"}: {timeText}
                        {s.status ? ` • ${lang === "en" ? "Status" : "สถานะ"}: ${s.status}` : ""}
                        {" • "}
                        plotId: {s.plotId}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}