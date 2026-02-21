"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// --- Load react-leaflet once (avoid race conditions between dynamic components) ---
const LeafletMap = dynamic(
  async () => {
    const RL = await import("react-leaflet");
    const L = await import("leaflet");

    // ✅ Fix default icon path for Next (กัน marker icon หาย/undefined)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyL = L;
    if (anyL?.Icon?.Default) {
      anyL.Icon.Default.mergeOptions({
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
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

        // polygons: array of LatLng tuples [[lat,lng], ...]
        const allPts = polygons.flat().filter((p) => Array.isArray(p) && p.length === 2);
        if (!allPts.length) return;

        const bounds = L.latLngBounds(allPts.map((p) => L.latLng(p[0], p[1])));
        map.fitBounds(bounds, { padding: [20, 20] });
      }, [map, polygons]);
      return null;
    }

    return function LeafletMapInner({
      mapKey,
      center,
      zoom,
      polygons,
      pins,
      pinIcon,
      readOnly,
      onPick,
      onCreated,
      onReady,
    }) {
      return (
        <RL.MapContainer
          key={mapKey}
          center={center}
          zoom={zoom}
          whenCreated={onCreated}
          whenReady={onReady}
          scrollWheelZoom={true}
          style={{ height: 230, width: "100%" }}
        >
          <RL.TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapFitBoundsInner polygons={polygons} />

          {(polygons || []).map((poly, idx) => (
            <RL.Polygon
              key={`poly-${idx}`}
              positions={poly}
              pathOptions={{ color: "#16a34a", fillColor: "#86efac", fillOpacity: 0.4 }}
            />
          ))}

          <MapClickHandlerInner onPick={onPick} disabled={readOnly} />

          {pinIcon &&
            (pins || [])
              .filter((p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)))
              .map((p) => (
                <RL.Marker key={p.id} position={[Number(p.lat), Number(p.lng)]} icon={pinIcon}>
                  <RL.Popup>Pin #{p.number}</RL.Popup>
                </RL.Marker>
              ))}
        </RL.MapContainer>
      );
    };
  },
  { ssr: false }
);
// =========================
// ✅ API helpers (matches server.js)
// =========================
const API_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) || "http://localhost:3001";

const TOKEN_KEYS = ["AUTH_TOKEN_V1", "token", "pmtool_token", "duwims_token"];

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

function isObjectId(s) {
  return typeof s === "string" && /^[a-f\d]{24}$/i.test(s);
}

function pickNumberFromText(s) {
  if (!s) return null;
  const m = String(s).match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

// ✅ Normalize polygon coords to [lat,lng] for React-Leaflet
// รองรับรูปแบบ: [[lat,lng], ...], [[lng,lat], ...], [{lat,lng}, ...], GeoJSON rings
function normalizeLatLngPoint(p) {
  if (!p) return null;

  // {lat,lng} or {latitude,longitude}
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

    // Heuristic for Thailand (lat ~ 5-21, lng ~ 97-106)
    const aLooksLngTH = a >= 90 && a <= 120;
    const bLooksLatTH = b >= -10 && b <= 30;
    const aLooksLat = a >= -90 && a <= 90;
    const bLooksLng = b >= -180 && b <= 180;

    // If [lng,lat] -> swap
    if (aLooksLngTH && bLooksLatTH) return [b, a];

    // General heuristic: if first isn't valid lat but second is, swap
    if (!aLooksLat && bLooksLng) return [b, a];

    // Assume [lat,lng]
    return [a, b];
  }

  return null;
}

function normalizePolygonCoords(coords) {
  if (!Array.isArray(coords)) return [];

  // If GeoJSON rings [[[...]]], take first ring
  const ring = Array.isArray(coords[0]) && Array.isArray(coords[0][0]) ? coords[0] : coords;

  const out = [];
  for (const p of ring) {
    const ll = normalizeLatLngPoint(p);
    if (ll) out.push(ll);
  }
  return out.length >= 3 ? out : [];
}

// ✅ Mongo ObjectId คร่าวๆ (24 hex)
function isLikelyObjectId(v) {
  return typeof v === "string" && /^[a-f\d]{24}$/i.test(v);
}

function mapGroupToSensorType(groupId) {
  const m = {
    soil: "soil_moisture",
    temp: "temp_rh",
    rh: "temp_rh",
    irrigation: "irrigation",
    npk: "npk",
    wind: "wind",
    ppfd: "ppfd",
    rain: "rain",
  };
  return m[groupId] || "soil_moisture";
}

