"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// --- dynamic import React-Leaflet เฉพาะฝั่ง client ---
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), {
  ssr: false,
});
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });
const Polygon = dynamic(() => import("react-leaflet").then((m) => m.Polygon), {
  ssr: false,
});

// ✅ Map click handler (React-Leaflet hook)
const MapClickHandler = dynamic(
  () =>
    import("react-leaflet").then((m) => {
      const useMapEvents = m.useMapEvents;
      return function MapClickHandlerInner({ onPick }) {
        useMapEvents({
          click(e) {
            onPick?.(e.latlng);
          },
        });
        return null;
      };
    }),
  { ssr: false }
);

// =========================
// ✅ API helpers (no UI changes)
// =========================
const API_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) ||
  "http://localhost:3000";

const TOKEN_KEYS = ["token", "duwims_token"];

function getToken() {
  if (typeof window === "undefined") return null;
  for (const k of TOKEN_KEYS) {
    const t = window.localStorage.getItem(k);
    if (t) return t;
  }
  return null;
}

function setToken(t) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("token", t);
  window.localStorage.setItem("duwims_token", t);
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

function pickNumberFromText(s) {
  if (!s) return null;
  const m = String(s).match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function mapGroupToSensorType(groupId) {
  // mapping จาก group id ใน FE -> sensorType ใน backend
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
  const [pinIcon, setPinIcon] = useState(null);

  // ✅ กัน Leaflet crash ใน dev (StrictMode/mount timing)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ✅ สำคัญ: รอให้ map ready ก่อนค่อย render layers (กัน appendChild undefined)
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
          iconUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
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
  const [selectedPlot, setSelectedPlot] = useState("all"); // plotId หรือ "all"
  const [selectedNode, setSelectedNode] = useState("all"); // nodeId หรือ "all"
  const [selectedSensorType, setSelectedSensorType] = useState("soil_moisture");

  // ====== server data ======
  const [plots, setPlots] = useState([]); // {id, plotName/alias...}
  const [nodes, setNodes] = useState([]); // {id, plotId, category, name...}

  // ✅ PIN LIST (from DB)
  const [pins, setPins] = useState([{ id: 1, number: 1, lat: 13.3, lng: 101.12 }]);

  // ✅ เลือก pin ที่กำลังแก้ไข
  const [activePinId, setActivePinId] = useState(1);
  const activePin = useMemo(() => {
    return pins.find((p) => p.id === activePinId) || pins[0];
  }, [pins, activePinId]);

  // =========================
  // ✅ SENSOR CRUD (DB + inline)
  // =========================
  const [sensorGroups, setSensorGroups] = useState([
    {
      id: "soil",
      title: "เซนเซอร์ความชื้นดิน",
      items: [],
    },
    {
      id: "temp",
      title: "เซนเซอร์ อุณหภูมิ",
      items: [],
    },
    {
      id: "irrigation",
      title: "เซนเซอร์การให้น้ำ",
      items: [],
    },
    {
      id: "rh",
      title: "เซนเซอร์ความชื้นสัมพัทธ์",
      items: [],
    },
    {
      id: "npk",
      title: "เซนเซอร์ NPK",
      items: [],
    },
    {
      id: "wind",
      title: "เซนเซอร์วัดความเร็วลม",
      items: [],
    },
    {
      id: "ppfd",
      title: "เซนเซอร์ความเข้มแสง",
      items: [],
    },
    {
      id: "rain",
      title: "เซนเซอร์ปริมาณน้ำฝน",
      items: [],
    },
  ]);

  const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const [addName, setAddName] = useState("");
  const [addValue, setAddValue] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("soil");

  const [editingItem, setEditingItem] = useState(null); // { groupId, itemId }
  const [editName, setEditName] = useState("");
  const [editValue, setEditValue] = useState("");

  const groupChoices = useMemo(
    () => sensorGroups.map((g) => ({ id: g.id, title: g.title })),
    [sensorGroups]
  );

  // =========================
  // ✅ Derived dropdown labels
  // =========================
  const plotLabel = useMemo(() => {
    if (selectedPlot === "all") return "ทุกแปลง";
    const p = plots.find((x) => String(x.id) === String(selectedPlot));
    return p ? p.plotName || p.name || p.alias || `แปลง ${p.id}` : `แปลง ${selectedPlot}`;
  }, [selectedPlot, plots]);

  // Node options: "all" + nodes of selectedPlot
  const nodeOptions = useMemo(() => {
    const items = [{ value: "all", label: "ทุก Node" }];
    const inPlot = selectedPlot === "all" ? [] : nodes.filter((n) => String(n.plotId) === String(selectedPlot));
    for (const n of inPlot) {
      const catLabel = n.category === "air" ? "อากาศ" : "ดิน";
      items.push({ value: n.id, label: `${n.name || "Node"} (${catLabel})` });
    }
    return items;
  }, [nodes, selectedPlot]);

  // ✅ ให้ครบตามที่สั่ง:
  const sensorOptions = useMemo(
    () => [
      { value: "temp_rh", label: "อุณหภูมิและความชื้น" },
      { value: "wind", label: "วัดความเร็วลม" },
      { value: "ppfd", label: "ความเข้มแสง" },
      { value: "rain", label: "ปริมาณน้ำฝน" },
      { value: "npk", label: "ความเข้้มข้นธาตุอาหาร (N,P,K)" },
      { value: "irrigation", label: "การให้น้ำ / ความพร้อมใช้น้ำ" },
      { value: "soil_moisture", label: "ความชื้ื้นในดิน" },
    ],
    []
  );

  // ✅ คุมค่า selectedSensorType ให้ถูกต้องเสมอ
  useEffect(() => {
    if (!sensorOptions.length) return;
    const ok = sensorOptions.some((s) => s.value === selectedSensorType);
    if (!ok) setSelectedSensorType(sensorOptions[0].value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensorOptions]);

  // =========================
  // ✅ Auth token bootstrap (optional)
  // =========================
  useEffect(() => {
    // ถ้ายังไม่มี token และคุณมีระบบ login หน้าอื่นอยู่แล้ว ให้ไม่ทำอะไร
    // หน้านี้จะเรียก API แล้วจะโดน 401 — user ต้อง login ก่อน
    // (เพื่อไม่เปลี่ยน UI/flow)
  }, []);

  // =========================
  // ✅ Load: plots
  // =========================
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        const token = getToken();
        if (!token) return; // ต้อง login ก่อน (ไม่แตะ UI)
        const r = await apiFetch("/api/plots", { token, signal: controller.signal });
        setPlots(Array.isArray(r?.items) ? r.items : []);
      } catch (e) {
        // เงียบไว้ ไม่เปลี่ยน UI
        console.warn("[AddSensor] load plots failed:", e?.message || e);
      }
    };
    run();
    return () => controller.abort();
  }, []);

  // =========================
  // ✅ Load: nodes (when selectedPlot changes)
  // =========================
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        const token = getToken();
        if (!token) return;
        if (selectedPlot === "all") {
          setNodes([]);
          setSelectedNode("all");
          return;
        }
        const r = await apiFetch(
          `/api/nodes?plotId=${encodeURIComponent(selectedPlot)}&category=all`,
          { token, signal: controller.signal }
        );
        const items = Array.isArray(r?.items) ? r.items : [];
        // ensure plotId string exists
        setNodes(items.map((x) => ({ ...x, plotId: x.plotId })));

        // ถ้า selectedNode ไม่อยู่ใน list -> reset
        if (selectedNode !== "all" && !items.some((n) => String(n.id) === String(selectedNode))) {
          setSelectedNode("all");
        }
      } catch (e) {
        console.warn("[AddSensor] load nodes failed:", e?.message || e);
      }
    };
    run();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlot]);

  // =========================
  // ✅ Load: pins (when plot/node changes)
  // - requirement: GET /pins?plotId=&nodeId=
  // =========================
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        const token = getToken();
        if (!token) return;

        if (selectedPlot === "all") {
          // ไม่รู้จะโหลด plot ไหน จึงคง demo ไว้
          return;
        }

        const q = new URLSearchParams();
        q.set("plotId", String(selectedPlot));
        if (selectedNode !== "all") q.set("nodeId", String(selectedNode));

        const r = await apiFetch(`/api/pins?${q.toString()}`, {
          token,
          signal: controller.signal,
        });

        const items = Array.isArray(r?.items) ? r.items : [];
        const normalized = items
          .map((p) => ({
            id: p.id || p._id || uid(),
            number: Number(p.number),
            lat: Number(p.lat),
            lng: Number(p.lng),
            _db: { pinId: p.id || p._id, plotId: p.plotId, nodeId: p.nodeId },
          }))
          .filter((p) => Number.isFinite(p.number) && Number.isFinite(p.lat) && Number.isFinite(p.lng))
          .sort((a, b) => a.number - b.number);

        if (normalized.length) {
          setPins(normalized);
          setActivePinId(normalized[0].id);
        } else {
          // ถ้าไม่มีใน DB ให้คงขั้นต่ำ 1 pin (ยังไม่สร้างจนกด + หรือ SAVE)
          setPins((prev) => (prev?.length ? prev : [{ id: 1, number: 1, lat: 13.3, lng: 101.12 }]));
          setActivePinId((prev) => prev || 1);
        }
      } catch (e) {
        console.warn("[AddSensor] load pins failed:", e?.message || e);
      }
    };
    run();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlot, selectedNode]);

  // =========================
  // ✅ Load: sensors (when node changes)
  // - requirement: GET /sensors?nodeId=
  // =========================
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        const token = getToken();
        if (!token) return;

        if (selectedNode === "all") {
          // ไม่รู้ node ไหนให้โหลด -> ล้างรายการ (ไม่เปลี่ยน UI มาก)
          setSensorGroups((prev) =>
            prev.map((g) => ({
              ...g,
              items: [],
            }))
          );
          return;
        }

        const r = await apiFetch(`/api/sensors?nodeId=${encodeURIComponent(selectedNode)}`, {
          token,
          signal: controller.signal,
        });

        const items = Array.isArray(r?.items) ? r.items : [];

        // map sensors -> group by sensorType
        const nextGroups = sensorGroups.map((g) => {
          const st = mapGroupToSensorType(g.id);
          const groupItems = items
            .filter((s) => String(s.sensorType) === String(st))
            .map((s) => ({
              id: s.id || s._id || uid(),
              name: s.name || "",
              value: s.valueHint || s.unit || "",
              _db: { sensorId: s.id || s._id, nodeId: s.nodeId, sensorType: s.sensorType },
            }));
          return { ...g, items: groupItems };
        });

        setSensorGroups(nextGroups);
      } catch (e) {
        console.warn("[AddSensor] load sensors failed:", e?.message || e);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    };
    run();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode]);

  // =========================
  // ✅ PIN actions (DB)
  // =========================

  // ✅ เพิ่ม pin: number ไม่ซ้ำ และ active ไป pin ใหม่ทันที
  const addPin = async () => {
    const newId = Date.now() + Math.random();

    setPins((prev) => {
      const usedNumbers = new Set(prev.map((p) => p.number));
      let nextNumber = 1;
      while (usedNumbers.has(nextNumber)) nextNumber += 1;

      const last = prev[prev.length - 1] || { lat: 13.3, lng: 101.12 };
      return [...prev, { id: newId, number: nextNumber, lat: last.lat, lng: last.lng }];
    });

    setActivePinId(newId);

    // ✅ ถ้ามี plot/node ที่เลือกแล้ว -> create ที่ DB ทันที
    try {
      const token = getToken();
      if (!token) return;
      if (selectedPlot === "all" || selectedNode === "all") return;

      // หา number ของ pin ใหม่จาก state ล่าสุดแบบปลอดภัย: recompute
      const used = new Set(pins.map((p) => p.number));
      let nextNumber = 1;
      while (used.has(nextNumber)) nextNumber += 1;

      const last = pins[pins.length - 1] || { lat: 13.3, lng: 101.12 };
      const r = await apiFetch("/api/pins", {
        method: "POST",
        token,
        body: {
          plotId: selectedPlot,
          nodeId: selectedNode,
          number: nextNumber,
          lat: last.lat,
          lng: last.lng,
        },
      });

      const created = r?.item;
      if (created?.id) {
        // replace temp pin with DB pinId while keeping UI unchanged
        setPins((prev) =>
          prev.map((p) =>
            p.id === newId
              ? {
                  ...p,
                  id: created.id,
                  number: created.number,
                  lat: created.lat,
                  lng: created.lng,
                  _db: { pinId: created.id, plotId: created.plotId, nodeId: created.nodeId },
                }
              : p
          )
        );
        setActivePinId(created.id);
      }
    } catch (e) {
      console.warn("[AddSensor] create pin failed:", e?.message || e);
    }
  };

  // ✅ ลบ pin ตาม id (ลบ #2/#3/#4 ได้) + DELETE /pins/{pinId}
  const removePinById = async (pinId) => {
    setPins((prev) => {
      if (prev.length <= 1) return prev;

      const idx = prev.findIndex((p) => p.id === pinId);
      if (idx === -1) return prev;

      const next = prev.filter((p) => p.id !== pinId);

      // ถ้าลบตัวที่ active อยู่ ให้ active ย้ายไปตัวถัดไป/ก่อนหน้า
      if (pinId === activePinId) {
        const pick = next[idx] || next[idx - 1] || next[0];
        if (pick) setActivePinId(pick.id);
      }

      return next;
    });

    // DB delete (best effort)
    try {
      const token = getToken();
      if (!token) return;
      // ถ้าเป็น temp id (ไม่ใช่ ObjectId) จะลบไม่สำเร็จ ก็ข้าม
      await apiFetch(`/api/pins/${encodeURIComponent(String(pinId))}`, { method: "DELETE", token });
    } catch (e) {
      console.warn("[AddSensor] delete pin failed:", e?.message || e);
    }
  };

  // ✅ ปุ่ม "-" ด้านบน: ลบ pin ที่กำลังเลือก (active)
  const removeActivePin = () => {
    removePinById(activePinId);
  };

  // ✅ คลิกแผนที่ => ย้ายพิกัดเฉพาะ pin ที่เลือก (active) + PATCH /pins/{pinId}
  const onPickLatLng = async (latlng) => {
    if (!latlng) return;
    const { lat, lng } = latlng;

    // UI update
    setPins((prev) => prev.map((p) => (p.id === activePinId ? { ...p, lat, lng } : p)));

    // DB update (best effort)
    try {
      const token = getToken();
      if (!token) return;
      await apiFetch(`/api/pins/${encodeURIComponent(String(activePinId))}`, {
        method: "PATCH",
        token,
        body: { lat, lng },
      });
    } catch (e) {
      console.warn("[AddSensor] patch pin failed:", e?.message || e);
    }
  };

  // ✅ แก้ lat/lng จาก input => แก้เฉพาะ active pin + PATCH /pins/{pinId}
  const setActiveLat = async (lat) => {
    setPins((prev) => prev.map((p) => (p.id === activePinId ? { ...p, lat } : p)));
    try {
      const token = getToken();
      if (!token) return;
      const la = numOrNull(lat);
      if (la === null) return;
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
    setPins((prev) => prev.map((p) => (p.id === activePinId ? { ...p, lng } : p)));
    try {
      const token = getToken();
      if (!token) return;
      const lo = numOrNull(lng);
      if (lo === null) return;
      await apiFetch(`/api/pins/${encodeURIComponent(String(activePinId))}`, {
        method: "PATCH",
        token,
        body: { lng: lo },
      });
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

    // UI optimistic
    const tempId = uid();
    setSensorGroups((prev) =>
      prev.map((g) => {
        if (g.id !== selectedGroupId) return g;
        const newItem = { id: tempId, name, value };
        return { ...g, items: [...g.items, newItem] };
      })
    );
    setAddName("");
    setAddValue("");

    // DB create
    try {
      const token = getToken();
      if (!token) return;
      if (selectedNode === "all") return; // ต้องเลือก node ก่อน

      const sensorType = mapGroupToSensorType(selectedGroupId);

      const body = {
        nodeId: selectedNode,
        sensorType,
        name,
        valueHint: value,
        status: "OK",
        lastReading: {
          value: Number.isFinite(pickNumberFromText(value)) ? pickNumberFromText(value) : null,
          ts: Number.isFinite(pickNumberFromText(value)) ? new Date().toISOString() : null,
        },
      };

      const r = await apiFetch("/api/sensors", { method: "POST", token, body });
      const created = r?.item;

      if (created?.id) {
        setSensorGroups((prev) =>
          prev.map((g) => {
            if (g.id !== selectedGroupId) return g;
            return {
              ...g,
              items: g.items.map((it) =>
                it.id === tempId
                  ? {
                      ...it,
                      id: created.id,
                      _db: { sensorId: created.id, nodeId: created.nodeId, sensorType: created.sensorType },
                    }
                  : it
              ),
            };
          })
        );
      }

      // optional: create reading if numeric exists
      const numeric = pickNumberFromText(value);
      if (created?.id && Number.isFinite(numeric)) {
        try {
          await apiFetch("/api/readings", {
            method: "POST",
            token,
            body: { sensorId: created.id, value: numeric, ts: new Date().toISOString() },
          });
        } catch (_) {}
      }
    } catch (e) {
      console.warn("[AddSensor] create sensor failed:", e?.message || e);
    }
  };

  const onStartInlineEdit = (groupId, itemId) => {
    const g = sensorGroups.find((x) => x.id === groupId);
    const it = g?.items.find((x) => x.id === itemId);
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

    // UI update
    const { groupId, itemId } = editingItem;
    setSensorGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          items: g.items.map((it) => (it.id === itemId ? { ...it, name, value } : it)),
        };
      })
    );

    // DB patch
    try {
      const token = getToken();
      if (!token) return;

      const sensorId = String(itemId);
      await apiFetch(`/api/sensors/${encodeURIComponent(sensorId)}`, {
        method: "PATCH",
        token,
        body: {
          name,
          valueHint: value,
          // ถ้าต้องการให้เปลี่ยน sensorType ตาม groupId ก็ใส่ได้
          // sensorType: mapGroupToSensorType(groupId),
        },
      });

      const numeric = pickNumberFromText(value);
      if (Number.isFinite(numeric)) {
        try {
          await apiFetch("/api/readings", {
            method: "POST",
            token,
            body: { sensorId, value: numeric, ts: new Date().toISOString() },
          });
        } catch (_) {}
      }
    } catch (e) {
      console.warn("[AddSensor] patch sensor failed:", e?.message || e);
    }

    onCancelInlineEdit();
  };

  const onDeleteItem = async (groupId, itemId) => {
    // UI
    setSensorGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return { ...g, items: g.items.filter((it) => it.id !== itemId) };
      })
    );
    if (editingItem && editingItem.groupId === groupId && editingItem.itemId === itemId) {
      onCancelInlineEdit();
    }

    // DB
    try {
      const token = getToken();
      if (!token) return;
      await apiFetch(`/api/sensors/${encodeURIComponent(String(itemId))}`, {
        method: "DELETE",
        token,
      });
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
      pinCardGrid: {
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
        gap: 10,
      },
      pinMetaBox: {
        borderRadius: 14,
        background: "rgba(255,255,255,0.78)",
        border: "1px solid rgba(15,23,42,0.10)",
        padding: "10px 10px",
      },
      pinMetaLabel: { fontSize: 10, fontWeight: 800, color: "#6b7280", marginBottom: 3 },
      pinMetaValue: { fontSize: 12, fontWeight: 800, color: "#0f172a" },

      pinPanel: {
        borderRadius: 26,
        background: "#ffd9f1",
        padding: isMobile ? "16px 12px 18px" : "18px 16px 20px",
        boxShadow: "0 14px 32px rgba(244,114,182,0.25)",
        marginBottom: 16,
      },
      pinHeaderRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        marginBottom: 12,
      },
      pinTitle: { fontSize: 14, fontWeight: 900 },

      // ✅ ทำให้ระยะห่าง “เท่ากันทุกบล็อก” ใน pinPanel
      pinStack: {
        display: "grid",
        rowGap: 12,
      },

      pinFormGrid: {
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: 12,
        alignItems: "start",
      },
      pinField: { display: "grid", gap: 6 },
      pinFieldLabel: { fontSize: 11, fontWeight: 900, color: "#475569" },

      // ✅ เอา marginTop ออก ให้ stack คุม spacing แทน
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
      hintDot: {
        width: 10,
        height: 10,
        borderRadius: 3,
        background: "#22c55e",
        boxShadow: "0 0 0 3px rgba(34,197,94,0.20)",
        flex: "0 0 auto",
      },

      // ✅ เอา marginBottom ออก ให้ stack คุม spacing แทน
      groupRowTop: {
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "minmax(220px, 360px) auto",
        gap: 10,
        alignItems: "center",
      },
      groupPick: {
        width: "100%",
        height: 44,
        borderRadius: 14,
        border: "1px solid rgba(15,23,42,0.12)",
        background: "#fff",
        padding: "0 12px",
        fontSize: 12,
        outline: "none",
      },

      // ✅ เอา marginTop ออก ให้ stack คุม spacing แทน
      addRow: {
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 44px",
        gap: 10,
        alignItems: "stretch",
      },
      inputField: {
        width: "100%",
        height: 44,
        boxSizing: "border-box",
        outline: "none",
        fontSize: 12,
        padding: "0 12px",
        borderRadius: 14,
        background: "#fff",
        border: "1px solid rgba(15,23,42,0.12)",
        boxShadow: "0 6px 14px rgba(15,23,42,0.05)",
      },

      actionBtn: {
        borderRadius: 999,
        border: "none",
        height: 44,
        padding: "0 16px",
        fontSize: 12,
        fontWeight: 900,
        cursor: "pointer",
        boxShadow: "0 10px 18px rgba(15,23,42,0.10)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      },
      addBtn: { background: "#a7f3d0", color: "#064e3b" },
      saveEditBtn: { background: "#fde68a", color: "#78350f" },
      cancelBtn: { background: "#e2e8f0", color: "#0f172a" },

      // ✅ เอา marginTop ออก ให้ stack คุม spacing แทน
      groupList: { display: "grid", gap: 12 },
      groupCard: {
        borderRadius: 16,
        background: "#ffffff",
        padding: "12px 12px",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 10px 18px rgba(15,23,42,0.08)",
      },
      groupTitle: { fontSize: 12, fontWeight: 900, color: "#111827", marginBottom: 10 },

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
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      },
      itemActions: {
        marginTop: 10,
        display: "flex",
        gap: 8,
        justifyContent: "flex-end",
        flexWrap: "wrap",
      },
      smallBtn: {
        borderRadius: 999,
        border: "1px solid rgba(15,23,42,0.10)",
        background: "#f8fafc",
        padding: "6px 10px",
        fontSize: 11,
        fontWeight: 900,
        cursor: "pointer",
      },
      delBtn: { background: "#fee2e2" },

      inlineEditBox: {
        marginTop: 10,
        borderRadius: 14,
        background: "#f1f5f9",
        padding: 10,
        border: "1px solid rgba(15,23,42,0.10)",
      },
      inlineRow: { display: "grid", gridTemplateColumns: "1fr", gap: 8 },

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

  // polygon demo (ถ้าต้องโหลด polygon จาก DB ให้เรียก /api/plots/:plotId/polygon แล้ว set state)
  const fieldPolygon = [
    [13.35, 101.0],
    [13.35, 101.2],
    [13.25, 101.2],
    [13.25, 101.0],
  ];

  // =========================
  // ✅ SAVE (optional) - keep UI same
  // =========================
  const onSaveAll = async () => {
    const payload = {
      plot: selectedPlot,
      node: selectedNode,
      sensorType: selectedSensorType,
      pins,
      activePinId,
      sensors: sensorGroups,
    };
    console.log("SAVE payload =>", payload);

    // หน้านี้: เราทำให้ CRUD ทำงานทันทีอยู่แล้ว (add/edit/delete ยิง API)
    // SAVE จะเป็นแค่ยืนยัน (ไม่ต้องเปลี่ยน UI)
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
              <select
                style={styles.filterSelect}
                value={selectedPlot}
                onChange={(e) => setSelectedPlot(e.target.value)}
              >
                <option value="all">ทุกแปลง</option>
                {plots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.plotName || p.name || p.alias || p.id}
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
              <div style={styles.infoLabel}>ประเภทพืช</div>
              <div style={styles.infoBox}>ทุเรียนหมอนทอง</div>
            </div>
            <div>
              <div style={styles.infoLabel}>วันที่เริ่มปลูก</div>
              <div style={styles.infoBox}>11/02/2568</div>
            </div>
            <div>
              <div style={styles.infoLabel}>จำนวนเซนเซอร์</div>
              <div style={styles.infoBox}>
                {sensorGroups.reduce((sum, g) => sum + (g.items?.length || 0), 0)} เครื่อง
              </div>
            </div>
          </div>

          {/* แผนที่ polygon + pins */}
          <div style={styles.mapCard}>
            <div style={styles.mapTitle}>
              จุด Pin เซนเซอร์ชุดนี้ (คลิกแผนที่เพื่อปักพิกัดให้ Pin ที่เลือก)
            </div>
            <div style={styles.mapHelp}>
              เลือก Pin จากรายการด้านล่างก่อน แล้วค่อยคลิกบนแผนที่เพื่อย้ายหมุด
            </div>

            {!mounted ? (
              <div style={styles.mapLoading}>Loading map...</div>
            ) : (
              <MapContainer
                key="duwims-map"
                center={[13.3, 101.1]}
                zoom={11}
                scrollWheelZoom={true}
                style={{ height: 230, width: "100%" }}
                whenReady={() => setMapReady(true)}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* ✅ กัน appendChild error: render layer เมื่อ map พร้อมแล้วเท่านั้น */}
                {mapReady && (
                  <>
                    <Polygon
                      positions={fieldPolygon}
                      pathOptions={{
                        color: "#16a34a",
                        fillColor: "#86efac",
                        fillOpacity: 0.4,
                      }}
                    />

                    <MapClickHandler onPick={onPickLatLng} />

                    {pinIcon &&
                      pins.map((p) => (
                        <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon}>
                          <Popup>Pin #{p.number}</Popup>
                        </Marker>
                      ))}
                  </>
                )}
              </MapContainer>
            )}
          </div>

          {/* ปุ่ม + / - */}
          <div style={styles.pinActionsRow}>
            <button style={styles.pinMetaBtn} type="button" onClick={addPin}>
              +
            </button>
            <button
              style={styles.pinMetaBtn}
              type="button"
              onClick={removeActivePin}
              disabled={pins.length <= 1}
              title={pins.length <= 1 ? "ต้องมีอย่างน้อย 1 pin" : "ลบ pin ที่กำลังเลือก"}
            >
              −
            </button>

            <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 700 }}>
              รวม {pins.length} จุด (กำลังเลือก: #{activePin?.number ?? 1})
            </div>
          </div>

          {/* รายการ PIN */}
          <div style={styles.pinList}>
            {pins.map((p) => {
              const active = p.id === activePinId;
              return (
                <div
                  key={p.id}
                  style={{ ...styles.pinCard(active), position: "relative" }}
                  onClick={() => setActivePinId(p.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setActivePinId(p.id)}
                  title="คลิกเพื่อเลือก pin นี้ แล้วค่อยคลิกบนแผนที่เพื่อย้ายหมุด"
                >
                  {/* ✅ ปุ่มลบอยู่ตรงการ์ด pin */}
                  {editOpen && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePinById(p.id);
                      }}
                      disabled={pins.length <= 1}
                      style={{
                        position: "absolute",
                        right: 10,
                        top: 10,
                        border: "none",
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontSize: 11,
                        fontWeight: 900,
                        cursor: pins.length <= 1 ? "not-allowed" : "pointer",
                        background: "#ef4444",
                        color: "#fff",
                        opacity: pins.length <= 1 ? 0.5 : 1,
                      }}
                      title={pins.length <= 1 ? "ต้องมีอย่างน้อย 1 pin" : `ลบ Pin #${p.number}`}
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
            <div style={styles.pinTitle}>Pin number #{activePin?.number ?? 1}</div>
          </div>

          {/* ✅ wrapper คุมระยะห่างให้เท่ากันทุกบล็อก */}
          <div style={styles.pinStack}>
            <div style={styles.pinFormGrid}>
              <div style={styles.pinField}>
                <div style={styles.pinFieldLabel}>ละติจูด (Latitude)</div>
                <input
                  style={styles.inputField}
                  type="number"
                  step="0.000001"
                  value={Number.isFinite(activePin?.lat) ? activePin.lat : ""}
                  onChange={(e) => setActiveLat(Number(e.target.value))}
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
                />
              </div>
            </div>

            <div style={styles.pinHint}>
              <span style={styles.hintDot} />
              <span>
                ✅ ตอนนี้กำลังแก้ไข: <b>Pin #{activePin?.number ?? 1}</b> — คลิกบนแผนที่เพื่อย้ายหมุดของ
                Pin นี้
              </span>
            </div>

            {/* เพิ่มเซนเซอร์ */}
            <div style={styles.groupRowTop}>
              <select
                style={styles.groupPick}
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                {groupChoices.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>

              <button
                type="button"
                style={{ ...styles.actionBtn, ...styles.addBtn }}
                onClick={onAddSensor}
              >
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
              <button
                type="button"
                style={{ ...styles.actionBtn, ...styles.addBtn, width: 44, padding: 0 }}
                onClick={onAddSensor}
                aria-label="เพิ่มรายการ"
                title="เพิ่มรายการ"
              >
                +
              </button>
            </div>

            {/* กลุ่มเซนเซอร์ */}
            <div style={styles.groupList}>
              {sensorGroups.map((g) => (
                <div key={g.id} style={styles.groupCard}>
                  <div style={styles.groupTitle}>{g.title}</div>

                  <div style={styles.itemsGrid}>
                    {g.items.map((it) => {
                      const isEditing =
                        editingItem?.groupId === g.id && editingItem?.itemId === it.id;

                      return (
                        <div key={it.id} style={styles.itemCard}>
                          <div style={styles.itemTitle}>{it.name}</div>
                          <div style={styles.itemSub}>{it.value}</div>

                          <div style={styles.itemActions}>
                            {!isEditing ? (
                              <>
                                <button
                                  type="button"
                                  style={styles.smallBtn}
                                  onClick={() => onStartInlineEdit(g.id, it.id)}
                                >
                                  แก้ไข
                                </button>
                                <button
                                  type="button"
                                  style={{ ...styles.smallBtn, ...styles.delBtn }}
                                  onClick={() => onDeleteItem(g.id, it.id)}
                                >
                                  ลบ
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  style={{ ...styles.smallBtn, ...styles.saveEditBtn }}
                                  onClick={onSaveInlineEdit}
                                >
                                  บันทึก
                                </button>
                                <button
                                  type="button"
                                  style={{ ...styles.smallBtn, ...styles.cancelBtn }}
                                  onClick={onCancelInlineEdit}
                                >
                                  ยกเลิก
                                </button>
                              </>
                            )}
                          </div>

                          {isEditing && (
                            <div style={styles.inlineEditBox}>
                              <div style={styles.inlineRow}>
                                <input
                                  style={styles.inputField}
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  placeholder="แก้ชื่อเซนเซอร์"
                                />
                                <input
                                  style={styles.inputField}
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  placeholder="แก้ค่า/คำอธิบาย"
                                />
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
