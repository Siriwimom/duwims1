"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDuwimsT } from "@/app/TopBar";

/* =========================================================
   LEAFLET BUNDLE
========================================================= */
function useLeafletBundle() {
  const [bundle, setBundle] = useState(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const RL = await import("react-leaflet");
      const LModule = await import("leaflet");
      const L = LModule?.default || LModule;

      if (typeof window !== "undefined") {
        window.L = L;
      }

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

      await import("leaflet-draw");
      const Draw = await import("react-leaflet-draw");

      if (alive) setBundle({ RL, Draw, L });
    })();

    return () => {
      alive = false;
    };
  }, []);

  return bundle;
}

/* =========================================================
   CONFIG / API
========================================================= */
const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"
).replace(/\/$/, "");

function getToken() {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("AUTH_TOKEN_V1") ||
    localStorage.getItem("token") ||
    localStorage.getItem("pmtool_token") ||
    localStorage.getItem("duwims_token") ||
    ""
  );
}

async function apiFetch(path, { method = "GET", body } = {}) {
  const token = typeof window !== "undefined" ? getToken() : "";

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      typeof data?.error === "string"
        ? `${data?.message || "Error"}: ${data.error}`
        : typeof data?.message === "string"
        ? data.message
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

/* =========================================================
   HELPERS
========================================================= */
function isTimestampLike(v) {
  if (!v || typeof v !== "object") return false;

  if (typeof v.toDate === "function") return true;

  const hasUnderscore =
    typeof v._seconds === "number" &&
    (typeof v._nanoseconds === "number" || typeof v._nanoseconds === "undefined");

  const hasPlain =
    typeof v.seconds === "number" &&
    (typeof v.nanoseconds === "number" || typeof v.nanoseconds === "undefined");

  return hasUnderscore || hasPlain;
}

function timestampLikeToIso(v) {
  if (!v) return "";

  if (typeof v?.toDate === "function") {
    try {
      return v.toDate().toISOString();
    } catch {
      return "";
    }
  }

  const seconds =
    typeof v._seconds === "number"
      ? v._seconds
      : typeof v.seconds === "number"
      ? v.seconds
      : null;

  if (typeof seconds !== "number") return "";

  return new Date(seconds * 1000).toISOString();
}

function deepNormalize(value) {
  if (isTimestampLike(value)) {
    return timestampLikeToIso(value);
  }

  if (Array.isArray(value)) {
    return value.map(deepNormalize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, deepNormalize(v)])
    );
  }

  return value;
}

function safeText(v, fallback = "") {
  if (v === null || v === undefined) return fallback;

  if (isTimestampLike(v)) {
    const iso = timestampLikeToIso(v);
    return iso ? new Date(iso).toLocaleString("th-TH") : fallback;
  }

  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);

  return fallback;
}

function normalizeCaretaker(v) {
  const s = safeText(v, "").trim();
  if (!s) return "";
  if (s === "0") return "";
  if (s.toLowerCase() === "null") return "";
  if (s.toLowerCase() === "undefined") return "";
  return s;
}

function normalizeCoordsToPairs(coords) {
  if (!Array.isArray(coords)) return [];

  return coords
    .map((pair) => {
      if (Array.isArray(pair) && pair.length >= 2) {
        const lat = Number(pair[0]);
        const lng = Number(pair[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return [lat, lng];
      }

      if (pair && typeof pair === "object") {
        const lat = Number(pair.lat);
        const lng = Number(pair.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return [lat, lng];
      }

      return null;
    })
    .filter(Boolean);
}

function normalizePlotItem(plot = {}) {
  const p = deepNormalize(plot || {});
  return {
    ...p,
    id: String(p.id || p._id || ""),
    alias: safeText(p.alias, ""),
    plotName: safeText(p.plotName || p.name, ""),
    name: safeText(p.name || p.plotName, ""),
    caretaker: normalizeCaretaker(p.caretaker || p.ownerName || ""),
    ownerName: normalizeCaretaker(p.ownerName || p.caretaker || ""),
    createdAt: safeText(p.createdAt, ""),
    updatedAt: safeText(p.updatedAt, ""),
  };
}

function normalizePolygonItem(poly = {}, fallbackId = "") {
  const p = deepNormalize(poly || {});
  const coords = normalizeCoordsToPairs(p.coords || p.coordinates || []);

  if (!coords.length) return null;

  return {
    id: String(p.id || p._id || fallbackId || "polygon"),
    color: safeText(p.color, "#2563eb"),
    coords,
  };
}

function normalizeEmployeeOption(user = {}) {
  const safeUser = deepNormalize(user || {});
  const role = safeText(safeUser.role, "").trim().toLowerCase();

  const label =
    normalizeCaretaker(
      safeUser.nickname ||
        safeUser.fullName ||
        safeUser.name ||
        safeUser.displayName ||
        safeUser.email ||
        ""
    ) || "";

  if (role !== "employee" || !label) return null;

  return {
    value: label,
    label,
    email: safeText(safeUser.email, ""),
    role,
  };
}

/* =========================================================
   MAP CHILDREN
========================================================= */
function PolyLayer({ leaflet, poly, onReady }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && onReady) onReady(ref.current);
  }, [onReady]);

  if (!leaflet?.RL) return null;

  return (
    <leaflet.RL.Polygon
      ref={ref}
      positions={normalizeCoordsToPairs(poly?.coords || [])}
      pathOptions={{
        color: safeText(poly?.color, "#2563eb"),
        fillColor: safeText(poly?.color, "#2563eb"),
        fillOpacity: 0.25,
      }}
    />
  );
}

