"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { useRouter } from "next/navigation";
import { useDuwimsT } from "@/app/TopBar";

// --- Load react-leaflet once (avoid race conditions between dynamic components) ---
const LeafletMap = dynamic(
  async () => {
    const RL = await import("react-leaflet");
    const React = await import("react");
    const L = await import("leaflet");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    function MapClickHandlerInner({ onPick, disabled }) {
      RL.useMapEvents({
        click(e) {
          if (disabled) return;
          onPick?.(e.latlng);
        },
      });
      return null;
    }

    function MapFitBoundsInner({ polygons }) {
      const map = RL.useMap();

      useEffect(() => {
        if (!polygons || !polygons.length) return;
        const allPts = polygons
          .flat()
          .filter((p) => Array.isArray(p) && p.length === 2);

        if (!allPts.length) return;

        const bounds = L.latLngBounds(allPts.map((p) => L.latLng(p[0], p[1])));
        map.fitBounds(bounds, { padding: [20, 20] });
      }, [map, polygons]);

      return null;
    }

    function CurrentLocationLayerInner({ locateTick, onStatus }) {
      const map = RL.useMap();
      const [pos, setPos] = React.useState(null);

      useEffect(() => {
        if (!locateTick) return;
        if (!map) return;
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
          whenReady={() => onReady?.()}
          ref={(mapInstance) => {
            if (mapInstance && onCreated) onCreated(mapInstance);
          }}
          scrollWheelZoom={true}
          style={{ height: 230, width: "100%" }}
        >
          <RL.TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <CurrentLocationLayerInner
            locateTick={locateTick}
            onStatus={onLocateStatus}
          />

          <MapFitBoundsInner polygons={polygons} />
          <MapClickHandlerInner onPick={onPick} disabled={readOnly} />

          {(polygons || []).map((poly, idx) => (
            <RL.Polygon
              key={`poly-${idx}`}
              positions={poly}
              pathOptions={{
                color: "#16a34a",
                fillColor: "#86efac",
                fillOpacity: 0.4,
              }}
            />
          ))}

          {pinIcon &&
            (pins || [])
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
                    {popupPinPrefix} #{p.number}
                  </RL.Popup>
                </RL.Marker>
              ))}
        </RL.MapContainer>
      );
    };
  },
  { ssr: false }
);

// =========================
// API helpers
// =========================
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

const SENSOR_TYPE_GROUPS = {
  air: [
    { value: "temp_rh", label: "อุณหภูมิและความชื้น", unit: "°C / %" },
    { value: "wind_speed", label: "วัดความเร็วลม", unit: "m/s" },
    { value: "light", label: "ความเข้มแสง", unit: "lux" },
    { value: "rain", label: "ปริมาณน้ำฝน", unit: "mm" },
  ],
  soil: [
    { value: "soil_moisture", label: "ความชื้นในดิน", unit: "%" },
    { value: "npk", label: "ความเข้มข้นธาตุอาหาร (N,P,K)", unit: "mg/kg" },
    { value: "water_level", label: "การให้น้ำ / ความพร้อมใช้น้ำ", unit: "%" },
  ],
};

function getToken() {
  if (typeof window === "undefined") return null;
  for (const k of TOKEN_KEYS) {
    const t = window.localStorage.getItem(k);
    if (t) return t;
  }
  return null;
}

async function apiFetch(path, { method = "GET", body, token, signal } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg = json?.message || res.statusText || "Request failed";
    const err = new Error(`${method} ${path} -> ${res.status}: ${msg}`);
    err.status = res.status;
    err.payload = json;
    throw err;
  }

  return json;
}

