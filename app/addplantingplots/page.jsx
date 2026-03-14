"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDuwimsT } from "@/app/TopBar";

// --- ✅ Load react-leaflet first, set window.L, then load leaflet-draw ---
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

function normalizeCaretaker(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (s === "0") return "";
  if (s.toLowerCase() === "null") return "";
  if (s.toLowerCase() === "undefined") return "";
  return s;
}

function normalizeTopicItem(item = {}, index = 0) {
  return {
    id: String(item._id || item.id || `topic_${index}`),
    topic: String(item.topic || "").trim(),
    content: String(item.description || item.content || "").trim(),
  };
}

function PolyLayer({ leaflet, poly, onReady }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && onReady) onReady(ref.current);
  }, [onReady]);

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
  const [extraItemsByPlot, setExtraItemsByPlot] = useState({});

  const [plotAlias, setPlotAlias] = useState("");
  const [plotName, setPlotName] = useState("");
  const [caretaker, setCaretaker] = useState("");
  const [currentNickname, setCurrentNickname] = useState("");
  const [plantType, setPlantType] = useState("");
  const [plantedAt, setPlantedAt] = useState("");

  const [newTopic, setNewTopic] = useState("");
  const [newContent, setNewContent] = useState("");

  useEffect(() => setMounted(true), []);

  const selectedPlot = useMemo(
    () => plots.find((p) => String(p.id) === String(selectedPlotId)) || null,
    [plots, selectedPlotId]
  );

  const isReadOnly = !editMode;
  const plotPolygons = polygonsByPlot[selectedPlotId] || [];
  const extraItems = extraItemsByPlot[selectedPlotId] || [];

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
    plotInfo: t("plotInfo", "กรอกการจัดการข้อมูลแปลงปลูกพืช"),
    editDelete: t("editDelete", "ลบ / แก้ไข"),
    done: t("done", "เสร็จสิ้น"),
    drawOnMap: t("drawOnMap", "Draw Polygons on a Map"),
    myLocation: t("myLocation", "ตำแหน่งฉัน"),
    loadingMap: t("loadingMap", "กำลังโหลดแผนที่..."),
    deleteAll: t("deleteAll", "ลบทั้งหมด"),
    noPolygon: t(
      "noPolygon",
      "ยังไม่มี polygon — เปิด “ลบ / แก้ไข” แล้ววาดบนแผนที่"
    ),
    plotDropdownName: t("plotDropdownName", "ชื่อที่แสดงในรายการแปลง (Dropdown)"),
    plotDetail: t("plotDetail", "ข้อมูลแปลงปลูก"),
    caretaker: t("caretaker", "ชื่อผู้ดูแล"),
    plantType: t("plantType", "ประเภทพืช"),
    plantedAt: t("plantedAt", "วันที่เริ่มปลูก"),
    topic: lang === "en" ? "Topic" : "หัวข้อ",
    content: lang === "en" ? "Details" : "รายละเอียด",
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
    displayNamePlaceholder: lang === "en" ? "Display name" : "ชื่อแสดง",
    plotNamePlaceholder: lang === "en" ? "Plot name" : "ชื่อแปลง",
    caretakerPlaceholder: lang === "en" ? "Caretaker name" : "ชื่อผู้ดูแล",
    plantTypePlaceholder: lang === "en" ? "Plant type" : "ประเภทพืช",
    topicPlaceholder: lang === "en" ? "Topic" : "หัวข้อ",
    contentPlaceholder: lang === "en" ? "Type details..." : "พิมพ์รายละเอียด...",
    allCount:
      lang === "en"
        ? `Plot Polygon ${plotPolygons.length ? "(1)" : "(0)"}`
        : `Polygon ของแปลง ${plotPolygons.length ? "(1)" : "(0)"}`,
    confirmDeletePlot:
      lang === "en"
        ? "Do you want to delete this plot completely?"
        : "ต้องการลบแปลงนี้ทั้งหมดใช่ไหม?",
    confirmDeletePolygon: lang === "en" ? "Delete this polygon?" : "ลบ polygon นี้?",
    confirmDeleteAllPolygons:
      lang === "en"
        ? "Delete the polygon of this plot?"
        : "ลบ polygon ของแปลงนี้?",
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
    deleteAllTitle:
      !editMode
        ? lang === "en"
          ? 'Click "Edit / Delete" first'
          : "กด “ลบ / แก้ไข” ก่อน"
        : lang === "en"
        ? "Delete polygon in this plot"
        : "ลบ polygon ของแปลงนี้",
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
    dateDisplayPrefix: lang === "en" ? "Display:" : "แสดงผล:",
    saveUpper: "SAVE",
    miniAddTitle: lang === "en" ? "Add item" : "เพิ่มรายการ",
    miniEmpty:
      lang === "en"
        ? "No items yet — click + to add"
        : "ยังไม่มีรายการ — กด + เพื่อเพิ่ม",
    plotWord: lang === "en" ? "Plot" : "แปลง",
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

  async function loadCurrentUserNickname() {
    try {
      const token = getToken();
      if (!token) return "";

      const data = await apiFetch("/auth/me");
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

  async function loadPolygon(plotId) {
    if (!plotId) return;

    const r = await apiFetch(`/api/plots/${plotId}/polygon`);
    const poly = r?.item || null;

    const items =
      poly && Array.isArray(poly.coords) && poly.coords.length
        ? [
            {
              id: String(poly._id || plotId),
              color: poly.color || "#2563eb",
              coords: poly.coords || [],
            },
          ]
        : [];

    setPolygonsByPlot((prev) => ({ ...prev, [plotId]: items }));
  }

  async function loadTopics(plotId) {
    if (!plotId) return;

    const r = await apiFetch(`/api/plots/${plotId}/topics`);
    const items = (r?.items || []).map((x, i) => normalizeTopicItem(x, i));
    setExtraItemsByPlot((prev) => ({ ...prev, [plotId]: items }));
  }

  async function loadAll() {
    setErr("");
    setLoading(true);
    try {
      await loadCurrentUserNickname();
      const first = await loadPlots();
      const pid = first || selectedPlotId;
      if (pid) {
        await Promise.all([loadPolygon(pid), loadTopics(pid)]);
      }
    } catch (e) {
      setErr(e.message || String(e));
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
    setNewTopic("");
    setNewContent("");
    Promise.all([loadPolygon(selectedPlotId), loadTopics(selectedPlotId)]).catch(() => {});
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

  function addExtraItem() {
    if (!editMode) {
      setErr(lang === "en" ? 'Please click "Edit / Delete" first' : "ต้องกด “ลบ / แก้ไข” ก่อน");
      return;
    }

    if (!selectedPlotId) return;
    if (!newTopic.trim() && !newContent.trim()) return;

    setExtraItemsByPlot((prev) => ({
      ...prev,
      [selectedPlotId]: [
        {
          id: `tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          topic: newTopic.trim(),
          content: newContent.trim(),
        },
        ...(prev[selectedPlotId] || []),
      ],
    }));

    setNewTopic("");
    setNewContent("");
  }

  function deleteExtraItem(itemId) {
    if (!editMode) {
      setErr(lang === "en" ? 'Please click "Edit / Delete" first' : "ต้องกด “ลบ / แก้ไข” ก่อน");
      return;
    }

    setExtraItemsByPlot((prev) => ({
      ...prev,
      [selectedPlotId]: (prev[selectedPlotId] || []).filter(
        (x) => String(x.id) !== String(itemId)
      ),
    }));
  }

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
          topics: [],
          polygon: { color: "#2563eb", coords: [], pins: [] },
        },
      });

      const created = r?.item ? { ...r.item, id: String(r.item.id || r.item._id) } : null;
      if (created) {
        setPlots((prev) => [created, ...prev]);
        setSelectedPlotId(created.id);
        setPolygonsByPlot((prev) => ({ ...prev, [created.id]: [] }));
        setExtraItemsByPlot((prev) => ({ ...prev, [created.id]: [] }));
        setCaretaker(
          normalizeCaretaker(created.caretaker || created.ownerName || "") ||
            nicknameToUse ||
            ""
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
    if (!editMode) {
      setErr(lang === "en" ? 'Please click "Edit / Delete" first' : "ต้องกด “ลบ / แก้ไข” ก่อน");
      return;
    }

    setErr("");
    setBusy(true);
    try {
      const safeAlias = String(plotAlias || "").trim();
      const safePlotName = String(plotName || "").trim();
      const safeCaretaker = String(caretaker || "").trim();
      const safePlantType = String(plantType || "").trim();
      const safeTopics = extraItems.map((x) => ({
        topic: String(x.topic || "").trim(),
        description: String(x.content || "").trim(),
      }));

      const r = await apiFetch(`/api/plots/${selectedPlotId}`, {
        method: "PATCH",
        body: {
          plotName: safePlotName,
          name: safePlotName,
          alias: safeAlias || safePlotName,
          caretaker: safeCaretaker,
          ownerName: safeCaretaker,
          plantType: safePlantType,
          plantedAt,
        },
      });

      await apiFetch(`/api/plots/${selectedPlotId}/topics`, {
        method: "PUT",
        body: {
          topics: safeTopics,
        },
      });

      const updated = r?.item ? { ...r.item, id: String(r.item.id || r.item._id) } : null;

      if (updated) {
        setPlots((prev) =>
          prev.map((p) => (String(p.id) === String(updated.id) ? updated : p))
        );

        setPlotAlias(updated.alias || updated.plotName || updated.name || "");
        setPlotName(updated.plotName || updated.name || "");
        setCaretaker(normalizeCaretaker(updated.caretaker || updated.ownerName || ""));
        setPlantType(updated.plantType || updated.cropType || "");
        setPlantedAt(updated.plantedAt || "");
      } else {
        setPlots((prev) =>
          prev.map((p) =>
            String(p.id) === String(selectedPlotId)
              ? {
                  ...p,
                  alias: safeAlias || safePlotName,
                  plotName: safePlotName,
                  name: safePlotName,
                  caretaker: safeCaretaker,
                  ownerName: safeCaretaker,
                  plantType: safePlantType,
                  plantedAt,
                }
              : p
          )
        );
      }

      await loadTopics(selectedPlotId);
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

      const nextPlots = plots.filter((p) => String(p.id) !== pid);
      setPlots(nextPlots);

      setPolygonsByPlot((prev) => {
        const next = { ...prev };
        delete next[pid];
        return next;
      });

      setExtraItemsByPlot((prev) => {
        const next = { ...prev };
        delete next[pid];
        return next;
      });

      setSelectedPlotId(nextPlots?.[0]?.id || "");
      setEditMode(false);
    } catch (e) {
      setErr(e.message || String(e));
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

      await apiFetch(`/api/plots/${selectedPlotId}/polygon`, {
        method: "PUT",
        body: { color, coords: ring, pins: [] },
      });

      await loadPolygon(selectedPlotId);
    } catch (e) {
      setErr(e.message || String(e));
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
    )
      return;
    if (!selectedPlotId) return;

    setErr("");
    setBusy(true);
    try {
      await apiFetch(`/api/plots/${selectedPlotId}/polygon`, {
        method: "PUT",
        body: { color: "#2563eb", coords: [], pins: [] },
      });

      await loadPolygon(selectedPlotId);
    } catch (e) {
      setErr(e.message || String(e));
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
    )
      return;
    if (!confirm(txt.confirmDeletePolygon)) return;

    await clearPolygon();
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

  const handlePolyLayerReady = () => {
    // backend.txt uses one embedded polygon per plot
  };

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

              <div className="pui-subhint">{editMode ? txt.editMode : txt.viewMode}</div>
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
                <button
                  className="pui-pill done"
                  type="button"
                  onClick={savePlotInfo}
                  disabled={busy}
                >
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

            <div
              className="pui-notes-add"
              style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}
            >
              <div className="pui-notes-head">
                <div className="pui-notes-title">{txt.allCount}</div>

                <button
                  className="pui-danger small"
                  type="button"
                  onClick={deleteAllPolygonsOfPlot}
                  disabled={busy || !selectedPlotId || !editMode || !plotPolygons.length}
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
                      <span className="pui-polynum"># polygon</span>
                      <span
                        className="pui-polychip"
                        style={{ background: p.color || "#2563eb" }}
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
            </div>

            <div className="pui-formbox">
              <div className="pui-card-title" style={{ marginBottom: 12 }}>
                {txt.plotDetail}
              </div>

              <div className="pui-form-grid">
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
                  <div className="pui-label-dark">{txt.plotDetail}</div>
                  <input
                    className="pui-input pui-input-short"
                    value={plotName}
                    onChange={(e) => setPlotName(e.target.value)}
                    placeholder={txt.plotNamePlaceholder}
                    readOnly={isReadOnly}
                    disabled={busy}
                  />
                </div>

                <div className="pui-field">
                  <div className="pui-label-dark">{txt.caretaker}</div>
                  <input
                    className="pui-input pui-input-short"
                    value={caretaker}
                    onChange={(e) => setCaretaker(e.target.value)}
                    placeholder={txt.caretakerPlaceholder}
                    readOnly={isReadOnly}
                    disabled={busy}
                  />
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

                  <div className="pui-after-date-block">
                    {!extraItems.length ? (
                      <div className="pui-empty" style={{ marginBottom: 12 }}>
                        {txt.miniEmpty}
                      </div>
                    ) : (
                      <div className="pui-mini-list" style={{ marginBottom: 12 }}>
                        {extraItems.map((item) => (
                          <div key={item.id} className="pui-item-card">
                            <div className="pui-item-head">
                              <div className="pui-item-title">{item.topic || "-"}</div>
                              <button
                                className="pui-danger small"
                                type="button"
                                onClick={() => deleteExtraItem(item.id)}
                                disabled={busy || !editMode}
                              >
                                {txt.delete}
                              </button>
                            </div>

                            <div className="pui-item-content">{item.content || "-"}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pui-label-dark">{txt.topic}</div>
                    <input
                      className="pui-input"
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                      placeholder={txt.topicPlaceholder}
                      readOnly={!editMode}
                      disabled={busy || !editMode}
                    />

                    <div className="pui-label-dark" style={{ marginTop: 8 }}>
                      {txt.content}
                    </div>
                    <textarea
                      className="pui-textarea"
                      rows={3}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder={txt.contentPlaceholder}
                      readOnly={!editMode}
                      disabled={busy || !editMode}
                    />

                    <div className="pui-mini-head" style={{ marginTop: 10 }}>
                      <button
                        className="pui-plus"
                        type="button"
                        onClick={addExtraItem}
                        disabled={busy || !editMode}
                        title={txt.miniAddTitle}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
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
        .pui-textarea:focus {
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