function CurrentLocationLayer({ leaflet, locateTick, onStatus, lang }) {
  const map = leaflet.RL.useMap();
  const [pos, setPos] = React.useState(null);

  React.useEffect(() => {
    if (!locateTick) return;
    if (!map) return;
    if (typeof window === "undefined") return;

    if (!("geolocation" in navigator)) {
      onStatus?.(
        lang === "en"
          ? "This device/browser does not support geolocation"
          : "อุปกรณ์/เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง"
      );
      return;
    }

    onStatus?.(
      lang === "en" ? "Finding current location..." : "กำลังหาตำแหน่งปัจจุบัน..."
    );

    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;
        const accuracy = p.coords.accuracy || 0;

        setPos({ lat, lng, accuracy });
        map.setView([lat, lng], Math.max(map.getZoom() || 16, 17), { animate: true });
        onStatus?.(lang === "en" ? "Location found" : "พบตำแหน่งแล้ว");
      },
      (err) => {
        onStatus?.(
          lang === "en"
            ? `Unable to get location: ${err?.message || ""}`
            : `ไม่สามารถหาตำแหน่งได้: ${err?.message || ""}`
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [locateTick, map, onStatus, lang]);

  if (!pos) return null;

  return (
    <>
      <leaflet.RL.Circle
        center={[pos.lat, pos.lng]}
        radius={pos.accuracy || 0}
        pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.12 }}
      />
      <leaflet.RL.CircleMarker
        center={[pos.lat, pos.lng]}
        radius={6}
        pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 1 }}
      />
    </>
  );
}

function FitPolygonBounds({ leaflet, coords }) {
  const map = leaflet.RL.useMap();

  useEffect(() => {
    const safeCoords = normalizeCoordsToPairs(coords);
    if (!map || safeCoords.length < 3) return;
    map.fitBounds(safeCoords, { padding: [20, 20] });
  }, [map, coords]);

  return null;
}

