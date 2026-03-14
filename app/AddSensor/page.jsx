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
      mapKey,
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
          key={mapKey}
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

function sensorTypeLabel(sensorType, t) {
  const key = String(sensorType || "");
  if (key === "soil_moisture") return t("soilMoisture");
  if (key === "temp_rh") return t("airTempHumidity");
  if (key === "irrigation") return t("irrigationReady");
  if (key === "npk") return t("npkConcentration");
  if (key === "wind") return t("windMeasure");
  if (key === "ppfd") return t("lightIntensity");
  if (key === "rain") return t("rainAmount");
  return key || "-";
}

function formatSensorDisplayValue(sensor) {
  const rawValue =
    sensor?.lastReading?.value !== undefined && sensor?.lastReading?.value !== null
      ? Number(sensor.lastReading.value)
      : sensor?.value !== undefined && sensor?.value !== null
      ? Number(sensor.value)
      : null;

  const unit = String(sensor?.unit || "").trim();

  if (rawValue !== null && Number.isFinite(rawValue)) {
    return `${rawValue}${unit ? ` ${unit}` : ""}`;
  }

  const hint = String(sensor?.valueHint || "").trim();
  if (hint) return hint;

  if (sensor?.value !== undefined && sensor?.value !== null && sensor?.value !== "") {
    return String(sensor.value);
  }

  return "-";
}

function toNodeSensorGroups(nodeDoc, t, selectedNode) {
  const groups = [];

  const pushGroup = (title, items) => {
    if (!items.length) return;
    groups.push({ title, items });
  };

  const soilSensors = Array.isArray(nodeDoc?.node_soil?.sensors)
    ? nodeDoc.node_soil.sensors
    : [];
  const airSensors = Array.isArray(nodeDoc?.node_air?.sensors)
    ? nodeDoc.node_air.sensors
    : [];

  const mapItems = (arr, nodeType) =>
    arr.map((s, idx) => ({
      id: String(s?._id || `${nodeType}-${idx}`),
      nodeType,
      sensorType: String(s?.sensorType || ""),
      name:
        String(s?.name || "").trim() ||
        `${sensorTypeLabel(s?.sensorType, t)} #${idx + 1}`,
      value: formatSensorDisplayValue(s),
      status: s?.status || "-",
      lastReadingAt: s?.lastReadingAt || s?.lastReading?.ts || "-",
      unit: s?.unit || "",
    }));

  const onlySoil = selectedNode === "soil";
  const onlyAir = selectedNode === "air";

  if (!onlyAir) {
    pushGroup(t("soilNode"), mapItems(soilSensors, "soil"));
  }

  if (!onlySoil) {
    pushGroup(t("airNode"), mapItems(airSensors, "air"));
  }

  return groups;
}

