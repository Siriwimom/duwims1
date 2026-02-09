"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

// --- dynamic import React-Leaflet & React-Leaflet-Draw ---
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), {
  ssr: false,
});
const FeatureGroup = dynamic(
  () => import("react-leaflet").then((m) => m.FeatureGroup),
  { ssr: false }
);
const Polygon = dynamic(() => import("react-leaflet").then((m) => m.Polygon), {
  ssr: false,
});
const EditControl = dynamic(
  () => import("react-leaflet-draw").then((m) => m.EditControl),
  { ssr: false }
);

export default function AddPlantingPlotsPage() {
  // ✅ กัน Leaflet/Draw crash ใน Next dev
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ===== counters (กันรีเซ็ตตอน rerender) =====
  const polygonIdRef = useRef(1);
  const noteIdRef = useRef(1);

  // =========================
  // ✅ PLOTS (กด + เพิ่มแปลง -> เพิ่มแปลงใหม่ + เปลี่ยนหน้า/ข้อมูลทันที)
  // =========================
  const [plots, setPlots] = useState(() => [
    {
      id: "A",
      label: "แปลง A – ทุเรียนล่าง",
      plotName: "แปลง A",
      caretaker: "สมหมาย ใจดี",
      plantType: "ทุเรียนหมอนทอง",
      plantedAt: "15/06/2568",
    },
    {
      id: "B",
      label: "แปลง B – ทุเรียนบน",
      plotName: "แปลง B",
      caretaker: "คุณสมชาย สวนทุเรียน",
      plantType: "ทุเรียนหมอนทอง",
      plantedAt: "11/02/2568",
    },
    {
      id: "C",
      label: "แปลง C",
      plotName: "แปลง C",
      caretaker: "-",
      plantType: "-",
      plantedAt: "-",
    },
  ]);

  const [selectedPlotId, setSelectedPlotId] = useState("A");

  // ✅ เก็บ polygon/notes แยกตาม plot
  const [polygonsByPlot, setPolygonsByPlot] = useState(() => ({
    A: [],
    B: [],
    C: [],
  }));
  const [notesByPlot, setNotesByPlot] = useState(() => ({
    A: [{ id: 1, topic: "หัวข้อเรื่อง", content: "" }],
    B: [{ id: 2, topic: "หัวข้อเรื่อง", content: "" }],
    C: [{ id: 3, topic: "หัวข้อเรื่อง", content: "" }],
  }));
  useEffect(() => {
    // ทำให้ noteId ไม่ชน ถ้าเริ่มจาก state ข้างบน
    const maxNoteId =
      Object.values(notesByPlot)
        .flat()
        .reduce((mx, n) => Math.max(mx, n.id), 0) || 0;
    noteIdRef.current = Math.max(noteIdRef.current, maxNoteId + 1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedPlot = useMemo(
    () => plots.find((p) => p.id === selectedPlotId) || plots[0],
    [plots, selectedPlotId]
  );

  // ===== form fields (แสดงตาม plot ที่เลือก) =====
  const [plotName, setPlotName] = useState("");
  const [caretaker, setCaretaker] = useState("");
  const [plantType, setPlantType] = useState("");
  const [plantedAt, setPlantedAt] = useState("");

  // sync เมื่อเปลี่ยน plot
  useEffect(() => {
    const p = selectedPlot;
    if (!p) return;
    setPlotName(p.plotName || `แปลง ${p.id}`);
    setCaretaker(p.caretaker || "");
    setPlantType(p.plantType || "");
    setPlantedAt(p.plantedAt || "");
  }, [selectedPlotId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ กด + เพิ่มแปลง -> สร้าง plot ใหม่ (ตัวอักษรถัดไป) แล้วเลือกทันที + ใส่ข้อมูลตัวอย่าง
  const addPlot = () => {
    const ids = plots.map((p) => p.id);
    const nextCharCode = Math.max(...ids.map((x) => x.charCodeAt(0))) + 1;
    const nextId = String.fromCharCode(nextCharCode);

    const newPlot = {
      id: nextId,
      label: `แปลง ${nextId}`,
      plotName: `แปลง ${nextId}`,
      caretaker: "สมใจ สวัสดิ์",
      plantType: "ทุเรียน",
      plantedAt: "11/02/2568",
    };

    setPlots((prev) => [...prev, newPlot]);
    setPolygonsByPlot((prev) => ({ ...prev, [nextId]: [] }));
    setNotesByPlot((prev) => ({
      ...prev,
      [nextId]: [{ id: noteIdRef.current++, topic: "หัวข้อเรื่อง", content: "" }],
    }));

    setSelectedPlotId(nextId);
  };

  // ✅ บันทึกข้อมูลพื้นฐานของแปลง (ชื่อผู้ดูแล/พืช/วันที่)
  const savePlotInfo = () => {
    setPlots((prev) =>
      prev.map((p) =>
        p.id === selectedPlotId
          ? {
              ...p,
              plotName: plotName?.trim() || `แปลง ${selectedPlotId}`,
              caretaker: caretaker?.trim() || "",
              plantType: plantType?.trim() || "",
              plantedAt: plantedAt?.trim() || "",
              label:
                selectedPlotId === "A"
                  ? "แปลง A – ทุเรียนล่าง"
                  : selectedPlotId === "B"
                  ? "แปลง B – ทุเรียนบน"
                  : plotName?.trim() || `แปลง ${selectedPlotId}`,
            }
          : p
      )
    );
  };

  // ====== polygon logic (DO NOT TOUCH) ======
  const [currentColor, setCurrentColor] = useState("#16a34a");

  const polygons = polygonsByPlot[selectedPlotId] || [];
  const setPolygons = (updater) => {
    setPolygonsByPlot((prev) => {
      const prevArr = prev[selectedPlotId] || [];
      const nextArr = typeof updater === "function" ? updater(prevArr) : updater;
      return { ...prev, [selectedPlotId]: nextArr };
    });
  };

  const handleCreated = (e) => {
    if (e.layerType === "polygon") {
      const layer = e.layer;
      const latlngs = layer.getLatLngs()[0] || [];
      const coords = latlngs.map((pt) => [pt.lat, pt.lng]);

      setPolygons((prev) => [
        ...prev,
        { id: polygonIdRef.current++, coords, color: currentColor },
      ]);

      // ✅ remove drawn layer from map (เราจะ render เองจาก state)
      layer.remove();
    }
  };

  const handleDeletePolygon = (id) => {
    setPolygons((prev) => prev.filter((p) => p.id !== id));
  };

  const colorOptions = [
    { value: "#16a34a", label: "เขียว" },
    { value: "#22c55e", label: "เขียวอ่อน" },
    { value: "#f97316", label: "ส้ม" },
    { value: "#ef4444", label: "แดง" },
    { value: "#3b82f6", label: "น้ำเงิน" },
  ];

  // ===== notes (หัวข้อเรื่อง + เนื้อหา) แยกตาม plot =====
  const notes = notesByPlot[selectedPlotId] || [];
  const setNotes = (updater) => {
    setNotesByPlot((prev) => {
      const prevArr = prev[selectedPlotId] || [];
      const nextArr = typeof updater === "function" ? updater(prevArr) : updater;
      return { ...prev, [selectedPlotId]: nextArr };
    });
  };

  const addNote = () => {
    setNotes((prev) => [
      ...prev,
      { id: noteIdRef.current++, topic: "หัวข้อเรื่อง", content: "" },
    ]);
  };
  const removeNote = (id) => setNotes((prev) => prev.filter((n) => n.id !== id));
  const updateNote = (id, patch) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));

  const [noteSaveState, setNoteSaveState] = useState({ saving: false, saved: false });
  const saveNotes = async () => {
    try {
      setNoteSaveState({ saving: true, saved: false });
      // mock
      await new Promise((r) => setTimeout(r, 250));
      setNoteSaveState({ saving: false, saved: true });
      setTimeout(() => setNoteSaveState((s) => ({ ...s, saved: false })), 1200);
    } catch {
      setNoteSaveState({ saving: false, saved: false });
      alert("บันทึกไม่สำเร็จ");
    }
  };

  // ===== SAVE รวม (polygon + notes + plot info) =====
  const buildPayload = () => ({
    plotId: selectedPlotId,
    plotInfo: { plotName, caretaker, plantType, plantedAt },
    polygons,
    notes,
  });

  return (
    <div className="pui">
      <main className="pui-wrap">
        {/* ===== HERO ===== */}
        <section className="pui-hero">
          <div className="pui-hero-top">
            <div className="pui-hero-title">การจัดการ Polygons</div>

            {/* ✅ กดแล้วเพิ่มแปลงใหม่ + เปลี่ยนข้อมูลหน้าใหม่ทันที */}
            <button className="pui-hero-btn" type="button" onClick={addPlot}>
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
              >
                {plots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ===== MAIN CARD ===== */}
        <section className="pui-card">
          <div className="pui-card-top">
            <div className="pui-card-title">กรอกการจัดการข้อมูลแปลงปลูกพืช</div>
            <button className="pui-pill" type="button">
              ลบ / แก้ไข
            </button>
          </div>

          {/* ===== FORMBOX ===== */}
          <div className="pui-formbox">
            <div className="pui-form-grid">
              <div className="pui-field">
                <div className="pui-label-dark">ข้อมูลแปลงปลูก แปลง A</div>
                <input
                  className="pui-input pui-input-short"
                  value={plotName}
                  onChange={(e) => setPlotName(e.target.value)}
                  placeholder={`แปลง ${selectedPlotId}`}
                />
              </div>

              <div className="pui-field">
                <div className="pui-label-dark">ชื่อผู้ดูแล</div>
                <input
                  className="pui-input pui-input-short"
                  value={caretaker}
                  onChange={(e) => setCaretaker(e.target.value)}
                  placeholder="ชื่อผู้ดูแล"
                />
              </div>

              <div className="pui-field">
                <div className="pui-label-dark">ประเภทพืช</div>
                <input
                  className="pui-input pui-input-short"
                  value={plantType}
                  onChange={(e) => setPlantType(e.target.value)}
                  placeholder="ประเภทพืช"
                />
              </div>

              <div className="pui-field">
                <div className="pui-label-dark">วันที่เริ่มปลูก</div>
                <input
                  className="pui-input pui-input-short"
                  value={plantedAt}
                  onChange={(e) => setPlantedAt(e.target.value)}
                  placeholder="11/02/2568"
                />
              </div>
            </div>

            {/* ✅ เพิ่มข้อมูล (หัวข้อเรื่อง + เนื้อหา) + ปุ่ม + และ บันทึก */}
            <div className="pui-notes">
              <div className="pui-notes-head">
                <div className="pui-notes-title">เพิ่มข้อมูล (หัวข้อเรื่อง + เนื้อหา)</div>

                <div className="pui-notes-actions">
                  <button className="pui-plus" type="button" onClick={addNote} title="เพิ่มรายการ">
                    +
                  </button>

                  <button
                    className="pui-save-mini"
                    type="button"
                    onClick={saveNotes}
                    disabled={noteSaveState.saving}
                    title="บันทึกข้อมูลอื่นๆ"
                  >
                    {noteSaveState.saving
                      ? "กำลังบันทึก..."
                      : noteSaveState.saved
                      ? "บันทึกแล้ว"
                      : "บันทึก"}
                  </button>
                </div>
              </div>

              <div className="pui-notes-list">
                {notes.map((n) => (
                  <div className="pui-note" key={n.id}>
                    <div className="pui-note-row">
                      <div className="pui-note-col">
                        <div className="pui-label-dark">หัวข้อเรื่อง</div>
                        <input
                          className="pui-input"
                          value={n.topic}
                          onChange={(e) => updateNote(n.id, { topic: e.target.value })}
                          placeholder="หัวข้อเรื่อง"
                        />
                      </div>

                      <button
                        className="pui-danger small"
                        type="button"
                        onClick={() => removeNote(n.id)}
                        title="ลบรายการนี้"
                      >
                        ลบ
                      </button>
                    </div>

                    <div className="pui-note-col">
                      <div className="pui-label-dark">เนื้อหา</div>
                      <textarea
                        className="pui-textarea"
                        rows={2}
                        value={n.content}
                        onChange={(e) => updateNote(n.id, { content: e.target.value })}
                        placeholder="พิมพ์รายละเอียด..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== MAP ===== */}
          <div className="pui-mapbox">
            <div className="pui-map-title">Draw Polygons on a Map</div>

            <div className="pui-palette">
              {colorOptions.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCurrentColor(c.value)}
                  className={currentColor === c.value ? "pui-color active" : "pui-color"}
                  style={{ background: c.value }}
                  title={c.label}
                  type="button"
                />
              ))}
            </div>

            <div className="pui-map">
              {!mounted ? (
                <div className="pui-map-loading">Loading map...</div>
              ) : (
                <MapContainer
                  // ✅ remount เวลาสลับแปลง กัน error ใน dev
                  key={`map-${selectedPlotId}`}
                  center={[13.3, 101.0]}
                  zoom={16}
                  style={{ width: "100%", height: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                  <FeatureGroup>
                    {polygons.map((poly) => (
                      <Polygon
                        key={poly.id}
                        positions={poly.coords}
                        pathOptions={{
                          color: poly.color,
                          fillColor: poly.color,
                          fillOpacity: 0.35,
                        }}
                      />
                    ))}

                    <EditControl
                      position="topright"
                      onCreated={handleCreated}
                      draw={{
                        polygon: {
                          allowIntersection: false,
                          shapeOptions: {
                            color: currentColor,
                            fillColor: currentColor,
                            fillOpacity: 0.25,
                          },
                        },
                        rectangle: false,
                        circle: false,
                        polyline: false,
                        marker: false,
                        circlemarker: false,
                      }}
                      edit={{ edit: false, remove: false }}
                    />
                  </FeatureGroup>
                </MapContainer>
              )}
            </div>

            {polygons.length > 0 && (
              <div className="pui-polylist">
                {polygons.map((poly) => (
                  <div className="pui-polyrow" key={poly.id}>
                    <span className="pui-polynum"># {poly.id}</span>
                    <span className="pui-polychip" style={{ background: poly.color }} />
                    <button
                      className="pui-danger small"
                      type="button"
                      onClick={() => handleDeletePolygon(poly.id)}
                    >
                      ลบ
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ===== SAVE (รวม) ===== */}
          <div className="pui-savewrap">
            <button
              className="pui-save"
              type="button"
              onClick={() => {
                // ✅ บันทึกข้อมูลฟอร์มก่อน
                savePlotInfo();
                const payload = buildPayload();
                console.log("[SAVE payload]", payload);
              }}
            >
              SAVE
            </button>
          </div>
        </section>
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

        /* ===== HERO ===== */
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

        /* ===== MAIN CARD ===== */
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

        /* ===== FORMBOX ===== */
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
          margin: 0 0 6px 4px; /* ✅ ปรับให้บาลานซ์ */
        }

        .pui-select,
        .pui-input {
          width: 100%;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 12px;
          padding: 11px 12px; /* ✅ บาลานซ์กับขอบ */
          font-size: 12px;
          outline: none;
          background: rgba(255, 255, 255, 0.95);
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

        .pui-textarea {
          width: 100%;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 12px;
          padding: 11px 12px; /* ✅ บาลานซ์กับขอบ */
          font-size: 12px;
          outline: none;
          background: rgba(255, 255, 255, 0.95); /* ✅ แก้บั๊กเดิม rgba(..., 0.) */
          resize: vertical;
          min-height: 84px; /* ✅ ไม่อึดอัด */
          line-height: 1.45;
        }

        /* ===== NOTES ===== */
        .pui-notes {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px dashed rgba(0, 0, 0, 0.12);
        }
        .pui-notes-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start; /* ✅ บาลานซ์หัวข้อกับปุ่ม */
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
          width: 38px; /* ✅ */
          height: 38px; /* ✅ */
          border-radius: 12px; /* ✅ */
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: rgba(255, 255, 255, 0.85);
          font-weight: 1000;
          cursor: pointer;
        }
        .pui-save-mini {
          border: none;
          border-radius: 12px; /* ✅ */
          height: 38px; /* ✅ ให้สูงใกล้กัน */
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
          opacity: 0.7;
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

        /* ===== MAPBOX ===== */
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
        .pui-palette {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .pui-color {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          border: 2px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 10px 18px rgba(0, 0, 0, 0.12);
          cursor: pointer;
        }
        .pui-color.active {
          outline: 3px solid rgba(17, 24, 39, 0.75);
          outline-offset: 1px;
        }
        .pui-map {
          height: 210px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: rgba(255, 255, 255, 0.8);
          position: relative;
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
        .pui-danger.small {
          height: 40px; /* ✅ สูงบาลานซ์กับ input */
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 14px;
          border-radius: 12px;
        }

        /* ===== SAVE ===== */
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
        }

        /* ✅ มือถือเล็ก: ไม่ให้ปุ่ม "ลบ" เบียด input */
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
      `}</style>
    </div>
  );
}