function numOrNull(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeLatLngPoint(p) {
  if (!p) return null;

  if (typeof p === "object" && !Array.isArray(p)) {
    const lat = Number(p.lat ?? p.latitude);
    const lng = Number(p.lng ?? p.lon ?? p.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    return null;
  }

  if (Array.isArray(p) && p.length >= 2) {
    const a = Number(p[0]);
    const b = Number(p[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

    const aLooksLngTH = a >= 90 && a <= 120;
    const bLooksLatTH = b >= -10 && b <= 30;
    const aLooksLat = a >= -90 && a <= 90;
    const bLooksLng = b >= -180 && b <= 180;

    if (aLooksLngTH && bLooksLatTH) return [b, a];
    if (!aLooksLat && bLooksLng) return [b, a];

    return [a, b];
  }

  return null;
}

function normalizePolygonCoords(coords) {
  if (!Array.isArray(coords)) return [];
  const ring =
    Array.isArray(coords[0]) && Array.isArray(coords[0][0]) ? coords[0] : coords;

  const out = [];
  for (const p of ring) {
    const ll = normalizeLatLngPoint(p);
    if (ll) out.push(ll);
  }
  return out.length >= 3 ? out : [];
}

function isLikelyObjectId(v) {
  return typeof v === "string" && /^[a-f\d]{24}$/i.test(v);
}

function formatCoordinate(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(6) : "-";
}

function getNextAvailablePinNumber(items = []) {
  const used = new Set(
    items
      .map((p) => Number(p?.number))
      .filter((n) => Number.isInteger(n) && n > 0)
  );

  let next = 1;
  while (used.has(next)) next += 1;
  return next;
}

function ensureUniquePinNumbers(items = []) {
  const used = new Set();

  return items.map((p) => {
    let num = Number(p?.number);

    if (!Number.isInteger(num) || num <= 0 || used.has(num)) {
      num = 1;
      while (used.has(num)) num += 1;
    }

    used.add(num);
    return { ...p, number: num };
  });
}

function sensorTypeLabel(sensorType) {
  const key = String(sensorType || "");
  if (key === "temp_rh") return "อุณหภูมิและความชื้น";
  if (key === "soil_moisture") return "ความชื้นในดิน";
  if (key === "water_level") return "การให้น้ำ / ความพร้อมใช้น้ำ";
  if (key === "npk") return "ความเข้มข้นธาตุอาหาร (N,P,K)";
  if (key === "wind_speed") return "วัดความเร็วลม";
  if (key === "light") return "ความเข้มแสง";
  if (key === "rain") return "ปริมาณน้ำฝน";
  return key || "-";
}

function getDefaultUnitByType(sensorType) {
  const all = [...SENSOR_TYPE_GROUPS.air, ...SENSOR_TYPE_GROUPS.soil];
  const found = all.find((x) => String(x.value) === String(sensorType));
  return found?.unit || "";
}

function getDefaultNameByType(sensorType) {
  const all = [...SENSOR_TYPE_GROUPS.air, ...SENSOR_TYPE_GROUPS.soil];
  const found = all.find((x) => String(x.value) === String(sensorType));
  return found?.label || sensorTypeLabel(sensorType);
}

function createLocalSensor(nodeType, sensorType = "") {
  const safeType =
    sensorType ||
    (nodeType === "air" ? SENSOR_TYPE_GROUPS.air[0].value : SENSOR_TYPE_GROUPS.soil[0].value);

  return {
    id: `tmp-sensor-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sensorType: safeType,
    name: getDefaultNameByType(safeType),
    unit: getDefaultUnitByType(safeType),
    value: null,
    valueHint: "",
    status: "OK",
    lastReadingAt: null,
    lastReading: { value: null, ts: null },
  };
}

function createLocalNode(nodeType = "air") {
  return {
    id: `tmp-node-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    nodeType,
    nodeName: nodeType === "air" ? "Node อากาศใหม่" : "Node ดินใหม่",
    sensors: [
      createLocalSensor(
        nodeType,
        nodeType === "air" ? "temp_rh" : "soil_moisture"
      ),
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizePinFromApi(p = {}, plotId = "") {
  return {
    ...p,
    id: String(p.id || p._id || ""),
    plotId: String(p.plotId || plotId || ""),
    pinName: String(p.pinName || p.name || ""),
    node_air: Array.isArray(p.node_air) ? p.node_air : [],
    node_soil: Array.isArray(p.node_soil) ? p.node_soil : [],
  };
}

function getPinStatus(pin) {
  const airCount = Array.isArray(pin?.node_air) ? pin.node_air.length : 0;
  const soilCount = Array.isArray(pin?.node_soil) ? pin.node_soil.length : 0;
  if (airCount === 0 && soilCount === 0) return "UNASSIGNED";
  if (airCount === 0 || soilCount === 0) return "PARTIAL";
  return "READY";
}

function getPinStatusLabel(pin) {
  const s = getPinStatus(pin);
  if (s === "READY") return "พร้อมใช้งาน";
  if (s === "PARTIAL") return "ยังไม่ครบ";
  return "ยังไม่ผูก node";
}

function formatSensorDisplayValue(sensor) {
  const rawValue =
    sensor?.lastReading?.value !== undefined && sensor?.lastReading?.value !== null
      ? sensor.lastReading.value
      : sensor?.value;

  if (
    rawValue !== null &&
    rawValue !== undefined &&
    typeof rawValue !== "object" &&
    rawValue !== ""
  ) {
    return `${rawValue}${sensor?.unit ? ` ${sensor.unit}` : ""}`;
  }

  const hint = String(sensor?.valueHint || "").trim();
  if (hint) return hint;

  if (sensor?.sensorType === "npk") {
    const src = sensor?.lastReading?.value ?? sensor?.value ?? {};
    const n = src?.n ?? src?.N ?? "-";
    const p = src?.p ?? src?.P ?? "-";
    const k = src?.k ?? src?.K ?? "-";
    return `N:${n} P:${p} K:${k}`;
  }

  return "-";
}

function getNodeTypeBadge(nodeType) {
  return nodeType === "air" ? "Node อากาศ" : "Node ดิน";
}

function getTemplateName(tpl) {
  return tpl?.nodeName || tpl?.id || tpl?._id || "-";
}

function prepareSensorsForSave(sensors = []) {
  return (Array.isArray(sensors) ? sensors : []).map((s) => ({
    id: s.id && !String(s.id).startsWith("tmp-") ? s.id : undefined,
    sensorType: String(s.sensorType || "").trim(),
    name: String(s.name || "").trim(),
    unit: String(s.unit || "").trim(),
    value: s.value ?? null,
    valueHint: s.valueHint ?? "",
    status: String(s.status || "OK"),
    lastReadingAt: s.lastReadingAt ?? null,
    lastReading: s.lastReading ?? { value: s.value ?? null, ts: s.lastReadingAt ?? null },
  }));
}

export default function AddSensorPage() {
  const router = useRouter();
  const { t, lang } = useDuwimsT();

  const mapRef = useRef(null);
  const [pinIcon, setPinIcon] = useState(null);
  const [activePinIcon, setActivePinIcon] = useState(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [mapReady, setMapReady] = useState(false);
  const [locateTick, setLocateTick] = useState(0);
  const [locateStatus, setLocateStatus] = useState("");

  const [width, setWidth] = useState(1200);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isMobile = width <= 640;
  const isTablet = width > 640 && width <= 1024;

  useEffect(() => {
    let alive = true;
    import("leaflet").then((L) => {
      if (!alive) return;
      setPinIcon(
        new L.Icon({
          iconUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
          shadowSize: [41, 41],
        })
      );
      setActivePinIcon(
        new L.Icon({
          iconUrl:
            "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
          shadowSize: [41, 41],
        })
      );
    });
    return () => {
      alive = false;
    };
  }, []);

  const [editOpen, setEditOpen] = useState(false);
  const onEditClick = () => setEditOpen((v) => !v);

  const [selectedPlot, setSelectedPlot] = useState("all");
  const [selectedNode, setSelectedNode] = useState("all");
  const [selectedSensorType, setSelectedSensorType] = useState("all");

  const [plots, setPlots] = useState([]);
  const [nodeTemplates, setNodeTemplates] = useState([]);
  const [plotMeta, setPlotMeta] = useState(null);
  const [plotPolygons, setPlotPolygons] = useState([]);

  const [pins, setPins] = useState([]);
  const [activePinId, setActivePinId] = useState(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [savingNodeId, setSavingNodeId] = useState("");

  const activePin = useMemo(
    () => pins.find((p) => String(p.id) === String(activePinId)) || null,
    [pins, activePinId]
  );

  useEffect(() => {
    setTemplatePickerOpen(false);
    setSelectedTemplateId("");
  }, [activePinId]);

  useEffect(() => {
    setMapReady(false);
  }, [selectedPlot, selectedNode]);

  useEffect(() => {
    const allowedTypes =
      selectedNode === "soil"
        ? SENSOR_TYPE_GROUPS.soil
        : selectedNode === "air"
        ? SENSOR_TYPE_GROUPS.air
        : [...SENSOR_TYPE_GROUPS.air, ...SENSOR_TYPE_GROUPS.soil];

    const hasCurrent = allowedTypes.some(
      (item) => String(item.value) === String(selectedSensorType)
    );

    if (selectedSensorType !== "all" && !hasCurrent) {
      setSelectedSensorType("all");
    }
  }, [selectedNode, selectedSensorType]);

  const readOnlyAllPlots = false;

  const plotLabel = useMemo(() => {
    if (selectedPlot === "all") return "ทุกแปลง";
    const p = plots.find((x) => String(x.id || x._id) === String(selectedPlot));
    return p
      ? p.plotName || p.alias || p.name || `แปลง ${p.id || p._id}`
      : `แปลง ${selectedPlot}`;
  }, [selectedPlot, plots]);

  const nodeOptions = useMemo(
    () => [
      { value: "all", label: "ทุก Node" },
      { value: "soil", label: "Node ดิน" },
      { value: "air", label: "Node อากาศ" },
    ],
    []
  );

  const sensorTypeOptions = useMemo(() => {
    if (selectedNode === "soil") {
      return SENSOR_TYPE_GROUPS.soil;
    }
    if (selectedNode === "air") {
      return SENSOR_TYPE_GROUPS.air;
    }
    return [...SENSOR_TYPE_GROUPS.air, ...SENSOR_TYPE_GROUPS.soil];
  }, [selectedNode]);

  const filteredPins = useMemo(() => {
    const list = Array.isArray(pins) ? pins : [];
    const scoped =
      selectedPlot === "all"
        ? list
        : list.filter((p) => String(p.plotId) === String(selectedPlot));

    return [...scoped].sort((a, b) => Number(a?.number || 0) - Number(b?.number || 0));
  }, [pins, selectedPlot]);

  const activePinVisibleNodes = useMemo(() => {
    if (!activePin) return [];
    let nodes = [];
    if (selectedNode === "all" || selectedNode === "air") {
      nodes.push(...(activePin.node_air || []).map((n) => ({ ...n, __nodeType: "air" })));
    }
    if (selectedNode === "all" || selectedNode === "soil") {
      nodes.push(...(activePin.node_soil || []).map((n) => ({ ...n, __nodeType: "soil" })));
    }

    return nodes.map((node) => ({
      ...node,
      sensors: (node.sensors || []).filter((s) => {
        if (selectedSensorType === "all") return true;
        return String(s.sensorType) === String(selectedSensorType);
      }),
    }));
  }, [activePin, selectedNode, selectedSensorType]);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      try {
        const token = getToken();
        const [plotsRes, nodesRes] = await Promise.all([
          apiFetch("/api/plots", { token, signal: controller.signal }),
          apiFetch("/api/nodes", { token, signal: controller.signal }),
        ]);

        setPlots(Array.isArray(plotsRes?.items) ? plotsRes.items : []);
        setNodeTemplates(Array.isArray(nodesRes?.items) ? nodesRes.items : []);
      } catch (e) {
        console.warn("[AddSensor] load initial data failed:", e?.message || e);
      }
    };

    run();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadSinglePlot = async (plotId, token) => {
      const [plotRes, polygonRes, pinsRes] = await Promise.all([
        apiFetch(`/api/plots/${encodeURIComponent(String(plotId))}`, {
          token,
          signal: controller.signal,
        }),
        apiFetch(`/api/plots/${encodeURIComponent(String(plotId))}/polygon`, {
          token,
          signal: controller.signal,
        }).catch(() => ({ item: null })),
        apiFetch(`/api/plots/${encodeURIComponent(String(plotId))}/pins`, {
          token,
          signal: controller.signal,
        }).catch(() => ({ items: [] })),
      ]);

      const meta = plotRes?.item || null;
      const polygonItem = polygonRes?.item || null;
      const pinsItems = Array.isArray(pinsRes?.items) ? pinsRes.items : [];

      const polys = [];
      const p1 = normalizePolygonCoords(polygonItem?.coords);
      if (p1.length >= 3) polys.push(p1);

      return {
        meta,
        polygons: polys,
        pins: ensureUniquePinNumbers(
          pinsItems.map((p) => normalizePinFromApi(p, plotId))
        ),
      };
    };

    const run = async () => {
      try {
        const token = getToken();

        setPlotMeta(null);
        setPlotPolygons([]);
        setPins([]);
        setActivePinId(null);

        if (selectedPlot === "all") {
          const plotRes = await apiFetch("/api/plots", {
            token,
            signal: controller.signal,
          });

          const plotItems = Array.isArray(plotRes?.items) ? plotRes.items : [];
          const allPolygons = [];
          const allPins = [];

          for (const p of plotItems) {
            const pid = String(p.id || p._id);
            if (!pid) continue;

            try {
              const one = await loadSinglePlot(pid, token);
              allPolygons.push(...one.polygons);
              allPins.push(...one.pins);
            } catch {}
          }

          setPlotPolygons(allPolygons);
          const fixedPins = ensureUniquePinNumbers(allPins);
          setPins(fixedPins);
          setActivePinId(fixedPins[0]?.id ? String(fixedPins[0].id) : null);
          return;
        }

        const one = await loadSinglePlot(selectedPlot, token);
        setPlotMeta(one.meta);
        setPlotPolygons(one.polygons);
        setPins(one.pins);
        setActivePinId(one.pins[0]?.id ? String(one.pins[0].id) : null);
      } catch (e) {
        console.warn("[AddSensor] load plot detail failed:", e?.message || e);
      }
    };

    run();
    return () => controller.abort();
  }, [selectedPlot]);

  const addPin = async () => {
    if (selectedPlot === "all") {
      alert(
        lang === "en"
          ? "Please select a plot before adding a pin"
          : "กรุณาเลือกแปลงก่อนเพิ่ม Pin"
      );
      return;
    }

    const scopedPins = (Array.isArray(pins) ? pins : []).filter(
      (p) => String(p.plotId) === String(selectedPlot)
    );

    const nextNumber = getNextAvailablePinNumber(scopedPins);
    const tempId = `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    setPins((prev) => [
      ...(Array.isArray(prev) ? prev : []),
      {
        id: tempId,
        _tmp: true,
        number: nextNumber,
        pinName: `Pin ${nextNumber}`,
        lat: null,
        lng: null,
        node_air: [],
        node_soil: [],
        plotId: String(selectedPlot),
      },
    ]);

    setActivePinId(tempId);
  };

  const removePinById = async (pinId) => {
    if (!pinId) return;

    setPins((prev) =>
      (Array.isArray(prev) ? prev : []).filter((p) => String(p.id) !== String(pinId))
    );

    if (String(pinId) === String(activePinId)) {
      setActivePinId(null);
    }

    try {
      const token = getToken();
      if (!isLikelyObjectId(String(pinId))) return;
      await apiFetch(`/api/pins/${encodeURIComponent(String(pinId))}`, {
        method: "DELETE",
        token,
      });
    } catch (e) {
      console.warn("[AddSensor] delete pin failed:", e?.message || e);
    }
  };

  const reloadOnePin = async (pinId) => {
    if (!pinId || !isLikelyObjectId(String(pinId))) return;
    try {
      const token = getToken();
      const res = await apiFetch(`/api/pins/${encodeURIComponent(String(pinId))}`, {
        token,
      });
      const item = res?.item || null;
      if (!item) return;

      setPins((prev) =>
        (prev || []).map((p) =>
          String(p.id) === String(pinId)
            ? normalizePinFromApi(item, p.plotId || selectedPlot)
            : p
        )
      );
    } catch (e) {
      console.warn("[AddSensor] reload pin failed:", e?.message || e);
    }
  };

  const onPickLatLng = async (latlng) => {
    if (!latlng || !activePinId) return;

    const { lat, lng } = latlng;
    const pin = pins.find((p) => String(p.id) === String(activePinId));
    if (!pin) return;

    setPins((prev) =>
      prev.map((p) => (String(p.id) === String(activePinId) ? { ...p, lat, lng } : p))
    );

    if (pin._tmp || !isLikelyObjectId(String(pin.id))) {
      const targetPlotId = String(pin.plotId || selectedPlot);
      if (!targetPlotId || targetPlotId === "all") {
        alert(
          lang === "en"
            ? "Please select a plot before placing a pin"
            : "กรุณาเลือกแปลงก่อนปักหมุด"
        );
        return;
      }

      try {
        const token = getToken();
        const r = await apiFetch(
          `/api/plots/${encodeURIComponent(String(targetPlotId))}/pins`,
          {
            method: "POST",
            token,
            body: {
              number: pin.number,
              pinName: pin.pinName || `Pin ${pin.number}`,
              lat,
              lng,
            },
          }
        );

        const created = r?.item || r;
        const createdId = created?.id || created?._id;
        if (!createdId) throw new Error("ไม่ได้รับ id จาก API");

        const normalizedCreated = normalizePinFromApi(created, targetPlotId);

        setPins((prev) => {
          const replaced = prev.map((p) =>
            String(p.id) === String(activePinId) ? normalizedCreated : p
          );

          const samePlot = replaced.filter(
            (p) => String(p.plotId) === String(targetPlotId)
          );
          const otherPlots = replaced.filter(
            (p) => String(p.plotId) !== String(targetPlotId)
          );

          return [...otherPlots, ...ensureUniquePinNumbers(samePlot)];
        });

        setActivePinId(String(createdId));
      } catch (e) {
        console.warn("[AddSensor] create pin failed:", e?.message || e);
        alert(
          `${lang === "en" ? "Pin placement failed" : "ปักหมุดไม่สำเร็จ"}: ${
            e?.message || e
          }`
        );
      }
      return;
    }

    try {
      const token = getToken();
      await apiFetch(`/api/pins/${encodeURIComponent(String(activePinId))}`, {
        method: "PATCH",
        token,
        body: { lat, lng },
      });
    } catch (e) {
      console.warn("[AddSensor] patch pin failed:", e?.message || e);
    }
  };

  const setActiveLat = async (lat) => {
    if (!activePinId) return;
    setPins((prev) =>
      prev.map((p) => (String(p.id) === String(activePinId) ? { ...p, lat } : p))
    );

    try {
      const token = getToken();
      const la = numOrNull(lat);
      if (la === null) return;
      if (!isLikelyObjectId(String(activePinId))) return;

      await apiFetch(`/api/pins/${encodeURIComponent(String(activePinId))}`, {
        method: "PATCH",
        token,
        body: { lat: la },
      });
    } catch (e) {
      console.warn("[AddSensor] patch pin lat failed:", e?.message || e);
    }
  };

  const setActiveLng = async (lng) => {
    if (!activePinId) return;
    setPins((prev) =>
      prev.map((p) => (String(p.id) === String(activePinId) ? { ...p, lng } : p))
    );

    try {
      const token = getToken();
      const lo = numOrNull(lng);
      if (lo === null) return;
      if (!isLikelyObjectId(String(activePinId))) return;

      await apiFetch(`/api/pins/${encodeURIComponent(String(activePinId))}`, {
        method: "PATCH",
        token,
        body: { lng: lo },
      });
    } catch (e) {
      console.warn("[AddSensor] patch pin lng failed:", e?.message || e);
    }
  };

  const setActivePinName = async (pinName) => {
    if (!activePinId) return;
    setPins((prev) =>
      prev.map((p) =>
        String(p.id) === String(activePinId) ? { ...p, pinName } : p
      )
    );

    try {
      const token = getToken();
      if (!isLikelyObjectId(String(activePinId))) return;

      await apiFetch(`/api/pins/${encodeURIComponent(String(activePinId))}`, {
        method: "PATCH",
        token,
        body: { pinName },
      });
    } catch (e) {
      console.warn("[AddSensor] patch pin name failed:", e?.message || e);
    }
  };

  const addNodeToActivePin = async (nodeType) => {
    if (!activePinId) {
      alert(lang === "en" ? "Please select a pin first" : "กรุณาเลือก Pin ก่อน");
      return;
    }

    if (!isLikelyObjectId(String(activePinId))) {
      setPins((prev) =>
        prev.map((p) => {
          if (String(p.id) !== String(activePinId)) return p;
          const key = nodeType === "air" ? "node_air" : "node_soil";
          return {
            ...p,
            [key]: [...(p[key] || []), createLocalNode(nodeType)],
          };
        })
      );
      return;
    }

    try {
      const token = getToken();
      const path =
        nodeType === "air"
          ? `/api/pins/${encodeURIComponent(String(activePinId))}/node-air`
          : `/api/pins/${encodeURIComponent(String(activePinId))}/node-soil`;

      const body =
        nodeType === "air"
          ? { nodeName: "Node อากาศใหม่" }
          : { nodeName: "Node ดินใหม่" };

      const res = await apiFetch(path, {
        method: "POST",
        token,
        body,
      });

      const created = res?.item || null;
      if (!created) throw new Error("ไม่สามารถสร้าง node ได้");

      setPins((prev) =>
        prev.map((p) => {
          if (String(p.id) !== String(activePinId)) return p;
          const key = nodeType === "air" ? "node_air" : "node_soil";
          return {
            ...p,
            [key]: [...(p[key] || []), created],
          };
        })
      );
    } catch (e) {
      console.warn("[AddSensor] add node failed:", e?.message || e);
      alert(`${lang === "en" ? "Add node failed" : "เพิ่ม node ไม่สำเร็จ"}: ${e?.message || e}`);
    }
  };

  const updateLocalNode = (pinId, nodeType, nodeId, updater) => {
    setPins((prev) =>
      (prev || []).map((pin) => {
        if (String(pin.id) !== String(pinId)) return pin;
        const key = nodeType === "air" ? "node_air" : "node_soil";
        return {
          ...pin,
          [key]: (pin[key] || []).map((node) =>
            String(node.id) === String(nodeId)
              ? typeof updater === "function"
                ? updater(node)
                : { ...node, ...updater }
              : node
          ),
        };
      })
    );
  };

  const deleteNodeFromPin = async (pinId, nodeId) => {
    if (!pinId || !nodeId) return;
    const pin = pins.find((p) => String(p.id) === String(pinId));
    const node =
      (pin?.node_air || []).find((n) => String(n.id) === String(nodeId)) ||
      (pin?.node_soil || []).find((n) => String(n.id) === String(nodeId));

    if (!node) return;

    if (!window.confirm(lang === "en" ? "Delete this node?" : "ลบ node นี้ใช่ไหม")) {
      return;
    }

    setPins((prev) =>
      (prev || []).map((p) => {
        if (String(p.id) !== String(pinId)) return p;
        return {
          ...p,
          node_air: (p.node_air || []).filter((n) => String(n.id) !== String(nodeId)),
          node_soil: (p.node_soil || []).filter((n) => String(n.id) !== String(nodeId)),
        };
      })
    );

    if (!isLikelyObjectId(String(pinId)) || !isLikelyObjectId(String(nodeId))) return;

    try {
      const token = getToken();
      await apiFetch(
        `/api/pins/${encodeURIComponent(String(pinId))}/nodes/${encodeURIComponent(
          String(nodeId)
        )}`,
        {
          method: "DELETE",
          token,
        }
      );
    } catch (e) {
      console.warn("[AddSensor] delete node failed:", e?.message || e);
      alert(`${lang === "en" ? "Delete node failed" : "ลบ node ไม่สำเร็จ"}: ${e?.message || e}`);
      await reloadOnePin(pinId);
    }
  };

  const saveNode = async (pinId, nodeType, node) => {
    if (!pinId || !node?.id) return;

    if (!isLikelyObjectId(String(pinId)) || !isLikelyObjectId(String(node.id))) {
      alert(
        lang === "en"
          ? "Please place/save the pin on the map first."
          : "กรุณาปักและบันทึก Pin บนแผนที่ก่อน"
      );
      return;
    }

    setSavingNodeId(String(node.id));
    try {
      const token = getToken();
      await apiFetch(
        `/api/pins/${encodeURIComponent(String(pinId))}/nodes/${encodeURIComponent(
          String(node.id)
        )}`,
        {
          method: "PATCH",
          token,
          body: {
            nodeName: node.nodeName,
            sensors: prepareSensorsForSave(node.sensors || []),
          },
        }
      );
      await reloadOnePin(pinId);
    } catch (e) {
      console.warn("[AddSensor] save node failed:", e?.message || e);
      alert(`${lang === "en" ? "Save node failed" : "บันทึก node ไม่สำเร็จ"}: ${e?.message || e}`);
    } finally {
      setSavingNodeId("");
    }
  };

  const addSensorToNode = (pinId, nodeType, nodeId) => {
    updateLocalNode(pinId, nodeType, nodeId, (node) => ({
      ...node,
      sensors: [...(node.sensors || []), createLocalSensor(nodeType)],
      updatedAt: new Date().toISOString(),
    }));
  };

  const updateSensorInNode = (pinId, nodeType, nodeId, sensorId, patch) => {
    updateLocalNode(pinId, nodeType, nodeId, (node) => ({
      ...node,
      sensors: (node.sensors || []).map((s) =>
        String(s.id) === String(sensorId)
          ? {
              ...s,
              ...patch,
              ...(patch.sensorType
                ? {
                    name:
                      patch.name !== undefined
                        ? patch.name
                        : getDefaultNameByType(patch.sensorType),
                    unit:
                      patch.unit !== undefined
                        ? patch.unit
                        : getDefaultUnitByType(patch.sensorType),
                  }
                : {}),
            }
          : s
      ),
      updatedAt: new Date().toISOString(),
    }));
  };

  const removeSensorFromNode = async (pinId, nodeType, nodeId, sensorId) => {
    const pin = pins.find((p) => String(p.id) === String(pinId));
    const nodeList = nodeType === "air" ? pin?.node_air || [] : pin?.node_soil || [];
    const node = nodeList.find((n) => String(n.id) === String(nodeId));
    const sensor = (node?.sensors || []).find((s) => String(s.id) === String(sensorId));
    if (!node || !sensor) return;

    updateLocalNode(pinId, nodeType, nodeId, (n) => ({
      ...n,
      sensors: (n.sensors || []).filter((s) => String(s.id) !== String(sensorId)),
      updatedAt: new Date().toISOString(),
    }));

    if (isLikelyObjectId(String(sensorId))) {
      try {
        const token = getToken();
        await apiFetch(`/api/sensors/${encodeURIComponent(String(sensorId))}`, {
          method: "PATCH",
          token,
          body: {
            status: "DELETED",
            name: sensor.name || "",
          },
        });
      } catch (e) {
        console.warn("[AddSensor] soft delete sensor failed:", e?.message || e);
      }
    }
  };

  const attachTemplateToActivePin = async () => {
    if (!activePinId) {
      alert(lang === "en" ? "Please select a pin first" : "กรุณาเลือก Pin ก่อน");
      return;
    }
    if (!selectedTemplateId) {
      alert(
        lang === "en"
          ? "Please select a node template"
          : "กรุณาเลือก NodeTemplate"
      );
      return;
    }
    if (!isLikelyObjectId(String(activePinId))) {
      alert(
        lang === "en"
          ? "Please place/save the pin on the map first."
          : "กรุณาปักและบันทึก Pin บนแผนที่ก่อน"
      );
      return;
    }

    try {
      const token = getToken();
      await apiFetch(`/api/pins/${encodeURIComponent(String(activePinId))}/node`, {
        method: "PATCH",
        token,
        body: { nodeId: selectedTemplateId },
      });
      await reloadOnePin(activePinId);
      setTemplatePickerOpen(false);
      setSelectedTemplateId("");
    } catch (e) {
      console.warn("[AddSensor] assign node template failed:", e?.message || e);
      alert(
        `${lang === "en" ? "Assign template failed" : "เพิ่ม template ไม่สำเร็จ"}: ${
          e?.message || e
        }`
      );
    }
  };

  const styles = useMemo(
    () => ({
      page: {
        fontFamily:
          '"Prompt", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background: "#e5edf8",
        minHeight: "100vh",
        color: "#111827",
        padding: "22px 0 30px",
      },
      body: { maxWidth: 1120, margin: "0 auto", padding: "0 16px" },

      topPanel: {
        borderRadius: 24,
        padding: "16px 20px 18px",
        background: "linear-gradient(135deg,#40B596,#676FC7)",
        color: "#fff",
        marginBottom: 18,
        boxShadow: "0 16px 36px rgba(15,23,42,0.18)",
      },
      topHeaderRow: {
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        justifyContent: "space-between",
        alignItems: isMobile ? "flex-start" : "center",
        gap: isMobile ? 8 : 0,
        marginBottom: 10,
      },
      topHeaderLeft: {
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
      },
      backBtn: {
        width: 34,
        height: 34,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.28)",
        background: "rgba(255,255,255,0.16)",
        color: "#fff",
        fontWeight: 1000,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
        userSelect: "none",
      },
      topTitle: { fontSize: 16, fontWeight: 700 },

      filterGrid: {
        display: "grid",
        gridTemplateColumns: isMobile
          ? "1fr"
          : isTablet
          ? "repeat(2,minmax(0,1fr))"
          : "repeat(3,minmax(0,1fr))",
        gap: 10,
        marginTop: 4,
      },
      filterCard: {
        borderRadius: 16,
        background:
          "linear-gradient(135deg,rgba(255,255,255,0.95),rgba(224,242,254,0.95))",
        padding: "8px 10px 6px",
        fontSize: 12,
        color: "#0f172a",
      },
      filterLabel: {
        fontSize: 11,
        fontWeight: 600,
        color: "#64748b",
        marginBottom: 4,
      },
      filterSelect: {
        width: "100%",
        borderRadius: 12,
        border: "none",
        padding: "8px 10px",
        fontSize: 12,
        background: "#e0f2fe",
      },

      plotPanel: {
        borderRadius: 26,
        background: "#dffff3",
        padding: "18px 20px 20px",
        marginBottom: 18,
        boxShadow: "0 14px 32px rgba(15,23,42,0.12)",
      },
      plotHeaderRow: {
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        justifyContent: "space-between",
        alignItems: isMobile ? "flex-start" : "center",
        gap: isMobile ? 6 : 0,
        marginBottom: 6,
      },
      plotTitle: { fontSize: 14, fontWeight: 600 },
      plotSub: { fontSize: 11, color: "#6b7280", marginBottom: 10 },

      editBtn: {
        borderRadius: 999,
        border: "none",
        padding: "7px 14px",
        fontSize: 12,
        fontWeight: 700,
        background: editOpen ? "#ef4444" : "#facc15",
        color: editOpen ? "#ffffff" : "#111827",
        cursor: "pointer",
        width: isMobile ? "100%" : "auto",
        boxShadow: "0 10px 18px rgba(15,23,42,0.12)",
      },

      infoGrid: {
        display: "grid",
        gridTemplateColumns: isMobile
          ? "1fr"
          : isTablet
          ? "repeat(2,minmax(0,1fr))"
          : "repeat(4,minmax(0,1fr))",
        gap: 10,
        marginBottom: 14,
      },
      infoLabel: { fontSize: 11, color: "#6b7280", marginBottom: 3 },
      infoBox: {
        borderRadius: 12,
        background: "#ffffff",
        border: "1px solid #c7f0df",
        padding: "6px 10px",
        fontSize: 12,
      },

      mapCard: {
        borderRadius: 22,
        overflow: "hidden",
        background: "#ffffff",
        boxShadow: "0 10px 24px rgba(15,23,42,0.15)",
        marginBottom: 10,
      },
      mapTitle: { fontSize: 13, fontWeight: 600, padding: "10px 14px 4px" },
      mapHelp: { fontSize: 11, color: "#64748b", padding: "0 14px 10px" },
      mapLoading: {
        height: 230,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        color: "#64748b",
        background: "#f8fafc",
      },

      pinActionsRow: {
        marginTop: 8,
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
      },
      pinMetaBtn: {
        borderRadius: 999,
        width: 34,
        height: 34,
        border: "1px solid rgba(15,23,42,0.12)",
        background: "#ffffff",
        cursor: "pointer",
        fontSize: 18,
        fontWeight: 800,
        lineHeight: "34px",
      },

      pinList: { marginTop: 10, display: "grid", gap: 10 },
      pinCard: (active, status) => ({
        borderRadius: 16,
        background:
          active
            ? "#fee2e2"
            : status === "READY"
            ? "#dcfce7"
            : status === "PARTIAL"
            ? "#fef3c7"
            : "#f1f5f9",
        padding: 10,
        border: active ? "2px solid #ef4444" : "1px solid rgba(15,23,42,0.10)",
        boxShadow: active
          ? "0 10px 18px rgba(239,68,68,0.25)"
          : "0 10px 18px rgba(15,23,42,0.06)",
        cursor: "pointer",
      }),
      pinCardGrid: {
        display: "grid",
        gridTemplateColumns: isMobile
          ? "1fr"
          : isTablet
          ? "repeat(2,minmax(0,1fr))"
          : "repeat(5,minmax(0,1fr))",
        gap: 12,
      },
      pinMetaBox: {
        borderRadius: 14,
        background: "rgba(255,255,255,0.82)",
        border: "1px solid rgba(15,23,42,0.10)",
        padding: "12px 12px",
        minWidth: 0,
      },
      pinMetaLabel: {
        fontSize: 10,
        fontWeight: 800,
        color: "#6b7280",
        marginBottom: 3,
      },
      pinMetaValue: {
        fontSize: 12,
        fontWeight: 800,
        color: "#0f172a",
        wordBreak: "break-word",
        lineHeight: 1.45,
      },

      pinPanel: {
        borderRadius: 26,
        background: "#ffd9f1",
        padding: isMobile ? "18px 14px 22px" : "22px 20px 24px",
        boxShadow: "0 14px 32px rgba(244,114,182,0.25)",
        marginBottom: 16,
      },
      pinHeaderRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: isMobile ? "flex-start" : "center",
        gap: 10,
        marginBottom: 16,
        flexWrap: "wrap",
      },
      pinTitle: {
        fontSize: isMobile ? 16 : 18,
        fontWeight: 900,
        color: "#111827",
        lineHeight: 1.4,
      },
      pinStack: {
        display: "grid",
        rowGap: 16,
      },

      pinFormGrid: {
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))",
        gap: 14,
        alignItems: "start",
      },
      pinField: {
        display: "grid",
        gap: 7,
        minWidth: 0,
      },
      pinFieldLabel: {
        fontSize: 12,
        fontWeight: 900,
        color: "#475569",
        lineHeight: 1.35,
      },

      pinHint: {
        borderRadius: 14,
        background: "rgba(255,255,255,0.72)",
        border: "1px solid rgba(15,23,42,0.10)",
        padding: "12px 14px",
        fontSize: 12,
        fontWeight: 900,
        color: "#ef4444",
        lineHeight: 1.5,
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
      },
      hintDot: {
        width: 10,
        height: 10,
        borderRadius: 3,
        background: "#22c55e",
        boxShadow: "0 0 0 3px rgba(34,197,94,0.20)",
        flex: "0 0 auto",
      },

      groupPick: {
        width: "100%",
        minHeight: 46,
        borderRadius: 14,
        border: "1px solid rgba(15,23,42,0.12)",
        background: "#ffffff",
        padding: "11px 14px",
        fontSize: 13,
        outline: "none",
        fontWeight: 800,
        color: "#0f172a",
        lineHeight: 1.4,
        boxSizing: "border-box",
      },

      sectionLabel: {
        fontSize: 12,
        fontWeight: 900,
        color: "#475569",
        marginBottom: 8,
      },

      infoNotice: {
        borderRadius: 14,
        background: "rgba(255,255,255,0.72)",
        border: "1px solid rgba(15,23,42,0.10)",
        padding: "12px 14px",
        fontSize: 12,
        color: "#334155",
      },

      templateCard: {
        borderRadius: 16,
        background: "#ffffff",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 10px 18px rgba(15,23,42,0.08)",
        padding: "12px 14px",
        display: "grid",
        gap: 10,
      },
      templateActions: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
      },
      nodeRow: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        marginBottom: 10,
      },
      actionBtn: {
        borderRadius: 999,
        border: "none",
        padding: "10px 16px",
        fontSize: 12,
        fontWeight: 800,
        background: "linear-gradient(135deg,#6366f1,#a855f7)",
        color: "#fff",
        cursor: "pointer",
      },
      secondaryBtn: {
        borderRadius: 999,
        border: "1px solid rgba(15,23,42,0.12)",
        padding: "10px 16px",
        fontSize: 12,
        fontWeight: 800,
        background: "#ffffff",
        color: "#111827",
        cursor: "pointer",
      },
      dangerBtn: {
        borderRadius: 999,
        border: "none",
        padding: "10px 16px",
        fontSize: 12,
        fontWeight: 800,
        background: "#ef4444",
        color: "#fff",
        cursor: "pointer",
      },

      groupList: { display: "grid", gap: 12 },
      groupCard: {
        borderRadius: 16,
        background: "#ffffff",
        padding: "12px 12px",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 10px 18px rgba(15,23,42,0.08)",
      },
      groupTitleRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: isMobile ? "flex-start" : "center",
        flexDirection: isMobile ? "column" : "row",
        gap: 8,
        marginBottom: 10,
      },
      groupTitle: {
        fontSize: 12,
        fontWeight: 900,
        color: "#111827",
      },
      badge: {
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "6px 10px",
        fontSize: 11,
        fontWeight: 900,
        background: "#ede9fe",
        color: "#5b21b6",
      },

      nodeEditGrid: {
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))",
        gap: 12,
        marginBottom: 12,
      },

      itemsGrid: {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 10,
      },
      itemCard: {
        borderRadius: 14,
        background: "#ffffff",
        border: "1px solid rgba(15,23,42,0.08)",
        padding: "10px 10px",
      },
      itemTitle: {
        fontSize: 11,
        fontWeight: 900,
        color: "#111827",
        marginBottom: 6,
      },
      itemSub: {
        fontSize: 11,
        color: "#6b7280",
        marginBottom: 6,
      },
      itemMeta: {
        fontSize: 11,
        color: "#475569",
      },
      sensorEditGrid: {
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))",
        gap: 10,
        marginBottom: 8,
      },
      miniInput: {
        width: "100%",
        minHeight: 40,
        borderRadius: 12,
        border: "1px solid rgba(15,23,42,0.12)",
        background: "#fff",
        padding: "8px 10px",
        fontSize: 12,
        outline: "none",
        fontWeight: 700,
        color: "#0f172a",
        boxSizing: "border-box",
      },
      sensorBtns: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        marginTop: 6,
      },

      saveBtn: {
        marginTop: 14,
        display: "block",
        marginLeft: "auto",
        marginRight: "auto",
        borderRadius: 999,
        border: "none",
        padding: "10px 44px",
        fontSize: 13,
        fontWeight: 800,
        background: "linear-gradient(135deg,#6366f1,#a855f7)",
        color: "#fff",
        cursor: "pointer",
        width: isMobile ? "100%" : "auto",
      },
    }),
    [editOpen, isMobile, isTablet]
  );

  const caretakerText = plotMeta?.caretaker || plotMeta?.ownerName || "-";
  const plantTypeText = plotMeta?.plantType || plotMeta?.cropType || "-";
  const plantedAtText = plotMeta?.plantedAt || "-";
  const polygonsToRender = plotPolygons;

  return (
    <div style={styles.page}>
      <div style={styles.body} className="du-add-sensor">
        <section style={styles.topPanel}>
          <div style={styles.topHeaderRow}>
            <div style={styles.topHeaderLeft}>
              <button
                type="button"
                style={styles.backBtn}
                onClick={() => router.push("/management")}
                title={t("back")}
                aria-label="back to management"
              >
                &lt;
              </button>
              <div style={styles.topTitle}>{t("sensorManagement")}</div>
            </div>
          </div>

          <div style={styles.filterGrid}>
            <div style={styles.filterCard}>
              <div style={styles.filterLabel}>แปลง</div>
              <select
                style={styles.filterSelect}
                value={selectedPlot}
                onChange={(e) => setSelectedPlot(e.target.value)}
              >
                <option value="all">ทุกแปลง</option>
                {plots.map((p) => (
                  <option key={p.id || p._id} value={p.id || p._id}>
                    {p.plotName || p.alias || p.name || p.id || p._id}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.filterCard}>
              <div style={styles.filterLabel}>เลือก Node</div>
              <select
                style={styles.filterSelect}
                value={selectedNode}
                onChange={(e) => setSelectedNode(e.target.value)}
              >
                {nodeOptions.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.filterCard}>
              <div style={styles.filterLabel}>ประเภทเซนเซอร์</div>
              <select
                style={styles.filterSelect}
                value={selectedSensorType}
                onChange={(e) => setSelectedSensorType(e.target.value)}
              >
                <option value="all">ทุกชนิดเซนเซอร์</option>
                {sensorTypeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section style={styles.plotPanel}>
          <div style={styles.plotHeaderRow}>
            <div style={styles.plotTitle}>
              {t("plotInformation")}: {plotLabel}
            </div>
            <button style={styles.editBtn} type="button" onClick={onEditClick}>
              {t("editDelete")}
            </button>
          </div>
          <div style={styles.plotSub}>{t("plotDetail")}</div>

          <div style={styles.infoGrid}>
            <div>
              <div style={styles.infoLabel}>{t("plot")}</div>
              <div style={styles.infoBox}>{plotLabel}</div>
            </div>
            <div>
              <div style={styles.infoLabel}>{t("caretaker")}</div>
              <div style={styles.infoBox}>{caretakerText}</div>
            </div>
            <div>
              <div style={styles.infoLabel}>{t("plantType")}</div>
              <div style={styles.infoBox}>{plantTypeText}</div>
            </div>
            <div>
              <div style={styles.infoLabel}>{t("plantedAt")}</div>
              <div style={styles.infoBox}>{plantedAtText}</div>
            </div>
          </div>

          <div style={styles.mapCard}>
            <div style={styles.mapTitle}>
              {lang === "en"
                ? "Sensor pin points for this set (click the map to place the selected pin)"
                : "จุด Pin เซนเซอร์ชุดนี้ (คลิกแผนที่เพื่อปักพิกัดให้ Pin ที่เลือก)"}
            </div>
            <div style={styles.mapHelp}>
              {lang === "en"
                ? "Select a pin from the list below first, then click the map to move that pin."
                : "เลือก Pin จากรายการด้านล่างก่อน แล้วค่อยคลิกแผนที่เพื่อย้ายหมุด"}
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                margin: "8px 0 10px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                title={
                  lang === "en"
                    ? "Get current location and zoom to it"
                    : "ขอตำแหน่งปัจจุบันและซูมไปยังจุดนั้น"
                }
                onClick={() => setLocateTick((v) => v + 1)}
                disabled={!mounted}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 16px",
                  borderRadius: 999,
                  background: "#fff",
                  border: "1px solid rgba(15, 23, 42, 0.12)",
                  boxShadow: "0 1px 0 rgba(15,23,42,0.04)",
                  color: "#0f172a",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: mounted ? "pointer" : "not-allowed",
                  opacity: mounted ? 1 : 0.6,
                  userSelect: "none",
                  lineHeight: 1,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#fb7185",
                    boxShadow: "0 0 0 4px rgba(251, 113, 133, 0.18)",
                    flex: "0 0 auto",
                  }}
                />
                {t("myLocation")}
              </button>
              {locateStatus ? <div style={{ fontSize: 12 }}>{locateStatus}</div> : null}
            </div>

            {!mounted ? (
              <div style={styles.mapLoading}>{t("loadingMap")}</div>
            ) : (
              <div style={{ height: 230, width: "100%" }}>
                <LeafletMap
                  center={[13.7563, 100.5018]}
                  zoom={11}
                  polygons={polygonsToRender}
                  pins={filteredPins}
                  pinIcon={pinIcon}
                  activePinIcon={activePinIcon}
                  activePinId={activePinId}
                  readOnly={readOnlyAllPlots}
                  onPick={onPickLatLng}
                  onCreated={(map) => {
                    mapRef.current = map;
                  }}
                  onReady={() => setMapReady(true)}
                  locateTick={locateTick}
                  onLocateStatus={setLocateStatus}
                  popupPinPrefix="Pin"
                />
              </div>
            )}
          </div>

          <div style={styles.pinActionsRow}>
            <button
              style={{
                ...styles.pinMetaBtn,
                opacity: selectedPlot === "all" ? 0.5 : 1,
                cursor: selectedPlot === "all" ? "not-allowed" : "pointer",
              }}
              type="button"
              onClick={addPin}
              disabled={selectedPlot === "all"}
              title={
                selectedPlot === "all"
                  ? lang === "en"
                    ? "Please select a plot first"
                    : "กรุณาเลือกแปลงก่อนเพิ่ม Pin"
                  : t("addPinAndSensor")
              }
            >
              +
            </button>

            <button
              style={styles.pinMetaBtn}
              type="button"
              onClick={() => removePinById(activePinId)}
              disabled={filteredPins.length === 0}
            >
              −
            </button>

            <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 700 }}>
              {lang === "en"
                ? `Total ${filteredPins.length} ${t("points")} (selected: #${
                    activePin?.number ?? "-"
                  })`
                : `รวม ${filteredPins.length} จุด (กำลังเลือก: #${
                    activePin?.number ?? "-"
                  })`}
            </div>
          </div>

          <div style={styles.pinList}>
            {filteredPins.map((p) => {
              const active = String(p.id) === String(activePinId);
              const status = getPinStatus(p);
              return (
                <div
                  key={p.id}
                  style={{ ...styles.pinCard(active, status), position: "relative" }}
                  onClick={() => setActivePinId(String(p.id))}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setActivePinId(String(p.id))}
                >
                  {editOpen && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePinById(p.id);
                      }}
                      style={{
                        position: "absolute",
                        right: 10,
                        top: 10,
                        border: "none",
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontSize: 11,
                        fontWeight: 900,
                        cursor: "pointer",
                        background: "#ef4444",
                        color: "#fff",
                      }}
                    >
                      {t("delete")}
                    </button>
                  )}

                  <div style={styles.pinCardGrid}>
                    <div style={styles.pinMetaBox}>
                      <div style={styles.pinMetaLabel}>number</div>
                      <div style={styles.pinMetaValue}>#{p.number}</div>
                    </div>

                    <div style={styles.pinMetaBox}>
                      <div style={styles.pinMetaLabel}>สถานะ</div>
                      <div style={styles.pinMetaValue}>{getPinStatusLabel(p)}</div>
                    </div>

                    <div style={styles.pinMetaBox}>
                      <div style={styles.pinMetaLabel}>
                        {lang === "en" ? "Latitude" : "ละติจูด"}
                      </div>
                      <div style={styles.pinMetaValue}>{formatCoordinate(p.lat)}</div>
                    </div>

                    <div style={styles.pinMetaBox}>
                      <div style={styles.pinMetaLabel}>
                        {lang === "en" ? "Longitude" : "ลองจิจูด"}
                      </div>
                      <div style={styles.pinMetaValue}>{formatCoordinate(p.lng)}</div>
                    </div>

                    <div style={styles.pinMetaBox}>
                      <div style={styles.pinMetaLabel}>Node</div>
                      <div style={styles.pinMetaValue}>
                        Air {(p.node_air || []).length} / Soil {(p.node_soil || []).length}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section style={styles.pinPanel}>
          <div style={styles.pinHeaderRow}>
            <div style={styles.pinTitle}>
              {activePin
                ? `Pin: #${activePin.number}`
                : lang === "en"
                ? "Pin: No pin selected"
                : "Pin: ยังไม่เลือก"}
            </div>
          </div>

          <div style={styles.pinStack}>
            <div style={styles.pinFormGrid}>
              <div style={styles.pinField}>
                <div style={styles.pinFieldLabel}>Pin Name</div>
                <input
                  style={styles.groupPick}
                  value={activePin?.pinName || ""}
                  onChange={(e) => setActivePinName(e.target.value)}
                  disabled={!activePinId}
                />
              </div>

              <div style={styles.pinField}>
                <div style={styles.pinFieldLabel}>Latitude</div>
                <input
                  style={styles.groupPick}
                  type="number"
                  step="0.000001"
                  value={
                    Number.isFinite(activePin?.lat)
                      ? Number(activePin.lat).toFixed(6)
                      : ""
                  }
                  onChange={(e) => setActiveLat(Number(e.target.value))}
                  disabled={!activePinId}
                />
              </div>

              <div style={styles.pinField}>
                <div style={styles.pinFieldLabel}>Longitude</div>
                <input
                  style={styles.groupPick}
                  type="number"
                  step="0.000001"
                  value={
                    Number.isFinite(activePin?.lng)
                      ? Number(activePin.lng).toFixed(6)
                      : ""
                  }
                  onChange={(e) => setActiveLng(Number(e.target.value))}
                  disabled={!activePinId}
                />
              </div>
            </div>

            <div style={styles.pinHint}>
              <span style={styles.hintDot} />
              <span>
                {lang === "en" ? (
                  <>
                    ✅ Now editing: <b>Pin #{activePin?.number ?? "-"}</b> — click on
                    the map to move this pin
                  </>
                ) : (
                  <>
                    ✅ ตอนนี้กำลังแก้ไข: <b>Pin #{activePin?.number ?? "-"}</b> —
                    คลิกบนแผนที่เพื่อย้ายหมุดของ Pin นี้
                  </>
                )}
              </span>
            </div>

            {!activePinId ? (
              <div style={styles.infoNotice}>
                {lang === "en"
                  ? "Please select a pin first."
                  : "กรุณาเลือก Pin ก่อน"}
              </div>
            ) : (
              <>
                <div>
                  <div style={styles.sectionLabel}>เพิ่ม NodeTemplate เข้า Pin</div>
                  <div style={styles.templateCard}>
                    <div style={styles.templateActions}>
                      <button
                        type="button"
                        style={styles.actionBtn}
                        onClick={() => setTemplatePickerOpen((v) => !v)}
                      >
                        {templatePickerOpen
                          ? "ปิดตัวเลือก Template"
                          : "เลือก Template เพื่อเพิ่ม Node"}
                      </button>
                    </div>

                    {templatePickerOpen ? (
                      <>
                        <select
                          style={styles.groupPick}
                          value={selectedTemplateId}
                          onChange={(e) => setSelectedTemplateId(e.target.value)}
                        >
                          <option value="">เลือก NodeTemplate</option>
                          {nodeTemplates.map((tpl) => (
                            <option key={tpl.id || tpl._id} value={tpl.id || tpl._id}>
                              {getTemplateName(tpl)}
                            </option>
                          ))}
                        </select>

                        <div style={styles.templateActions}>
                          <button
                            type="button"
                            style={styles.actionBtn}
                            onClick={attachTemplateToActivePin}
                          >
                            เพิ่ม Template เข้า Pin นี้
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>

                <div>
                  <div style={styles.sectionLabel}>จัดการ Node ของ Pin นี้</div>
                  <div style={styles.nodeRow}>
                    <button
                      type="button"
                      style={styles.actionBtn}
                      onClick={() => addNodeToActivePin("air")}
                    >
                      + เพิ่ม Node อากาศ
                    </button>
                    <button
                      type="button"
                      style={styles.actionBtn}
                      onClick={() => addNodeToActivePin("soil")}
                    >
                      + เพิ่ม Node ดิน
                    </button>
                  </div>
                </div>

                {activePinVisibleNodes.length === 0 ? (
                  <div style={styles.infoNotice}>
                    {lang === "en"
                      ? "No nodes found in this pin yet."
                      : "Pin นี้ยังไม่มี node"}
                  </div>
                ) : (
                  <div style={styles.groupList}>
                    {activePinVisibleNodes.map((node) => {
                      const nodeType = node.__nodeType || node.nodeType || "air";
                      return (
                        <div key={node.id} style={styles.groupCard}>
                          <div style={styles.groupTitleRow}>
                            <div style={styles.groupTitle}>
                              {node.nodeName || "-"}
                            </div>
                            <div style={styles.badge}>
                              {getNodeTypeBadge(nodeType)}
                            </div>
                          </div>

                          <div style={styles.nodeEditGrid}>
                            <div>
                              <div style={styles.pinFieldLabel}>ชื่อ Node</div>
                              <input
                                style={styles.groupPick}
                                value={node.nodeName || ""}
                                onChange={(e) =>
                                  updateLocalNode(
                                    activePin.id,
                                    nodeType,
                                    node.id,
                                    { nodeName: e.target.value }
                                  )
                                }
                              />
                            </div>

                            <div>
                              <div style={styles.pinFieldLabel}>จำนวน Sensor</div>
                              <div style={styles.infoNotice}>
                                {(node.sensors || []).length} รายการ
                              </div>
                            </div>
                          </div>

                          <div style={styles.nodeRow}>
                            <button
                              type="button"
                              style={styles.secondaryBtn}
                              onClick={() =>
                                addSensorToNode(activePin.id, nodeType, node.id)
                              }
                            >
                              + เพิ่ม Sensor
                            </button>

                            <button
                              type="button"
                              style={styles.actionBtn}
                              onClick={() => saveNode(activePin.id, nodeType, node)}
                              disabled={savingNodeId === String(node.id)}
                            >
                              {savingNodeId === String(node.id)
                                ? "กำลังบันทึก..."
                                : "บันทึก Node"}
                            </button>

                            <button
                              type="button"
                              style={styles.dangerBtn}
                              onClick={() => deleteNodeFromPin(activePin.id, node.id)}
                            >
                              ลบ Node
                            </button>
                          </div>

                          {!node.sensors || node.sensors.length === 0 ? (
                            <div style={styles.infoNotice}>ยังไม่มี sensor ใน node นี้</div>
                          ) : (
                            <div style={styles.itemsGrid}>
                              {node.sensors.map((sensor) => {
                                const options =
                                  nodeType === "air"
                                    ? SENSOR_TYPE_GROUPS.air
                                    : SENSOR_TYPE_GROUPS.soil;

                                return (
                                  <div key={sensor.id} style={styles.itemCard}>
                                    <div style={styles.itemTitle}>
                                      {sensor.name || sensorTypeLabel(sensor.sensorType)}
                                    </div>

                                    <div style={styles.itemSub}>
                                      {sensorTypeLabel(sensor.sensorType)}
                                    </div>

                                    <div style={styles.sensorEditGrid}>
                                      <div>
                                        <div style={styles.pinFieldLabel}>ประเภท</div>
                                        <select
                                          style={styles.miniInput}
                                          value={sensor.sensorType || ""}
                                          onChange={(e) =>
                                            updateSensorInNode(
                                              activePin.id,
                                              nodeType,
                                              node.id,
                                              sensor.id,
                                              {
                                                sensorType: e.target.value,
                                                name: getDefaultNameByType(e.target.value),
                                                unit: getDefaultUnitByType(e.target.value),
                                              }
                                            )
                                          }
                                        >
                                          {options.map((op) => (
                                            <option key={op.value} value={op.value}>
                                              {op.label}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      <div>
                                        <div style={styles.pinFieldLabel}>ชื่อ Sensor</div>
                                        <input
                                          style={styles.miniInput}
                                          value={sensor.name || ""}
                                          onChange={(e) =>
                                            updateSensorInNode(
                                              activePin.id,
                                              nodeType,
                                              node.id,
                                              sensor.id,
                                              { name: e.target.value }
                                            )
                                          }
                                        />
                                      </div>

                                      <div>
                                        <div style={styles.pinFieldLabel}>Unit</div>
                                        <input
                                          style={styles.miniInput}
                                          value={sensor.unit || ""}
                                          onChange={(e) =>
                                            updateSensorInNode(
                                              activePin.id,
                                              nodeType,
                                              node.id,
                                              sensor.id,
                                              { unit: e.target.value }
                                            )
                                          }
                                        />
                                      </div>
                                    </div>

                                    <div style={styles.itemMeta}>
                                      <b>ค่า:</b> {formatSensorDisplayValue(sensor)}
                                    </div>
                                    <div style={styles.itemMeta}>
                                      <b>Status:</b> {sensor.status || "OK"}
                                    </div>
                                    <div style={styles.itemMeta}>
                                      <b>อ่านค่าล่าสุด:</b>{" "}
                                      {sensor.lastReadingAt || sensor?.lastReading?.ts || "-"}
                                    </div>

                                    <div style={styles.sensorBtns}>
                                      <button
                                        type="button"
                                        style={styles.secondaryBtn}
                                        onClick={() =>
                                          removeSensorFromNode(
                                            activePin.id,
                                            nodeType,
                                            node.id,
                                            sensor.id
                                          )
                                        }
                                      >
                                        ลบ Sensor
                                      </button>
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
              </>
            )}

            <button
              style={styles.saveBtn}
              type="button"
              onClick={() =>
                alert(
                  lang === "en"
                    ? "Saved. Pin position, nodes, and sensors are now synced with the backend when you save each node."
                    : "บันทึกแล้ว โดยตำแหน่ง pin จะ sync ทันที และ node/sensor จะ sync เมื่อกดบันทึก Node"
                )
              }
            >
              {t("save")}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}