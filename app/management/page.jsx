"use client";

import { useDuwimsT } from "@/app/TopBar";
import "leaflet/dist/leaflet.css";

import React, { useEffect, useMemo, useState } from "react";

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
    marginBottom: 16,
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

  pinSectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 10,
    color: "#0f172a",
  },

  pinCardList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 16,
  },

  pinCard: {
    borderRadius: 22,
    background: "#ffffff",
    border: "1px solid #c7f0df",
    boxShadow: "0 10px 22px rgba(15, 23, 42, 0.08)",
    padding: 16,
  },

  pinCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },

  pinBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px 14px",
    borderRadius: 999,
    background: "#111827",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
  },

  pinNodeBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 12px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontSize: 12,
    fontWeight: 700,
  },

  pinPlotRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 14,
    flexWrap: "wrap",
  },

  pinPlotLabelInline: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  pinPlotHeroInline: {
    fontSize: 24,
    lineHeight: 1.15,
    fontWeight: 800,
    color: "#0f172a",
    wordBreak: "break-word",
  },

  pinInfoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginBottom: 12,
  },

  pinInfoItem: {
    borderRadius: 12,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    padding: "8px 10px",
  },

  pinInfoItemFull: {
    gridColumn: "1 / -1",
    borderRadius: 12,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    padding: "8px 10px",
  },

  pinInfoItemLabel: {
    fontSize: 10,
    color: "#64748b",
    marginBottom: 2,
  },

  pinInfoItemValue: {
    fontSize: 12,
    color: "#0f172a",
    fontWeight: 500,
    wordBreak: "break-word",
  },

  sensorGroupTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 8,
    marginBottom: 8,
    color: "#0f172a",
  },

  sensorList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  sensorItem: {
    borderRadius: 14,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    padding: "10px 12px",
  },

  sensorMainRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 6,
  },

  sensorName: {
    fontSize: 12,
    fontWeight: 700,
    color: "#0f172a",
  },

  sensorTypeBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 8px",
    borderRadius: 999,
    background: "#e0f2fe",
    color: "#075985",
    fontSize: 10,
    fontWeight: 700,
  },

  sensorMetaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
  },

  sensorMetaBox: {
    borderRadius: 10,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    padding: "7px 8px",
  },

  sensorMetaLabel: {
    fontSize: 10,
    color: "#64748b",
    marginBottom: 2,
  },

  sensorMetaValue: {
    fontSize: 11,
    color: "#111827",
    fontWeight: 500,
    wordBreak: "break-word",
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

  emptyBox: {
    fontSize: 12,
    color: "#64748b",
    borderRadius: 14,
    background: "#ffffff",
    border: "1px dashed #cbd5e1",
    padding: "12px 14px",
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

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:3001/api";

async function apiFetch(path, { method = "GET", body } = {}) {
  const token = getToken();
  const cleanBase = String(API_BASE).replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${cleanBase}${cleanPath}`;

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

function normalizeCoords(coords) {
  if (!Array.isArray(coords)) return [];
  return coords
    .map((pair) => {
      if (!Array.isArray(pair) || pair.length < 2) return null;
      const lat = safeNum(pair[0]);
      const lng = safeNum(pair[1]);
      if (lat === null || lng === null) return null;
      return [lat, lng];
    })
    .filter(Boolean);
}

function collectSensorsFromPin(pin) {
  const soilSensors = Array.isArray(pin?.node_soil?.sensors)
    ? pin.node_soil.sensors.map((s) => ({
        ...s,
        nodeType: "soil",
      }))
    : [];

  const airSensors = Array.isArray(pin?.node_air?.sensors)
    ? pin.node_air.sensors.map((s) => ({
        ...s,
        nodeType: "air",
      }))
    : [];

  return [...soilSensors, ...airSensors];
}

function useLeafletBundle() {
  const [bundle, setBundle] = useState(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const [RL, L] = await Promise.all([
        import("react-leaflet"),
        import("leaflet"),
      ]);

      const anyL = L;
      if (anyL?.Icon?.Default) {
        anyL.Icon.Default.mergeOptions({
          iconUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          iconRetinaUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });
      }

      const pinIcon = new anyL.Icon({
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      if (!alive) return;

      setBundle({
        ...RL,
        L: anyL,
        pinIcon,
      });
    })();

    return () => {
      alive = false;
    };
  }, []);

  return bundle;
}

export default function ManagementPage() {
  const { t, lang } = useDuwimsT();
  const leafletBundle = useLeafletBundle();

  const [hydrated, setHydrated] = useState(false);
  const [vw, setVw] = useState(1280);
  const [mapH, setMapH] = useState(280);

  const [plots, setPlots] = useState([]);
  const [plotDetailsMap, setPlotDetailsMap] = useState({});
  const [plotSummaryMap, setPlotSummaryMap] = useState({});

  const [selectedPlot, setSelectedPlot] = useState("all");
  const [nodeCategory, setNodeCategory] = useState("all");
  const [selectedSensorType, setSelectedSensorType] = useState("all");

  const [loadingPlots, setLoadingPlots] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setVw(window.innerWidth || 1280);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  const isMobile = vw < 640;

  const sensorOptions = useMemo(() => {
    const AIR = [
      { value: "temp_rh", label: t("airTempHumidity", "อุณหภูมิและความชื้น") },
      { value: "wind", label: t("windMeasure", "วัดความเร็วลม") },
      { value: "ppfd", label: t("lightIntensity", "ความเข้มแสง") },
      { value: "rain", label: t("rainAmount", "ปริมาณน้ำฝน") },
    ];
    const SOIL = [
      { value: "soil_moisture", label: t("soilMoisture", "ความชื้นในดิน") },
      { value: "npk", label: t("npkConcentration", "ความเข้มข้นธาตุอาหาร (N,P,K)") },
      { value: "irrigation", label: t("irrigationReady", "การให้น้ำ / ความพร้อมใช้น้ำ") },
    ];

    if (nodeCategory === "all") {
      return [{ value: "all", label: t("allSensors", "ทุกเซนเซอร์") }, ...AIR, ...SOIL];
    }
    if (nodeCategory === "air") {
      return [{ value: "all", label: t("allSensors", "ทุกเซนเซอร์") }, ...AIR];
    }
    return [{ value: "all", label: t("allSensors", "ทุกเซนเซอร์") }, ...SOIL];
  }, [nodeCategory, t]);

  useEffect(() => {
    const ok = sensorOptions.some((x) => x.value === selectedSensorType);
    if (!ok) setSelectedSensorType("all");
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
          const id = String(p?.id || p?._id || "");
          const plotName = p?.plotName || p?.name || "-";
          const alias = p?.alias || plotName || `${t("plot", "แปลง")} ${id}`;
          const caretaker = p?.caretaker || p?.ownerName || "-";
          const plantType = p?.plantType || p?.cropType || "-";
          const plantedAt = p?.plantedAt || "-";

          return {
            value: id,
            label: alias,
            raw: p,
            meta: {
              farmer: caretaker,
              plant: plantType,
              plantedAt,
            },
          };
        });

        if (!cancelled) {
          setPlots([
            {
              value: "all",
              label: t("allPlots", "ทุกแปลง"),
              raw: null,
              meta: { farmer: "-", plant: "-", plantedAt: "-" },
            },
            ...mapped,
          ]);
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
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    let cancelled = false;

    async function loadDetails() {
      const targetPlotIds =
        selectedPlot === "all"
          ? plots.filter((p) => p.value !== "all").map((p) => p.value)
          : plots
              .filter((p) => p.value !== "all" && p.value === selectedPlot)
              .map((p) => p.value);

      if (!targetPlotIds.length) {
        if (!cancelled) {
          setPlotDetailsMap({});
          setPlotSummaryMap({});
        }
        return;
      }

      setLoadingData(true);
      setErrorMsg("");

      try {
        const resultEntries = await Promise.all(
          targetPlotIds.map(async (plotId) => {
            const res = await apiFetch(`/plots/${encodeURIComponent(plotId)}/full`);
            const item = res?.item || null;
            return [plotId, item];
          })
        );

        if (cancelled) return;

        const nextDetails = {};
        const nextSummary = {};

        for (const [plotId, item] of resultEntries) {
          const polygonObj = item?.polygon || {};
          const pins = Array.isArray(polygonObj?.pins) ? polygonObj.pins : [];
          const coords = normalizeCoords(polygonObj?.coords || []);

          const normalizedPins = pins
            .map((pin, index) => ({
              ...pin,
              _id: String(pin?._id || ""),
              plotId: String(item?.id || item?._id || plotId),
              plotLabel: item?.alias || item?.plotName || item?.name || "-",
              number: safeNum(pin?.number) ?? index + 1,
              displayNumber: index + 1,
              lat: safeNum(pin?.lat),
              lng: safeNum(pin?.lng),
              nodeId: pin?.nodeId ? String(pin.nodeId) : null,
              nodeName: pin?.nodeName || "",
              node_soil: pin?.node_soil || { sensors: [] },
              node_air: pin?.node_air || { sensors: [] },
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
            .sort((a, b) => {
              if ((a.number || 0) !== (b.number || 0)) return (a.number || 0) - (b.number || 0);
              return String(a._id).localeCompare(String(b._id));
            })
            .map((pin, index) => ({
              ...pin,
              displayNumber: index + 1,
            }));

          nextDetails[plotId] = {
            item,
            polygon: {
              id: String(polygonObj?._id || `polygon-${plotId}`),
              color: polygonObj?.color || "#2563eb",
              coords,
            },
            pins: normalizedPins,
          };

          const totalSensors = normalizedPins.reduce(
            (sum, pin) => sum + collectSensorsFromPin(pin).length,
            0
          );

          nextSummary[plotId] = {
            pinCount: normalizedPins.length,
            sensorCount: totalSensors,
          };
        }

        setPlotDetailsMap(nextDetails);
        setPlotSummaryMap(nextSummary);
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

    if (plots.length > 1 || (plots.length === 1 && plots[0].value === "all")) {
      loadDetails();
    }

    return () => {
      cancelled = true;
    };
  }, [plots, selectedPlot, t]);

  const selectedPlotObj = useMemo(() => {
    return plots.find((p) => p.value === selectedPlot) || plots[0] || null;
  }, [plots, selectedPlot]);

  const visiblePlotIds = useMemo(() => {
    if (selectedPlot === "all") {
      return plots.filter((p) => p.value !== "all").map((p) => p.value);
    }
    return selectedPlot ? [selectedPlot] : [];
  }, [plots, selectedPlot]);

  const polygons = useMemo(() => {
    return visiblePlotIds
      .map((plotId) => {
        const detail = plotDetailsMap[plotId];
        if (!detail?.polygon?.coords?.length || detail.polygon.coords.length < 3) return null;
        return {
          id: detail.polygon.id,
          plotId,
          color: detail.polygon.color,
          coords: detail.polygon.coords,
        };
      })
      .filter(Boolean);
  }, [visiblePlotIds, plotDetailsMap]);

  const pins = useMemo(() => {
    return visiblePlotIds.flatMap((plotId) => plotDetailsMap[plotId]?.pins || []);
  }, [visiblePlotIds, plotDetailsMap]);

  const pinCards = useMemo(() => {
    const raw = pins
      .map((pin) => {
        let sensors = collectSensorsFromPin(pin);

        if (nodeCategory !== "all") {
          sensors = sensors.filter((s) => s.nodeType === nodeCategory);
        }

        if (selectedSensorType !== "all") {
          sensors = sensors.filter(
            (s) => String(s.sensorType) === String(selectedSensorType)
          );
        }

        return {
          ...pin,
          sensors,
        };
      })
      .filter((pin) => {
        if (selectedSensorType !== "all" || nodeCategory !== "all") {
          return pin.sensors.length > 0;
        }
        return true;
      });

    return [...raw].sort((a, b) => {
      if (selectedPlot === "all" && String(a.plotLabel) !== String(b.plotLabel)) {
        return String(a.plotLabel).localeCompare(String(b.plotLabel));
      }
      if ((a.number || 0) !== (b.number || 0)) return (a.number || 0) - (b.number || 0);
      return String(a._id).localeCompare(String(b._id));
    });
  }, [pins, nodeCategory, selectedSensorType, selectedPlot]);

  const sensorsShownCount = useMemo(() => {
    return pinCards.reduce((sum, pin) => sum + pin.sensors.length, 0);
  }, [pinCards]);

  const selectedSummary = useMemo(() => {
    if (selectedPlot === "all") {
      const pinCount = visiblePlotIds.reduce(
        (sum, pid) => sum + Number(plotSummaryMap[pid]?.pinCount || 0),
        0
      );
      const sensorCount = visiblePlotIds.reduce(
        (sum, pid) => sum + Number(plotSummaryMap[pid]?.sensorCount || 0),
        0
      );
      return { pinCount, sensorCount };
    }
    return plotSummaryMap[selectedPlot] || { pinCount: 0, sensorCount: 0 };
  }, [selectedPlot, visiblePlotIds, plotSummaryMap]);

  const mapCenter = useMemo(() => {
    if (polygons.length && polygons[0]?.coords?.length) {
      const pts = polygons[0].coords;
      const lat = pts.reduce((sum, p) => sum + Number(p?.[0] || 0), 0) / pts.length;
      const lng = pts.reduce((sum, p) => sum + Number(p?.[1] || 0), 0) / pts.length;
      if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    }

    if (pins.length) {
      const lat = pins.reduce((sum, p) => sum + Number(p.lat || 0), 0) / pins.length;
      const lng = pins.reduce((sum, p) => sum + Number(p.lng || 0), 0) / pins.length;
      if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    }

    return [13.3, 101.1];
  }, [polygons, pins]);

  const mapKey = `${selectedPlot}-${nodeCategory}-${selectedSensorType}-${polygons.length}-${pins.length}-${pinCards.length}-${leafletBundle ? 1 : 0}`;

  const pinCountText = useMemo(
    () => `${pinCards.length} ${t("points", "จุด")}`,
    [pinCards.length, t]
  );

  const sensorCountText = useMemo(
    () => `${sensorsShownCount} ${t("items", "รายการ")}`,
    [sensorsShownCount, t]
  );

  const selectedPlotMeta = useMemo(() => {
    if (selectedPlot === "all") {
      return {
        farmer: "-",
        plant: "-",
        plantedAt: "-",
        sensorCount: `${selectedSummary.pinCount} PIN • ${selectedSummary.sensorCount} Sensors`,
      };
    }

    const base = selectedPlotObj?.meta || {};
    return {
      farmer: base?.farmer || "-",
      plant: base?.plant || "-",
      plantedAt: base?.plantedAt || "-",
      sensorCount: `${selectedSummary.pinCount} PIN • ${selectedSummary.sensorCount} Sensors`,
    };
  }, [selectedPlot, selectedPlotObj, selectedSummary]);

  const MapContainer = leafletBundle?.MapContainer;
  const TileLayer = leafletBundle?.TileLayer;
  const Marker = leafletBundle?.Marker;
  const Popup = leafletBundle?.Popup;
  const Polygon = leafletBundle?.Polygon;
  const pinIcon = leafletBundle?.pinIcon;

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
            <div style={styles.headerTitle}>
              {t("sensorManagement", "จัดการ PIN และ Sensor")}
            </div>

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
                {t("plot", "แปลง")}{" "}
                {loadingPlots ? `• ${t("loading", "กำลังโหลด...")}` : ""}
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
              <label style={styles.fieldLabel}>
                {lang === "en" ? "Select Node" : "เลือก Node"}
              </label>
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
              <label style={styles.fieldLabel}>
                {lang === "en" ? "Sensor Type" : "ชนิดเซนเซอร์"}
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

          {errorMsg ? <div style={styles.errorBar}>{errorMsg}</div> : null}

          <div style={styles.mapTitle}>
            {selectedPlot === "all"
              ? t("mapAndResourcesAllPlots", "แผนที่และทรัพยากร (ทุกแปลง)")
              : `${t("mapAndResources", "แผนที่และทรัพยากร")} (${selectedPlotObj?.label || "-"})`}
          </div>

          <div style={styles.mapWrapper}>
            {!hydrated || !leafletBundle || !MapContainer ? (
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
                  pinCards.map((p) => (
                    <Marker
                      key={`${p.plotId}-${p._id}`}
                      position={[p.lat, p.lng]}
                      icon={pinIcon}
                    >
                      <Popup>
                        <div style={{ fontSize: 12, minWidth: 200 }}>
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>
                            PIN #{p.displayNumber}
                          </div>
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>
                            {p.plotLabel || "-"}
                          </div>
                          <div>Latitude: {Number(p.lat).toFixed(6)}</div>
                          <div>Longitude: {Number(p.lng).toFixed(6)}</div>
                          <div style={{ marginTop: 6 }}>
                            Node: {p.nodeName || "-"}
                          </div>
                          <div>Node ID: {p.nodeId || "-"}</div>
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
              {lang === "en" ? "Plot Information" : "ข้อมูลแปลง"}:{" "}
              {selectedPlotObj?.label || `${t("plot", "แปลง")} ${selectedPlot}`}
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
            {loadingData ? ` • ${t("loading", "กำลังโหลด...")}` : ""}
          </div>

          <div style={styles.infoGrid}>
            <div>
              <div style={styles.infoLabel}>
                {lang === "en" ? "Caretaker" : "ผู้ปลูก"}
              </div>
              <div style={styles.infoBox}>{selectedPlotMeta.farmer}</div>
            </div>
            <div>
              <div style={styles.infoLabel}>{t("plantType", "ประเภทพืช")}</div>
              <div style={styles.infoBox}>{selectedPlotMeta.plant}</div>
            </div>
            <div>
              <div style={styles.infoLabel}>{t("plantedAt", "วันที่เริ่มปลูก")}</div>
              <div style={styles.infoBox}>{selectedPlotMeta.plantedAt}</div>
            </div>
            <div>
              <div style={styles.infoLabel}>
                {lang === "en" ? "PIN / Sensor Count" : "จำนวน PIN / เซนเซอร์"}
              </div>
              <div style={styles.infoBox}>{selectedPlotMeta.sensorCount}</div>
            </div>
          </div>

          <div style={styles.pinSectionTitle}>
            {lang === "en" ? "PIN Details" : "รายละเอียด PIN"}
          </div>

          {pinCards.length === 0 ? (
            <div style={styles.emptyBox}>
              {t("noSensorData", "ยังไม่มีข้อมูลเซนเซอร์")}
            </div>
          ) : (
            <div style={styles.pinCardList}>
              {pinCards.map((pin) => {
                const shownNumber = pin.displayNumber;

                return (
                  <div key={`${pin.plotId}-${pin._id}`} style={styles.pinCard}>
                    <div style={styles.pinCardTop}>
                      <div style={styles.pinBadge}>PIN #{shownNumber}</div>
                      <div style={styles.pinNodeBadge}>
                        {pin.nodeName || (lang === "en" ? "No Node" : "ยังไม่มี Node")}
                      </div>
                    </div>

                    <div style={styles.pinPlotRow}>
                      <span style={styles.pinPlotLabelInline}>
                        {lang === "en" ? "Plot:" : "แปลง:"}
                      </span>
                      <span style={styles.pinPlotHeroInline}>
                        {pin.plotLabel || "-"}
                      </span>
                    </div>

                    <div style={styles.pinInfoGrid}>
                      <div style={styles.pinInfoItem}>
                        <div style={styles.pinInfoItemLabel}>
                          {lang === "en" ? "Latitude" : "ละติจูด"}
                        </div>
                        <div style={styles.pinInfoItemValue}>
                          {Number.isFinite(Number(pin.lat))
                            ? Number(pin.lat).toFixed(6)
                            : "-"}
                        </div>
                      </div>

                      <div style={styles.pinInfoItem}>
                        <div style={styles.pinInfoItemLabel}>
                          {lang === "en" ? "Longitude" : "ลองจิจูด"}
                        </div>
                        <div style={styles.pinInfoItemValue}>
                          {Number.isFinite(Number(pin.lng))
                            ? Number(pin.lng).toFixed(6)
                            : "-"}
                        </div>
                      </div>

                      <div style={styles.pinInfoItemFull}>
                        <div style={styles.pinInfoItemLabel}>
                          {lang === "en" ? "Node ID" : "รหัส Node"}
                        </div>
                        <div style={styles.pinInfoItemValue}>{pin.nodeId || "-"}</div>
                      </div>
                    </div>

                    <div style={styles.sensorGroupTitle}>
                      {lang === "en" ? "Sensors in this PIN" : "เซนเซอร์ใน PIN นี้"} ({pin.sensors.length})
                    </div>

                    {pin.sensors.length === 0 ? (
                      <div style={styles.emptyBox}>
                        {lang === "en"
                          ? "No sensors match the selected filter"
                          : "ไม่มีเซนเซอร์ที่ตรงกับตัวกรอง"}
                      </div>
                    ) : (
                      <div style={styles.sensorList}>
                        {pin.sensors.map((s) => {
                          const lr = s?.lastReading || null;
                          const hasVal =
                            lr &&
                            lr.value !== undefined &&
                            lr.value !== null &&
                            !Number.isNaN(Number(lr.value));

                          const valText = hasVal
                            ? `${Number(lr.value)}${s?.unit ? ` ${s.unit}` : ""}`
                            : "-";

                          const timeText = lr?.ts ? fmtTs(lr.ts, lang) : "-";

                          return (
                            <div
                              key={`${pin._id}-${s.nodeType}-${String(s._id || s.id || s.sensorType)}`}
                              style={styles.sensorItem}
                            >
                              <div style={styles.sensorMainRow}>
                                <div style={styles.sensorName}>
                                  {s?.name || s?.sensorType || "Sensor"}
                                </div>
                                <div style={styles.sensorTypeBadge}>
                                  {s?.sensorType || "-"}
                                </div>
                              </div>

                              <div style={styles.sensorMetaGrid}>
                                <div style={styles.sensorMetaBox}>
                                  <div style={styles.sensorMetaLabel}>
                                    {lang === "en" ? "Node Type" : "ประเภท Node"}
                                  </div>
                                  <div style={styles.sensorMetaValue}>
                                    {s?.nodeType === "air"
                                      ? lang === "en"
                                        ? "Air"
                                        : "อากาศ"
                                      : lang === "en"
                                      ? "Soil"
                                      : "ดิน"}
                                  </div>
                                </div>

                                <div style={styles.sensorMetaBox}>
                                  <div style={styles.sensorMetaLabel}>
                                    {lang === "en" ? "Status" : "สถานะ"}
                                  </div>
                                  <div style={styles.sensorMetaValue}>
                                    {s?.status || "-"}
                                  </div>
                                </div>

                                <div style={styles.sensorMetaBox}>
                                  <div style={styles.sensorMetaLabel}>
                                    {lang === "en" ? "Latest Value" : "ค่าล่าสุด"}
                                  </div>
                                  <div style={styles.sensorMetaValue}>{valText}</div>
                                </div>

                                <div style={styles.sensorMetaBox}>
                                  <div style={styles.sensorMetaLabel}>
                                    {lang === "en" ? "Time" : "เวลา"}
                                  </div>
                                  <div style={styles.sensorMetaValue}>{timeText}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}