"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { useDuwimsT } from "@/app/TopBar";

/* =========================================================
   LEAFLET
========================================================= */
const LeafletMap = dynamic(
  async () => {
    const RL = await import("react-leaflet");
    const React = await import("react");
    const LModule = await import("leaflet");
    const L = LModule?.default || LModule;

    if (L?.Icon?.Default) {
      L.Icon.Default.mergeOptions({
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
    }

    function MapClickHandlerInner({ onPick, disabled }) {
      RL.useMapEvents({
        click(e) {
          if (disabled) return;
          onPick?.(e.latlng);
        },
      });
      return null;
    }

    function MapFitBoundsInner({ polygons, pins }) {
      const map = RL.useMap();

      useEffect(() => {
        const pts = [];

        for (const poly of polygons || []) {
          for (const p of poly || []) {
            if (Array.isArray(p) && p.length === 2) {
              const lat = Number(p[0]);
              const lng = Number(p[1]);
              if (Number.isFinite(lat) && Number.isFinite(lng)) pts.push([lat, lng]);
            }
          }
        }

        for (const pin of pins || []) {
          const lat = Number(pin?.lat);
          const lng = Number(pin?.lng);
          if (Number.isFinite(lat) && Number.isFinite(lng)) pts.push([lat, lng]);
        }

        if (!pts.length) return;
        const bounds = L.latLngBounds(pts.map((p) => L.latLng(p[0], p[1])));
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
      }, [map, polygons, pins]);

      return null;
    }

    function CurrentLocationLayerInner({ locateTick, onStatus }) {
      const map = RL.useMap();
      const [pos, setPos] = React.useState(null);

      useEffect(() => {
        if (!locateTick || !map) return;
        if (typeof window === "undefined") return;

        if (!("geolocation" in navigator)) {
          onStatus?.("อุปกรณ์/เบราว์เซอร์นี้ไม่รองรับ Geolocation");
          return;
        }

        onStatus?.("กำลังหาตำแหน่งปัจจุบัน...");
        navigator.geolocation.getCurrentPosition(
          (p) => {
            const lat = p.coords.latitude;
            const lng = p.coords.longitude;
            const accuracy = p.coords.accuracy || 0;
            setPos({ lat, lng, accuracy });

            const zoom = Math.max(map.getZoom(), 17);
            map.setView([lat, lng], zoom, { animate: true });
            onStatus?.("พบตำแหน่งแล้ว ✅");
          },
          (err) => {
            onStatus?.(
              err?.message || "ไม่สามารถเข้าถึงตำแหน่งได้ (อาจไม่ได้อนุญาตสิทธิ์)"
            );
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      }, [locateTick, map, onStatus]);

      if (!pos) return null;

      return (
        <>
          {pos.accuracy > 0 && (
            <RL.Circle
              center={[pos.lat, pos.lng]}
              radius={pos.accuracy}
              pathOptions={{ weight: 1, opacity: 0.7, fillOpacity: 0.15 }}
            />
          )}
          <RL.CircleMarker
            center={[pos.lat, pos.lng]}
            radius={7}
            pathOptions={{ weight: 2, opacity: 1, fillOpacity: 1 }}
          />
        </>
      );
    }

    return function LeafletMapInner({
      center,
      zoom,
      polygons,
      pins,
      pinIcon,
      activePinIcon,
      activePinId,
      readOnly,
      onPick,
      onCreated,
      onReady,
      locateTick,
      onLocateStatus,
      popupPinPrefix,
    }) {
      return (
        <RL.MapContainer
          center={center}
          zoom={zoom}
          whenReady={(e) => {
            onCreated?.(e?.target || null);
            onReady?.();
          }}
          scrollWheelZoom
          style={{ height: 280, width: "100%" }}
        >
          <RL.TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <CurrentLocationLayerInner
            locateTick={locateTick}
            onStatus={onLocateStatus}
          />

          <MapFitBoundsInner polygons={polygons} pins={pins} />
          <MapClickHandlerInner onPick={onPick} disabled={readOnly} />

          {(polygons || []).map((poly, idx) => (
            <RL.Polygon
              key={`poly-${idx}`}
              positions={poly}
              pathOptions={{
                color: "#1ea69a",
                fillColor: "#68d6cf",
                fillOpacity: 0.4,
                weight: 2,
              }}
            />
          ))}

          {(pins || [])
            .filter(
              (p) =>
                Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))
            )
            .map((p) => (
              <RL.Marker
                key={p.id}
                position={[Number(p.lat), Number(p.lng)]}
                icon={
                  String(p.id) === String(activePinId)
                    ? activePinIcon || pinIcon
                    : pinIcon
                }
              >
                <RL.Popup>
                  {popupPinPrefix} #{p.number} {p.pinName ? `- ${p.pinName}` : ""}
                </RL.Popup>
              </RL.Marker>
            ))}
        </RL.MapContainer>
      );
    };
  },
  { ssr: false }
);

/* =========================================================
   HELPERS
========================================================= */
const API_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) ||
  "http://localhost:3001";

const TOKEN_KEYS = [
  "AUTH_TOKEN_V1",
  "token",
  "authToken",
  "pmtool_token",
  "duwims_token",
];

function getToken() {
  if (typeof window === "undefined") return "";
  for (const key of TOKEN_KEYS) {
    const value = window.localStorage.getItem(key);
    if (value) return value;
  }
  return "";
}

function makeHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readJsonSafe(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function normalizeNodeType(v) {
  const s = String(v || "").trim().toLowerCase();
  if (
    s === "air" ||
    s === "air_node" ||
    s === "airnode" ||
    s === "node_air" ||
    s === "อากาศ"
  ) {
    return "air";
  }
  if (
    s === "soil" ||
    s === "soil_node" ||
    s === "soilnode" ||
    s === "node_soil" ||
    s === "ดิน"
  ) {
    return "soil";
  }
  return "air";
}

function makeUid(prefix = "AIR") {
  const ts = Date.now().toString().slice(-6);
  return `${prefix}-${ts}`;
}

function makeSimpleIcon(L, color = "#2563eb") {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        position: relative;
        width: 22px;
        height: 22px;
        transform: translate(-2px,-8px);
      ">
        <div style="
          width: 22px;
          height: 22px;
          background:${color};
          border:2px solid white;
          border-radius: 999px 999px 999px 0;
          transform: rotate(-45deg);
          box-shadow:0 3px 10px rgba(0,0,0,.22);
        "></div>
        <div style="
          position:absolute;
          top:5px;
          left:5px;
          width:8px;
          height:8px;
          background:white;
          border-radius:999px;
        "></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -18],
  });
}