export default function AddSensor() {
  // ✅ เก็บ instance ของ Leaflet map เพื่อ cleanup กัน error: container reused
  const mapRef = useRef(null);

  const [pinIcon, setPinIcon] = useState(null);

  // ✅ กัน Leaflet crash ใน dev (StrictMode/mount timing)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ✅ Cleanup Leaflet map instance on unmount (prevents "container is being reused" during HMR/StrictMode)
  useEffect(() => {
    return () => {
      try {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      } catch {}
    };
  }, []);

  // ✅ สำคัญ: รอให้ map ready ก่อนค่อย render layers
  const [mapReady, setMapReady] = useState(false);
  // ===== responsive =====
  const [width, setWidth] = useState(1200);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isMobile = width <= 640;
  const isTablet = width > 640 && width <= 1024;

  // ===== Leaflet icon =====
  useEffect(() => {
    let alive = true;
    import("leaflet").then((L) => {
      if (!alive) return;
      setPinIcon(
        new L.Icon({
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        })
      );
    });
    return () => {
      alive = false;
    };
  }, []);

  // ===== ปุ่ม "ลบ / แก้ไข" =====
  const [editOpen, setEditOpen] = useState(false);
  const onEditClick = () => setEditOpen((v) => !v);

  // =========================
  // ✅ FILTER STATE
  // =========================
  const [selectedPlot, setSelectedPlot] = useState("all");
  const [selectedNode, setSelectedNode] = useState("all"); // ✅ filter: all | soil | air

  // ✅ Force fresh map DOM container when plot/node changes (prevents Leaflet "container reused" in dev/HMR)


  // ✅ รีเซ็ตสถานะ mapReady เมื่อเปลี่ยน Plot/Node (กัน Leaflet init ซ้อนจน appendChild error ใน dev/Turbopack)
  useEffect(() => {
    setMapReady(false);
  }, [selectedPlot, selectedNode]);

  // ✅ เปลี่ยน key เพื่อบังคับ remount MapContainer (กัน Leaflet init ซ้อนจน appendChild error)
  const mapKey = useMemo(() => `${selectedPlot}__${selectedNode}`, [selectedPlot, selectedNode]);

  const [selectedSensorType, setSelectedSensorType] = useState("all");
  const readOnlyAllPlots = selectedPlot === "all"; // ✅ โหมดรวมทุกแปลง: ดูอย่างเดียว (ห้ามย้าย/เพิ่ม/ลบ pin)

  // ====== server data ======
  const [plots, setPlots] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [sensorTypes, setSensorTypes] = useState([]); // from /api/sensor-types
  const [plotSensorSummary, setPlotSensorSummary] = useState([]); // [{sensorType,count}]

  // ✅ plot meta + polygon
  const [plotMeta, setPlotMeta] = useState(null);
  const [plotPolygons, setPlotPolygons] = useState([]); // array coords

  // ✅ Auto-fit map to polygons whenever polygons change (no need for whenReady)
  useEffect(() => {
    try {
      const map = mapRef.current;
      if (!map) return;
      const polys = Array.isArray(plotPolygons) ? plotPolygons : [];
      const pts = [];
      for (const poly of polys) {
        if (Array.isArray(poly)) {
          for (const p of poly) {
            if (Array.isArray(p) && p.length >= 2) pts.push([Number(p[0]), Number(p[1])]);
          }
        }
      }
      if (!pts.length) return;
      // leaflet bounds
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const L = require("leaflet");
      const bounds = L.latLngBounds(pts.map((p) => L.latLng(p[0], p[1])));
      if (bounds && bounds.isValid && bounds.isValid()) map.fitBounds(bounds, { padding: [16, 16], animate: false });
    } catch {}
  }, [plotPolygons]);

  // ✅ PINS
  const [pins, setPins] = useState([]);
  const [activePinId, setActivePinId] = useState(null);
  const activePin = useMemo(() => pins.find((p) => String(p.id) === String(activePinId)) || null, [pins, activePinId]);



  // =========================
  // ✅ SENSOR CRUD (DB + inline)
  // =========================
  const [sensorGroups, setSensorGroups] = useState([
    { id: "soil", title: "เซนเซอร์ความชื้นดิน", items: [] },
    { id: "temp", title: "เซนเซอร์ อุณหภูมิ", items: [] },
    { id: "irrigation", title: "เซนเซอร์การให้น้ำ", items: [] },
    { id: "rh", title: "เซนเซอร์ความชื้นสัมพัทธ์", items: [] },
    { id: "npk", title: "เซนเซอร์ NPK", items: [] },
    { id: "wind", title: "เซนเซอร์วัดความเร็วลม", items: [] },
    { id: "ppfd", title: "เซนเซอร์ความเข้มแสง", items: [] },
    { id: "rain", title: "เซนเซอร์ปริมาณน้ำฝน", items: [] },
  ]);


  const activePinSensors = useMemo(() => {
    if (!activePinId) return [];
    const out = [];
    for (const g of sensorGroups || []) {
      for (const it of g.items || []) {
        if (String(it.pinId) === String(activePinId)) out.push({ ...it, _groupId: g.id, _groupTitle: g.title });
      }
    }
    return out;
  }, [sensorGroups, activePinId]);

  const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const [addName, setAddName] = useState("");
  const [addValue, setAddValue] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("soil");

  const [editingItem, setEditingItem] = useState(null); // { groupId, itemId }
  const [editName, setEditName] = useState("");
  const [editValue, setEditValue] = useState("");

  const groupChoices = useMemo(() => {
    // ✅ selectedNode is filter category: all | soil | air
    const soilIds = new Set(["irrigation", "soil"]);
    const airIds = new Set(["temp", "rh", "wind", "ppfd", "rain", "npk"]);
    const filtered =
      selectedNode === "soil"
        ? sensorGroups.filter((g) => soilIds.has(g.id))
        : selectedNode === "air"
        ? sensorGroups.filter((g) => airIds.has(g.id))
        : sensorGroups;
    return filtered.map((g) => ({ id: g.id, title: g.title }));
  }, [sensorGroups, selectedNode]);
  // ✅ keep selected group valid under node filter
  useEffect(() => {
    if (!groupChoices.length) return;
    if (!groupChoices.some((g) => g.id === selectedGroupId)) {
      setSelectedGroupId(groupChoices[0].id);
    }
  }, [groupChoices, selectedGroupId]);


  // =========================
  // ✅ Derived dropdown labels
  // =========================
  const plotLabel = useMemo(() => {
    if (selectedPlot === "all") return "ทุกแปลง";
    const p = plots.find((x) => String(x.id) === String(selectedPlot));
    return p ? p.plotName || p.alias || p.name || `แปลง ${p.id}` : `แปลง ${selectedPlot}`;
  }, [selectedPlot, plots]);

  const nodeOptions = useMemo(() => {
    return [
      { value: "all", label: "ทุก Node" },
      { value: "soil", label: "Node ดิน" },
      { value: "air", label: "Node อากาศ" },
    ];
  }, []);

  const selectedNodeCategory = useMemo(() => {
    // selectedNode here is a FILTER: all / soil / air
    if (selectedNode === "soil" || selectedNode === "air") return selectedNode;
    return "all";
  }, [selectedNode]);

  // ✅ Filter pins by Node filter (ดิน/อากาศ/ทั้งหมด)
  const filteredPins = useMemo(() => {
    const list = Array.isArray(pins) ? pins : [];
    // ✅ filter by plot (เมื่อไม่ได้อยู่โหมดรวมทุกแปลง)
    const byPlot = selectedPlot === "all" ? list : list.filter((p) => String(p.plotId) === String(selectedPlot));

    if (selectedNodeCategory === "all") return byPlot;

    // pins saved from backend have nodeId; nodes has category
    const byId = new Map((nodes || []).map((n) => [String(n.id || n._id), n]));
    return byPlot.filter((p) => {
      const n = byId.get(String(p.nodeId));
      const cat = String(n?.category || "soil");
      return cat === String(selectedNodeCategory);
    });
  }, [pins, nodes, selectedNodeCategory, selectedPlot]);

  // sensorOptions จาก DB + filter ตาม Node (ดิน/อากาศ/ทั้งหมด)
  const sensorOptions = useMemo(() => {
    const base = [{ value: "all", label: "ทุกชนิดเซนเซอร์" }];

    const SOIL_KEYS = new Set(["irrigation", "water_status", "soil_moisture"]);
    const AIR_KEYS = new Set(["temp_rh", "wind", "ppfd", "rain", "npk"]);

    const raw = sensorTypes.map((t) => ({ value: t.key, label: t.label }));

    const filtered =
      selectedNodeCategory === "soil"
        ? raw.filter((x) => SOIL_KEYS.has(String(x.value)))
        : selectedNodeCategory === "air"
        ? raw.filter((x) => AIR_KEYS.has(String(x.value)))
        : raw;

    return [...base, ...filtered];
  }, [sensorTypes, selectedNodeCategory]);

  // ✅ Filter sensor groups/items ตาม Node filter + ชนิดเซนเซอร์ filter
  const displaySensorGroups = useMemo(() => {
    const SOIL = new Set(["irrigation", "water_status", "soil_moisture"]);
    const AIR = new Set(["temp_rh", "wind", "ppfd", "rain", "npk"]);

    const allowByNode = (sensorKey) => {
      if (selectedNodeCategory === "soil") return SOIL.has(sensorKey);
      if (selectedNodeCategory === "air") return AIR.has(sensorKey);
      return true;
    };

    const allowByType = (sensorKey) => {
      if (selectedSensorType === "all") return true;
      return String(selectedSensorType) === String(sensorKey);
    };

    return sensorGroups
      .map((g) => {
        const key = mapGroupToSensorType(g.id);
        if (!allowByNode(key) || !allowByType(key)) return null;
        return g;
      })
      .filter(Boolean);
  }, [sensorGroups, selectedNodeCategory, selectedSensorType]);

  // คุมค่าที่เลือก
  useEffect(() => {
    if (!sensorOptions.length) return;
    const ok = sensorOptions.some((s) => s.value === selectedSensorType);
    if (!ok) setSelectedSensorType("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensorOptions]);

  useEffect(() => {
    if (!displaySensorGroups.length) return;
    const ok = displaySensorGroups.some((g) => g.id === selectedGroupId);
    if (!ok) setSelectedGroupId(displaySensorGroups[0].id);
  }, [displaySensorGroups, selectedGroupId]);

  // =========================
  
  // =========================
  // ✅ Summary: sensors ในแปลงที่เลือก (ไว้บอกว่าแปลงนี้มี sensor อะไรบ้าง)
  // =========================
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        const token = getToken();
        // ถ้าเลือก all -> รวมทั้งหมด
        const qs = new URLSearchParams();
        if (selectedPlot !== "all") qs.set("plotId", String(selectedPlot));
        if (selectedNodeCategory && selectedNodeCategory !== "all") qs.set("nodeCategory", String(selectedNodeCategory));
        const url = qs.toString() ? `/api/sensors?${qs.toString()}` : "/api/sensors";
        const r = await apiFetch(url, { token, signal: controller.signal });
        const items = Array.isArray(r?.items) ? r.items : [];
        const m = new Map();
        for (const it of items) {
          const k = String(it.sensorType || "");
          if (!k) continue;
          m.set(k, (m.get(k) || 0) + 1);
        }
        const arr = [...m.entries()].map(([sensorType, count]) => ({ sensorType, count }))
          .sort((a,b) => b.count - a.count);
        setPlotSensorSummary(arr);
      } catch (e) {
        // เงียบๆ ถ้า backend จำกัดสิทธิ์
        setPlotSensorSummary([]);
      }
    };
    run();
    return () => controller.abort();
  }, [selectedPlot, selectedNodeCategory]);