export default function AddSensorPage() {
  const router = useRouter();
  const { t, lang } = useDuwimsT();

  const mapRef = useRef(null);
  const [pinIcon, setPinIcon] = useState(null);
  const [activePinIcon, setActivePinIcon] = useState(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    return () => {
      try {
        if (mapRef.current?.remove) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      } catch {}
    };
  }, []);

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

  useEffect(() => {
    setMapReady(false);
  }, [selectedPlot, selectedNode]);

  const mapKey = useMemo(
    () => `${selectedPlot}__${selectedNode}`,
    [selectedPlot, selectedNode]
  );

  const readOnlyAllPlots = false;

  const [plots, setPlots] = useState([]);
  const [nodeTemplates, setNodeTemplates] = useState([]);
  const [plotMeta, setPlotMeta] = useState(null);
  const [plotPolygons, setPlotPolygons] = useState([]);

  const [pins, setPins] = useState([]);
  const [activePinId, setActivePinId] = useState(null);
  const [activePinNode, setActivePinNode] = useState(null);

  const activePin = useMemo(
    () => pins.find((p) => String(p.id) === String(activePinId)) || null,
    [pins, activePinId]
  );

  const selectedNodeTemplateId = useMemo(
    () => String(activePin?.nodeId || ""),
    [activePin]
  );

  const plotLabel = useMemo(() => {
    if (selectedPlot === "all") return t("allPlots");
    const p = plots.find((x) => String(x.id || x._id) === String(selectedPlot));
    return p
      ? p.plotName || p.alias || p.name || `${t("plot")} ${p.id || p._id}`
      : `${t("plot")} ${selectedPlot}`;
  }, [selectedPlot, plots, t]);

  const nodeOptions = useMemo(
    () => [
      { value: "all", label: t("allNodes") },
      { value: "soil", label: t("soilNode") },
      { value: "air", label: t("airNode") },
    ],
    [t]
  );

  const filteredPins = useMemo(() => {
    const list = Array.isArray(pins) ? pins : [];
    const scoped =
      selectedPlot === "all"
        ? list
        : list.filter((p) => String(p.plotId) === String(selectedPlot));

    return [...scoped].sort((a, b) => Number(a?.number || 0) - Number(b?.number || 0));
  }, [pins, selectedPlot]);

  const sensorDisplayGroups = useMemo(
    () => toNodeSensorGroups(activePinNode, t, selectedNode),
    [activePinNode, selectedNode, t]
  );

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
          pinsItems.map((p) => ({
            ...p,
            id: String(p.id || p._id),
            plotId: String(plotId),
            nodeId: p?.nodeId ? String(p.nodeId) : "",
            nodeName: p?.nodeName || "",
          }))
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
        setActivePinNode(null);

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
          setPins(ensureUniquePinNumbers(allPins));
          setActivePinId(allPins[0]?.id ? String(allPins[0].id) : null);
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

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      try {
        if (!activePinId || !isLikelyObjectId(String(activePinId))) {
          setActivePinNode(null);
          return;
        }

        const token = getToken();
        const res = await apiFetch(
          `/api/pins/${encodeURIComponent(String(activePinId))}/node`,
          {
            token,
            signal: controller.signal,
          }
        );

        setActivePinNode(res?.item || null);
      } catch (e) {
        console.warn("[AddSensor] load active pin node failed:", e?.message || e);
        setActivePinNode(null);
      }
    };

    run();
    return () => controller.abort();
  }, [activePinId]);

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

    setPins((prev) => {
      const next = [
        ...(Array.isArray(prev) ? prev : []),
        {
          id: tempId,
          _tmp: true,
          number: nextNumber,
          lat: null,
          lng: null,
          nodeId: "",
          nodeName: "",
          plotId: String(selectedPlot),
        },
      ];

      return Array.isArray(next) ? next : [];
    });

    setActivePinId(tempId);
  };

  const removePinById = async (pinId) => {
    if (!pinId) return;

    setPins((prev) =>
      (Array.isArray(prev) ? prev : []).filter((p) => String(p.id) !== String(pinId))
    );

    if (String(pinId) === String(activePinId)) {
      setActivePinId(null);
      setActivePinNode(null);
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
              lat,
              lng,
              nodeId: selectedNodeTemplateId || null,
            },
          }
        );

        const created = r?.item || r;
        const createdId = created?.id || created?._id;
        if (!createdId) throw new Error("ไม่ได้รับ id จาก API");

        setPins((prev) => {
          const replaced = prev.map((p) =>
            String(p.id) === String(activePinId)
              ? {
                  ...p,
                  _tmp: false,
                  id: String(createdId),
                  number: created.number ?? pin.number,
                  lat: created.lat ?? lat,
                  lng: created.lng ?? lng,
                  nodeId: created?.nodeId ? String(created.nodeId) : "",
                  nodeName: created?.nodeName || "",
                  plotId: targetPlotId,
                }
              : p
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

  const onChangeNodeTemplate = async (nodeId) => {
    if (!activePinId) {
      alert(
        lang === "en" ? "Please select a pin first" : "กรุณาเลือก Pin ก่อน"
      );
      return;
    }

    if (!isLikelyObjectId(String(activePinId))) {
      alert(
        lang === "en"
          ? "Please place the pin on the map first"
          : "กรุณาปัก Pin ลงบนแผนที่ก่อน"
      );
      return;
    }

    const chosen = nodeTemplates.find(
      (n) => String(n.id || n._id) === String(nodeId)
    );

    try {
      const token = getToken();
      await apiFetch(`/api/pins/${encodeURIComponent(String(activePinId))}/node`, {
        method: "PATCH",
        token,
        body: { nodeId },
      });

      setPins((prev) =>
        prev.map((p) =>
          String(p.id) === String(activePinId)
            ? {
                ...p,
                nodeId: String(nodeId),
                nodeName: chosen?.nodeName || "",
              }
            : p
        )
      );

      setActivePinNode(chosen || null);
    } catch (e) {
      console.warn("[AddSensor] assign node template failed:", e?.message || e);
      alert(
        `${lang === "en" ? "Assign node failed" : "ผูก node ไม่สำเร็จ"}: ${
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
          : "repeat(2,minmax(0,1fr))",
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
      pinCard: (active) => ({
        borderRadius: 16,
        background: active ? "#fee2e2" : "#fef9c3",
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
          : "repeat(4,minmax(0,1fr))",
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
        gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))",
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

      groupList: { display: "grid", gap: 12 },
      groupCard: {
        borderRadius: 16,
        background: "#ffffff",
        padding: "12px 12px",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 10px 18px rgba(15,23,42,0.08)",
      },
      groupTitle: {
        fontSize: 12,
        fontWeight: 900,
        color: "#111827",
        marginBottom: 10,
      },

      itemsGrid: {
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
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
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
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
              <div style={styles.filterLabel}>{t("plot")}</div>
              <select
                style={styles.filterSelect}
                value={selectedPlot}
                onChange={(e) => setSelectedPlot(e.target.value)}
              >
                <option value="all">{t("allPlots")}</option>
                {plots.map((p) => (
                  <option key={p.id || p._id} value={p.id || p._id}>
                    {p.plotName || p.alias || p.name || p.id || p._id}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.filterCard}>
              <div style={styles.filterLabel}>{t("selectNode")}</div>
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
                : "เลือก Pin จากรายการด้านล่างก่อน แล้วค่อยคลิกบนแผนที่เพื่อย้ายหมุด"}
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
                  mapKey={mapKey}
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
              return (
                <div
                  key={p.id}
                  style={{ ...styles.pinCard(active), position: "relative" }}
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
                      <div style={styles.pinMetaLabel}>
                        {lang === "en" ? "Node name" : "ชื่อ Node"}
                      </div>
                      <div style={styles.pinMetaValue}>{p.nodeName || "-"}</div>
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

            <div>
              <div style={styles.sectionLabel}>
                {lang === "en" ? "Select NodeTemplate" : "เลือก NodeTemplate"}
              </div>
              <select
                style={styles.groupPick}
                value={selectedNodeTemplateId}
                onChange={(e) => onChangeNodeTemplate(e.target.value)}
                disabled={!activePinId}
              >
                <option value="">
                  {lang === "en" ? "Select node name" : "เลือกชื่อ node"}
                </option>
                {nodeTemplates.map((n) => (
                  <option key={n.id || n._id} value={n.id || n._id}>
                    {n.nodeName || n.id || n._id}
                  </option>
                ))}
              </select>
            </div>

            {!activePinId ? (
              <div style={styles.infoNotice}>
                {lang === "en"
                  ? "Please select a pin first."
                  : "กรุณาเลือก Pin ก่อน"}
              </div>
            ) : !selectedNodeTemplateId ? (
              <div style={styles.infoNotice}>
                {lang === "en"
                  ? "This pin has not been assigned to a NodeTemplate yet."
                  : "Pin นี้ยังไม่ได้ผูกกับ NodeTemplate"}
              </div>
            ) : sensorDisplayGroups.length === 0 ? (
              <div style={styles.infoNotice}>
                {lang === "en"
                  ? "No sensors found inside this NodeTemplate."
                  : "ไม่พบ sensor ภายใน NodeTemplate นี้"}
              </div>
            ) : (
              <div style={styles.groupList}>
                {sensorDisplayGroups.map((g) => (
                  <div key={g.title} style={styles.groupCard}>
                    <div style={styles.groupTitle}>{g.title}</div>

                    <div style={styles.itemsGrid}>
                      {g.items.map((it) => (
                        <div key={it.id} style={styles.itemCard}>
                          <div style={styles.itemTitle}>{it.name}</div>
                          <div style={styles.itemSub}>
                            {sensorTypeLabel(it.sensorType, t)}
                          </div>
                          <div style={styles.itemMeta}>
                            <b>{lang === "en" ? "Value" : "ค่า"}:</b> {it.value}
                          </div>
                          <div style={styles.itemMeta}>
                            <b>Status:</b> {it.status}
                          </div>
                          <div style={styles.itemMeta}>
                            <b>{lang === "en" ? "Last reading" : "อ่านค่าล่าสุด"}:</b>{" "}
                            {it.lastReadingAt || "-"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              style={styles.saveBtn}
              type="button"
              onClick={() =>
                alert(
                  lang === "en"
                    ? "Saved (pin-node link and coordinates are synced with DB)"
                    : "บันทึกแล้ว (ตำแหน่ง pin และการผูก node sync กับ DB แล้ว)"
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