function normalizePolygonCoords(coords) {
  if (!Array.isArray(coords)) return [];
  const ring =
    Array.isArray(coords[0]) && Array.isArray(coords[0][0]) ? coords[0] : coords;

  const out = [];
  for (const p of ring) {
    if (Array.isArray(p) && p.length >= 2) {
      const lat = Number(p[0]);
      const lng = Number(p[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) out.push([lat, lng]);
    } else if (p && typeof p === "object") {
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) out.push([lat, lng]);
    }
  }
  return out.length >= 3 ? out : [];
}

function normalizePlot(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    id: raw.id || raw._id || raw.plotId || "",
    alias: raw.alias || raw.plotName || raw.name || "ทุกแปลง",
    polygons: safeArray(raw.polygons || raw.coords || raw.boundaries).map((poly) => ({
      id: poly?.id || poly?._id || Math.random().toString(36).slice(2),
      coords: normalizePolygonCoords(poly?.coords || poly?.coordinates || poly),
    })),
    pins: safeArray(raw.pins).map((p, idx) => ({
      id: p.id || p._id || `pin-${idx + 1}`,
      number: p.number ?? idx + 1,
      pinName: p.pinName || p.name || "",
      lat: Number(p.lat ?? p.latitude),
      lng: Number(p.lng ?? p.longitude),
      plotId: raw.id || raw._id || raw.plotId || "",
    })),
  };
}

function buildPinsFromPlots(plots) {
  const all = [];
  for (const plot of plots || []) {
    for (const pin of plot?.pins || []) {
      all.push({
        ...pin,
        plotAlias: plot.alias,
      });
    }
  }
  return all;
}

function buildPolygonsFromPlots(plots, selectedPlotId = "all") {
  const list = [];
  for (const plot of plots || []) {
    if (selectedPlotId !== "all" && String(plot.id) !== String(selectedPlotId)) continue;
    for (const poly of plot?.polygons || []) {
      if (Array.isArray(poly.coords) && poly.coords.length >= 3) {
        list.push(poly.coords);
      }
    }
  }
  return list;
}

