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
          if (!e?.latlng) return;
          onPick?.(e.latlng);
        },
      });
      return null;
    }

    function MapFitBoundsInner({ polygons, pins, pickedLatLng }) {
      const map = RL.useMap();

      useEffect(() => {
        const pts = [];

        for (const poly of polygons || []) {
          for (const p of poly || []) {
            if (Array.isArray(p) && p.length === 2) {
              const lat = Number(p[0]);
              const lng = Number(p[1]);
              if (Number.isFinite(lat) && Number.isFinite(lng)) {
                pts.push([lat, lng]);
              }
            }
          }
        }

        for (const pin of pins || []) {
          const lat = Number(pin?.lat);
          const lng = Number(pin?.lng);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            pts.push([lat, lng]);
          }
        }

        if (
          pickedLatLng &&
          Number.isFinite(Number(pickedLatLng.lat)) &&
          Number.isFinite(Number(pickedLatLng.lng))
        ) {
          pts.push([Number(pickedLatLng.lat), Number(pickedLatLng.lng)]);
        }

        if (!pts.length) return;

        const bounds = L.latLngBounds(pts.map((p) => L.latLng(p[0], p[1])));
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20] });
        }
      }, [map, polygons, pins, pickedLatLng]);

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
              pathOptions={{
                color: "#4b9fff",
                weight: 1,
                opacity: 0.7,
                fillOpacity: 0.12,
              }}
            />
          )}
          <RL.CircleMarker
            center={[pos.lat, pos.lng]}
            radius={7}
            pathOptions={{
              color: "#3b82f6",
              weight: 2,
              opacity: 1,
              fillOpacity: 1,
            }}
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
      pickedLatLng,
      pickedIcon,
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
          style={{ height: "100%", width: "100%" }}
        >
          <RL.TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <CurrentLocationLayerInner
            locateTick={locateTick}
            onStatus={onLocateStatus}
          />

          <MapFitBoundsInner
            polygons={polygons}
            pins={pins}
            pickedLatLng={pickedLatLng}
          />

          <MapClickHandlerInner onPick={onPick} disabled={readOnly} />

          {(polygons || []).map((poly, idx) => (
            <RL.Polygon
              key={`poly-${idx}`}
              positions={poly}
              pathOptions={{
                color: "#1ea69a",
                fillColor: "#68d6cf",
                fillOpacity: 0.32,
                weight: 2,
              }}
            />
          ))}

          {(pins || [])
            .filter(
              (p) =>
                Number.isFinite(Number(p.lat)) &&
                Number.isFinite(Number(p.lng))
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
                  {popupPinPrefix} #{p.number}{" "}
                  {p.pinName ? `- ${p.pinName}` : ""}
                </RL.Popup>
              </RL.Marker>
            ))}

          {pickedLatLng &&
            Number.isFinite(Number(pickedLatLng.lat)) &&
            Number.isFinite(Number(pickedLatLng.lng)) && (
              <RL.Marker
                position={[
                  Number(pickedLatLng.lat),
                  Number(pickedLatLng.lng),
                ]}
                icon={pickedIcon || activePinIcon || pinIcon}
              >
                <RL.Popup>ตำแหน่งใหม่ที่เลือก</RL.Popup>
              </RL.Marker>
            )}
        </RL.MapContainer>
      );
    };
  },
  { ssr: false }
);