/* =========================================================
   PAGE
========================================================= */
export default function AddPlantingPlotsPage() {
  const router = useRouter();
  const leaflet = useLeafletBundle();
  const { t, lang } = useDuwimsT();

  const [mounted, setMounted] = useState(false);

  const [locateTick, setLocateTick] = useState(0);
  const [locateStatus, setLocateStatus] = useState("");

  const fgRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [plots, setPlots] = useState([]);
  const [selectedPlotId, setSelectedPlotId] = useState("");
  const [editMode, setEditMode] = useState(false);

  const [polygonsByPlot, setPolygonsByPlot] = useState({});

  const [plotAlias, setPlotAlias] = useState("");
  const [plotName, setPlotName] = useState("");
  const [caretaker, setCaretaker] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState([]);

  useEffect(() => setMounted(true), []);

  const selectedPlot = useMemo(
    () => plots.find((p) => String(p.id) === String(selectedPlotId)) || null,
    [plots, selectedPlotId]
  );

  const isReadOnly = !editMode;
  const plotPolygons = polygonsByPlot[selectedPlotId] || [];

  const mergedCaretakerOptions = useMemo(() => {
    const map = new Map();

    for (const item of employeeOptions || []) {
      const key = normalizeCaretaker(item?.value || item?.label || "");
      if (!key) continue;

      map.set(key, {
        value: key,
        label: normalizeCaretaker(item?.label || key) || key,
      });
    }

    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "th")
    );
  }, [employeeOptions]);

  const txt = {
    polygons: t("polygons", "การจัดการ Polygons"),
    backToManagement:
      lang === "en" ? "Back to management page" : "ย้อนกลับไปที่หน้า management",
    addPlot: t("addPlot", "+ เพิ่มแปลง"),
    deletePlot: t("deletePlot", "ลบแปลง"),
    selectPlot: t("selectPlot", "แปลง"),
    editMode: t(
      "editMode",
      "โหมดแก้ไข: สามารถวาด/แก้/ลบ polygon และจัดการข้อมูลได้"
    ),
    viewMode: t("viewMode", "โหมดดูข้อมูล: ต้องกด “ลบ / แก้ไข” ก่อน"),
    loading: t("loading", "กำลังโหลด..."),
    plotInfo: t("plotInfo", "ข้อมูลแปลงปลูก"),
    editDelete: t("editDelete", "ลบ / แก้ไข"),
    done: t("done", "เสร็จสิ้น"),
    drawOnMap: t("drawOnMap", "Draw Polygons on a Map"),
    myLocation: t("myLocation", "ตำแหน่งฉัน"),
    loadingMap: t("loadingMap", "กำลังโหลดแผนที่..."),
    noPolygon: t(
      "noPolygon",
      "ยังไม่มี polygon — เปิด “ลบ / แก้ไข” แล้ววาดบนแผนที่"
    ),
    plotDropdownName: t("plotDropdownName", "ชื่อที่แสดงในรายการแปลง (Dropdown)"),
    plotDetail: t("plotDetail", "ข้อมูลแปลงปลูก"),
    caretaker: t("caretaker", "ชื่อผู้ดูแล"),
    save: t("save", "บันทึก"),
    delete: t("delete", "ลบ"),
    noPlotYet:
      lang === "en"
        ? 'No plots yet — click "+ Add Plot" to start'
        : "ยังไม่มีแปลง — กด “+ เพิ่มแปลง” ได้เลย",
    alertTitle: lang === "en" ? "Alert" : "แจ้งเตือน",
    tokenHint:
      lang === "en"
        ? "* token key used: AUTH_TOKEN_V1"
        : "* token ใช้ key: AUTH_TOKEN_V1",
    displayNamePlaceholder: lang === "en" ? "Display name" : "ชื่อที่แสดง",
    plotNamePlaceholder: lang === "en" ? "Plot name" : "ชื่อแปลง",
    caretakerPlaceholder: lang === "en" ? "Select caretaker" : "เลือกผู้ดูแล",
    plantTypePlaceholder: lang === "en" ? "Plant type" : "ประเภทพืช",
    topicPlaceholder: lang === "en" ? "Topic" : "หัวข้อ",
    contentPlaceholder: lang === "en" ? "Type details..." : "พิมพ์รายละเอียด...",
    confirmDeletePlot:
      lang === "en"
        ? "Do you want to delete this plot completely?"
        : "ต้องการลบแปลงนี้ทั้งหมดใช่ไหม?",
    confirmDeletePolygon: lang === "en" ? "Delete this polygon?" : "ลบ polygon นี้?",
    lockDraw:
      lang === "en"
        ? '* Click "Edit / Delete" first to draw/edit/delete polygon'
        : '* ต้องกด “ลบ / แก้ไข” ก่อนถึงจะวาด/แก้/ลบ polygon ได้',
    deletePlotTitle:
      !editMode
        ? lang === "en"
          ? 'Click "Edit / Delete" first'
          : "กด “ลบ / แก้ไข” ก่อน"
        : lang === "en"
        ? "Delete this plot from the system"
        : "ลบแปลงนี้ออกจากระบบ",
    deleteOneTitle:
      !editMode
        ? lang === "en"
          ? 'Click "Edit / Delete" first'
          : "กด “ลบ / แก้ไข” ก่อน"
        : lang === "en"
        ? "Delete this polygon"
        : "ลบ polygon นี้",
    savePlotTitle:
      !editMode
        ? lang === "en"
          ? 'Click "Edit / Delete" first'
          : "กด “ลบ / แก้ไข” ก่อน"
        : lang === "en"
        ? "Save plot information"
        : "บันทึกข้อมูลแปลง",
    locateTitle:
      lang === "en"
        ? "Get current location and zoom to it"
        : "ขอตำแหน่งปัจจุบันและซูมไปยังจุดนั้น",
    saveUpper: "SAVE",
    plotWord: lang === "en" ? "Plot" : "แปลง",
    noCaretakerOptions:
      lang === "en" ? "No employee list found" : "ยังไม่พบรายชื่อผู้ดูแล",
  };

  const requireEditMode = (
    msg =
      lang === "en"
        ? 'Please click "Edit / Delete" first before doing this action'
        : "ต้องกด “ลบ / แก้ไข” ก่อนถึงจะทำรายการนี้ได้"
  ) => {
    if (editMode) return true;
    setErr(msg);
    return false;
  };

  async function loadEmployeeOptions() {
    try {
      const r = deepNormalize(await apiFetch("/api/users?role=employee"));
      const rawItems = Array.isArray(r?.items) ? r.items : [];

      const normalized = rawItems.map(normalizeEmployeeOption).filter(Boolean);

      const uniqueMap = new Map();

      for (const item of normalized) {
        const key = normalizeCaretaker(item.value);
        if (!key) continue;
        uniqueMap.set(key, {
          value: key,
          label: item.label || key,
        });
      }

      setEmployeeOptions(Array.from(uniqueMap.values()));
    } catch {
      setEmployeeOptions([]);
    }
  }

  async function loadPlots() {
    const r = deepNormalize(await apiFetch("/api/plots"));
    const items = (r?.items || []).map(normalizePlotItem);

    setPlots(items);

    const firstId = items?.[0]?.id || "";
    setSelectedPlotId((prev) => prev || firstId);

    return firstId || selectedPlotId || "";
  }

  async function loadPolygon(plotId) {
    if (!plotId) return;

    const r = deepNormalize(await apiFetch(`/api/plots/${plotId}/polygon`));
    const poly = normalizePolygonItem(r?.item || null, plotId);
    const items = poly ? [poly] : [];

    setPolygonsByPlot((prev) => ({ ...prev, [plotId]: items }));
  }

  async function loadAll() {
    setErr("");
    setLoading(true);

    try {
      await loadEmployeeOptions();
      const first = await loadPlots();
      const pid = first || selectedPlotId;
      if (pid) {
        await loadPolygon(pid);
      }
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!mounted) return;
    loadAll();
  }, [mounted]);

  useEffect(() => {
    if (!selectedPlotId) return;
    setEditMode(false);
    loadPolygon(selectedPlotId).catch(() => {});
  }, [selectedPlotId]);

  useEffect(() => {
    if (!selectedPlot) return;

    setPlotAlias(
      safeText(selectedPlot.alias || selectedPlot.plotName || selectedPlot.name || "", "")
    );
    setPlotName(safeText(selectedPlot.plotName || selectedPlot.name || "", ""));
    setCaretaker(() => {
      const fromPlot = normalizeCaretaker(selectedPlot.caretaker || selectedPlot.ownerName || "");
      return fromPlot || "";
    });
  }, [selectedPlot]);

  async function addPlot() {
    setErr("");
    setBusy(true);

    try {
      const baseName =
        lang === "en"
          ? `New Plot ${new Date().toISOString().slice(0, 10)}`
          : `แปลงใหม่ ${new Date().toISOString().slice(0, 10)}`;

      const r = deepNormalize(
        await apiFetch("/api/plots", {
          method: "POST",
          body: {
            plotName: baseName,
            name: baseName,
            alias: baseName,
            caretaker: "",
            ownerName: "",
            plantType: "",
            polygon: {
              color: "#2563eb",
              coords: [],
              pins: [],
            },
          },
        })
      );

      const created = r?.item ? normalizePlotItem(r.item) : null;

      if (created) {
        setPlots((prev) => [created, ...prev]);
        setSelectedPlotId(created.id);
        setPolygonsByPlot((prev) => ({ ...prev, [created.id]: [] }));
        setCaretaker(normalizeCaretaker(created.caretaker || created.ownerName || ""));
        setPlotAlias(safeText(created.alias || created.plotName || created.name || "", ""));
        setPlotName(safeText(created.plotName || created.name || "", ""));
        setEditMode(true);
      }
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function savePlotInfo() {
    if (!selectedPlotId) return;
    if (!editMode) {
      setErr(lang === "en" ? 'Please click "Edit / Delete" first' : "ต้องกด “ลบ / แก้ไข” ก่อน");
      return;
    }

    setErr("");
    setBusy(true);

    try {
      const safeAlias = String(plotAlias || "").trim();
      const safeCaretaker = String(caretaker || "").trim();

      const r = deepNormalize(
        await apiFetch(`/api/plots/${selectedPlotId}`, {
          method: "PATCH",
          body: {
            alias: safeAlias,
            caretaker: safeCaretaker,
            ownerName: safeCaretaker,
          },
        })
      );

      const updated = r?.item ? normalizePlotItem(r.item) : null;

      if (updated) {
        setPlots((prev) =>
          prev.map((p) => (String(p.id) === String(updated.id) ? updated : p))
        );

        setPlotAlias(safeText(updated.alias || updated.plotName || updated.name || "", ""));
        setCaretaker(normalizeCaretaker(updated.caretaker || updated.ownerName || ""));
      } else {
        setPlots((prev) =>
          prev.map((p) =>
            String(p.id) === String(selectedPlotId)
              ? {
                  ...p,
                  alias: safeAlias,
                  caretaker: safeCaretaker,
                  ownerName: safeCaretaker,
                }
              : p
          )
        );
      }

      setEditMode(false);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function deletePlot(plotId) {
    if (
      !requireEditMode(
        lang === "en"
          ? 'Please click "Edit / Delete" first before deleting a plot'
          : "ต้องกด “ลบ / แก้ไข” ก่อนถึงจะลบแปลงได้"
      )
    ) {
      return;
    }

    const pid = String(plotId || selectedPlotId || "");
    if (!pid) return;
    if (!confirm(txt.confirmDeletePlot)) return;

    setErr("");
    setBusy(true);

    try {
      await apiFetch(`/api/plots/${pid}`, { method: "DELETE" });

      const nextPlots = plots.filter((p) => String(p.id) !== pid);
      setPlots(nextPlots);

      setPolygonsByPlot((prev) => {
        const next = { ...prev };
        delete next[pid];
        return next;
      });

      setSelectedPlotId(nextPlots?.[0]?.id || "");
      setEditMode(false);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function putPolygon(coords, color = "#2563eb") {
    if (
      !requireEditMode(
        lang === "en"
          ? 'Please click "Edit / Delete" first before drawing a polygon'
          : "ต้องกด “ลบ / แก้ไข” ก่อนถึงจะวาด Polygon ได้"
      )
    ) {
      return;
    }

    if (!selectedPlotId) return;

    setErr("");
    setBusy(true);

    try {
      const safeCoords = normalizeCoordsToPairs(coords);

      const ring =
        safeCoords.length >= 3 &&
        (safeCoords[0][0] !== safeCoords.at(-1)?.[0] ||
          safeCoords[0][1] !== safeCoords.at(-1)?.[1])
          ? [...safeCoords, safeCoords[0]]
          : safeCoords;

      await apiFetch(`/api/plots/${selectedPlotId}/polygon`, {
        method: "PUT",
        body: {
          color,
          coords: ring,
        },
      });

      await loadPolygon(selectedPlotId);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function clearPolygon() {
    if (
      !requireEditMode(
        lang === "en"
          ? 'Please click "Edit / Delete" first before deleting a polygon'
          : "ต้องกด “ลบ / แก้ไข” ก่อนถึงจะลบ Polygon ได้"
      )
    ) {
      return;
    }

    if (!selectedPlotId) return;

    setErr("");
    setBusy(true);

    try {
      await apiFetch(`/api/plots/${selectedPlotId}/polygon`, {
        method: "PUT",
        body: {
          color: "#2563eb",
          coords: [],
        },
      });

      await loadPolygon(selectedPlotId);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function deletePolygon() {
    if (
      !requireEditMode(
        lang === "en"
          ? 'Please click "Edit / Delete" first before deleting a polygon'
          : "ต้องกด “ลบ / แก้ไข” ก่อนถึงจะลบ Polygon ได้"
      )
    ) {
      return;
    }

    if (!confirm(txt.confirmDeletePolygon)) return;
    await clearPolygon();
  }

  const onCreated = async (e) => {
    if (!editMode) {
      setErr(
        lang === "en"
          ? 'Please click "Edit / Delete" first before drawing a polygon'
          : "ต้องกด “ลบ / แก้ไข” ก่อนถึงจะวาด Polygon ได้"
      );
      return;
    }

    const layer = e?.layer;
    if (!layer) return;

    const latlngs = layer.getLatLngs?.();
    const pts = Array.isArray(latlngs) ? latlngs[0] : [];
    const coords = (pts || []).map((p) => [Number(p.lat), Number(p.lng)]);

    if (coords.length >= 3) {
      await putPolygon(coords, "#2563eb");
    }
  };

  const onEdited = async (e) => {
    if (!editMode) {
      setErr(
        lang === "en"
          ? 'Please click "Edit / Delete" first before editing a polygon'
          : "ต้องกด “ลบ / แก้ไข” ก่อนถึงจะแก้ไข Polygon ได้"
      );
      return;
    }

    const layers = e?.layers;
    if (!layers || !selectedPlotId) return;

    let updatedCoords = null;

    layers.eachLayer((layer) => {
      const latlngs = layer.getLatLngs?.();
      const pts = Array.isArray(latlngs) ? latlngs[0] : [];
      const coords = (pts || []).map((p) => [Number(p.lat), Number(p.lng)]);
      if (coords.length >= 3) updatedCoords = coords;
    });

    if (updatedCoords) {
      await putPolygon(updatedCoords, "#2563eb");
    }
  };

  const onDeleted = async () => {
    if (!editMode) {
      setErr(
        lang === "en"
          ? 'Please click "Edit / Delete" first before deleting a polygon'
          : "ต้องกด “ลบ / แก้ไข” ก่อนถึงจะลบ Polygon ได้"
      );
      return;
    }

    await clearPolygon();
  };

  const handlePolyLayerReady = () => {};

  const getPlotDisplayName = (p) => {
    const raw = p?.alias ?? p?.plotName ?? p?.name ?? "";
    return safeText(raw, txt.plotWord).trim() || txt.plotWord;
  };

  if (!mounted) return null;

  if (!leaflet) {
    return <div style={{ padding: 16 }}>{txt.loadingMap}</div>;
  }

  return (
    <div className="pui">
      <main className="pui-wrap pui-wrap-wide">
        <section className="pui-hero">
          <div className="pui-hero-top">
            <div className="pui-hero-left">
              <button
                type="button"
                className="pui-back"
                onClick={() => router.push("/management")}
                title={txt.backToManagement}
              >
                &lt;
              </button>
              <div className="pui-hero-title">{txt.polygons}</div>
            </div>
          </div>

          <div className="pui-hero-grid">
            <div className="pui-field">
              <div className="pui-label">{txt.selectPlot}</div>
              <select
                className="pui-select"
                value={selectedPlotId}
                onChange={(e) => setSelectedPlotId(e.target.value)}
                disabled={busy || loading || !plots.length}
              >
                {plots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {getPlotDisplayName(p)}
                  </option>
                ))}
              </select>

              <div className="pui-subhint">{editMode ? txt.editMode : txt.viewMode}</div>
            </div>
          </div>
        </section>

        {err && (
          <div className="pui-alert">
            <div className="pui-alert-title">{txt.alertTitle}</div>
            <div className="pui-alert-msg">{safeText(err, "Unknown error")}</div>
            <div className="pui-alert-hint">
              <span>{txt.tokenHint.split("AUTH_TOKEN_V1")[0]}</span>
              <b>AUTH_TOKEN_V1</b>
            </div>
          </div>
        )}

        {loading ? (
          <div className="pui-empty">{txt.loading}</div>
        ) : !plots.length ? (
          <div className="pui-empty">{txt.noPlotYet}</div>
        ) : (
          <section className="pui-card">
            <div className="pui-mapbox pui-mapbox-top">
              <div className="pui-map-title">{txt.drawOnMap}</div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0 10px" }}>
                <button
                  type="button"
                  className="pui-pill"
                  onClick={() => setLocateTick((x) => x + 1)}
                  disabled={!mounted}
                  title={txt.locateTitle}
                >
                  📍 {txt.myLocation}
                </button>

                {locateStatus ? <div style={{ fontSize: 12 }}>{safeText(locateStatus)}</div> : null}
              </div>

              <div className="pui-map pui-map-top">
                {!mounted || !leaflet?.RL ? (
                  <div className="pui-map-loading">{txt.loadingMap}</div>
                ) : (
                  <leaflet.RL.MapContainer
                    key={selectedPlotId || "map"}
                    center={[13.7563, 100.5018]}
                    zoom={13}
                    style={{ height: "100%", width: "100%" }}
                    preferCanvas={true}
                  >
                    <leaflet.RL.TileLayer
                      attribution="&copy; OpenStreetMap contributors"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <CurrentLocationLayer
                      leaflet={leaflet}
                      locateTick={locateTick}
                      onStatus={setLocateStatus}
                      lang={lang}
                    />

                    {!!plotPolygons?.[0]?.coords?.length && (
                      <FitPolygonBounds
                        leaflet={leaflet}
                        coords={plotPolygons?.[0]?.coords || []}
                      />
                    )}

                    <leaflet.RL.FeatureGroup ref={fgRef}>
                      {plotPolygons.map((poly) => (
                        <PolyLayer
                          leaflet={leaflet}
                          key={poly.id}
                          poly={poly}
                          onReady={handlePolyLayerReady}
                        />
                      ))}

                      <leaflet.Draw.EditControl
                        position="topright"
                        onCreated={onCreated}
                        onEdited={onEdited}
                        onDeleted={onDeleted}
                        draw={{
                          rectangle: false,
                          circle: false,
                          circlemarker: false,
                          marker: false,
                          polyline: false,
                          polygon: !isReadOnly && plotPolygons.length === 0,
                        }}
                        edit={{
                          edit: !isReadOnly && plotPolygons.length > 0,
                          remove: !isReadOnly && plotPolygons.length > 0,
                        }}
                      />
                    </leaflet.RL.FeatureGroup>
                  </leaflet.RL.MapContainer>
                )}
              </div>

              {!editMode && <div className="pui-lockhint">{txt.lockDraw}</div>}
            </div>

            <div className="pui-inline-section">
              <div className="pui-card-top pui-card-top-inline">
                <div className="pui-card-title">{txt.plotInfo}</div>

                <div className="pui-action-group">
                  <button
                    className="pui-hero-btn"
                    type="button"
                    onClick={addPlot}
                    disabled={busy}
                  >
                    {txt.addPlot}
                  </button>

                  <button
                    className="pui-hero-btn pui-hero-btn-danger"
                    type="button"
                    onClick={() => deletePlot(selectedPlotId)}
                    disabled={busy || !selectedPlotId || !plots.length || !editMode}
                    title={txt.deletePlotTitle}
                  >
                    🗑️ {txt.deletePlot}
                  </button>

                  {!editMode ? (
                    <button
                      className="pui-pill"
                      type="button"
                      onClick={() => {
                        setErr("");
                        setEditMode(true);
                      }}
                      disabled={busy}
                    >
                      {txt.editDelete}
                    </button>
                  ) : (
                    <button
                      className="pui-pill done"
                      type="button"
                      onClick={() => {
                        setErr("");
                        setEditMode(false);
                      }}
                      disabled={busy}
                    >
                      {txt.done}
                    </button>
                  )}
                </div>
              </div>

              {!plotPolygons.length ? (
                <div className="pui-empty" style={{ marginBottom: 12 }}>
                  {txt.noPolygon}
                </div>
              ) : (
                <div className="pui-polylist" style={{ marginBottom: 12 }}>
                  {plotPolygons.map((p) => (
                    <div className="pui-polyrow" key={p.id}>
                      <span className="pui-polynum"># polygon</span>
                      <span
                        className="pui-polychip"
                        style={{ background: safeText(p.color, "#2563eb") }}
                      />
                      <button
                        className="pui-danger small"
                        type="button"
                        onClick={() => deletePolygon()}
                        disabled={busy || !editMode}
                        title={txt.deleteOneTitle}
                      >
                        {txt.delete}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="pui-form-grid pui-form-grid-inline">
                <div className="pui-field">
                  <div className="pui-label-dark">{txt.plotDropdownName}</div>
                  <input
                    className="pui-input pui-input-short"
                    value={plotAlias}
                    onChange={(e) => setPlotAlias(e.target.value)}
                    placeholder={txt.displayNamePlaceholder}
                    disabled={busy}
                    readOnly={!editMode}
                  />
                </div>

                <div className="pui-field">
                  <div className="pui-label-dark">{txt.caretaker}</div>
                  <select
                    className="pui-select pui-input-short"
                    value={caretaker}
                    onChange={(e) => setCaretaker(e.target.value)}
                    disabled={busy || isReadOnly || !mergedCaretakerOptions.length}
                  >
                    {!caretaker && <option value="">{txt.caretakerPlaceholder}</option>}

                    {mergedCaretakerOptions.length ? (
                      mergedCaretakerOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {safeText(item.label, "")}
                        </option>
                      ))
                    ) : (
                      <option value="">{txt.noCaretakerOptions}</option>
                    )}
                  </select>
                </div>
              </div>

              {editMode && (
                <div className="pui-savewrap">
                  <button
                    className="pui-save"
                    type="button"
                    disabled={busy}
                    onClick={savePlotInfo}
                    title={txt.savePlotTitle}
                  >
                    {txt.saveUpper}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <style jsx global>{`
        html,
        body {
          margin: 0;
          background: #ffffff;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial,
            "Noto Sans Thai", "Noto Sans", sans-serif;
        }

        .pui-wrap {
          max-width: 860px;
          margin: 14px auto 44px;
          padding: 0 14px;
        }

        .pui-wrap-wide {
          max-width: 1280px;
        }

        .pui-hero {
          border-radius: 14px;
          padding: 14px;
          background: linear-gradient(135deg, #40b596, #676fc7);
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.12);
          margin-bottom: 14px;
        }

        .pui-hero-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .pui-hero-left {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .pui-back {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: rgba(255, 255, 255, 0.16);
          color: #fff;
          font-weight: 1000;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        .pui-back:hover {
          background: rgba(255, 255, 255, 0.22);
        }

        .pui-hero-title {
          color: #fff;
          font-weight: 900;
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pui-hero-btn {
          border: none;
          background: rgba(255, 255, 255, 0.9);
          color: rgba(0, 0, 0, 0.75);
          font-weight: 900;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 12px;
          cursor: pointer;
        }

        .pui-hero-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .pui-hero-btn-danger {
          background: rgba(255, 235, 235, 0.92);
          color: #991b1b;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }

        .pui-hero-btn-danger:hover {
          background: rgba(254, 226, 226, 0.98);
        }

        .pui-hero-btn-danger:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .pui-hero-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .pui-card {
          background: #dff6ef;
          border-radius: 18px;
          padding: 14px;
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.12);
          border: 1px solid rgba(0, 0, 0, 0.06);
        }

        .pui-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .pui-card-title {
          font-weight: 900;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.7);
        }

        .pui-action-group {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .pui-pill {
          border: none;
          background: rgba(255, 255, 255, 0.75);
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 999px;
          padding: 6px 10px;
          font-weight: 900;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.7);
          cursor: pointer;
        }

        .pui-pill:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .pui-pill.done {
          background: rgba(16, 185, 129, 0.2);
          border-color: rgba(16, 185, 129, 0.35);
          color: rgba(0, 0, 0, 0.72);
        }

        .pui-subhint {
          margin-top: 8px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.9);
          opacity: 0.95;
          padding-left: 6px;
        }

        .pui-inline-section {
          margin-top: 12px;
        }

        .pui-card-top-inline {
          margin-bottom: 12px;
        }

        .pui-form-grid-inline {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          align-items: end;
        }

        .pui-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .pui-field {
          min-width: 0;
        }

        .pui-label {
          font-size: 11px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.9);
          margin: 0 0 6px 6px;
        }

        .pui-label-dark {
          font-size: 11px;
          font-weight: 900;
          color: rgba(0, 0, 0, 0.6);
          margin: 0 0 6px 4px;
        }

        .pui-select,
        .pui-input,
        .pui-textarea {
          width: 100%;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 12px;
          padding: 11px 12px;
          font-size: 12px;
          outline: none;
          background: rgba(255, 255, 255, 0.95);
          box-sizing: border-box;
        }

        .pui-textarea {
          resize: vertical;
          min-height: 84px;
          line-height: 1.45;
        }

        .pui-input[readonly],
        .pui-textarea[readonly] {
          opacity: 0.9;
          background: rgba(255, 255, 255, 0.75);
        }

        .pui-input:focus,
        .pui-textarea:focus,
        .pui-select:focus {
          border-color: rgba(76, 99, 255, 0.55);
          box-shadow: 0 0 0 3px rgba(76, 99, 255, 0.14);
        }

        .pui-input-short {
          width: 260px;
          max-width: 100%;
        }

        .pui-datehint {
          font-size: 11px;
          color: rgba(0, 0, 0, 0.55);
          margin: 6px 0 0 6px;
        }

        .pui-notes-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
        }

        .pui-notes-title {
          font-weight: 1000;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.7);
          line-height: 1.2;
        }

        .pui-empty {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.55);
          background: rgba(255, 255, 255, 0.55);
          border: 1px dashed rgba(0, 0, 0, 0.12);
          border-radius: 12px;
          padding: 10px 12px;
        }

        .pui-notes-add {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px dashed rgba(0, 0, 0, 0.12);
        }

        .pui-mapbox {
          background: rgba(255, 255, 255, 0.55);
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 14px;
          padding: 12px;
        }

        .pui-map-title {
          font-weight: 900;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.7);
          margin-bottom: 8px;
        }

        .pui-map {
          height: 560px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: rgba(255, 255, 255, 0.8);
          position: relative;
        }

        .pui-mapbox-top {
          margin-bottom: 12px;
        }

        .pui-map-top {
          height: 260px;
        }

        .pui-map-loading {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.6);
        }

        .pui-polylist {
          margin-top: 10px;
          border-top: 1px dashed rgba(0, 0, 0, 0.18);
          padding-top: 10px;
          display: grid;
          gap: 8px;
        }

        .pui-polyrow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 12px;
          padding: 8px 10px;
        }

        .pui-polynum {
          font-weight: 900;
          color: rgba(0, 0, 0, 0.72);
          font-size: 12px;
        }

        .pui-polychip {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          border: 2px solid rgba(255, 255, 255, 0.95);
          box-shadow: 0 8px 14px rgba(0, 0, 0, 0.12);
        }

        .pui-danger {
          border: none;
          background: rgba(239, 68, 68, 0.14);
          color: #b91c1c;
          font-weight: 1000;
          padding: 8px 10px;
          border-radius: 999px;
          cursor: pointer;
          font-size: 12px;
        }

        .pui-danger:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .pui-danger.small {
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 14px;
          border-radius: 12px;
        }

        .pui-lockhint {
          margin-top: 8px;
          font-size: 11px;
          color: rgba(0, 0, 0, 0.55);
        }

        .pui-savewrap {
          display: flex;
          justify-content: center;
          margin-top: 12px;
        }

        .pui-save {
          width: 160px;
          border: none;
          border-radius: 8px;
          padding: 10px 12px;
          font-weight: 1000;
          color: #fff;
          background: linear-gradient(180deg, #5b7cff, #4c63ff);
          box-shadow: 0 14px 26px rgba(76, 99, 255, 0.25);
          cursor: pointer;
        }

        .pui-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .pui-plus {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: rgba(255, 255, 255, 0.85);
          font-weight: 1000;
          cursor: pointer;
        }

        .pui-plus:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .pui-after-date-block {
          margin-top: 14px;
        }

        .pui-mini-head {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          margin-bottom: 8px;
        }

        .pui-mini-list {
          display: grid;
          gap: 8px;
          margin-top: 8px;
        }

        .pui-item-card {
          background: rgba(255, 255, 255, 0.62);
          border: 1px solid rgba(0, 0, 0, 0.07);
          border-radius: 14px;
          padding: 12px;
        }

        .pui-item-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }

        .pui-item-title {
          font-weight: 1000;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.78);
          white-space: pre-wrap;
        }

        .pui-item-content {
          margin-top: 8px;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.7);
          white-space: pre-wrap;
          line-height: 1.45;
        }

        @media (max-width: 860px) {
          .pui-form-grid {
            grid-template-columns: 1fr;
          }

          .pui-form-grid-inline {
            grid-template-columns: 1fr;
          }

          .pui-input-short {
            width: 100%;
          }

          .pui-map-top {
            height: 340px;
          }
        }

        .pui-alert {
          border-radius: 14px;
          padding: 12px;
          margin: 10px 0 14px;
          background: linear-gradient(
            180deg,
            rgba(255, 235, 235, 0.95),
            rgba(255, 210, 210, 0.85)
          );
          border: 1px solid rgba(239, 68, 68, 0.25);
          box-shadow: 0 12px 22px rgba(0, 0, 0, 0.1);
        }

        .pui-alert-title {
          font-weight: 1000;
          font-size: 12px;
          color: rgba(127, 29, 29, 0.95);
          margin-bottom: 6px;
        }

        .pui-alert-msg {
          font-size: 12px;
          color: rgba(127, 29, 29, 0.9);
          line-height: 1.45;
          white-space: pre-wrap;
        }

        .pui-alert-hint {
          margin-top: 8px;
          font-size: 11px;
          color: rgba(127, 29, 29, 0.8);
        }
      `}</style>
    </div>
  );
}