// ✅ Load dropdown sources
  // =========================
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        const token = getToken();
        // ✅ allow loading even if token is missing (backend may be public; if protected you'll see 401)
        const [p, st] = await Promise.all([
          apiFetch("/api/plots", { token, signal: controller.signal }),
          apiFetch("/api/sensor-types", { token, signal: controller.signal }),
        ]);
        setPlots(Array.isArray(p?.items) ? p.items : []);
        setSensorTypes(Array.isArray(st?.items) ? st.items : []);
      } catch (e) {
        console.warn("[AddSensor] load plots/sensor-types failed:", e?.message || e);
      }
    };
    run();
    return () => controller.abort();
  }, []);

  // =========================
  // ✅ Load plot meta + polygons
  // =========================
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        setPlotMeta(null);
        setPlotPolygons([]);
        if (selectedPlot === "all") {
          // ✅ แสดงทุก polygon + ทุก pin (โหมดรวมทั้งหมด)
          const token = getToken();

          // polygons: ดึงทุกแปลง แล้วตามไปดึง polygons ของแต่ละแปลง
          try {
            const pr = await apiFetch("/api/plots", { token, signal: controller.signal });
            const plotItems = Array.isArray(pr?.items) ? pr.items : [];
            const allPolys = [];
            // จำกัด concurrency แบบง่าย ๆ
            for (const p of plotItems) {
              const pid = String(p.id || p._id);
              if (!pid) continue;
              try {
                const rr = await apiFetch(`/api/plots/${encodeURIComponent(pid)}/polygons`, { token, signal: controller.signal });
                const polys = (Array.isArray(rr?.items) ? rr.items : [])
                  .map((x) => normalizePolygonCoords(x.coords))
                  .filter((c) => Array.isArray(c) && c.length >= 3);
                allPolys.push(...polys);
              } catch {}
            }
            setPlotPolygons(allPolys);
          } catch (e) {
            console.warn("[AddSensor] load all polygons failed:", e?.message || e);
            setPlotPolygons([]);
          }

          // pins: ดึง nodes ของแต่ละแปลง แล้วดึง pins ตาม node (เพื่อรวมทั้งหมด)
          try {
            const pr = await apiFetch("/api/plots", { token, signal: controller.signal });
            const plotItems = Array.isArray(pr?.items) ? pr.items : [];
            const allPins = [];
            const allNodes = [];
            for (const p of plotItems) {
              const pid = String(p.id || p._id);
              if (!pid) continue;
              try {
                const nr = await apiFetch(`/api/nodes?plotId=${encodeURIComponent(pid)}&category=all`, { token, signal: controller.signal });
                const nitems = Array.isArray(nr?.items) ? nr.items : [];
                allNodes.push(...nitems);
                for (const n of nitems) {
                  const nid = String(n.id || n._id);
                  if (!nid) continue;
                  try {
                    const qs = new URLSearchParams();
                    qs.set("plotId", pid);
                    qs.set("nodeId", nid);
                    // ไม่ส่ง sensorType เพื่อให้ได้ทุก pin
                    const prr = await apiFetch(`/api/pins?${qs.toString()}`, { token, signal: controller.signal });
                    const pins = Array.isArray(prr?.items) ? prr.items : [];
                    allPins.push(...pins);
                  } catch {}
                }
              } catch {}
            }
                        setNodes(allNodes); // เพื่อใช้ category map/filter
            // ✅ dedupe pins (บางครั้ง loop รวมทุกแปลงอาจได้ซ้ำ)
            const uniq = new Map();
            for (const p of allPins) {
              const pid = String(p?.id || p?._id || "");
              if (!pid) continue;
              if (!uniq.has(pid)) uniq.set(pid, p);
            }
            const dedupedPins = Array.from(uniq.values());
            setPins(dedupedPins);
            setActivePinId(dedupedPins[0]?.id ? String(dedupedPins[0].id) : (dedupedPins[0]?._id ? String(dedupedPins[0]._id) : null));
          } catch (e) {
            console.warn("[AddSensor] load all pins failed:", e?.message || e);
            setPins([]);
            setActivePinId(null);
          }

          setPlotMeta(null);
          return;
        }

        const token = getToken();
        // ✅ allow loading even if token is missing (backend may be public; if protected you'll see 401)

        const r = await apiFetch(`/api/plots/${encodeURIComponent(String(selectedPlot))}`, {
          token,
          signal: controller.signal,
        });

        const item = r?.item || null;
        setPlotMeta(item);

        // ✅ โหลด polygons ของแปลง (รองรับหลาย polygons)
        let polys = [];
        try {
          const rr = await apiFetch(`/api/plots/${encodeURIComponent(String(selectedPlot))}/polygons`, {
            token,
            signal: controller.signal,
          });
          polys = (Array.isArray(rr?.items) ? rr.items : [])
            .map((x) => normalizePolygonCoords(x.coords))
                  .filter((c) => Array.isArray(c) && c.length >= 3);
        } catch (e2) {
          // ignore, fallback below
        }

        // fallback: ถ้า endpoint /polygons ไม่มีข้อมูล แต่ใน plot มี polygon เดี่ยว
        const one = normalizePolygonCoords(item?.polygon?.coords);
        if ((!polys || polys.length === 0) && Array.isArray(one) && one.length >= 3) {
          polys = [one];
        }

        setPlotPolygons(polys);
      } catch (e) {
        console.warn("[AddSensor] load plot detail failed:", e?.message || e);
      }
    };
    run();
    return () => controller.abort();
  }, [selectedPlot]);

  // =========================
  // =========================
  // ✅ Load nodes (for mapping nodeId <-> category) 
  // =========================
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        const token = getToken();
        if (selectedPlot === "all") {
          setNodes([]);
          return;
        }
        const r = await apiFetch(
          `/api/nodes?plotId=${encodeURIComponent(String(selectedPlot))}&category=all`,
          { token, signal: controller.signal }
        );
        const items = Array.isArray(r?.items) ? r.items : [];
        setNodes(items);
      } catch (e) {
        console.warn("[AddSensor] load nodes failed:", e?.message || e);
        setNodes([]);
      }
    };
    run();
    return () => controller.abort();
  }, [selectedPlot]);

  // =========================
  // ✅ Load sensors (list)
  // =========================
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        const token = getToken();
        // ✅ allow loading even if token is missing (backend may be public; if protected you'll see 401)

        if (selectedPlot === "all") {
          setSensorGroups((prev) => prev.map((g) => ({ ...g, items: [] })));
          return;
        }

        const q = new URLSearchParams();
        q.set("plotId", String(selectedPlot));
        q.set("nodeCategory", String(selectedNodeCategory || "all"));
        q.set("sensorType", String(selectedSensorType || "all"));
        if (selectedNode !== "all") q.set("nodeId", String(selectedNode));

        const r = await apiFetch(`/api/sensors?${q.toString()}`, { token, signal: controller.signal });
        const items = Array.isArray(r?.items) ? r.items : [];

        setSensorGroups((prev) =>
          prev.map((g) => {
            const st = mapGroupToSensorType(g.id);
            const groupItems = items
              .filter((s) => String(s.sensorType) === String(st))
              .map((s) => ({
                id: String(s.id || s._id),
                name: s.name || "",
                value: s.valueHint || s.unit || "",
                lastReading: s.lastReading || null,
              }));
            return { ...g, items: groupItems };
          })
        );
      } catch (e) {
        console.warn("[AddSensor] load sensors failed:", e?.message || e);
      }
    };
    run();
    return () => controller.abort();
  }, [selectedPlot, selectedNode, selectedNodeCategory, selectedSensorType]);

  // =========================
  
  // =========================
  // ✅ Ensure nodeId for a given plot + category (soil/air)
  // - If node doesn't exist, create it via POST /api/nodes
  // =========================
  const ensureNodeId = async (plotId, category) => {
    // category: "soil" | "air" (ถ้า all จะถูกแปลงเป็น soil ก่อนเรียก)
    const cat = category === "air" ? "air" : "soil";

    // 1) ดึงจาก backend เพื่อให้ชัวร์ว่าเป็นข้อมูลล่าสุด
    let items = [];
    try {
      const token = getToken();
      const r = await apiFetch(
        `/api/nodes?plotId=${encodeURIComponent(String(plotId))}&category=all`,
        { token }
      );
      items = Array.isArray(r?.items) ? r.items : [];
    } catch (e) {
      // ถ้า backend ปิด auth หรือมีปัญหา ให้ fallback เป็น state nodes ที่มีอยู่
      items = Array.isArray(nodes) ? nodes : [];
    }

    // 2) หา node ตาม category
    const found = items.find((n) => String((n.category || "")).toLowerCase() === cat);
    if (found) return String(found.id || found._id);

    // 3) ถ้ายังไม่มี -> สร้างใหม่
    const token = getToken(); // อาจเป็น null ถ้า backend ไม่ต้อง auth
    const created = await apiFetch("/api/nodes", {
      method: "POST",
      token,
      body: {
        plotId: String(plotId),
        category: cat,
        name: cat === "air" ? "Node อากาศ 1" : "Node ดิน 1",
      },
    });
    const node = created?.item || created;
    const newId = String(node?.id || node?._id);
    if (newId) {
      setNodes((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        return arr.some((x) => String(x.id || x._id) === newId) ? arr : [node, ...arr];
      });
      return newId;
    }
    throw new Error("สร้าง Node ไม่สำเร็จ");
  };