function buildAirRows(values) {
  return [
    {
      key: "temperature",
      sensor: "อุณหภูมิ",
      value: values.temperature,
      unit: "",
      max: "35",
      maxUnit: "°c",
      min: "20",
      minUnit: "°c",
    },
    {
      key: "humidity",
      sensor: "ความชื้นสัมพัทธ์",
      value: values.humidity,
      unit: "",
      max: "85",
      maxUnit: "%",
      min: "75",
      minUnit: "%",
    },
    {
      key: "wind",
      sensor: "วัดความเร็วลม",
      value: values.windSpeed,
      unit: "",
      max: "6",
      maxUnit: "km/hr",
      min: "1",
      minUnit: "km/hr",
    },
    {
      key: "light",
      sensor: "ความเข้มแสง",
      value: values.light,
      unit: "",
      max: "70000",
      maxUnit: "lux",
      min: "15000",
      minUnit: "lux",
    },
    {
      key: "rain",
      sensor: "ปริมาณน้ำฝน",
      value: values.rain,
      unit: "",
      max: "10",
      maxUnit: "mm",
      min: "3",
      minUnit: "mm",
    },
  ];
}

/* =========================================================
   PAGE (View + Add Node in one file)
========================================================= */
export default function AddSensorPage() {
  const topbarHook = typeof useDuwimsT === "function" ? useDuwimsT() : null;
  const t = topbarHook?.t || ((text) => text);

  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [screen, setScreen] = useState("view"); // "view" | "add"

  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selectedPlot, setSelectedPlot] = useState("all");
  const [activePinId, setActivePinId] = useState("");
  const [locateTick, setLocateTick] = useState(0);
  const [locateStatus, setLocateStatus] = useState("");

  const [message, setMessage] = useState("");

  // add node form
  const [uid, setUid] = useState("Air - 00000001");
  const [nodeName, setNodeName] = useState("");
  const [nodeKind, setNodeKind] = useState("Node");
  const [statusText, setStatusText] = useState("");
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [windSpeed, setWindSpeed] = useState("");
  const [light, setLight] = useState("");
  const [rain, setRain] = useState("");

  const mapRef = useRef(null);
  const pinIconRef = useRef(null);
  const activePinIconRef = useRef(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    setMounted(true);

    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);

    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const LModule = await import("leaflet");
        const L = LModule?.default || LModule;
        if (!alive || !L) return;

        pinIconRef.current = makeSimpleIcon(L, "#2563eb");
        activePinIconRef.current = makeSimpleIcon(L, "#ef4444");
      } catch {}
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function fetchAll() {
    setLoading(true);
    setLoadError("");

    try {
      const headers = makeHeaders();
      const res = await fetch(`${API_BASE}/api/plots`, { headers });
      const json = await readJsonSafe(res);

      const list = Array.isArray(json)
        ? json
        : safeArray(json?.items || json?.data || json?.plots || json?.result);

      if (!aliveRef.current) return;

      const normalized = list.map(normalizePlot).filter(Boolean);
      setPlots(normalized);

      const allPins = buildPinsFromPlots(normalized);
      if (allPins.length && !activePinId) {
        setActivePinId(String(allPins[0].id));
      }
    } catch (err) {
      if (!aliveRef.current) return;
      setLoadError(err?.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    aliveRef.current = true;
    fetchAll();
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const allPins = useMemo(() => buildPinsFromPlots(plots), [plots]);

  const filteredPins = useMemo(() => {
    return allPins.filter((pin) => {
      if (selectedPlot === "all") return true;
      return String(pin.plotId) === String(selectedPlot);
    });
  }, [allPins, selectedPlot]);

  useEffect(() => {
    if (!filteredPins.length) {
      setActivePinId("");
      return;
    }
    const exists = filteredPins.some((p) => String(p.id) === String(activePinId));
    if (!exists) setActivePinId(String(filteredPins[0].id));
  }, [filteredPins, activePinId]);

  const polygonsToRender = useMemo(
    () => buildPolygonsFromPlots(plots, selectedPlot),
    [plots, selectedPlot]
  );

  const activePin = useMemo(() => {
    return filteredPins.find((p) => String(p.id) === String(activePinId)) || null;
  }, [filteredPins, activePinId]);

  const viewMainCard = useMemo(() => {
    return {
      uid: "Air - 0000001",
      nodeName: "กลางไร่",
      status: "ON",
      nodeType: "Air Node",
      rows: [
        ["อุณหภูมิ", "25", "°c", "35", "°c", "20", "°c"],
        ["ความชื้นสัมพัทธ์", "76", "%", "85", "%", "75", "%"],
        ["วัดความเร็วลม", "3", "km/hr", "6", "km/hr", "1", "km/hr"],
        ["ความเข้มแสง", "50000", "lux", "70000", "lux", "15000", "lux"],
        ["ปริมาณน้ำฝน", "5", "mm", "10", "mm", "3", "mm"],
      ],
    };
  }, []);

  const addRows = useMemo(
    () =>
      buildAirRows({
        temperature,
        humidity,
        windSpeed,
        light,
        rain,
      }),
    [temperature, humidity, windSpeed, light, rain]
  );

  function onPickLatLng() {}

  function openCreateNode() {
    setUid("Air - 00000001");
    setNodeName("");
    setNodeKind("Node");
    setStatusText("");
    setTemperature("");
    setHumidity("");
    setWindSpeed("");
    setLight("");
    setRain("");
    setMessage("");
    setScreen("add");
  }

  function cancelCreateNode() {
    setScreen("view");
  }

  async function saveCreateNode() {
    // ตรงนี้คุณค่อยต่อ backend จริงเพิ่มภายหลังได้
    setMessage("บันทึกข้อมูลเรียบร้อยแล้ว");
    setScreen("view");
  }

  const styles = useMemo(
    () => ({
      page: {
        fontFamily:
          '"Prompt", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background: "#efefef",
        minHeight: "100vh",
        color: "#111",
        padding: "22px 0 40px",
      },
      body: {
        maxWidth: 1040,
        margin: "0 auto",
        padding: "0 18px",
      },
      topRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
      },
      backBtn: {
        border: "none",
        background: "transparent",
        fontSize: 13,
        cursor: "pointer",
        color: "#111",
      },
      createBtn: {
        border: "none",
        borderRadius: 10,
        background: "#c9c7ff",
        color: "#3d3d6b",
        fontWeight: 700,
        fontSize: 13,
        padding: "10px 18px",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      },
      mapWrap: {
        background: "transparent",
        marginBottom: 18,
      },
      locationChip: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: "#c8f1f5",
        color: "#27646f",
        fontWeight: 600,
        fontSize: 12,
        padding: "8px 12px",
        borderRadius: 12,
        marginBottom: 12,
      },
      mapCard: {
        borderRadius: 22,
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
      },
      mapLoading: {
        height: 280,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#666",
        background: "#eef2f7",
        fontSize: 13,
      },
      fieldBlock: {
        display: "grid",
        gap: 8,
        marginBottom: 16,
      },
      fieldLabel: {
        fontSize: 12,
        color: "#333",
      },
      select: {
        width: "100%",
        border: "none",
        borderRadius: 8,
        background: "#c9f1eb",
        padding: "12px 14px",
        fontSize: 13,
        color: "#2c2c2c",
        outline: "none",
      },
      pinRow: {
        display: "grid",
        gap: 0,
        marginBottom: 18,
        overflow: "hidden",
        borderRadius: 8,
      },
      pinBtn: (active) => ({
        width: "100%",
        textAlign: "left",
        border: "none",
        borderRadius: 0,
        background: active ? "#bfc2ff" : "#c9f1eb",
        padding: "8px 12px",
        fontSize: 13,
        cursor: "pointer",
      }),

      // view card
      nodeCardMain: {
        background: "#f6b9bd",
        borderRadius: 16,
        padding: "14px 14px 16px",
        marginBottom: 2,
      },
      nodeCardTop: {
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "1.1fr 1fr 1fr 1fr auto",
        gap: 10,
        alignItems: "center",
        marginBottom: 4,
        fontSize: 13,
        fontWeight: 500,
        color: "#222",
        padding: "6px 4px 0",
      },
      nodeTopText: {
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      },
      nodeTypeBadge: {
        justifySelf: "end",
        fontWeight: 500,
      },
      nodeChevron: {
        fontSize: 18,
        fontWeight: 700,
        color: "#111",
      },
      sensorTableWrap: {
        background: "#e5e5e5",
        borderRadius: 16,
        padding: "36px 12px 16px",
        marginTop: 2,
      },
      sensorTableHeader: {
        display: "grid",
        gridTemplateColumns: "1.3fr 1fr 1fr 1fr",
        gap: 18,
        marginBottom: 18,
        color: "#111",
        fontSize: 16,
        fontWeight: 400,
        textAlign: "center",
      },
      sensorRow: {
        display: "grid",
        gridTemplateColumns: "1.3fr 1fr 1fr 1fr",
        gap: 18,
        marginBottom: 16,
        alignItems: "center",
      },
      sensorNamePill: {
        background: "#f4f4f4",
        borderRadius: 12,
        padding: "12px 18px",
        fontSize: 16,
        color: "#222",
        textAlign: "left",
        minHeight: 32,
        display: "flex",
        alignItems: "center",
      },
      sensorValueBox: {
        background: "#f4f4f4",
        borderRadius: 12,
        padding: "12px 16px",
        fontSize: 16,
        color: "#222",
        textAlign: "center",
        minHeight: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      },
      actionRow: {
        display: "flex",
        justifyContent: "flex-end",
        gap: 12,
        marginTop: 28,
        paddingRight: 6,
      },
      editBtnMini: {
        border: "none",
        borderRadius: 14,
        padding: "10px 26px",
        background: "#e5d338",
        color: "#111",
        fontWeight: 500,
        fontSize: 16,
        cursor: "pointer",
      },
      deleteBtnMini: {
        border: "none",
        borderRadius: 14,
        padding: "10px 30px",
        background: "#ff120d",
        color: "#111",
        fontWeight: 500,
        fontSize: 16,
        cursor: "pointer",
      },
      collapsedList: {
        display: "grid",
        gap: 2,
        marginTop: 2,
      },
      collapsedCard: {
        background: "#bfc2ff",
        borderRadius: 14,
        padding: "18px 16px",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "1.1fr 1fr 1fr 1fr auto",
        gap: 10,
        alignItems: "center",
        fontSize: 13,
        color: "#111",
        cursor: "pointer",
      },

      // add node card
      formCard: {
        background: "#f8bcbc",
        borderRadius: 14,
        padding: "14px 14px 0",
      },
      formTop: {
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr auto",
        gap: 12,
        alignItems: "center",
        marginBottom: 10,
      },
      miniField: {
        display: "grid",
        gap: 4,
      },
      miniLabel: {
        fontSize: 10,
        color: "#9b6a6a",
      },
      input: {
        width: "100%",
        border: "none",
        borderRadius: 999,
        padding: "7px 12px",
        background: "#f3f3f3",
        fontSize: 13,
        outline: "none",
        boxSizing: "border-box",
      },
      dropdownText: {
        fontSize: 14,
        fontWeight: 500,
      },
      chevron: {
        fontSize: 18,
        fontWeight: 700,
      },
      tableWrap: {
        background: "#e5e5e5",
        borderRadius: 16,
        padding: "14px 14px 18px",
      },
      currentMapText: {
        textAlign: "right",
        fontSize: 13,
        marginBottom: 10,
      },
      tableHeader: {
        display: "grid",
        gridTemplateColumns: "1.3fr 1fr 1fr 1fr",
        gap: 18,
        marginBottom: 18,
        color: "#111",
        fontSize: 16,
        fontWeight: 400,
        textAlign: "center",
      },
      row: {
        display: "grid",
        gridTemplateColumns: "1.3fr 1fr 1fr 1fr",
        gap: 18,
        marginBottom: 16,
        alignItems: "center",
      },
      cellName: {
        background: "#f4f4f4",
        borderRadius: 12,
        padding: "12px 18px",
        fontSize: 16,
        color: "#222",
        textAlign: "left",
      },
      cellValue: {
        background: "#f4f4f4",
        borderRadius: 12,
        padding: "12px 16px",
        fontSize: 16,
        color: "#222",
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      },
      formActionRow: {
        display: "flex",
        justifyContent: "center",
        gap: 18,
        marginTop: 20,
      },
      deleteBtn: {
        border: "none",
        borderRadius: 10,
        padding: "10px 28px",
        background: "#ff0d0d",
        color: "#111",
        fontWeight: 600,
        fontSize: 16,
        cursor: "pointer",
      },
      saveBtn: {
        border: "none",
        borderRadius: 10,
        padding: "10px 28px",
        background: "#99ea76",
        color: "#111",
        fontWeight: 600,
        fontSize: 16,
        cursor: "pointer",
      },

      loadingBox: {
        background: "#fff",
        borderRadius: 12,
        padding: "18px",
        color: "#666",
        fontSize: 13,
        textAlign: "center",
      },
      errorBox: {
        background: "#fee2e2",
        border: "1px solid #fecaca",
        color: "#991b1b",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 16,
        fontSize: 13,
      },
      messageBox: {
        marginTop: 18,
        fontSize: 13,
        color: "#374151",
      },
    }),
    [isMobile]
  );

  if (!mounted) {
    return <div style={styles.page} />;
  }

  return (
    <div style={styles.page}>
      <div style={styles.body}>
        <div style={styles.topRow}>
          {screen === "add" ? (
            <button
              type="button"
              style={styles.backBtn}
              onClick={cancelCreateNode}
            >
              + เพิ่ม NODE
            </button>
          ) : (
            <div />
          )}

          {screen === "view" ? (
            <button
              type="button"
              style={styles.createBtn}
              onClick={openCreateNode}
            >
              + Create Node
            </button>
          ) : null}
        </div>

        {loadError ? <div style={styles.errorBox}>{loadError}</div> : null}

        {loading ? (
          <div style={styles.loadingBox}>กำลังโหลดข้อมูล...</div>
        ) : (
          <>
            <div style={styles.mapWrap}>
              <div style={styles.locationChip}>
                <span style={{ color: "#ff4d4f" }}>📍</span>
                <span>ตำแหน่งของฉัน</span>
              </div>

              <div style={styles.mapCard}>
                {!mounted ? (
                  <div style={styles.mapLoading}>กำลังโหลดแผนที่...</div>
                ) : (
                  <div style={{ height: 280, width: "100%" }}>
                    <LeafletMap
                      center={[13.7563, 100.5018]}
                      zoom={11}
                      polygons={polygonsToRender}
                      pins={filteredPins}
                      pinIcon={pinIconRef.current}
                      activePinIcon={activePinIconRef.current}
                      activePinId={activePinId}
                      readOnly={false}
                      onPick={onPickLatLng}
                      onCreated={(map) => {
                        mapRef.current = map;
                      }}
                      onReady={() => {}}
                      locateTick={locateTick}
                      onLocateStatus={setLocateStatus}
                      popupPinPrefix="Pin"
                    />
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <button
                type="button"
                style={{
                  border: "none",
                  borderRadius: 10,
                  background: "#c8f1f5",
                  color: "#27646f",
                  fontWeight: 700,
                  fontSize: 13,
                  padding: "9px 14px",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setLocateTick((prev) => prev + 1);
                }}
              >
                ตำแหน่งของฉัน
              </button>
            </div>

            {locateStatus ? (
              <div style={{ marginBottom: 12, fontSize: 12, color: "#5b6470" }}>
                {locateStatus}
              </div>
            ) : null}

            <div style={styles.fieldBlock}>
              <div style={styles.fieldLabel}>แปลง</div>
              <select
                style={styles.select}
                value={selectedPlot}
                onChange={(e) => setSelectedPlot(e.target.value)}
              >
                <option value="all">ทุกแปลง</option>
                {plots.map((plot) => (
                  <option key={plot.id} value={plot.id}>
                    {plot.alias}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.pinRow}>
              {filteredPins.map((pin) => {
                const active = String(pin.id) === String(activePinId);
                return (
                  <button
                    key={pin.id}
                    type="button"
                    style={styles.pinBtn(active)}
                    onClick={() => setActivePinId(String(pin.id))}
                  >
                    {pin.number}
                  </button>
                );
              })}
            </div>

            {screen === "view" ? (
              <>
                <div style={styles.nodeCardMain}>
                  <div style={styles.nodeCardTop}>
                    <div style={styles.nodeTopText}>
                      UID : {viewMainCard.uid}
                    </div>
                    <div style={styles.nodeTopText}>
                      Node : {viewMainCard.nodeName}
                    </div>
                    <div style={styles.nodeTopText}>
                      Status : <span style={{ color: "#27a11f" }}>{viewMainCard.status}</span>
                    </div>
                    <div style={styles.nodeTypeBadge}>{viewMainCard.nodeType}</div>
                    <div style={styles.nodeChevron}>▼</div>
                  </div>

                  <div style={styles.sensorTableWrap}>
                    <div style={styles.sensorTableHeader}>
                      <div>sensor</div>
                      <div>ข้อมูล</div>
                      <div>Max</div>
                      <div>Min</div>
                    </div>

                    {viewMainCard.rows.map((row) => (
                      <div key={row[0]} style={styles.sensorRow}>
                        <div style={styles.sensorNamePill}>{row[0]}</div>

                        <div style={styles.sensorValueBox}>
                          <span>{row[1]}</span>
                          <span>{row[2]}</span>
                        </div>

                        <div style={styles.sensorValueBox}>
                          <span>{row[3]}</span>
                          <span>{row[4]}</span>
                        </div>

                        <div style={styles.sensorValueBox}>
                          <span>{row[5]}</span>
                          <span>{row[6]}</span>
                        </div>
                      </div>
                    ))}

                    <div style={styles.actionRow}>
                      <button type="button" style={styles.editBtnMini}>
                        แก้ไข
                      </button>
                      <button type="button" style={styles.deleteBtnMini}>
                        ลบ
                      </button>
                    </div>
                  </div>
                </div>

                <div style={styles.collapsedList}>
                  <div style={styles.collapsedCard}>
                    <div>UID : Air - 0000002</div>
                    <div>Node : กลางไร่</div>
                    <div>
                      Status : <span style={{ color: "#27a11f" }}>ON</span>
                    </div>
                    <div>Soil Node</div>
                    <div style={styles.nodeChevron}>▼</div>
                  </div>

                  <div style={styles.collapsedCard}>
                    <div>UID : Air - 0000001</div>
                    <div>Node : กลางไร่</div>
                    <div>
                      Status : <span style={{ color: "#27a11f" }}>ON</span>
                    </div>
                    <div>Air Node</div>
                    <div style={styles.nodeChevron}>▼</div>
                  </div>
                </div>
              </>
            ) : (
              <div style={styles.formCard}>
                <div style={styles.formTop}>
                  <div style={styles.miniField}>
                    <div style={styles.miniLabel}>กรุณาใส่ UID</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span>UID :</span>
                      <input
                        style={styles.input}
                        value={uid}
                        onChange={(e) => setUid(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={styles.miniField}>
                    <div style={styles.miniLabel}>กรุณาใส่ชื่อ Node</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span>Node :</span>
                      <input
                        style={styles.input}
                        value={nodeName}
                        placeholder="name"
                        onChange={(e) => setNodeName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={styles.miniField}>
                    <div style={styles.miniLabel}>&nbsp;</div>
                    <div>Status : {statusText}</div>
                  </div>

                  <div style={styles.miniField}>
                    <div style={styles.miniLabel}>&nbsp;</div>
                    <div>{nodeKind}</div>
                  </div>

                  <div style={styles.chevron}>▼</div>
                </div>

                <div style={styles.tableWrap}>
                  <div style={styles.currentMapText}>Current Map</div>

                  <div style={styles.tableHeader}>
                    <div>sensor</div>
                    <div>ข้อมูล</div>
                    <div>Max</div>
                    <div>Min</div>
                  </div>

                  {addRows.map((row) => (
                    <div key={row.key} style={styles.row}>
                      <div style={styles.cellName}>{row.sensor}</div>

                      <div style={styles.cellValue}>
                        <input
                          style={{ ...styles.input, borderRadius: 10 }}
                          value={row.value}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (row.key === "temperature") setTemperature(val);
                            if (row.key === "humidity") setHumidity(val);
                            if (row.key === "wind") setWindSpeed(val);
                            if (row.key === "light") setLight(val);
                            if (row.key === "rain") setRain(val);
                          }}
                        />
                      </div>

                      <div style={styles.cellValue}>
                        <span>{row.max}</span>
                        <span>{row.maxUnit}</span>
                      </div>

                      <div style={styles.cellValue}>
                        <span>{row.min}</span>
                        <span>{row.minUnit}</span>
                      </div>
                    </div>
                  ))}

                  <div style={styles.formActionRow}>
                    <button
                      type="button"
                      style={styles.deleteBtn}
                      onClick={cancelCreateNode}
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      style={styles.saveBtn}
                      onClick={saveCreateNode}
                    >
                      บันทึก
                    </button>
                  </div>
                </div>
              </div>
            )}

            {message ? <div style={styles.messageBox}>{message}</div> : null}
          </>
        )}
      </div>
    </div>
  );
}