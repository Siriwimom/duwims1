"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

// --- dynamic import React-Leaflet & React-Leaflet-Draw (client only) ---
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const FeatureGroup = dynamic(() => import("react-leaflet").then((m) => m.FeatureGroup), { ssr: false });
const Polygon = dynamic(() => import("react-leaflet").then((m) => m.Polygon), { ssr: false });
const EditControl = dynamic(() => import("react-leaflet-draw").then((m) => m.EditControl), { ssr: false });

/**
 * Multi-polygons CRUD endpoints (via Next rewrites or direct base URL):
 * - GET    /api/plots
 * - POST   /api/plots
 * - PATCH  /api/plots/:plotId
 * - DELETE /api/plots/:plotId
 *
 * - GET    /api/plots/:plotId/polygons
 * - POST   /api/plots/:plotId/polygons          (create NEW polygon)
 * - PATCH  /api/polygons/:polygonId             (update ONE polygon)
 * - DELETE /api/polygons/:polygonId             (delete ONE polygon)
 * - DELETE /api/plots/:plotId/polygons          (delete ALL polygons of plot) [optional]
 *
 * - GET    /api/plots/:plotId/notes
 * - POST   /api/plots/:plotId/notes
 * - PATCH  /api/notes/:noteId
 * - DELETE /api/notes/:noteId
 */

// Use same-origin by default (recommended when you have rewrites)
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