// ✅ PIN actions (DB)
  // =========================
  const addPin = async () => {
    // ✅ ต้องเลือก Plot ก่อน
    if (selectedPlot === "all") {
      alert("กรุณาเลือกแปลงก่อน");
      return;
    }

    // ✅ selectedNode ใน UI นี้เป็น filter: all | soil | air
    // ถ้าเลือก all ให้ default สร้าง/ใช้ node ดิน เพื่อให้ปักหมุดได้ทันที
    const category = selectedNode === "air" ? "air" : "soil";
    let nodeId = "";
    try {
      nodeId = await ensureNodeId(selectedPlot, category);
    } catch (e) {
      alert(e?.message || "สร้าง/ค้นหา Node ไม่สำเร็จ");
      return;
    }

    // หา number ถัดไป (ต้องดู "ทั้งแปลง" ไม่ใช่แค่ที่ถูก filter อยู่)
    let nextNumber = 1;
    try {
      const token = getToken();
      const rr = await apiFetch(`/api/pins?plotId=${encodeURIComponent(String(selectedPlot))}`, { token });
      const items = Array.isArray(rr?.items) ? rr.items : [];
      const maxNum = items.reduce((mx, p) => {
        const n = Number(p?.number);
        return Number.isFinite(n) ? Math.max(mx, n) : mx;
      }, 0);
      nextNumber = maxNum + 1;
    } catch {
      // fallback: ใช้จาก state ที่มีอยู่
      const used = new Set((pins || []).map((p) => Number(p.number)));
      while (used.has(nextNumber)) nextNumber += 1;
    }

    // ✅ สร้าง pin แบบรอปัก (ยังไม่ POST) -> ให้ผู้ใช้คลิกบนแผนที่เพื่อกำหนด lat/lng
    const tempId = `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setPins((prev) => [
      ...prev,
      { id: tempId, _tmp: true, number: nextNumber, lat: null, lng: null, nodeId: nodeId, plotId: selectedPlot },
    ]);
    setActivePinId(tempId);
  };



  const removePinById = async (pinId) => {
    if (readOnlyAllPlots) return; // ✅ โหมดรวมทุกแปลง: ห้ามลบ pin

    if (!pinId) return;
    setPins((prev) => {
      const idx = prev.findIndex((p) => String(p.id) === String(pinId));
      if (idx === -1) return prev;
      const next = prev.filter((p) => String(p.id) !== String(pinId));
      if (String(pinId) === String(activePinId)) {
        const pick = next[idx] || next[idx - 1] || next[0];
        if (pick) setActivePinId(String(pick.id));
        else setActivePinId(null);
      }
      return next;
    });

    try {
      const token = getToken();
      // ✅ don't block; let API respond with 401 if auth is required
      if (!isLikelyObjectId(String(pinId))) return; // demo/tmp -> ไม่ยิงลบ
      await apiFetch(`/api/pins/${encodeURIComponent(String(pinId))}`, { method: "DELETE", token });
    } catch (e) {
      console.warn("[AddSensor] delete pin failed:", e?.message || e);
    }
  };

  const removeActivePin = () => removePinById(activePinId);

  const onPickLatLng = async (latlng) => {
    // ✅ ย้าย/ปัก pin ได้เฉพาะตอนกด "ลบ / แก้ไข"
    if (!editOpen) {
      // อนุญาตให้ปัก pin ใหม่เฉพาะกรณี activePin เป็น temp (รอปัก)
      const ap = pins.find((p) => String(p.id) === String(activePinId));
      if (!ap || !ap._tmp) return;
    }
    if (readOnlyAllPlots) return; // ✅ โหมดรวมทุกแปลง: ห้ามย้าย/ปัก pin

    if (!latlng) return;
    if (!activePinId) return;

    const { lat, lng } = latlng;

    // หา pin ที่ active
    const pin = pins.find((p) => String(p.id) === String(activePinId));
    if (!pin) return;

    // อัปเดต UI ทันที
    setPins((prev) => prev.map((p) => (String(p.id) === String(activePinId) ? { ...p, lat, lng } : p)));

    // ✅ ถ้าเป็น pin แบบรอปัก (temp) -> POST ตอนคลิกแผนที่
    if (pin._tmp || !isLikelyObjectId(String(pin.id))) {
      // ต้องเลือก Plot + Node ก่อน
      if (selectedPlot === "all") {
        alert("กรุณาเลือกแปลงก่อนปักหมุด");
        return;
      }

      const token = getToken(); // อาจเป็น null ได้ (ถ้า backend ไม่ต้อง auth)
      // ✅ หา/สร้าง nodeId ตาม filter ที่เลือก (ดิน/อากาศ)
      const category = selectedNode === "air" ? "air" : "soil";
      const nodeToUse = await ensureNodeId(selectedPlot, category);

      try {
        let r = null;
        try {
          r = await apiFetch("/api/pins", {
            method: "POST",
            token,
            body: (() => {
              const payload = { plotId: selectedPlot, lat, lng };
              if (nodeToUse && String(nodeToUse) !== "all") payload.nodeId = nodeToUse;
              return payload;
            })(),
          });
        } catch (e1) {
          const msg = String(e1?.message || e1);
          if (msg.includes("409")) {
            // ✅ ถ้าเลขซ้ำ ให้ดึง max ของแปลงแล้วลองใหม่อีกครั้ง
            const rr = await apiFetch(`/api/pins?plotId=${encodeURIComponent(String(selectedPlot))}`, { token });
            const items = Array.isArray(rr?.items) ? rr.items : [];
            const maxNum = items.reduce((mx, p) => {
              const n = Number(p?.number);
              return Number.isFinite(n) ? Math.max(mx, n) : mx;
            }, 0);
            const nextNumber = maxNum + 1;
            // update local temp pin number
            setPins((prev) => prev.map((p) => (String(p.id) === String(activePinId) ? { ...p, number: nextNumber } : p)));
            r = await apiFetch("/api/pins", {
              method: "POST",
              token,
              body: (() => {
                const payload = { plotId: selectedPlot, number: nextNumber, lat, lng };
                if (nodeToUse && String(nodeToUse) !== "all") payload.nodeId = nodeToUse;
                return payload;
              })(),
            });
          } else {
            throw e1;
          }
        }

        const created = (r?.item || r) || null;
        const createdId = created?.id || created?._id;
        if (createdId) {
          setPins((prev) =>
            prev.map((p) =>
              String(p.id) === String(activePinId)
                ? { ...p, _tmp: false, id: String(createdId), number: created.number ?? pin.number, lat: created.lat ?? lat, lng: created.lng ?? lng, nodeId: nodeToUse }
                : p
            )
          );
          setActivePinId(String(createdId));
        } else {
          // ไม่มี id กลับมา -> rollback
          setPins((prev) => prev.filter((p) => String(p.id) !== String(activePinId)));
          setActivePinId(null);
          alert("ปักหมุดไม่สำเร็จ (ไม่ได้รับ id จาก API)");
        }
      } catch (e) {
        console.warn("[AddSensor] create pin on map click failed:", e?.message || e);
        setPins((prev) => prev.filter((p) => String(p.id) !== String(activePinId)));
        setActivePinId(null);
        alert(`ปักหมุดไม่สำเร็จ: ${e?.message || e}`);
      }
      return;
    }

    // ✅ ถ้าเป็น pin จริง -> PATCH ย้ายหมุด
    try {
      const token = getToken();
      // ✅ don't block; let API respond with 401 if auth is required
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
    setPins((prev) => prev.map((p) => (String(p.id) === String(activePinId) ? { ...p, lat } : p)));
    try {
      const token = getToken();
      // ✅ don't block; let API respond with 401 if auth is required
      const la = numOrNull(lat);
      if (la === null) return;
      if (!isLikelyObjectId(String(activePinId))) return;
      await apiFetch(`/api/pins/${encodeURIComponent(String(activePinId))}`, { method: "PATCH", token, body: { lat: la } });
    } catch (e) {
      console.warn("[AddSensor] patch pin lat failed:", e?.message || e);
    }
  };

  const setActiveLng = async (lng) => {
    if (!activePinId) return;
    setPins((prev) => prev.map((p) => (String(p.id) === String(activePinId) ? { ...p, lng } : p)));
    try {
      const token = getToken();
      // ✅ don't block; let API respond with 401 if auth is required
      const lo = numOrNull(lng);
      if (lo === null) return;
      if (!isLikelyObjectId(String(activePinId))) return;
      await apiFetch(`/api/pins/${encodeURIComponent(String(activePinId))}`, { method: "PATCH", token, body: { lng: lo } });
    } catch (e) {
      console.warn("[AddSensor] patch pin lng failed:", e?.message || e);
    }
  };

  // =========================
  // ✅ SENSOR actions (DB)
  // =========================
  const onAddSensor = async () => {
    const name = (addName || "").trim();
    const value = (addValue || "").trim();
    if (!name || !value) return;

    const tempId = uid();
    setSensorGroups((prev) =>
      prev.map((g) => (g.id !== selectedGroupId ? g : { ...g, items: [...g.items, { id: tempId, name, value }] }))
    );
    setAddName("");
    setAddValue("");

    try {
      const token = getToken();
      // ✅ don't block; let API respond with 401 if auth is required
      if (!activePinId) {
        alert("กรุณาเลือก Pin ก่อนเพิ่ม Sensor");
        return;
      }

      const sensorType = mapGroupToSensorType(selectedGroupId);
      const r = await apiFetch("/api/sensors", {
        method: "POST",
        token,
        body: {
          nodeId: String(activePin?.nodeId || selectedNode),
          pinId: activePinId,
          sensorType,
          name,
          valueHint: value,
          status: "OK",
          lastReading: {
            value: Number.isFinite(pickNumberFromText(value)) ? pickNumberFromText(value) : null,
            ts: Number.isFinite(pickNumberFromText(value)) ? new Date().toISOString() : null,
          },
        },
      });

      const created = r?.item || r;
      const createdId = created?.id || created?._id;
      if (createdId) {
        setSensorGroups((prev) =>
          prev.map((g) =>
            g.id !== selectedGroupId
              ? g
              : { ...g, items: g.items.map((it) => (it.id === tempId ? { ...it, id: String(createdId) } : it)) }
          )
        );
      }
    } catch (e) {
      console.warn("[AddSensor] create sensor failed:", e?.message || e);
    }
  };

  const onStartInlineEdit = (groupId, itemId) => {
    const g = sensorGroups.find((x) => x.id === groupId);
    const it = g?.items.find((x) => String(x.id) === String(itemId));
    if (!it) return;
    setEditingItem({ groupId, itemId });
    setEditName(it.name);
    setEditValue(it.value);
  };

  const onCancelInlineEdit = () => {
    setEditingItem(null);
    setEditName("");
    setEditValue("");
  };

  const onSaveInlineEdit = async () => {
    if (!editingItem) return;
    const name = (editName || "").trim();
    const value = (editValue || "").trim();
    if (!name || !value) return;

    const { groupId, itemId } = editingItem;

    setSensorGroups((prev) =>
      prev.map((g) => (g.id !== groupId ? g : { ...g, items: g.items.map((it) => (it.id === itemId ? { ...it, name, value } : it)) }))
    );

    try {
      const token = getToken();
      // ✅ don't block; let API respond with 401 if auth is required
      if (!isLikelyObjectId(String(itemId))) return; // temp id
      await apiFetch(`/api/sensors/${encodeURIComponent(String(itemId))}`, {
        method: "PATCH",
        token,
        body: { name, valueHint: value },
      });
    } catch (e) {
      console.warn("[AddSensor] patch sensor failed:", e?.message || e);
    }

    onCancelInlineEdit();
  };

  const onDeleteItem = async (groupId, itemId) => {
    setSensorGroups((prev) =>
      prev.map((g) => (g.id !== groupId ? g : { ...g, items: g.items.filter((it) => String(it.id) !== String(itemId)) }))
    );
    if (editingItem && editingItem.groupId === groupId && String(editingItem.itemId) === String(itemId)) {
      onCancelInlineEdit();
    }

    try {
      const token = getToken();
      // ✅ don't block; let API respond with 401 if auth is required
      if (!isLikelyObjectId(String(itemId))) return;
      await apiFetch(`/api/sensors/${encodeURIComponent(String(itemId))}`, { method: "DELETE", token });
    } catch (e) {
      console.warn("[AddSensor] delete sensor failed:", e?.message || e);
    }
  };

  // =========================
  // ✅ styles (UNCHANGED)
  // =========================
  const styles = useMemo(
    () => ({
      page: {
        fontFamily: '"Prompt", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
      topTitle: { fontSize: 16, fontWeight: 700 },
      topBtn: {
        borderRadius: 999,
        border: "none",
        padding: "8px 18px",
        fontSize: 13,
        fontWeight: 500,
        background: "#ffffff",
        color: "#1f2937",
        cursor: "pointer",
        boxShadow: "0 4px 10px rgba(15,23,42,0.25)",
        width: isMobile ? "100%" : "auto",
      },

      filterGrid: {
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))",
        gap: 10,
        marginTop: 4,
      },
      filterCard: {
        borderRadius: 16,
        background: "linear-gradient(135deg,rgba(255,255,255,0.95),rgba(224,242,254,0.95))",
        padding: "8px 10px 6px",
        fontSize: 12,
        color: "#0f172a",
      },
      filterLabel: { fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 },
      filterSelect: {
        width: "100%",
        borderRadius: 12,
        border: "none",
        padding: "5px 8px",
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
        background: editOpen ? "#fb7185" : "#facc15",
        color: "#111827",
        cursor: "pointer",
        width: isMobile ? "100%" : "auto",
        boxShadow: "0 10px 18px rgba(15,23,42,0.12)",
      },

      infoGrid: {
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))",
        gap: 10,
        marginBottom: 14,
      },
      infoLabel: { fontSize: 11, color: "#6b7280", marginBottom: 3 },
      infoBox: { borderRadius: 12, background: "#ffffff", border: "1px solid #c7f0df", padding: "6px 10px", fontSize: 12 },

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

      pinActionsRow: { marginTop: 8, display: "flex", gap: 8, alignItems: "center" },
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
      pinCard: (active) => ({
        borderRadius: 16,
        background: active ? "#fde68a" : "#fef9c3",
        padding: 10,
        border: active ? "2px solid rgba(15,23,42,0.25)" : "1px solid rgba(15,23,42,0.10)",
        boxShadow: "0 10px 18px rgba(15,23,42,0.06)",
        cursor: "pointer",
      }),
      pinCardGrid: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 10 },
      pinMetaBox: {
        borderRadius: 14,
        background: "rgba(255,255,255,0.78)",
        border: "1px solid rgba(15,23,42,0.10)",
        padding: "10px 10px",
      },
      pinMetaLabel: { fontSize: 10, fontWeight: 800, color: "#6b7280", marginBottom: 3 },
      pinMetaValue: { fontSize: 12, fontWeight: 800, color: "#0f172a" },

      pinMetaGrid: {
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: 10,
        marginBottom: 12,
      },
      pinMetaBox: {
        borderRadius: 16,
        background: "rgba(255,255,255,0.85)",
        border: "1px solid rgba(15,23,42,0.10)",
        padding: "10px 12px",
      },


      pinPanel: {
        borderRadius: 26,
        background: "#ffd9f1",
        padding: isMobile ? "16px 12px 18px" : "18px 16px 20px",
        boxShadow: "0 14px 32px rgba(244,114,182,0.25)",
        marginBottom: 16,
      },
      pinHeaderRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 },
      pinTitle: { fontSize: 14, fontWeight: 900 },
      pinStack: { display: "grid", rowGap: 12 },

      pinFormGrid: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, alignItems: "start" },
      pinField: { display: "grid", gap: 6 },
      pinFieldLabel: { fontSize: 11, fontWeight: 900, color: "#475569" },

      pinHint: {
        borderRadius: 14,
        background: "rgba(255,255,255,0.72)",
        border: "1px solid rgba(15,23,42,0.10)",
        padding: "10px 12px",
        fontSize: 12,
        fontWeight: 800,
        color: "#334155",
        lineHeight: 1.35,
        display: "flex",
        alignItems: "center",
        gap: 8,
      },
      hintDot: { width: 10, height: 10, borderRadius: 3, background: "#22c55e", boxShadow: "0 0 0 3px rgba(34,197,94,0.20)", flex: "0 0 auto" },

      groupRowTop: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(220px, 360px) auto", gap: 10, alignItems: "center" },
      groupPick: { width: "100%", height: 44, borderRadius: 14, border: "1px solid rgba(15,23,42,0.12)", background: "#fff", padding: "0 12px", fontSize: 12, outline: "none" },

      addRow: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 44px", gap: 10, alignItems: "stretch" },
      inputField: { width: "100%", height: 44, boxSizing: "border-box", outline: "none", fontSize: 12, padding: "0 12px", borderRadius: 14, background: "#fff", border: "1px solid rgba(15,23,42,0.12)", boxShadow: "0 6px 14px rgba(15,23,42,0.05)" },

      actionBtn: { borderRadius: 999, border: "none", height: 44, padding: "0 16px", fontSize: 12, fontWeight: 900, cursor: "pointer", boxShadow: "0 10px 18px rgba(15,23,42,0.10)", display: "inline-flex", alignItems: "center", justifyContent: "center" },
      addBtn: { background: "#a7f3d0", color: "#064e3b" },
      saveEditBtn: { background: "#fde68a", color: "#78350f" },
      cancelBtn: { background: "#e2e8f0", color: "#0f172a" },

      groupList: { display: "grid", gap: 12 },
      groupCard: { borderRadius: 16, background: "#ffffff", padding: "12px 12px", border: "1px solid rgba(15,23,42,0.08)", boxShadow: "0 10px 18px rgba(15,23,42,0.08)" },
      groupTitle: { fontSize: 12, fontWeight: 900, color: "#111827", marginBottom: 10 },

      itemsGrid: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 10 },
      itemCard: { borderRadius: 14, background: "#ffffff", border: "1px solid rgba(15,23,42,0.08)", padding: "10px 10px" },
      itemTitle: { fontSize: 11, fontWeight: 900, color: "#111827", marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
      itemSub: { fontSize: 11, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
      itemActions: { marginTop: 10, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" },
      smallBtn: { borderRadius: 999, border: "1px solid rgba(15,23,42,0.10)", background: "#f8fafc", padding: "6px 10px", fontSize: 11, fontWeight: 900, cursor: "pointer" },
      delBtn: { background: "#fee2e2" },

      inlineEditBox: { marginTop: 10, borderRadius: 14, background: "#f1f5f9", padding: 10, border: "1px solid rgba(15,23,42,0.10)" },
      inlineRow: { display: "grid", gridTemplateColumns: "1fr", gap: 8 },

      saveBtn: { marginTop: 14, display: "block", marginLeft: "auto", marginRight: "auto", borderRadius: 999, border: "none", padding: "10px 44px", fontSize: 13, fontWeight: 800, background: "linear-gradient(135deg,#6366f1,#a855f7)", color: "#fff", cursor: "pointer", width: isMobile ? "100%" : "auto" },
    }),
    [editOpen, isMobile, isTablet]
  );

  const caretakerText = plotMeta?.caretaker || plotMeta?.ownerName || "-";
  const plantTypeText = plotMeta?.plantType || plotMeta?.cropType || "-";
  const plantedAtText = plotMeta?.plantedAt || "-";

  const fallbackPolygon = [
    [13.35, 101.0],
    [13.35, 101.2],
    [13.25, 101.2],
    [13.25, 101.0],
  ];
  const polygonsToRender = plotPolygons.length ? plotPolygons : [fallbackPolygon];

  const onSaveAll = async () => {
    const payload = {
      plot: selectedPlot,
      node: selectedNode,
      nodeCategory: selectedNodeCategory,
      sensorType: selectedSensorType,
      pins,
      activePinId,
      sensors: sensorGroups,
    };
    console.log("SAVE payload =>", payload);
    alert("บันทึกแล้ว (sync กับ DB แบบ real-time)");
  };

  return (
    <div style={styles.page}>
      <div style={styles.body} className="du-add-sensor">
        {/* TOP gradient filter panel */}
        <section style={styles.topPanel}>
          <div style={styles.topHeaderRow}>
            <div style={styles.topTitle}>การจัดการ PIN และ Sensor</div>
            <button style={styles.topBtn} type="button">
              + เพิ่ม PIN และ Sensor
            </button>
          </div>

          <div style={styles.filterGrid}>
            <div style={styles.filterCard}>
              <div style={styles.filterLabel}>แปลง</div>
              <select style={styles.filterSelect} value={selectedPlot} onChange={(e) => setSelectedPlot(e.target.value)}>
                <option value="all">ทุกแปลง</option>
                {plots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.plotName || p.alias || p.name || p.id}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.filterCard}>
              <div style={styles.filterLabel}>เลือก Node</div>
              <select style={styles.filterSelect} value={selectedNode} onChange={(e) => setSelectedNode(e.target.value)}>
                {nodeOptions.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.filterCard}>
              <div style={styles.filterLabel}>ชนิดเซนเซอร์</div>
              <select
                style={styles.filterSelect}
                value={selectedSensorType}
                onChange={(e) => setSelectedSensorType(e.target.value)}
              >
                {sensorOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* PANEL ข้อมูลแปลง + แผนที่ + PIN meta */}
        <section style={styles.plotPanel}>
          <div style={styles.plotHeaderRow}>
            <div style={styles.plotTitle}>ข้อมูลแปลง: {plotLabel}</div>
            <button style={styles.editBtn} type="button" onClick={onEditClick}>
              ลบ / แก้ไข
            </button>
          </div>
          <div style={styles.plotSub}>รายละเอียดแปลงและข้อมูลพื้นฐาน</div>

          <div style={styles.infoGrid}>
            <div>
              <div style={styles.infoLabel}>ชื่อแปลง</div>
              <div style={styles.infoBox}>{plotLabel}</div>
            </div>
            <div>
              <div style={styles.infoLabel}>ผู้ดูแล</div>
              <div style={styles.infoBox}>{caretakerText}</div>
            </div>
            <div>
              <div style={styles.infoLabel}>ประเภทพืช</div>
              <div style={styles.infoBox}>{plantTypeText}</div>
            </div>
            <div>
              <div style={styles.infoLabel}>วันที่เริ่มปลูก</div>
              <div style={styles.infoBox}>{plantedAtText}</div>
            </div>
          </div>

          {/* แผนที่ polygon + pins */}
          <div style={styles.mapCard}>
            <div style={styles.mapTitle}>จุด Pin เซนเซอร์ชุดนี้ (คลิกแผนที่เพื่อปักพิกัดให้ Pin ที่เลือก)</div>
            <div style={styles.mapHelp}>เลือก Pin จากรายการด้านล่างก่อน แล้วค่อยคลิกบนแผนที่เพื่อย้ายหมุด</div>

            {!mounted ? (
              <div style={styles.mapLoading}>Loading map...</div>
            ) : (
              <div style={{ height: 230, width: "100%" }}>
                <LeafletMap
                mapKey={mapKey}
                center={[13.7563, 100.5018]}
                zoom={11}
                polygons={polygonsToRender}
                pins={filteredPins}
                pinIcon={pinIcon}
                readOnly={readOnlyAllPlots}
                onPick={onPickLatLng}
                onCreated={(map) => {
                  mapRef.current = map;
                }}
                onReady={() => setMapReady(true)}
              />
              </div>
            )}

          </div>

          {/* ปุ่ม + / - */}
          <div style={styles.pinActionsRow}>
            <button
              style={{ ...styles.pinMetaBtn, opacity: (selectedPlot === "all" || selectedNode === "all") ? 0.5 : 1, cursor: (selectedPlot === "all" || selectedNode === "all") ? "not-allowed" : "pointer" }}
              type="button"
              onClick={addPin}
              disabled={selectedPlot === "all" || readOnlyAllPlots}
            >
              +
            </button>
            <button
              style={styles.pinMetaBtn}
              type="button"
              onClick={() => removePinById(activePinId)}
              disabled={readOnlyAllPlots || filteredPins.length === 0}
              title={filteredPins.length === 0 ? "ยังไม่มี pin" : "ลบ pin ที่กำลังเลือก"}
            >
              −
            </button>

            <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 700 }}>
              รวม {filteredPins.length} จุด (กำลังเลือก: #{activePin?.number ?? "-"})
            </div>
          </div>

          {/* รายการ PIN */}
          <div style={styles.pinList}>
            {filteredPins.map((p) => {
              const active = String(p.id) === String(activePinId);
              return (
                <div
                  key={p.id}
                  style={{ ...styles.pinCard(active), position: "relative" }}
                  onClick={() => setActivePinId(String(p.id))}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setActivePinId(String(p.id))}
                  title="คลิกเพื่อเลือก pin นี้ แล้วค่อยคลิกบนแผนที่เพื่อย้ายหมุด"
                >
                  {editOpen && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePinById(p.id);
                      }}
                      disabled={false}
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
                      title={`ลบ Pin #${p.number}`}
                    >
                      ลบ
                    </button>
                  )}

                  <div style={styles.pinCardGrid}>
                    <div style={styles.pinMetaBox}>
                      <div style={styles.pinMetaLabel}>number</div>
                      <div style={styles.pinMetaValue}>#{p.number}</div>
                    </div>
                    <div style={styles.pinMetaBox}>
                      <div style={styles.pinMetaLabel}>ละติจูด</div>
                      <div style={styles.pinMetaValue}>{p.lat}</div>
                    </div>
                    <div style={styles.pinMetaBox}>
                      <div style={styles.pinMetaLabel}>ลองจิจูด</div>
                      <div style={styles.pinMetaValue}>{p.lng}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ✅ PANEL แก้ไข Pin ที่เลือก */}
        <section style={styles.pinPanel}>
          <div style={styles.pinHeaderRow}>
            <div style={styles.pinTitle}>Pin: {activePin ? `#${activePin.number}` : "ยังไม่เลือก Pin"}</div>
          </div>

          <div style={styles.pinStack}>
            
            <div style={styles.pinMetaGrid}>
              <div style={styles.pinMetaBox}>
                <div style={styles.pinMetaLabel}>plotId</div>
                <div style={styles.pinMetaValue}>{activePin?.plotId || "-"}</div>
              </div>
              <div style={styles.pinMetaBox}>
                <div style={styles.pinMetaLabel}>nodeId</div>
                <div style={styles.pinMetaValue}>{activePin?.nodeId || "-"}</div>
              </div>
              <div style={styles.pinMetaBox}>
                <div style={styles.pinMetaLabel}>จำนวน Sensor</div>
                <div style={styles.pinMetaValue}>{activePinSensors.length}</div>
              </div>
              <div style={styles.pinMetaBox}>
                <div style={styles.pinMetaLabel}>ชนิดที่มี</div>
                <div style={styles.pinMetaValue} 
                style={{...styles.pinMetaValue, whiteSpace:"normal"}}>
                  {activePinSensors.length ? Array.from(new Set(activePinSensors.map((x)=>x.sensorType))).join(", ") : "-"}
                </div>
              </div>
            </div>

