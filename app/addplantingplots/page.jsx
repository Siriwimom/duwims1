"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDuwimsT } from "@/app/TopBar";

// --- ✅ Load react-leaflet + react-leaflet-draw in ONE client-side bundle ---
function useLeafletBundle() {
  const [bundle, setBundle] = useState(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const [RL, Draw, L] = await Promise.all([
        import("react-leaflet"),
        import("react-leaflet-draw"),
        import("leaflet"),
      ]);

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

      if (alive) setBundle({ RL, Draw });
    })();

    return () => {
      alive = false;
    };
  }, []);

  return bundle;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001").replace(
  /\/$/,
  ""
);

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
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error
      ? `${data.message || "Error"}: ${data.error}`
      : data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function isoToThai(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-");
  const yy = Number(y);
  if (!yy || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${yy + 543}`;
}

function formatDateTimeByLang(isoOrDate, lang = "th") {
  if (!isoOrDate) return "";
  const dt = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  try {
    if (lang === "en") {
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(dt);
    }

    return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(dt);
  } catch {
    return dt.toLocaleString(lang === "en" ? "en-US" : "th-TH", {
      hour12: false,
    });
  }
}

function normalizeCaretaker(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (s === "0") return "";
  if (s.toLowerCase() === "null") return "";
  if (s.toLowerCase() === "undefined") return "";
  return s;
}

function PolyLayer({ leaflet, poly, onReady }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && onReady) onReady(ref.current, poly.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poly?.id]);

  if (!leaflet?.RL) return null;

  return (
    <leaflet.RL.Polygon
      ref={ref}
      positions={poly.coords}
      pathOptions={{
        color: poly.color || "#2563eb",
        fillColor: poly.color || "#2563eb",
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

    onStatus?.(lang === "en" ? "Finding current location..." : "กำลังหาตำแหน่งปัจจุบัน...");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locateTick]);

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

export default function AddPlantingPlotsPage() {
  const router = useRouter();
  const leaflet = useLeafletBundle();
  const { t, lang } = useDuwimsT();

  const [mounted, setMounted] = useState(false);

  const [locateTick, setLocateTick] = useState(0);
  const [locateStatus, setLocateStatus] = useState("");

  const fgRef = useRef(null);
  const layerIdToPolyIdRef = useRef(new Map());

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [plots, setPlots] = useState([]);
  const [selectedPlotId, setSelectedPlotId] = useState("");
  const [editMode, setEditMode] = useState(false);

  const [polygonsByPlot, setPolygonsByPlot] = useState({});
  const [notesByPlot, setNotesByPlot] = useState({});
  const [savedNotesByPlot, setSavedNotesByPlot] = useState({});

  const [plotAlias, setPlotAlias] = useState("");
  const [plotName, setPlotName] = useState("");
  const [caretaker, setCaretaker] = useState("");
  const [currentNickname, setCurrentNickname] = useState("");
  const [plantType, setPlantType] = useState("");
  const [plantedAt, setPlantedAt] = useState("");

  useEffect(() => setMounted(true), []);

  const selectedPlot = useMemo(
    () => plots.find((p) => String(p.id) === String(selectedPlotId)) || null,
    [plots, selectedPlotId]
  );

  const isReadOnly = !editMode;
  const plotPolygons = polygonsByPlot[selectedPlotId] || [];
  const plotNotes = notesByPlot[selectedPlotId] || [];
  const savedNotes = savedNotesByPlot[selectedPlotId] || [];
  const latestSaved = savedNotes?.[0] || null;
  const effectiveCaretaker = normalizeCaretaker(caretaker) || normalizeCaretaker(currentNickname) || "";
  const makeLocalId = () => `snap_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const txt = {
    addPlantingPlots: t("addPlantingPlots", "จัดการแปลงปลูก"),
    polygons: t("polygons", "การจัดการ Polygons"),
    backToManagement:
      lang === "en"
        ? "Back to management page"
        : "ย้อนกลับไปที่หน้า management",
    addPlot: t("addPlot", "+ เพิ่มแปลง"),
    deletePlot: t("deletePlot", "ลบแปลง"),
    selectPlot: t("selectPlot", "แปลง"),
    editMode: t(
      "editMode",
      "โหมดแก้ไข: สามารถวาด/แก้/ลบ polygon และจัดการข้อมูลได้"
    ),
    viewMode: t(
      "viewMode",
      "โหมดดูข้อมูล: ต้องกด “ลบ / แก้ไข” ก่อน"
    ),
    loading: t("loading", "กำลังโหลด..."),
    plotInfo: t("plotInfo", "กรอกการจัดการข้อมูลแปลงปลูกพืช"),
    editDelete: t("editDelete", "ลบ / แก้ไข"),
    done: t("done", "เสร็จสิ้น"),
    drawOnMap: t("drawOnMap", "Draw Polygons on a Map"),
    myLocation: t("myLocation", "ตำแหน่งฉัน"),
    loadingMap: t("loadingMap", "กำลังโหลดแผนที่..."),
    polygonsOfPlot: t("polygonsOfPlot", "Polygons ของแปลง"),
    deleteAll: t("deleteAll", "ลบทั้งหมด"),
    noPolygon: t(
      "noPolygon",
      "ยังไม่มี polygon — เปิด “ลบ / แก้ไข” แล้ววาดบนแผนที่"
    ),
    plotDropdownName: t(
      "plotDropdownName",
      "ชื่อที่แสดงในรายการแปลง (Dropdown)"
    ),
    plotDetail: t("plotDetail", "ข้อมูลแปลงปลูก"),
    caretaker: t("caretaker", "ชื่อผู้ดูแล"),
    plantType: t("plantType", "ประเภทพืช"),
    plantedAt: t("plantedAt", "วันที่เริ่มปลูก"),
    addInfo: t("addInfo", "เพิ่มข้อมูล"),
    notes: t("notes", "เพิ่มข้อมูล (หัวข้อเรื่อง + เนื้อหา)"),
    noteTopic: t("noteTopic", "หัวข้อเรื่อง"),
    noteContent: t("noteContent", "เนื้อหา"),
    save: t("save", "บันทึก"),
    noItems: t("noItems", "ยังไม่มีรายการ"),
    noList: t("noList", "ยังไม่มีรายการ"),
    pleaseEditFirst: t("pleaseEditFirst", "ต้องกด “ลบ / แก้ไข” ก่อน"),
    noPlotYet:
      lang === "en"
        ? 'No plots yet — click "+ Add Plot" to start'
        : "ยังไม่มีแปลง — กด “+ เพิ่มแปลง” ได้เลย",
    alertTitle: lang === "en" ? "Alert" : "แจ้งเตือน",
    tokenHint:
      lang === "en"
        ? "* token key used: AUTH_TOKEN_V1"
        : "* token ใช้ key: AUTH_TOKEN_V1",
    displayNamePlaceholder: lang === "en" ? "Display name" : "ชื่อแสดง",
    plotNamePlaceholder: lang === "en" ? "Plot name" : "ชื่อแปลง",
    plantTypePlaceholder: lang === "en" ? "Plant type" : "ประเภทพืช",
    topicPlaceholder: lang === "en" ? "Topic" : "หัวข้อเรื่อง",
    contentPlaceholder: lang === "en" ? "Type details..." : "พิมพ์รายละเอียด...",
    allCount:
      lang === "en"
        ? `Plot Polygons (Total: ${plotPolygons.length})`
        : `Polygons ของแปลง (ทั้งหมด: ${plotPolygons.length})`,
    confirmDeletePlot:
      lang === "en"
        ? "Do you want to delete this plot completely? (including related polygons/notes)"
        : "ต้องการลบแปลงนี้ทั้งหมดใช่ไหม? (รวม polygons/notes ที่เกี่ยวข้อง)",
    confirmDeletePolygon:
      lang === "en" ? "Delete this polygon?" : "ลบ polygon นี้?",
    confirmDeleteAllPolygons:
      lang === "en"
        ? "Delete all polygons of this plot?"
        : "ลบ polygons ทั้งหมดของแปลงนี้?",
    confirmDeleteNote:
      lang === "en" ? "Delete this note?" : "ลบโน้ตนี้?",
    lockDraw:
      lang === "en"
        ? '* Click "Edit / Delete" first to draw/edit/delete polygons'
        : '* ต้องกด “ลบ / แก้ไข” ก่อนถึงจะวาด/แก้/ลบ polygon ได้',
    deletePlotTitle:
      !editMode
        ? lang === "en"
          ? 'Click "Edit / Delete" first'
          : "กด “ลบ / แก้ไข” ก่อน"
        : lang === "en"
        ? "Delete this plot from the system"
        : "ลบแปลงนี้ออกจากระบบ",
    deleteAllTitle:
      !editMode
        ? lang === "en"
          ? 'Click "Edit / Delete" first'
          : "กด “ลบ / แก้ไข” ก่อน"
        : lang === "en"
        ? "Delete all polygons in this plot"
        : "ลบ polygons ทั้งหมดของแปลงนี้",
    deleteOneTitle:
      !editMode
        ? lang === "en"
          ? 'Click "Edit / Delete" first'
          : "กด “ลบ / แก้ไข” ก่อน"
        : lang === "en"
        ? "Delete this polygon"
        : "ลบ polygon นี้",
    addItemTitle:
      !editMode
        ? lang === "en"
          ? 'Click "Edit / Delete" first'
          : "กด “ลบ / แก้ไข” ก่อน"
        : lang === "en"
        ? "Add item"
        : "เพิ่มรายการ",
    deleteItemTitle:
      !editMode
        ? lang === "en"
          ? 'Click "Edit / Delete" first'
          : "กด “ลบ / แก้ไข” ก่อน"
        : lang === "en"
        ? "Delete this item"
        : "ลบรายการนี้",
    saveTitle:
      !editMode
        ? lang === "en"
          ? 'Click "Edit / Delete" first'
          : "กด “ลบ / แก้ไข” ก่อน"
        : lang === "en"
        ? "Save"
        : "บันทึก",
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
    caretakerReadonlyTitle:
      lang === "en"
        ? "Caretaker is taken from the logged-in user and cannot be edited"
        : "ชื่อผู้ดูแลดึงจากผู้ใช้ที่ล็อกอิน และแก้ไขไม่ได้",
    dateDisplayPrefix: lang === "en" ? "Display:" : "แสดงผล:",
    saveUpper: lang === "en" ? "SAVE" : "SAVE",
    noListEdit:
      lang === "en"
        ? "No items yet — click + to add"
        : "ยังไม่มีรายการ — กด + เพื่อเพิ่ม",
    noListView:
      lang === "en"
        ? 'No items yet (click "Edit / Delete" first to add)'
        : "ยังไม่มีรายการ (กด “ลบ / แก้ไข” ก่อนถึงจะเพิ่มได้)",
    createTopicDefault: lang === "en" ? "Topic" : "หัวข้อเรื่อง",
    dash: "—",
    plotWord: lang === "en" ? "Plot" : "แปลง",
  };

  const requireEditMode = (
    msg = lang === "en"
      ? 'Please click "Edit / Delete" first before doing this action'
      : "ต้องกด “ลบ / แก้ไข” ก่อนถึงจะทำรายการนี้ได้"
  ) => {
    if (editMode) return true;
    setErr(msg);
    return false;
  };

  async function loadCurrentUserNickname() {
    try {
      const token = getToken();
      if (!token) return "";

      const data = await apiFetch("/me");
      const u = data?.user || {};
      const nick = normalizeCaretaker(u?.nickname || "");
      if (nick) {
        setCurrentNickname(nick);
        return nick;
      }
    } catch {
      // ignore
    }
    return "";
  }

  async function loadPlots() {
    const r = await apiFetch("/api/plots");
    const items = (r?.items || []).map((p) => ({ ...p, id: String(p.id || p._id) }));
    setPlots(items);
    const firstId = items?.[0]?.id || "";
    setSelectedPlotId((prev) => prev || firstId);
    return firstId || selectedPlotId || "";
  }

  async function loadPolygons(plotId) {
    const r = await apiFetch(`/api/plots/${plotId}/polygons`);
    const items = (r?.items || []).map((x) => ({
      id: String(x.id || x._id),
      polygonId: x.polygonId,
      color: x.color || "#2563eb",
      coords: x.coords || x.coordinates || [],
      createdAt: x.createdAt,
      updatedAt: x.updatedAt,
    }));
    setPolygonsByPlot((prev) => ({ ...prev, [plotId]: items }));
  }

  async function loadNotes(plotId) {
    const r = await apiFetch(`/api/plots/${plotId}/notes`);
    const items = (r?.items || []).map((n) => ({ ...n, id: String(n.id || n._id) }));
    setNotesByPlot((prev) => ({ ...prev, [plotId]: items }));
    setSavedNotesByPlot((prev) => ({ ...prev, [plotId]: prev[plotId] || [] }));
  }

  async function loadAll() {
    setErr("");
    setLoading(true);
    try {
      await loadCurrentUserNickname();
      const first = await loadPlots();
      const pid = first || selectedPlotId;
      if (pid) await Promise.all([loadPolygons(pid), loadNotes(pid)]);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!mounted) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => {
    if (!selectedPlotId) return;
    setEditMode(false);
    layerIdToPolyIdRef.current = new Map();
    Promise.all([loadPolygons(selectedPlotId), loadNotes(selectedPlotId)]).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlotId]);

  useEffect(() => {
    if (!selectedPlot) return;

    setPlotAlias(selectedPlot.alias || selectedPlot.plotName || selectedPlot.name || "");
    setPlotName(selectedPlot.plotName || selectedPlot.name || "");
    setCaretaker(() => {
      const fromPlot = normalizeCaretaker(selectedPlot.caretaker || selectedPlot.ownerName || "");
      const fromLogin = normalizeCaretaker(currentNickname || "");
      return fromPlot || fromLogin || "";
    });
    setPlantType(selectedPlot.plantType || selectedPlot.cropType || "");
    setPlantedAt(selectedPlot.plantedAt || "");
  }, [selectedPlot, currentNickname]);

  async function addPlot() {
    setErr("");
    setBusy(true);
    try {
      let nicknameToUse = normalizeCaretaker(currentNickname);
      if (!nicknameToUse) {
        nicknameToUse = await loadCurrentUserNickname();
      }

      const baseName =
        lang === "en"
          ? `New Plot ${new Date().toISOString().slice(0, 10)}`
          : `แปลงใหม่ ${new Date().toISOString().slice(0, 10)}`;

      const r = await apiFetch("/api/plots", {
        method: "POST",
        body: {
          plotName: baseName,
          name: baseName,
          alias: baseName,
          caretaker: nicknameToUse,
          ownerName: nicknameToUse,
          plantType: "",
          plantedAt: "",
        },
      });

      const created = r?.item ? { ...r.item, id: String(r.item.id || r.item._id) } : null;
      if (created) {
        setPlots((prev) => [created, ...prev]);
        setSelectedPlotId(created.id);
        setPolygonsByPlot((prev) => ({ ...prev, [created.id]: [] }));
        setNotesByPlot((prev) => ({ ...prev, [created.id]: [] }));
        setSavedNotesByPlot((prev) => ({ ...prev, [created.id]: [] }));
        setCaretaker(
          normalizeCaretaker(created.caretaker || created.ownerName || "") || nicknameToUse || ""
        );
        setEditMode(true);
      }
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function savePlotInfo() {
    if (!selectedPlotId) return;
    if (!requireEditMode()) return;

    setErr("");
    setBusy(true);
    try {
      const r = await apiFetch(`/api/plots/${selectedPlotId}`, {
        method: "PATCH",
        body: {
          plotName,
          name: plotName,
          alias: plotAlias || plotName,
          plantType,
          plantedAt,
        },
      });
      const updated = r?.item ? { ...r.item, id: String(r.item.id || r.item._id) } : null;
      if (updated) {
        setPlots((prev) =>
          prev.map((p) => (String(p.id) === String(updated.id) ? updated : p))
        );
      }
      setEditMode(false);
    } catch (e) {
      setErr(e.message || String(e));
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
    )
      return;

    const pid = String(plotId || selectedPlotId || "");
    if (!pid) return;
    if (!confirm(txt.confirmDeletePlot)) return;

    setErr("");
    setBusy(true);
    try {
      await apiFetch(`/api/plots/${pid}`, { method: "DELETE" });

      setPlots((prev) => prev.filter((p) => String(p.id) !== pid));
      setPolygonsByPlot((prev) => {
        const next = { ...prev };
        delete next[pid];
        return next;
      });
      setNotesByPlot((prev) => {
        const next = { ...prev };
        delete next[pid];
        return next;
      });
      setSavedNotesByPlot((prev) => {
        const next = { ...prev };
        delete next[pid];
        return next;
      });

      setSelectedPlotId((cur) => {
        const remaining = plots.filter((p) => String(p.id) !== pid);
        const nextId = remaining?.[0]?.id || "";
        return cur === pid ? nextId : cur;
      });

      setEditMode(false);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function createPolygon(coords, color = "#2563eb") {
    if (
      !requireEditMode(
        lang === "en"
          ? 'Please click "Edit / Delete" first before drawing a polygon'
          : "ต้องกด “ลบ / แก้ไข” ก่อนถึงจะวาด Polygon ได้"
      )
    )
      return;
    if (!selectedPlotId) return;

    setErr("");
    setBusy(true);
    try {
      const ring =
        coords.length >= 3 &&
        (coords[0][0] !== coords.at(-1)[0] || coords[0][1] !== coords.at(-1)[1])
          ? [...coords, coords[0]]
          : coords;

      await apiFetch(`/api/plots/${selectedPlotId}/polygons`, {
        method: "POST",
        body: { coords: ring, coordinates: ring, color },
      });

      await loadPolygons(selectedPlotId);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function updatePolygon(polygonDbId, coords, color) {
    if (
      !requireEditMode(
        lang === "en"
          ? 'Please click "Edit / Delete" first before editing a polygon'
          : "ต้องกด “ลบ / แก้ไข” ก่อนถึงจะแก้ไข Polygon ได้"
      )
    )
      return;

    setErr("");
    setBusy(true);
    try {
      const ring =
        coords.length >= 3 &&
        (coords[0][0] !== coords.at(-1)[0] || coords[0][1] !== coords.at(-1)[1])
          ? [...coords, coords[0]]
          : coords;

      await apiFetch(`/api/polygons/${polygonDbId}`, {
        method: "PATCH",
        body: { coords: ring, coordinates: ring, ...(color ? { color } : {}) },
      });
      await loadPolygons(selectedPlotId);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function deletePolygon(polygonDbId) {
    if (
      !requireEditMode(
        lang === "en"
          ? 'Please click "Edit / Delete" first before deleting a polygon'
          : "ต้องกด “ลบ / แก้ไข” ก่อนถึงจะลบ Polygon ได้"
      )
    )
      return;
    if (!confirm(txt.confirmDeletePolygon)) return;

    setErr("");
    setBusy(true);
    try {
      await apiFetch(`/api/polygons/${polygonDbId}`, { method: "DELETE" });
      await loadPolygons(selectedPlotId);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function deleteAllPolygonsOfPlot() {
    if (
      !requireEditMode(
        lang === "en"
          ? 'Please click "Edit / Delete" first before deleting all polygons'
          : "ต้องกด “ลบ / แก้ไข” ก่อนถึงจะลบ Polygon ทั้งหมดได้"
      )
    )
      return;
    if (!selectedPlotId) return;
    if (!confirm(txt.confirmDeleteAllPolygons)) return;

    setErr("");
    setBusy(true);
    try {
      await apiFetch(`/api/plots/${selectedPlotId}/polygons`, { method: "DELETE" });
      await loadPolygons(selectedPlotId);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
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
      await createPolygon(coords, "#2563eb");
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
    if (!layers) return;

    const jobs = [];
    layers.eachLayer((layer) => {
      const lid = layer?._leaflet_id;
      const polyDbId = layerIdToPolyIdRef.current.get(lid);
      if (!polyDbId) return;

      const latlngs = layer.getLatLngs?.();
      const pts = Array.isArray(latlngs) ? latlngs[0] : [];
      const coords = (pts || []).map((p) => [Number(p.lat), Number(p.lng)]);
      if (coords.length >= 3) jobs.push(updatePolygon(polyDbId, coords));
    });

    if (jobs.length) await Promise.all(jobs);
  };

  const onDeleted = async (e) => {
    if (!editMode) {
      setErr(
        lang === "en"
          ? 'Please click "Edit / Delete" first before deleting a polygon'
          : "ต้องกด “ลบ / แก้ไข” ก่อนถึงจะลบ Polygon ได้"
      );
      return;
    }
    const layers = e?.layers;
    if (!layers) return;

    const jobs = [];
    layers.eachLayer((layer) => {
      const lid = layer?._leaflet_id;
      const polyDbId = layerIdToPolyIdRef.current.get(lid);
      if (polyDbId) jobs.push(apiFetch(`/api/polygons/${polyDbId}`, { method: "DELETE" }));
    });

    if (!jobs.length) return;

    setErr("");
    setBusy(true);
    try {
      await Promise.all(jobs);
      await loadPolygons(selectedPlotId);
    } catch (e2) {
      setErr(e2.message || String(e2));
    } finally {
      setBusy(false);
    }
  };

  const handlePolyLayerReady = (layer, polygonDbId) => {
    const lid = layer?._leaflet_id;
    if (!lid) return;
    layerIdToPolyIdRef.current.set(lid, polygonDbId);
  };

  async function addNote() {
    if (
      !requireEditMode(
        lang === "en"
          ? 'Please click "Edit / Delete" first before adding information'
          : "ต้องกด “ลบ / แก้ไข” ก่อนถึงจะเพิ่มข้อมูลได้"
      )
    )
      return;
    if (!selectedPlotId) return;

    setErr("");
    setBusy(true);
    try {
      const r = await apiFetch(`/api/plots/${selectedPlotId}/notes`, {
        method: "POST",
        body: { topic: txt.createTopicDefault, content: "" },
      });
      const item = r?.item ? { ...r.item, id: String(r.item.id || r.item._id) } : null;
      if (item) {
        setNotesByPlot((prev) => ({
          ...prev,
          [selectedPlotId]: [item, ...(prev[selectedPlotId] || [])],
        }));
      }
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveNote(noteId, patch) {
    if (
      !requireEditMode(
        lang === "en"
          ? 'Please click "Edit / Delete" first before saving information'
          : "ต้องกด “ลบ / แก้ไข” ก่อนถึงจะบันทึกข้อมูลได้"
      )
    )
      return;

    setErr("");
    setBusy(true);
    try {
      const r = await apiFetch(`/api/notes/${noteId}`, { method: "PATCH", body: patch });
      const item = r?.item ? { ...r.item, id: String(r.item.id || r.item._id) } : null;

      if (item) {
        setNotesByPlot((prev) => ({
          ...prev,
          [selectedPlotId]: (prev[selectedPlotId] || []).map((n) =>
            String(n.id) === String(item.id) ? item : n
          ),
        }));

        const snapTopic = (item.topic || "").trim();
        const snapContent = (item.content || "").trim();

        setSavedNotesByPlot((prev) => {
          const cur = prev[selectedPlotId] || [];
          const next = [
            {
              id: makeLocalId(),
              topic: snapTopic || txt.dash,
              content: snapContent || txt.dash,
              createdAt: new Date().toISOString(),
            },
            ...cur,
          ];
          return { ...prev, [selectedPlotId]: next };
        });

        setNotesByPlot((prev) => ({
          ...prev,
          [selectedPlotId]: (prev[selectedPlotId] || []).filter((n) => String(n.id) !== String(noteId)),
        }));
      }
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function deleteNote(noteId) {
    if (
      !requireEditMode(
        lang === "en"
          ? 'Please click "Edit / Delete" first before deleting information'
          : "ต้องกด “ลบ / แก้ไข” ก่อนถึงจะลบข้อมูลได้"
      )
    )
      return;
    if (!confirm(txt.confirmDeleteNote)) return;

    setErr("");
    setBusy(true);
    try {
      await apiFetch(`/api/notes/${noteId}`, { method: "DELETE" });
      setNotesByPlot((prev) => ({
        ...prev,
        [selectedPlotId]: (prev[selectedPlotId] || []).filter((n) => String(n.id) !== String(noteId)),
      }));
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  const getPlotDisplayName = (p) => {
    const nameText = (p?.alias || p?.plotName || p?.name || "").trim();
    return nameText || txt.plotWord;
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

            <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <button className="pui-hero-btn" type="button" onClick={addPlot} disabled={busy}>
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

              <div className="pui-subhint">
                {editMode ? txt.editMode : txt.viewMode}
              </div>
            </div>
          </div>
        </section>

        {err && (
          <div className="pui-alert">
            <div className="pui-alert-title">{txt.alertTitle}</div>
            <div className="pui-alert-msg">{err}</div>
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
            <div className="pui-card-top">
              <div className="pui-card-title">{txt.plotInfo}</div>

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
                <button className="pui-pill done" type="button" onClick={savePlotInfo} disabled={busy}>
                  {txt.done}
                </button>
              )}
            </div>

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

                {locateStatus ? <div style={{ fontSize: 12 }}>{locateStatus}</div> : null}
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

                    <leaflet.RL.FeatureGroup ref={fgRef}>
                      {plotPolygons.map((poly) => (
                        <PolyLayer leaflet={leaflet} key={poly.id} poly={poly} onReady={handlePolyLayerReady} />
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
                          polygon: !isReadOnly,
                        }}
                        edit={{
                          edit: !isReadOnly,
                          remove: !isReadOnly,
                        }}
                      />
                    </leaflet.RL.FeatureGroup>
                  </leaflet.RL.MapContainer>
                )}
              </div>

              {!editMode && <div className="pui-lockhint">{txt.lockDraw}</div>}
            </div>

            <div className="pui-notes-add" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
              <div className="pui-notes-head">
                <div className="pui-notes-title">{txt.allCount}</div>

                <button
                  className="pui-danger small"
                  type="button"
                  onClick={deleteAllPolygonsOfPlot}
                  disabled={busy || !selectedPlotId || !editMode}
                  title={txt.deleteAllTitle}
                >
                  {txt.deleteAll}
                </button>
              </div>

              {!plotPolygons.length ? (
                <div className="pui-empty">{txt.noPolygon}</div>
              ) : (
                <div className="pui-polylist">
                  {plotPolygons.map((p) => (
                    <div className="pui-polyrow" key={p.id}>
                      <span className="pui-polynum"># {p.id.slice(-6)}</span>
                      <span className="pui-polychip" style={{ background: p.color || "#2563eb" }} />
                      <button
                        className="pui-danger small"
                        type="button"
                        onClick={() => deletePolygon(p.id)}
                        disabled={busy || !editMode}
                        title={txt.deleteOneTitle}
                      >
                        {txt.delete}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pui-formbox">
              <div className="pui-form-grid">
                <div className="pui-field">
                  <div className="pui-label-dark">{txt.plotDropdownName}</div>
                  {latestSaved?.topic ? <div className="pui-topnote">{latestSaved.topic}</div> : null}
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
                  <div className="pui-label-dark">{txt.plotDetail}</div>
                  <input
                    className="pui-input pui-input-short"
                    value={plotName}
                    onChange={(e) => setPlotName(e.target.value)}
                    placeholder={txt.plotNamePlaceholder}
                    readOnly={isReadOnly}
                    disabled={busy}
                  />

                  {latestSaved?.content ? (
                    <div className="pui-compactbox">
                      <div className="pui-compacttext">{latestSaved.content}</div>
                      <div className="pui-compacttime">
                        {formatDateTimeByLang(latestSaved.createdAt, lang)}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="pui-field">
                  <div className="pui-label-dark">{txt.caretaker}</div>
                  <select
                    className="pui-input pui-input-short"
                    value={effectiveCaretaker}
                    disabled={false}
                    onChange={() => {}}
                    aria-readonly="true"
                    title={txt.caretakerReadonlyTitle}
                  >
                    <option value={effectiveCaretaker}>{effectiveCaretaker || "-"}</option>
                  </select>
                </div>

                <div className="pui-field">
                  <div className="pui-label-dark">{txt.plantType}</div>
                  <input
                    className="pui-input pui-input-short"
                    value={plantType}
                    onChange={(e) => setPlantType(e.target.value)}
                    placeholder={txt.plantTypePlaceholder}
                    readOnly={isReadOnly}
                    disabled={busy}
                  />
                </div>

                <div className="pui-field">
                  <div className="pui-label-dark">{txt.plantedAt}</div>
                  <input
                    className="pui-input pui-input-short"
                    type="date"
                    value={plantedAt || ""}
                    onChange={(e) => setPlantedAt(e.target.value)}
                    readOnly={isReadOnly}
                    disabled={busy || isReadOnly}
                  />
                  {plantedAt && (
                    <div className="pui-datehint">
                      {txt.dateDisplayPrefix} {isoToThai(plantedAt)}
                    </div>
                  )}
                </div>
              </div>

              {savedNotes.length > 0 && (
                <div className="pui-inline-saved">
                  {savedNotes.map((n) => (
                    <div className="pui-snap" key={n.id}>
                      <div className="pui-snap-topic">{n.topic || txt.dash}</div>
                      <div className="pui-snap-content">{n.content || txt.dash}</div>
                      <div className="pui-snap-time">
                        {formatDateTimeByLang(n.createdAt, lang)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pui-notes-add">
                <div className="pui-notes-head">
                  <div className="pui-notes-title">{txt.notes}</div>

                  <div className="pui-notes-actions">
                    <button
                      className="pui-plus"
                      type="button"
                      onClick={addNote}
                      disabled={busy || !selectedPlotId || !editMode}
                      title={txt.addItemTitle}
                    >
                      +
                    </button>
                  </div>
                </div>

                {!plotNotes.length ? (
                  <div className="pui-empty">
                    {editMode ? txt.noListEdit : txt.noListView}
                  </div>
                ) : (
                  <div className="pui-notes-list">
                    {plotNotes.map((n) => (
                      <div className="pui-note" key={n.id}>
                        <div className="pui-note-row">
                          <div className="pui-note-col">
                            <div className="pui-label-dark">{txt.noteTopic}</div>
                            <input
                              className="pui-input"
                              value={n.topic || ""}
                              onChange={(e) => {
                                if (!editMode) return;
                                const v = e.target.value;
                                setNotesByPlot((prev) => ({
                                  ...prev,
                                  [selectedPlotId]: (prev[selectedPlotId] || []).map((x) =>
                                    String(x.id) === String(n.id) ? { ...x, topic: v } : x
                                  ),
                                }));
                              }}
                              disabled={busy || !editMode}
                              readOnly={!editMode}
                              placeholder={txt.topicPlaceholder}
                            />
                          </div>

                          <button
                            className="pui-danger small"
                            type="button"
                            onClick={() => deleteNote(n.id)}
                            disabled={busy || !editMode}
                            title={txt.deleteItemTitle}
                          >
                            {txt.delete}
                          </button>
                        </div>

                        <div className="pui-note-col">
                          <div className="pui-label-dark">{txt.noteContent}</div>
                          <textarea
                            className="pui-textarea"
                            rows={3}
                            value={n.content || ""}
                            onChange={(e) => {
                              if (!editMode) return;
                              const v = e.target.value;
                              setNotesByPlot((prev) => ({
                                ...prev,
                                [selectedPlotId]: (prev[selectedPlotId] || []).map((x) =>
                                  String(x.id) === String(n.id) ? { ...x, content: v } : x
                                ),
                              }));
                            }}
                            disabled={busy || !editMode}
                            readOnly={!editMode}
                            placeholder={txt.contentPlaceholder}
                          />
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                          <button
                            className="pui-save-mini"
                            type="button"
                            onClick={() => saveNote(n.id, { topic: n.topic, content: n.content })}
                            disabled={busy || !editMode}
                            title={txt.saveTitle}
                          >
                            {txt.save}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pui-savewrap">
                <button
                  className="pui-save"
                  type="button"
                  disabled={!editMode || busy}
                  onClick={savePlotInfo}
                  title={txt.savePlotTitle}
                >
                  {txt.saveUpper}
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      <style jsx global>{`
        html,
        body {
          margin: 0;
          background: #ffffff;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans Thai",
            "Noto Sans", sans-serif;
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

        .pui-formbox {
          background: #fff1d8;
          border-radius: 14px;
          padding: 12px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          margin-bottom: 12px;
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
        .pui-input {
          width: 100%;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 12px;
          padding: 11px 12px;
          font-size: 12px;
          outline: none;
          background: rgba(255, 255, 255, 0.95);
          box-sizing: border-box;
        }

        .pui-input[readonly],
        .pui-textarea[readonly] {
          opacity: 0.9;
          background: rgba(255, 255, 255, 0.75);
        }

        .pui-input:focus,
        .pui-textarea:focus {
          border-color: rgba(76, 99, 255, 0.55);
          box-shadow: 0 0 0 3px rgba(76, 99, 255, 0.14);
        }

        .pui-input-short {
          width: 260px;
          max-width: 100%;
        }

        .pui-topnote {
          font-weight: 1000;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.75);
          margin: 0 0 6px 6px;
        }

        .pui-compactbox {
          margin-top: 8px;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: rgba(255, 255, 255, 0.85);
          padding: 8px 10px;
        }
        .pui-compacttext {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.72);
          white-space: pre-wrap;
          line-height: 1.35;
        }
        .pui-compacttime {
          margin-top: 6px;
          font-size: 11px;
          color: rgba(0, 0, 0, 0.5);
          white-space: nowrap;
        }

        .pui-datehint {
          font-size: 11px;
          color: rgba(0, 0, 0, 0.55);
          margin: 6px 0 0 6px;
        }

        .pui-textarea {
          width: 100%;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 12px;
          padding: 11px 12px;
          font-size: 12px;
          outline: none;
          background: rgba(255, 255, 255, 0.95);
          resize: vertical;
          min-height: 84px;
          line-height: 1.45;
          box-sizing: border-box;
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
        .pui-notes-actions {
          display: inline-flex;
          align-items: center;
          gap: 8px;
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
        .pui-save-mini {
          border: none;
          border-radius: 12px;
          height: 38px;
          padding: 0 14px;
          font-weight: 1000;
          font-size: 12px;
          cursor: pointer;
          color: #fff;
          background: linear-gradient(180deg, #5b7cff, #4c63ff);
          box-shadow: 0 10px 18px rgba(76, 99, 255, 0.22);
          display: inline-flex;
          align-items: center;
        }
        .pui-save-mini:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .pui-notes-list {
          display: grid;
          gap: 10px;
        }
        .pui-note {
          background: rgba(255, 255, 255, 0.62);
          border: 1px solid rgba(0, 0, 0, 0.07);
          border-radius: 14px;
          padding: 12px;
        }
        .pui-note-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: end;
          margin-bottom: 10px;
        }
        .pui-note-col {
          min-width: 0;
        }

        .pui-empty {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.55);
          background: rgba(255, 255, 255, 0.55);
          border: 1px dashed rgba(0, 0, 0, 0.12);
          border-radius: 12px;
          padding: 10px 12px;
        }

        .pui-inline-saved {
          margin-top: 12px;
          display: grid;
          gap: 10px;
        }
        .pui-snap {
          background: rgba(255, 255, 255, 0.62);
          border: 1px solid rgba(0, 0, 0, 0.07);
          border-radius: 14px;
          padding: 10px 12px;
        }
        .pui-snap-topic {
          font-weight: 1000;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.78);
          margin-bottom: 6px;
          white-space: pre-wrap;
        }
        .pui-snap-content {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.7);
          white-space: pre-wrap;
          line-height: 1.45;
        }
        .pui-snap-time {
          margin-top: 8px;
          font-size: 11px;
          color: rgba(0, 0, 0, 0.5);
          white-space: nowrap;
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

        @media (max-width: 860px) {
          .pui-form-grid {
            grid-template-columns: 1fr;
          }
          .pui-input-short {
            width: 100%;
          }
          .pui-map-top {
            height: 340px;
          }
        }

        @media (max-width: 520px) {
          .pui-note-row {
            grid-template-columns: 1fr;
            align-items: stretch;
          }
          .pui-danger.small {
            width: 100%;
            height: 38px;
          }
          .pui-notes-actions {
            width: 100%;
            justify-content: flex-end;
          }
        }

        .pui-alert {
          border-radius: 14px;
          padding: 12px;
          margin: 10px 0 14px;
          background: linear-gradient(180deg, rgba(255, 235, 235, 0.95), rgba(255, 210, 210, 0.85));
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