/* =========================================================
   HELPERS / API
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

async function apiFetch(path, options = {}) {
  const {
    method = "GET",
    token = getToken(),
    body,
    headers = {},
  } = options;

  const finalHeaders = { ...headers };

  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const errorMessage =
      data?.message || data?.error || `Request failed (${res.status})`;
    throw new Error(errorMessage);
  }

  return data;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function makeDefaultUid(nodeType = "air") {
  return nodeType === "soil" ? "Soil - 00000001" : "Air - 00000001";
}

function isValidUid(uid, nodeType = "air") {
  const text = String(uid || "").trim();
  if (nodeType === "soil") return /^Soil\s*-\s*\d{8}$/.test(text);
  return /^Air\s*-\s*\d{8}$/.test(text);
}

function makeSimpleIcon(L, color = "#2563eb") {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        position: relative;
        width: 24px;
        height: 24px;
        transform: translate(-2px,-8px);
      ">
        <div style="
          width: 24px;
          height: 24px;
          background:${color};
          border:2px solid white;
          border-radius:999px 999px 999px 0;
          transform: rotate(-45deg);
          box-shadow:0 6px 16px rgba(0,0,0,.22);
        "></div>
        <div style="
          position:absolute;
          top:6px;
          left:6px;
          width:8px;
          height:8px;
          background:white;
          border-radius:999px;
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -18],
  });
}

function normalizeLatLngPoint(p) {
  if (!p) return null;

  if (Array.isArray(p) && p.length >= 2) {
    const lat = Number(p[0]);
    const lng = Number(p[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  }

  if (typeof p === "object") {
    const lat = Number(p.lat ?? p.latitude);
    const lng = Number(p.lng ?? p.longitude ?? p.lon ?? p.long);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  }

  return null;
}

function normalizePolygonCoords(coords) {
  if (!Array.isArray(coords) || !coords.length) return [];

  let ring = coords;

  if (
    Array.isArray(coords[0]) &&
    coords[0].length &&
    Array.isArray(coords[0][0])
  ) {
    ring = coords[0];
  }

  const out = ring.map(normalizeLatLngPoint).filter(Boolean);
  return out.length >= 3 ? out : [];
}

function extractPolygonList(raw) {
  if (!raw || typeof raw !== "object") return [];

  const candidates = [
    raw.polygons,
    raw.polygon,
    raw.coords,
    raw.coordinates,
    raw.boundaries,
    raw.boundary,
    raw.areas,
  ];

  for (const item of candidates) {
    if (Array.isArray(item) && item.length) {
      return item;
    }
  }

  return [];
}

function extractPolygonCoords(poly) {
  if (!poly) return [];

  const candidates = [
    poly.coords,
    poly.coordinates,
    poly.points,
    poly.positions,
    poly.polygon,
    poly.boundary,
    poly,
  ];

  for (const item of candidates) {
    const normalized = normalizePolygonCoords(item);
    if (normalized.length >= 3) return normalized;
  }

  return [];
}

function normalizePlot(raw) {
  if (!raw || typeof raw !== "object") return null;

  const plotId = raw.id || raw._id || raw.plotId || raw.plot_id || "";
  const alias =
    raw.alias ||
    raw.plotName ||
    raw.plot_name ||
    raw.name ||
    raw.title ||
    "ไม่ระบุชื่อแปลง";

  const polygonList = extractPolygonList(raw);

  const normalizedPolygons = polygonList
    .map((poly, idx) => ({
      id: poly?.id || poly?._id || `poly-${plotId}-${idx + 1}`,
      coords: extractPolygonCoords(poly),
    }))
    .filter((poly) => poly.coords.length >= 3);

  const pinsRaw = safeArray(raw.pins || raw.pinList || raw.nodesPin);

  const pins = pinsRaw
    .map((p, idx) => {
      const lat = Number(p?.lat ?? p?.latitude);
      const lng = Number(p?.lng ?? p?.longitude);
      return {
        id: p?.id || p?._id || `pin-${plotId}-${idx + 1}`,
        number: p?.number ?? idx + 1,
        pinName: p?.pinName || p?.name || "",
        lat,
        lng,
        plotId,
        nodeUid: p?.nodeUid || p?.uid || "",
        nodeId: p?.nodeId || "",
      };
    })
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

  return {
    id: plotId,
    alias,
    polygons: normalizedPolygons,
    pins,
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
  const out = [];

  for (const plot of plots || []) {
    if (
      selectedPlotId !== "all" &&
      String(plot.id) !== String(selectedPlotId)
    ) {
      continue;
    }

    for (const poly of plot?.polygons || []) {
      if (Array.isArray(poly.coords) && poly.coords.length >= 3) {
        out.push(poly.coords);
      }
    }
  }

  return out;
}

function buildDefaultSensorConfig(nodeType = "air") {
  if (nodeType === "soil") {
    return [
      {
        key: "soil_moisture",
        label: "💧 ความชื้นในดิน",
        value: "",
        unit: "%",
        max: "80",
        min: "65",
        maxUnit: "%",
        minUnit: "%",
      },
      {
        key: "nitrogen",
        label: "🧪 ไนโตรเจน (N)",
        value: "",
        unit: "mg/kg",
        max: "60",
        min: "20",
        maxUnit: "mg/kg",
        minUnit: "mg/kg",
      },
      {
        key: "phosphorus",
        label: "🧪 ฟอสฟอรัส (P)",
        value: "",
        unit: "mg/kg",
        max: "40",
        min: "10",
        maxUnit: "mg/kg",
        minUnit: "mg/kg",
      },
      {
        key: "potassium",
        label: "🧪 โพแทสเซียม (K)",
        value: "",
        unit: "mg/kg",
        max: "120",
        min: "40",
        maxUnit: "mg/kg",
        minUnit: "mg/kg",
      },
    ];
  }

  return [
    {
      key: "temperature",
      label: "🌡 อุณหภูมิ",
      value: "",
      unit: "°C",
      max: "35",
      min: "20",
      maxUnit: "°C",
      minUnit: "°C",
    },
    {
      key: "humidity",
      label: "💧 ความชื้นสัมพัทธ์",
      value: "",
      unit: "%",
      max: "85",
      min: "75",
      maxUnit: "%",
      minUnit: "%",
    },
    {
      key: "wind_speed",
      label: "🪽 วัดความเร็วลม",
      value: "",
      unit: "km/hr",
      max: "6",
      min: "1",
      maxUnit: "km/hr",
      minUnit: "km/hr",
    },
    {
      key: "light",
      label: "🌞 ความเข้มแสง",
      value: "",
      unit: "lux",
      max: "70000",
      min: "15000",
      maxUnit: "lux",
      minUnit: "lux",
    },
    {
      key: "rain",
      label: "☁ ปริมาณน้ำฝน",
      value: "",
      unit: "mm",
      max: "10",
      min: "3",
      maxUnit: "mm",
      minUnit: "mm",
    },
  ];
}

function mergeThresholds(defaultRows, items) {
  return defaultRows.map((row) => {
    const found = safeArray(items).find(
      (x) => String(x?.key) === String(row.key)
    );

    if (!found) return row;

    const unit = found.unit || row.unit;

    return {
      ...row,
      max: found.max ?? row.max,
      min: found.min ?? row.min,
      unit,
      maxUnit: unit,
      minUnit: unit,
    };
  });
}

function pointInPolygon(lat, lng, polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return false;

  let inside = false;
  const x = Number(lng);
  const y = Number(lat);

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const yi = Number(polygon[i][0]);
    const xi = Number(polygon[i][1]);
    const yj = Number(polygon[j][0]);
    const xj = Number(polygon[j][1]);

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

function findPlotByLatLng(plots, lat, lng) {
  for (const plot of plots || []) {
    for (const poly of plot?.polygons || []) {
      if (pointInPolygon(lat, lng, poly.coords)) {
        return plot;
      }
    }
  }
  return null;
}

function getNextPinNumber(plot) {
  const nums = safeArray(plot?.pins)
    .map((p) => Number(p?.number))
    .filter((n) => Number.isFinite(n));

  if (!nums.length) return 1;
  return Math.max(...nums) + 1;
}

/* =========================================================
   PAGE
========================================================= */
export default function AddSensorPage() {
  const topbarHook = typeof useDuwimsT === "function" ? useDuwimsT() : null;
  const t = topbarHook?.t || ((text) => text);

  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [screen, setScreen] = useState("view");
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selectedPlot, setSelectedPlot] = useState("all");
  const [activePinId, setActivePinId] = useState("");
  const [locateTick, setLocateTick] = useState(0);
  const [locateStatus, setLocateStatus] = useState("");

  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [formNodeType, setFormNodeType] = useState("air");
  const [formUid, setFormUid] = useState(makeDefaultUid("air"));
  const [formNodeName, setFormNodeName] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [sensorConfig, setSensorConfig] = useState(
    buildDefaultSensorConfig("air")
  );
  const [pickedLatLng, setPickedLatLng] = useState(null);
  const [nodeStatus, setNodeStatus] = useState("ON");
  const [autoPickedPlotId, setAutoPickedPlotId] = useState("");
  const [autoPickedPlotName, setAutoPickedPlotName] = useState("");

  const mapRef = useRef(null);
  const pinIconRef = useRef(null);
  const activePinIconRef = useRef(null);
  const pickedPinIconRef = useRef(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    setMounted(true);

    const onResize = () => setIsMobile(window.innerWidth < 980);
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

        pinIconRef.current = makeSimpleIcon(L, "#4b5563");
        activePinIconRef.current = makeSimpleIcon(L, "#1f7a1f");
        pickedPinIconRef.current = makeSimpleIcon(L, "#d62828");
      } catch {}
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function loadPlotScope() {
    setLoading(true);
    setLoadError("");

    try {
      const json = await apiFetch("/api/plots");
      const list = Array.isArray(json)
        ? json
        : safeArray(json?.items || json?.data || json?.plots || json?.result);

      if (!aliveRef.current) return;

      const normalized = list.map(normalizePlot).filter(Boolean);

      console.log("[plots raw]", list);
      console.log("[plots normalized]", normalized);

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
    loadPlotScope();

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
    const exists = filteredPins.some(
      (p) => String(p.id) === String(activePinId)
    );
    if (!exists) setActivePinId(String(filteredPins[0].id));
  }, [filteredPins, activePinId]);

  const polygonsToRender = useMemo(
    () => buildPolygonsFromPlots(plots, selectedPlot),
    [plots, selectedPlot]
  );

  useEffect(() => {
    console.log("[selectedPlot]", selectedPlot);
    console.log("[polygonsToRender]", polygonsToRender);
    console.log("[plots]", plots);
  }, [selectedPlot, polygonsToRender, plots]);

  const activePin = useMemo(() => {
    return (
      filteredPins.find((p) => String(p.id) === String(activePinId)) || null
    );
  }, [filteredPins, activePinId]);

  async function loadNodeThresholds(nodeType = "air") {
    const defaults = buildDefaultSensorConfig(nodeType);
    setSensorConfig(defaults);

    try {
      const json = await apiFetch(
        `/api/node-thresholds?nodeType=${encodeURIComponent(nodeType)}`
      );

      const items = Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json)
        ? json
        : safeArray(json?.data);

      setSensorConfig(mergeThresholds(defaults, items));
    } catch {
      setSensorConfig(defaults);
    }
  }

  function updateSensorField(key, field, value) {
    setSensorConfig((prev) =>
      prev.map((row) =>
        String(row.key) === String(key) ? { ...row, [field]: value } : row
      )
    );
  }

  function validateCreateNodeForm() {
    const errors = {};

    if (!String(formUid || "").trim()) {
      errors.uid = "กรุณากรอก UID";
    } else if (!isValidUid(formUid, formNodeType)) {
      errors.uid =
        formNodeType === "soil"
          ? "UID ต้องอยู่ในรูปแบบ Soil - 00000001"
          : "UID ต้องอยู่ในรูปแบบ Air - 00000001";
    }

    if (!String(formNodeName || "").trim()) {
      errors.nodeName = "กรุณาใส่ชื่อ NODE";
    }

    if (!pickedLatLng) {
      errors.pin = "กรุณาคลิกแผนที่เพื่อปักตำแหน่ง";
    }

    if (!autoPickedPlotId) {
      errors.plot = "ตำแหน่งที่เลือกไม่ได้อยู่ใน polygon ของแปลงใด";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function checkUidExists(uid) {
    const json = await apiFetch(
      `/api/nodes/check-uid?uid=${encodeURIComponent(uid)}`
    );
    return !!json?.exists;
  }

  async function checkPinBinding(pinId) {
    try {
      const json = await apiFetch(
        `/api/pins/${encodeURIComponent(pinId)}/node-binding`
      );
      return json?.node || null;
    } catch {
      return null;
    }
  }

  async function createPinInPlot(plotId, lat, lng) {
    const plot = plots.find((p) => String(p.id) === String(plotId));
    if (!plot) throw new Error("ไม่พบข้อมูลแปลง");

    const nextPinNumber = getNextPinNumber(plot);

    const payload = {
      number: nextPinNumber,
      pinName: String(formNodeName || "").trim() || `Pin ${nextPinNumber}`,
      lat: Number(lat),
      lng: Number(lng),
    };

    const json = await apiFetch(
      `/api/plots/${encodeURIComponent(plotId)}/pins`,
      {
        method: "POST",
        body: payload,
      }
    );

    const createdPin =
      json?.pin || json?.data || json?.item || json?.result || json;

    if (!createdPin?.id && !createdPin?._id) {
      throw new Error("สร้าง pin ไม่สำเร็จ");
    }

    return {
      id: createdPin.id || createdPin._id,
      number: createdPin.number ?? nextPinNumber,
      pinName: createdPin.pinName || payload.pinName,
      lat: Number(createdPin.lat ?? lat),
      lng: Number(createdPin.lng ?? lng),
      plotId,
    };
  }

  async function openCreateNode() {
    setFormErrors({});
    setMessage("");
    setFormNodeType("air");
    setFormUid(makeDefaultUid("air"));
    setFormNodeName("");
    setNodeStatus("ON");
    setPickedLatLng(null);
    setAutoPickedPlotId("");
    setAutoPickedPlotName("");
    setScreen("add");
    await loadNodeThresholds("air");
  }

  function goBackToView() {
    setFormErrors({});
    setPickedLatLng(null);
    setAutoPickedPlotId("");
    setAutoPickedPlotName("");
    setScreen("view");
  }

  async function saveCreateNode() {
    const ok = validateCreateNodeForm();
    if (!ok) return;

    try {
      setBusy(true);

      const uidExists = await checkUidExists(formUid);
      if (uidExists) {
        alert("UID นี้ถูกใช้งานแล้ว");
        return;
      }

      if (!pickedLatLng?.lat || !pickedLatLng?.lng) {
        alert("กรุณาปักตำแหน่งบนแผนที่ก่อน");
        return;
      }

      if (!autoPickedPlotId) {
        alert("ตำแหน่งที่เลือกไม่ได้อยู่ใน polygon ของแปลงใด");
        return;
      }

      const createdPin = await createPinInPlot(
        autoPickedPlotId,
        pickedLatLng.lat,
        pickedLatLng.lng
      );

      const existingBinding = await checkPinBinding(createdPin.id);
      if (existingBinding) {
        alert("Pin ที่สร้างใหม่มี Node ผูกอยู่แล้ว");
        return;
      }

      const payload = {
        pinId: createdPin.id,
        plotId: autoPickedPlotId,
        uid: String(formUid).trim(),
        nodeName: String(formNodeName).trim(),
        nodeType: formNodeType,
        status: nodeStatus,
        thresholds: sensorConfig.map((row) => ({
          key: row.key,
          value: row.value === "" ? null : Number(row.value),
          max: row.max === "" ? null : Number(row.max),
          min: row.min === "" ? null : Number(row.min),
          unit: row.unit,
        })),
      };

      await apiFetch("/api/nodes/create-and-bind", {
        method: "POST",
        body: payload,
      });

      await loadPlotScope();
      setMessage("บันทึกข้อมูลเรียบร้อยแล้ว");
      setPickedLatLng(null);
      setAutoPickedPlotId("");
      setAutoPickedPlotName("");
      setScreen("view");
    } catch (e) {
      console.warn("[CreateNode] save failed:", e?.message || e);
      alert(`บันทึกไม่สำเร็จ: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  function onPickLatLng(latlng) {
    if (screen !== "add") return;
    if (!latlng) return;

    const lat = Number(latlng.lat);
    const lng = Number(latlng.lng);

    setPickedLatLng({ lat, lng });

    const foundPlot = findPlotByLatLng(plots, lat, lng);

    if (foundPlot) {
      setAutoPickedPlotId(String(foundPlot.id));
      setAutoPickedPlotName(
        foundPlot.alias || foundPlot.name || "ไม่ระบุชื่อแปลง"
      );
      setSelectedPlot(String(foundPlot.id));
      setFormErrors((prev) => ({
        ...prev,
        plot: "",
        pin: "",
      }));
    } else {
      setAutoPickedPlotId("");
      setAutoPickedPlotName("");
      setFormErrors((prev) => ({
        ...prev,
        plot: "ตำแหน่งที่เลือกไม่ได้อยู่ใน polygon ของแปลงใด",
        pin: "",
      }));
    }

    console.log("[picked latlng]", { lat, lng, foundPlot });
  }

  const viewMainCard = useMemo(() => {
    return {
      uid: activePin?.nodeUid || "Air - 00000001",
      nodeName: activePin?.pinName || "กลางไร่",
      status: "ON",
      nodeType: "Air Node",
    };
  }, [activePin]);

  const styles = useMemo(
    () => ({
      page: {
        margin: 0,
        minHeight: "100vh",
        fontFamily:
          '"Prompt", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background: "#edf3ea",
        color: "#30482c",
        padding: "10px 6px 30px",
      },
      shell: {
        maxWidth: 1260,
        margin: "0 auto",
      },
      createShell: {
        background: "#f4f7f1",
        borderRadius: 26,
        padding: "18px 24px 22px",
        boxShadow: "0 10px 24px rgba(62, 97, 52, 0.10)",
        border: "1px solid rgba(112, 168, 104, 0.18)",
      },
      sectionLabel: {
        fontSize: 14,
        fontWeight: 700,
        color: "#5d704f",
        marginBottom: 8,
      },
      redText: {
        color: "#d13a34",
      },
      topActions: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
      },
      createBtn: {
        border: 0,
        borderRadius: 16,
        background: "#24530f",
        color: "#fff",
        fontWeight: 800,
        padding: "12px 18px",
        cursor: "pointer",
      },
      backBtn: {
        border: 0,
        borderRadius: 14,
        background: "#eef1eb",
        color: "#5f6f58",
        fontWeight: 700,
        padding: "10px 16px",
        cursor: "pointer",
      },
      fieldGrid2: {
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: 16,
        marginBottom: 16,
      },
      input: {
        width: "100%",
        border: "2px solid #b7d7b2",
        borderRadius: 18,
        padding: "14px 18px",
        fontSize: 15,
        outline: "none",
        background: "#f9fbf7",
        color: "#30482c",
      },
      select: {
        width: "100%",
        border: "2px solid #b7d7b2",
        borderRadius: 18,
        padding: "14px 18px",
        fontSize: 15,
        outline: "none",
        background: "#f9fbf7",
        color: "#30482c",
      },
      statusRow: {
        display: "flex",
        alignItems: "center",
        gap: 16,
        marginBottom: 14,
        flexWrap: "wrap",
      },
      radioWrap: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 14,
        fontWeight: 700,
      },
      tableWrap: {
        overflowX: "auto",
        borderRadius: 20,
        background: "#f6faf4",
        border: "1px solid #d9e8d2",
      },
      tableHead: {
        display: "grid",
        gridTemplateColumns: "1.4fr 0.7fr 1fr 1fr",
        gap: 0,
        background: "#dfe9da",
        color: "#596f4d",
        fontWeight: 800,
        fontSize: 14,
        minWidth: 860,
      },
      tableRow: {
        display: "grid",
        gridTemplateColumns: "1.4fr 0.7fr 1fr 1fr",
        gap: 0,
        minWidth: 860,
        borderTop: "1px solid #e4ece0",
        alignItems: "center",
      },
      th: {
        padding: "12px 16px",
      },
      td: {
        padding: "12px 16px",
      },
      sensorName: {
        fontWeight: 700,
        color: "#30482c",
      },
      waitText: {
        color: "#a0a8a0",
        fontStyle: "italic",
        fontWeight: 700,
      },
      numberInputWrap: {
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      },
      miniInput: {
        width: 110,
        border: "2px solid #b7d7b2",
        borderRadius: 18,
        padding: "8px 12px",
        fontSize: 14,
        outline: "none",
        background: "#f9fbf7",
        color: "#30482c",
      },
      actionRow: {
        display: "flex",
        justifyContent: "flex-end",
        gap: 14,
        marginTop: 16,
      },
      cancelBtn: {
        border: "1px solid #d8dbe0",
        borderRadius: 16,
        padding: "14px 24px",
        background: "#f1f2f5",
        color: "#66705d",
        fontWeight: 800,
        cursor: "pointer",
      },
      saveBtn: {
        border: 0,
        borderRadius: 16,
        padding: "14px 30px",
        background: "#24530f",
        color: "#fff",
        fontWeight: 800,
        cursor: busy ? "not-allowed" : "pointer",
        opacity: busy ? 0.7 : 1,
      },
      mapBlock: {
        marginTop: 18,
        marginBottom: 18,
      },
      mapTitle: {
        fontSize: 18,
        fontWeight: 800,
        color: "#355a2d",
        marginBottom: 10,
      },
      mapCard: {
        height: 360,
        borderRadius: 22,
        overflow: "hidden",
        background: "#fff",
        border: "1px solid #d6e6d0",
      },
      locateBtn: {
        marginTop: 10,
        border: 0,
        borderRadius: 14,
        background: "#dff2f5",
        color: "#375d66",
        fontWeight: 700,
        padding: "10px 14px",
        cursor: "pointer",
      },
      helper: {
        marginTop: 10,
        fontSize: 13,
        color: "#6b7d64",
        lineHeight: 1.6,
      },
      errorText: {
        marginTop: 6,
        color: "#d13a34",
        fontSize: 12,
        fontWeight: 700,
      },
      infoRow: {
        marginTop: 10,
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
      },
      badge: {
        background: "#edf5ea",
        border: "1px solid #d7e7d0",
        color: "#4b6341",
        borderRadius: 999,
        padding: "8px 12px",
        fontSize: 13,
        fontWeight: 700,
      },
      loadingBox: {
        background: "#fff",
        borderRadius: 18,
        padding: 20,
        color: "#5f6f58",
      },
      errorBox: {
        background: "#ffecec",
        border: "1px solid #ffcaca",
        color: "#b23b3b",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
      },
      viewCard: {
        background: "#fff",
        borderRadius: 20,
        padding: 20,
        border: "1px solid #dfe9da",
      },
      viewHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 16,
      },
      viewTitle: {
        margin: 0,
        fontSize: 24,
        fontWeight: 800,
        color: "#355a2d",
      },
      viewSub: {
        fontSize: 14,
        color: "#76896e",
      },
      pinList: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))",
        gap: 8,
        marginTop: 12,
      },
      pinBtn: (active) => ({
        border: active ? "2px solid #24530f" : "1px solid #d6e6d0",
        borderRadius: 14,
        background: active ? "#edf6ea" : "#fafcf8",
        color: "#335328",
        padding: "10px 12px",
        fontWeight: 700,
        cursor: "pointer",
      }),
      viewMapCard: {
        height: 300,
        borderRadius: 20,
        overflow: "hidden",
        background: "#fff",
        border: "1px solid #d6e6d0",
        marginBottom: 16,
      },
    }),
    [isMobile, busy]
  );

  if (!mounted) {
    return <div style={styles.page} />;
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.shell}>
          <div style={styles.loadingBox}>กำลังโหลดข้อมูล...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        {loadError ? <div style={styles.errorBox}>{loadError}</div> : null}

        {screen === "add" ? (
          <div style={styles.createShell}>
            <div style={styles.topActions}>
              <button type="button" style={styles.backBtn} onClick={goBackToView}>
                ← กลับ
              </button>
            </div>

            <div style={styles.sectionLabel}>
              แปลง <span style={styles.redText}>(เลือกเพื่อดึง POLYGON)</span>
            </div>
            <select
              style={styles.select}
              value={selectedPlot}
              onChange={(e) => {
                const nextPlotId = e.target.value;
                setSelectedPlot(nextPlotId);

                if (nextPlotId === "all") {
                  setAutoPickedPlotId("");
                  setAutoPickedPlotName("");
                  return;
                }

                const selected = plots.find(
                  (p) => String(p.id) === String(nextPlotId)
                );
                if (selected) {
                  setAutoPickedPlotId(String(selected.id));
                  setAutoPickedPlotName(selected.alias || "ไม่ระบุชื่อแปลง");
                }
              }}
            >
              <option value="all">-- เลือกแปลง --</option>
              {plots.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.alias}
                </option>
              ))}
            </select>
            {formErrors.plot ? (
              <div style={styles.errorText}>{formErrors.plot}</div>
            ) : null}

            <div style={{ height: 18 }} />

            <div style={styles.fieldGrid2}>
              <div>
                <div style={styles.sectionLabel}>กรอกUID</div>
                <input
                  style={styles.input}
                  value={formUid}
                  onChange={(e) => setFormUid(e.target.value)}
                  placeholder="UID : Air-00000001 / Soil-00000002"
                />
                {formErrors.uid ? (
                  <div style={styles.errorText}>{formErrors.uid}</div>
                ) : null}
              </div>

              <div>
                <div style={styles.sectionLabel}>กรอกชื่อ NODE</div>
                <input
                  style={styles.input}
                  value={formNodeName}
                  onChange={(e) => setFormNodeName(e.target.value)}
                  placeholder="Node : name"
                />
                {formErrors.nodeName ? (
                  <div style={styles.errorText}>{formErrors.nodeName}</div>
                ) : null}
              </div>
            </div>

            <div style={styles.statusRow}>
              <div style={{ ...styles.sectionLabel, marginBottom: 0 }}>
                STATUS
              </div>

              <label style={styles.radioWrap}>
                <input
                  type="radio"
                  checked={nodeStatus === "ON"}
                  onChange={() => setNodeStatus("ON")}
                />
                ON
              </label>

              <label style={styles.radioWrap}>
                <input
                  type="radio"
                  checked={nodeStatus === "OFF"}
                  onChange={() => setNodeStatus("OFF")}
                />
                OFF
              </label>

              <div style={{ marginLeft: "auto", minWidth: 180 }}>
                <select
                  style={styles.select}
                  value={formNodeType}
                  onChange={async (e) => {
                    const nextType = e.target.value;
                    setFormNodeType(nextType);
                    setFormUid(makeDefaultUid(nextType));
                    await loadNodeThresholds(nextType);
                  }}
                >
                  <option value="air">Air Node</option>
                  <option value="soil">Soil Node</option>
                </select>
              </div>
            </div>

            <div style={styles.mapBlock}>
              <div style={styles.mapTitle}>🗺 Current Map</div>
              <div style={styles.mapCard}>
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
                  pickedLatLng={pickedLatLng}
                  pickedIcon={pickedPinIconRef.current}
                />
              </div>

              <button
                type="button"
                style={styles.locateBtn}
                onClick={() => setLocateTick((prev) => prev + 1)}
              >
                ตำแหน่งของฉัน
              </button>

              <div style={styles.helper}>
                คลิกบนแผนที่เพื่อปักตำแหน่ง Node ใหม่
                {pickedLatLng
                  ? ` | Lat: ${pickedLatLng.lat.toFixed(6)} , Lng: ${pickedLatLng.lng.toFixed(6)}`
                  : ""}
              </div>

              {autoPickedPlotId ? (
                <div style={styles.helper}>
                  ระบบเลือกแปลงให้อัตโนมัติ: {autoPickedPlotName}
                </div>
              ) : null}

              {locateStatus ? (
                <div style={styles.helper}>{locateStatus}</div>
              ) : null}
              {formErrors.pin ? (
                <div style={styles.errorText}>{formErrors.pin}</div>
              ) : null}
              {formErrors.plot ? (
                <div style={styles.errorText}>{formErrors.plot}</div>
              ) : null}

              <div style={styles.infoRow}>
                <div style={styles.badge}>
                  จำนวน pin เดิมในแปลง: {filteredPins.length}
                </div>
                {activePin ? (
                  <div style={styles.badge}>
                    pin ที่เลือกดูอยู่: #{activePin.number}
                  </div>
                ) : null}
              </div>

              {!!filteredPins.length && (
                <div style={styles.pinList}>
                  {filteredPins.map((pin) => {
                    const active = String(pin.id) === String(activePinId);
                    return (
                      <button
                        key={pin.id}
                        type="button"
                        style={styles.pinBtn(active)}
                        onClick={() => setActivePinId(String(pin.id))}
                      >
                        Pin #{pin.number}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ ...styles.sectionLabel, marginBottom: 8 }}>
              SENSOR{" "}
              <span style={{ fontWeight: 500 }}>
                (ระบบตั้งค่าอัตโนมัติ · แก้ไข MAX/MIN ได้)
              </span>
            </div>

            <div style={styles.tableWrap}>
              <div style={styles.tableHead}>
                <div style={styles.th}>SENSOR</div>
                <div style={styles.th}>ข้อมูล</div>
                <div style={styles.th}>MAX</div>
                <div style={styles.th}>MIN</div>
              </div>

              {sensorConfig.map((row) => (
                <div key={row.key} style={styles.tableRow}>
                  <div style={styles.td}>
                    <div style={styles.sensorName}>{row.label}</div>
                  </div>

                  <div style={styles.td}>
                    <div style={styles.waitText}>รอข้อมูล</div>
                  </div>

                  <div style={styles.td}>
                    <div style={styles.numberInputWrap}>
                      <input
                        style={styles.miniInput}
                        value={row.max}
                        onChange={(e) =>
                          updateSensorField(row.key, "max", e.target.value)
                        }
                      />
                      <span>{row.maxUnit}</span>
                    </div>
                  </div>

                  <div style={styles.td}>
                    <div style={styles.numberInputWrap}>
                      <input
                        style={styles.miniInput}
                        value={row.min}
                        onChange={(e) =>
                          updateSensorField(row.key, "min", e.target.value)
                        }
                      />
                      <span>{row.minUnit}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.actionRow}>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={goBackToView}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                style={styles.saveBtn}
                onClick={saveCreateNode}
                disabled={busy}
              >
                {busy ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.viewCard}>
            <div style={styles.viewHeader}>
              <div>
                <h1 style={styles.viewTitle}>📡 Node Sensor</h1>
                <div style={styles.viewSub}>
                  กด + Create Node เพื่อเพิ่ม node ใหม่และปักตำแหน่งบนแผนที่
                </div>
              </div>

              <button
                type="button"
                style={styles.createBtn}
                onClick={openCreateNode}
              >
                + Create Node
              </button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={styles.sectionLabel}>เลือกแปลง</div>
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

            <div style={styles.viewMapCard}>
              <LeafletMap
                center={[13.7563, 100.5018]}
                zoom={11}
                polygons={polygonsToRender}
                pins={filteredPins}
                pinIcon={pinIconRef.current}
                activePinIcon={activePinIconRef.current}
                activePinId={activePinId}
                readOnly
                onPick={() => {}}
                onCreated={(map) => {
                  mapRef.current = map;
                }}
                onReady={() => {}}
                locateTick={locateTick}
                onLocateStatus={setLocateStatus}
                popupPinPrefix="Pin"
                pickedLatLng={null}
                pickedIcon={pickedPinIconRef.current}
              />
            </div>

            {!!filteredPins.length && (
              <div style={styles.pinList}>
                {filteredPins.map((pin) => {
                  const active = String(pin.id) === String(activePinId);
                  return (
                    <button
                      key={pin.id}
                      type="button"
                      style={styles.pinBtn(active)}
                      onClick={() => setActivePinId(String(pin.id))}
                    >
                      Pin #{pin.number}
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: 18 }}>
              <div style={styles.badge}>UID: {viewMainCard.uid}</div>
              <div style={{ height: 8 }} />
              <div style={styles.badge}>NODE: {viewMainCard.nodeName}</div>
              <div style={{ height: 8 }} />
              <div style={styles.badge}>STATUS: {viewMainCard.status}</div>
              <div style={{ height: 8 }} />
              <div style={styles.badge}>TYPE: {viewMainCard.nodeType}</div>
            </div>

            {message ? <div style={styles.helper}>{message}</div> : null}
          </div>
        )}
      </div>
    </div>
  );
}