<div style={styles.pinFormGrid}>
              <div style={styles.pinField}>
                <div style={styles.pinFieldLabel}>ละติจูด (Latitude)</div>
                <input
                  style={styles.inputField}
                  type="number"
                  step="0.000001"
                  value={Number.isFinite(activePin?.lat) ? activePin.lat : ""}
                  onChange={(e) => setActiveLat(Number(e.target.value))}
                  disabled={!activePinId}
                />
              </div>

              <div style={styles.pinField}>
                <div style={styles.pinFieldLabel}>ลองจิจูด (Longitude)</div>
                <input
                  style={styles.inputField}
                  type="number"
                  step="0.000001"
                  value={Number.isFinite(activePin?.lng) ? activePin.lng : ""}
                  onChange={(e) => setActiveLng(Number(e.target.value))}
                  disabled={!activePinId}
                />
              </div>
            </div>

            <div style={styles.pinHint}>
              <span style={styles.hintDot} />
              <span>
                ✅ ตอนนี้กำลังแก้ไข: <b>Pin #{activePin?.number ?? "-"}</b> — คลิกบนแผนที่เพื่อย้ายหมุดของ Pin นี้
              </span>
            </div>

            {/* เพิ่มเซนเซอร์ */}
            <div style={styles.groupRowTop}>
              <select style={styles.groupPick} value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}>
                {groupChoices.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>

              <button type="button" style={{ ...styles.actionBtn, ...styles.addBtn }} onClick={onAddSensor}>
                เพิ่มรายการ
              </button>
            </div>

            <div style={styles.addRow}>
              <input
                style={styles.inputField}
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="ชื่อเซนเซอร์ (เช่น เซนเซอร์ความชื้นดิน #1)"
              />
              <input
                style={styles.inputField}
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
                placeholder="ค่า/คำอธิบาย (เช่น ความชื้นดิน ~ 32 %)"
              />
              <button type="button" style={{ ...styles.actionBtn, ...styles.addBtn, width: 44, padding: 0 }} onClick={onAddSensor} aria-label="เพิ่มรายการ" title="เพิ่มรายการ">
                +
              </button>
            </div>

            {/* กลุ่มเซนเซอร์ */}
            <div style={styles.groupList}>
              {displaySensorGroups.map((g) => (
                <div key={g.id} style={styles.groupCard}>
                  <div style={styles.groupTitle}>{g.title}</div>

                  <div style={styles.itemsGrid}>
                    {g.items.map((it) => {
                      const isEditing = editingItem?.groupId === g.id && String(editingItem?.itemId) === String(it.id);

                      return (
                        <div key={it.id} style={styles.itemCard}>
                          <div style={styles.itemTitle}>{it.name}</div>
                          <div style={styles.itemSub}>{it.value}</div>

                          <div style={styles.itemActions}>
                            {!isEditing ? (
                              <>
                                <button type="button" style={styles.smallBtn} onClick={() => onStartInlineEdit(g.id, it.id)}>
                                  แก้ไข
                                </button>
                                <button type="button" style={{ ...styles.smallBtn, ...styles.delBtn }} onClick={() => onDeleteItem(g.id, it.id)}>
                                  ลบ
                                </button>
                              </>
                            ) : (
                              <>
                                <button type="button" style={{ ...styles.smallBtn, ...styles.saveEditBtn }} onClick={onSaveInlineEdit}>
                                  บันทึก
                                </button>
                                <button type="button" style={{ ...styles.smallBtn, ...styles.cancelBtn }} onClick={onCancelInlineEdit}>
                                  ยกเลิก
                                </button>
                              </>
                            )}
                          </div>

                          {isEditing && (
                            <div style={styles.inlineEditBox}>
                              <div style={styles.inlineRow}>
                                <input style={styles.inputField} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="แก้ชื่อเซนเซอร์" />
                                <input style={styles.inputField} value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="แก้ค่า/คำอธิบาย" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button style={styles.saveBtn} type="button" onClick={onSaveAll}>
              SAVE
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}