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
    localStorage.getItem("AUTH_TOKEN_V1") || // ✅ เพิ่มบรรทัดนี้
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
    const msg = data?.error ? `${data.message || "Error"}: ${data.error}` : (data?.message || `HTTP ${res.status}`);
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
      pathOptions={{ color: poly.color || "#2563eb" }}
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

  // plot form
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
    layerIdToPolyIdRef.current = new Map(); // reset mapping for new plot
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

  async function deletePlot() {
    if (!selectedPlotId) return;
    if (!confirm("ลบแปลงนี้ทั้งหมด?")) return;
    setErr("");
    setBusy(true);
    try {
      await apiFetch(`/api/plots/${selectedPlotId}`, { method: "DELETE" });
      const remaining = plots.filter((p) => String(p.id) !== String(selectedPlotId));
      setPlots(remaining);
      setSelectedPlotId(remaining?.[0]?.id || "");
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
      // (optional) close ring
      const ring =
        coords.length >= 3 && (coords[0][0] !== coords.at(-1)[0] || coords[0][1] !== coords.at(-1)[1])
          ? [...coords, coords[0]]
          : coords;

      await apiFetch(`/api/plots/${selectedPlotId}/polygons`, {
        method: "POST",
        body: { coords: ring, coordinates: ring, color },
      });

      await loadPolygons(selectedPlotId); // refresh to get DB ids
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
    // Called when react-leaflet Polygon layer ref is available
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
      const r = await apiFetch(`/api/plots/${selectedPlotId}/notes`, { method: "POST", body: { topic: "หัวข้อเรื่อง", content: "" } });
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
    <div style={{ maxWidth: 1280, margin: "16px auto", padding: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>การจัดการ Polygons (Multi)</h2>

        <button disabled={busy} onClick={addPlot} style={{ padding: "8px 12px" }}>
          + เพิ่มแปลง
        </button>

        <select
          value={selectedPlotId}
          onChange={(e) => setSelectedPlotId(e.target.value)}
          disabled={busy || loading || !plots.length}
          style={{ padding: "8px 10px", minWidth: 220 }}
        >
          {plots.map((p) => (
            <option key={p.id} value={p.id}>
              {getPlotDisplayName(p)}
            </option>
          ))}
        </select>

        <button disabled={busy || !selectedPlotId} onClick={() => setEditMode((v) => !v)} style={{ padding: "8px 12px" }}>
          {editMode ? "ยกเลิกแก้ไข" : "แก้ไข"}
        </button>

        <button disabled={busy || !editMode || !selectedPlotId} onClick={savePlotInfo} style={{ padding: "8px 12px" }}>
          บันทึกข้อมูลแปลง
        </button>

        <button disabled={busy || !selectedPlotId} onClick={deletePlot} style={{ padding: "8px 12px" }}>
          ลบแปลง
        </button>

        <button disabled={busy || !selectedPlotId} onClick={deleteAllPolygonsOfPlot} style={{ padding: "8px 12px" }}>
          ลบ Polygons ทั้งหมด
        </button>

        {busy && <span>กำลังทำงาน...</span>}
      </div>

      {err && (
        <div style={{ marginTop: 10, padding: 10, background: "#ffe8e8", border: "1px solid #ffb3b3" }}>
          {err}
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
            * token ใช้ key: <b>AUTH_TOKEN_V1</b> (ตามหน้า login ของคุณ) หรือปรับ getToken()
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ marginTop: 14 }}>Loading...</div>
      ) : !plots.length ? (
        <div style={{ marginTop: 14 }}>ยังไม่มีแปลง — กด “+ เพิ่มแปลง”</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 14, marginTop: 14 }}>
          {/* LEFT */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>ข้อมูลแปลงปลูกพืช</h3>

            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <div>ชื่อแปลง (ชื่อจริง)</div>
                <input
                  value={plotName}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPlotName(v);
                    // ให้ชื่อแสดงผลตามชื่อจริงโดยอัตโนมัติ (ลดความสับสน)
                    setPlotAlias(v);
                  }}
                  disabled={isReadOnly || busy}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <div>ชื่อแปลงสำหรับแสดง (alias)</div>
                <input value={plotAlias} onChange={(e) => setPlotAlias(e.target.value)} disabled={isReadOnly || busy} />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <div>ชื่อผู้ดูแล</div>
                <input value={caretaker} onChange={(e) => setCaretaker(e.target.value)} disabled={isReadOnly || busy} />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <div>ประเภทพืช</div>
                <input value={plantType} onChange={(e) => setPlantType(e.target.value)} disabled={isReadOnly || busy} />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <div>วันที่เริ่มปลูก</div>
                <input type="date" value={plantedAt || ""} onChange={(e) => setPlantedAt(e.target.value)} disabled={isReadOnly || busy} />
                <div style={{ fontSize: 12, opacity: 0.75 }}>{plantedAt ? isoToThai(plantedAt) : ""}</div>
              </label>
            </div>

            <hr style={{ margin: "14px 0" }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <h3 style={{ margin: 0 }}>Polygons ของแปลง</h3>
              <div style={{ fontSize: 12, opacity: 0.7 }}>ทั้งหมด: {plotPolygons.length}</div>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {plotPolygons.length === 0 ? (
                <div style={{ opacity: 0.7 }}>ยังไม่มี polygon — เปิด “แก้ไข” แล้ววาดบนแผนที่</div>
              ) : (
                plotPolygons.map((p) => (
                  <div key={p.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10, background: "#fafafa" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ fontSize: 13, opacity: 0.85 }}>
                        <b>Polygon</b> #{p.id.slice(-6)}
                        <div style={{ fontSize: 12, opacity: 0.7 }}>{p.coords?.length || 0} จุด</div>
                      </div>
                      <button disabled={busy} onClick={() => deletePolygon(p.id)} style={{ padding: "6px 10px" }}>
                        ลบ
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <hr style={{ margin: "14px 0" }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <h3 style={{ margin: 0 }}>บันทึก (Notes)</h3>
              <button disabled={busy || !selectedPlotId} onClick={addNote} style={{ padding: "8px 12px" }}>
                + เพิ่มโน้ต
              </button>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {plotNotes.length === 0 ? (
                <div style={{ opacity: 0.7 }}>ยังไม่มีโน้ต</div>
              ) : (
                plotNotes.map((n) => (
                  <div key={n.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10, background: "#fafafa" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        value={n.topic || ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setNotesByPlot((prev) => ({
                            ...prev,
                            [selectedPlotId]: (prev[selectedPlotId] || []).map((x) => (String(x.id) === String(n.id) ? { ...x, topic: v } : x)),
                          }));
                        }}
                        disabled={busy}
                        placeholder="หัวข้อเรื่อง"
                        style={{ flex: 1 }}
                      />
                      <button disabled={busy} onClick={() => saveNote(n.id, { topic: n.topic, content: n.content })}>
                        บันทึก
                      </button>
                      <button disabled={busy} onClick={() => deleteNote(n.id)}>
                        ลบ
                      </button>
                    </div>

                    <textarea
                      value={n.content || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNotesByPlot((prev) => ({
                          ...prev,
                          [selectedPlotId]: (prev[selectedPlotId] || []).map((x) => (String(x.id) === String(n.id) ? { ...x, content: v } : x)),
                        }));
                      }}
                      disabled={busy}
                      placeholder="พิมพ์รายละเอียด..."
                      rows={4}
                      style={{ width: "100%", marginTop: 8, resize: "vertical" }}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT: map */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Draw Polygons on a Map</h3>
              <div style={{ fontSize: 12, opacity: 0.7 }}>* เปิด “แก้ไข” ก่อนถึงจะวาด/แก้/ลบ ได้</div>
            </div>

            <div style={{ marginTop: 10, height: 560, borderRadius: 12, overflow: "hidden" }}>
              {!mounted ? (
                <div style={{ height: "100%" }} />
              ) : (
                <MapContainer key={selectedPlotId || "map"} center={[13.7563, 100.5018]} zoom={13} style={{ height: "100%", width: "100%" }} preferCanvas={true}>
                <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                <FeatureGroup ref={fgRef}>
                  {/* Put polygons INSIDE FeatureGroup so EditControl can edit them */}
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
          </div>
        </div>
      )}
    </div>
  );
}