// IMPORTANT: your login saves token under AUTH_TOKEN_V1
function getToken() {
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
    const msg = data?.error ? `${data.message || "Error"}: ${data.error}` : data?.message || `HTTP ${res.status}`;
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

// ✅ เวลาไทย (พ.ศ.) สำหรับแสดง “วันที่กลับมา”
function formatThaiDateTimeBuddhist(isoOrDate) {
  if (!isoOrDate) return "";
  const dt = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  try {
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
    return dt.toLocaleString("th-TH", { hour12: false });
  }
}

function PolyLayer({ poly, onReady }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && onReady) onReady(ref.current, poly.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poly?.id]);

  return (
    <Polygon
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

export default function AddPlantingPlotsPageMultiPolygons() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const fgRef = useRef(null);
  const layerIdToPolyIdRef = useRef(new Map()); // leafletLayerId -> polygonDbId

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [plots, setPlots] = useState([]);
  const [selectedPlotId, setSelectedPlotId] = useState("");
  const [editMode, setEditMode] = useState(false);

  const [polygonsByPlot, setPolygonsByPlot] = useState({});
  const [notesByPlot, setNotesByPlot] = useState({});
  const [savedNotesByPlot, setSavedNotesByPlot] = useState({}); // ✅ ต่อหัวข้อใหม่ “แนะนำ / 555.. / เวลา”

  const selectedPlot = useMemo(
    () => plots.find((p) => String(p.id) === String(selectedPlotId)) || null,
    [plots, selectedPlotId]
  );

  const [plotAlias, setPlotAlias] = useState("");
  const [plotName, setPlotName] = useState("");
  const [caretaker, setCaretaker] = useState("");
  const [plantType, setPlantType] = useState("");
  const [plantedAt, setPlantedAt] = useState("");

  const isReadOnly = !editMode;
  const plotPolygons = polygonsByPlot[selectedPlotId] || [];
  const plotNotes = notesByPlot[selectedPlotId] || [];
  const savedNotes = savedNotesByPlot[selectedPlotId] || [];
  const latestSaved = savedNotes?.[0] || null; // ✅ ล่าสุด (แนะนำ/555...)

  const makeLocalId = () => `snap_${Date.now()}_${Math.random().toString(16).slice(2)}`;

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
    setCaretaker(selectedPlot.caretaker || selectedPlot.ownerName || "");
    setPlantType(selectedPlot.plantType || selectedPlot.cropType || "");
    setPlantedAt(selectedPlot.plantedAt || "");
  }, [selectedPlot]);

  // ============ Plot CRUD ============
  async function addPlot() {
    setErr("");
    setBusy(true);
    try {
      const baseName = `แปลงใหม่ ${new Date().toISOString().slice(0, 10)}`;
      const r = await apiFetch("/api/plots", {
        method: "POST",
        body: { plotName: baseName, name: baseName, alias: baseName, caretaker: "", plantType: "", plantedAt: "" },
      });
      const created = r?.item ? { ...r.item, id: String(r.item.id || r.item._id) } : null;
      if (created) {
        setPlots((prev) => [created, ...prev]);
        setSelectedPlotId(created.id);
        setPolygonsByPlot((prev) => ({ ...prev, [created.id]: [] }));
        setNotesByPlot((prev) => ({ ...prev, [created.id]: [] }));
        setSavedNotesByPlot((prev) => ({ ...prev, [created.id]: [] }));
      }
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function savePlotInfo() {
    if (!selectedPlotId) return;
    setErr("");
    setBusy(true);
    try {
      const r = await apiFetch(`/api/plots/${selectedPlotId}`, {
        method: "PATCH",
        body: { plotName, name: plotName, alias: plotAlias || plotName, caretaker, plantType, plantedAt },
      });
      const updated = r?.item ? { ...r.item, id: String(r.item.id || r.item._id) } : null;
      if (updated) setPlots((prev) => prev.map((p) => (String(p.id) === String(updated.id) ? updated : p)));
      setEditMode(false);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  // ============ Polygon CRUD (MULTI) ============
  async function createPolygon(coords, color = "#2563eb") {
    if (!selectedPlotId) return;
    setErr("");
    setBusy(true);
    try {
      const ring =
        coords.length >= 3 && (coords[0][0] !== coords.at(-1)[0] || coords[0][1] !== coords.at(-1)[1])
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
    setErr("");
    setBusy(true);
    try {
      const ring =
        coords.length >= 3 && (coords[0][0] !== coords.at(-1)[0] || coords[0][1] !== coords.at(-1)[1])
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
    if (!confirm("ลบ polygon นี้?")) return;
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
    if (!selectedPlotId) return;
    if (!confirm("ลบ polygons ทั้งหมดของแปลงนี้?")) return;
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

  // Leaflet-draw handlers
  const onCreated = async (e) => {
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
      if (coords.length >= 3) {
        jobs.push(updatePolygon(polyDbId, coords));
      }
    });

    if (jobs.length) await Promise.all(jobs);
  };

  const onDeleted = async (e) => {
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

  // ============ Notes CRUD ============
  async function addNote() {
    if (!selectedPlotId) return;
    setErr("");
    setBusy(true);
    try {
      const r = await apiFetch(`/api/plots/${selectedPlotId}/notes`, {
        method: "POST",
        body: { topic: "หัวข้อเรื่อง", content: "" },
      });
      const item = r?.item ? { ...r.item, id: String(r.item.id || r.item._id) } : null;
      if (item) {
        setNotesByPlot((prev) => ({ ...prev, [selectedPlotId]: [item, ...(prev[selectedPlotId] || [])] }));
      }
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  // ✅ save note -> ต่อหัวข้อใหม่ (ไม่ไปทับช่องฟอร์ม => ไม่ซ้ำ “แนะนำ”)
  async function saveNote(noteId, patch) {
    setErr("");
    setBusy(true);
    try {
      const r = await apiFetch(`/api/notes/${noteId}`, { method: "PATCH", body: patch });
      const item = r?.item ? { ...r.item, id: String(r.item.id || r.item._id) } : null;

      if (item) {
        setNotesByPlot((prev) => ({
          ...prev,
          [selectedPlotId]: (prev[selectedPlotId] || []).map((n) => (String(n.id) === String(item.id) ? item : n)),
        }));

        const snapTopic = (item.topic || "").trim();
        const snapContent = (item.content || "").trim();

        setSavedNotesByPlot((prev) => {
          const cur = prev[selectedPlotId] || [];
          const next = [
            { id: makeLocalId(), topic: snapTopic || "—", content: snapContent || "—", createdAt: new Date().toISOString() },
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
    if (!confirm("ลบโน้ตนี้?")) return;
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
    const t = (p?.plotName || p?.name || p?.alias || "").trim();
    return t || "แปลง";
  };

  if (!mounted) return null;

  return (
    <div className="pui">
      <main className="pui-wrap pui-wrap-wide">
        {/* ===== HERO ===== */}
        <section className="pui-hero">
          <div className="pui-hero-top">
            <div className="pui-hero-title">การจัดการ Polygons</div>

            <button className="pui-hero-btn" type="button" onClick={addPlot} disabled={busy}>
              + เพิ่มแปลง
            </button>
          </div>

          <div className="pui-hero-grid">
            <div className="pui-field">
              <div className="pui-label">แปลง</div>
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
                {editMode ? "โหมดแก้ไข: สามารถแก้ไข/ลบ/เพิ่มข้อมูลได้" : "โหมดดูข้อมูล: แก้ไขได้เมื่อกด “ลบ / แก้ไข”"}
              </div>
            </div>
          </div>
        </section>

        {err && (
          <div className="pui-alert">
            <div className="pui-alert-title">เกิดข้อผิดพลาด</div>
            <div className="pui-alert-msg">{err}</div>
            <div className="pui-alert-hint">
              * token ใช้ key: <b>AUTH_TOKEN_V1</b> (ตามหน้า login ของคุณ) หรือปรับ getToken()
            </div>
          </div>
        )}

        {loading ? (
          <div className="pui-empty">Loading...</div>
        ) : !plots.length ? (
          <div className="pui-empty">ยังไม่มีแปลง — กด “+ เพิ่มแปลง”</div>
        ) : (
          <section className="pui-card">
            <div className="pui-card-top">
              <div className="pui-card-title">กรอกการจัดการข้อมูลแปลงปลูกพืช</div>

              {!editMode ? (
                <button className="pui-pill" type="button" onClick={() => setEditMode(true)} disabled={busy}>
                  ลบ / แก้ไข
                </button>
              ) : (
                <button className="pui-pill done" type="button" onClick={savePlotInfo} disabled={busy}>
                  เสร็จสิ้น
                </button>
              )}
            </div>

            {/* MAP อยู่บน */}
            <div className="pui-mapbox pui-mapbox-top">
              <div className="pui-map-title">Draw Polygons on a Map</div>

              <div className="pui-map pui-map-top">
                {!mounted ? (
                  <div className="pui-map-loading">Loading map...</div>
                ) : (
                  <MapContainer
                    key={selectedPlotId || "map"}
                    center={[13.7563, 100.5018]}
                    zoom={13}
                    style={{ height: "100%", width: "100%" }}
                    preferCanvas={true}
                  >
                    <TileLayer
                      attribution="&copy; OpenStreetMap contributors"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <FeatureGroup ref={fgRef}>
                      {plotPolygons.map((poly) => (
                        <PolyLayer key={poly.id} poly={poly} onReady={handlePolyLayerReady} />
                      ))}

                      <EditControl
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
                    </FeatureGroup>
                  </MapContainer>
                )}
              </div>

              {!editMode && <div className="pui-lockhint">* ต้องกด “ลบ / แก้ไข” ก่อนถึงจะวาด/แก้/ลบ polygon ได้</div>}
            </div>

            {/* ✅ ย้าย Polygons ของแปลง มาไว้ก่อนฟอร์ม */}
            <div className="pui-notes-add" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
              <div className="pui-notes-head">
                <div className="pui-notes-title">Polygons ของแปลง (ทั้งหมด: {plotPolygons.length})</div>

                <button
                  className="pui-danger small"
                  type="button"
                  onClick={deleteAllPolygonsOfPlot}
                  disabled={busy || !selectedPlotId}
                  title="ลบ polygons ทั้งหมดของแปลงนี้"
                >
                  ลบทั้งหมด
                </button>
              </div>

              {!plotPolygons.length ? (
                <div className="pui-empty">ยังไม่มี polygon — เปิด “ลบ / แก้ไข” แล้ววาดบนแผนที่</div>
              ) : (
                <div className="pui-polylist">
                  {plotPolygons.map((p) => (
                    <div className="pui-polyrow" key={p.id}>
                      <span className="pui-polynum"># {p.id.slice(-6)}</span>
                      <span className="pui-polychip" style={{ background: p.color || "#2563eb" }} />
                      <button className="pui-danger small" type="button" onClick={() => deletePolygon(p.id)} disabled={busy}>
                        ลบ
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ฟอร์ม */}
            <div className="pui-formbox">
              <div className="pui-form-grid">
                {/* ✅ แนะนำอยู่ “บนกล่อง” (ไม่ทำให้แนะนำซ้ำใน input) */}
                <div className="pui-field">
                  <div className="pui-label-dark">ชื่อที่แสดงในรายการแปลง (Dropdown)</div>
                  {latestSaved?.topic ? <div className="pui-topnote">{latestSaved.topic}</div> : null}
                  <input
                    className="pui-input pui-input-short"
                    value={plotAlias}
                    onChange={(e) => setPlotAlias(e.target.value)}
                    placeholder="ชื่อแสดง"
                    readOnly={isReadOnly}
                    disabled={busy}
                  />
                </div>

                {/* ✅ 555 อยู่ “ในกล่อง” แบบเตี้ยลง (โชว์จาก latestSaved) */}
                <div className="pui-field">
                  <div className="pui-label-dark">ข้อมูลแปลงปลูก</div>
                  <input
                    className="pui-input pui-input-short"
                    value={plotName}
                    onChange={(e) => setPlotName(e.target.value)}
                    placeholder="ชื่อแปลง"
                    readOnly={isReadOnly}
                    disabled={busy}
                  />

                  {latestSaved?.content ? (
                    <div className="pui-compactbox">
                      <div className="pui-compacttext">{latestSaved.content}</div>
                      <div className="pui-compacttime">{formatThaiDateTimeBuddhist(latestSaved.createdAt)}</div>
                    </div>
                  ) : null}
                </div>

                <div className="pui-field">
                  <div className="pui-label-dark">ชื่อผู้ดูแล</div>
                  <input
                    className="pui-input pui-input-short"
                    value={caretaker}
                    onChange={(e) => setCaretaker(e.target.value)}
                    placeholder="ชื่อผู้ดูแล"
                    readOnly={isReadOnly}
                    disabled={busy}
                  />
                </div>

                <div className="pui-field">
                  <div className="pui-label-dark">ประเภทพืช</div>
                  <input
                    className="pui-input pui-input-short"
                    value={plantType}
                    onChange={(e) => setPlantType(e.target.value)}
                    placeholder="ประเภทพืช"
                    readOnly={isReadOnly}
                    disabled={busy}
                  />
                </div>

                <div className="pui-field">
                  <div className="pui-label-dark">วันที่เริ่มปลูก</div>
                  <input
                    className="pui-input pui-input-short"
                    type="date"
                    value={plantedAt || ""}
                    onChange={(e) => setPlantedAt(e.target.value)}
                    readOnly={isReadOnly}
                    disabled={busy}
                  />
                  {plantedAt && <div className="pui-datehint">แสดงผล: {isoToThai(plantedAt)}</div>}
                </div>
              </div>

              {/* ✅ แสดงรายการที่บันทึก (2 บรรทัด + วันที่) */}
              {savedNotes.length > 0 && (
                <div className="pui-inline-saved">
                  {savedNotes.map((n) => (
                    <div className="pui-snap" key={n.id}>
                      <div className="pui-snap-topic">{n.topic || "—"}</div>
                      <div className="pui-snap-content">{n.content || "—"}</div>
                      <div className="pui-snap-time">{formatThaiDateTimeBuddhist(n.createdAt)}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* เพิ่มข้อมูล (draft notes) */}
              <div className="pui-notes-add">
                <div className="pui-notes-head">
                  <div className="pui-notes-title">เพิ่มข้อมูล (หัวข้อเรื่อง + เนื้อหา)</div>

                  <div className="pui-notes-actions">
                    <button className="pui-plus" type="button" onClick={addNote} disabled={busy || !selectedPlotId}>
                      +
                    </button>
                  </div>
                </div>

                {!plotNotes.length ? (
                  <div className="pui-empty">{editMode ? "ยังไม่มีรายการ — กด + เพื่อเพิ่ม" : "ยังไม่มีรายการ"}</div>
                ) : (
                  <div className="pui-notes-list">
                    {plotNotes.map((n) => (
                      <div className="pui-note" key={n.id}>
                        <div className="pui-note-row">
                          <div className="pui-note-col">
                            <div className="pui-label-dark">หัวข้อเรื่อง</div>
                            <input
                              className="pui-input"
                              value={n.topic || ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                setNotesByPlot((prev) => ({
                                  ...prev,
                                  [selectedPlotId]: (prev[selectedPlotId] || []).map((x) =>
                                    String(x.id) === String(n.id) ? { ...x, topic: v } : x
                                  ),
                                }));
                              }}
                              disabled={busy}
                              placeholder="หัวข้อเรื่อง"
                            />
                          </div>

                          <button className="pui-danger small" type="button" onClick={() => deleteNote(n.id)} disabled={busy}>
                            ลบ
                          </button>
                        </div>

                        <div className="pui-note-col">
                          <div className="pui-label-dark">เนื้อหา</div>
                          <textarea
                            className="pui-textarea"
                            rows={3}
                            value={n.content || ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setNotesByPlot((prev) => ({
                                ...prev,
                                [selectedPlotId]: (prev[selectedPlotId] || []).map((x) =>
                                  String(x.id) === String(n.id) ? { ...x, content: v } : x
                                ),
                              }));
                            }}
                            disabled={busy}
                            placeholder="พิมพ์รายละเอียด..."
                          />
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                          <button
                            className="pui-save-mini"
                            type="button"
                            onClick={() => saveNote(n.id, { topic: n.topic, content: n.content })}
                            disabled={busy}
                          >
                            บันทึก
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
                  title={!editMode ? "กด “ลบ / แก้ไข” ก่อน" : "บันทึกข้อมูลแปลง"}
                >
                  SAVE
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
        .pui-hero-title {
          color: #fff;
          font-weight: 900;
          font-size: 13px;
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

        /* ✅ กล่องเตี้ยสำหรับโชว์ 555... */
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
          .pui-hero-grid {
            grid-template-columns: 1fr;
          }
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