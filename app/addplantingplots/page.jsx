"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

// --- dynamic import React-Leaflet & React-Leaflet-Draw ---
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const FeatureGroup = dynamic(
  () => import("react-leaflet").then((m) => m.FeatureGroup),
  { ssr: false }
);
const Polygon = dynamic(
  () => import("react-leaflet").then((m) => m.Polygon),
  { ssr: false }
);
const EditControl = dynamic(
  () => import("react-leaflet-draw").then((m) => m.EditControl),
  { ssr: false }
);

let polygonIdCounter = 1;

// ===== simple note ids (NOT polygon) =====
let noteIdCounter = 1;

export default function AddPlantingPlotsPage() {
  const [baseUrl, setBaseUrl] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setBaseUrl(window.location.origin);
  }, []);

  // ✅ กัน Leaflet/Draw crash ใน Next dev (StrictMode/mount timing)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // ====== (DO NOT TOUCH) polygon logic ======
  const [polygons, setPolygons] = useState([]);
  const [currentColor, setCurrentColor] = useState("#16a34a");

  const handleCreated = (e) => {
    if (e.layerType === "polygon") {
      const layer = e.layer;
      const latlngs = layer.getLatLngs()[0] || [];
      const coords = latlngs.map((p) => [p.lat, p.lng]);

      setPolygons((prev) => [
        ...prev,
        { id: polygonIdCounter++, coords, color: currentColor },
      ]);

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

  // ====== ✅ เพิ่มข้อมูล: แค่ 2 ช่อง (หัวข้อเรื่อง + เนื้อหา) ======
  const [notes, setNotes] = useState([
    { id: noteIdCounter++, topic: "หัวข้อเรื่อง", content: "" },
  ]);

  const addNote = () => {
    setNotes((prev) => [
      ...prev,
      { id: noteIdCounter++, topic: "หัวข้อเรื่อง", content: "" },
    ]);
  };

  const removeNote = (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const updateNote = (id, patch) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch } : n))
    );
  };

  // ====== ✅ ปุ่มบันทึกของ "ข้อมูลอื่นๆ" ======
  const [noteSaveState, setNoteSaveState] = useState({
    saving: false,
    saved: false,
  });

  const saveNotes = async () => {
    const payload = { notes };

    try {
      setNoteSaveState({ saving: true, saved: false });
      console.log("[SAVE NOTES payload]", payload);

      // ถ้าคุณมี API จริง ให้เปิดใช้ส่วนนี้
      // await fetch(`${baseUrl}/api/plots/notes`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(payload),
      // });

      // mock success
      await new Promise((r) => setTimeout(r, 300));

      setNoteSaveState({ saving: false, saved: true });
      setTimeout(() => setNoteSaveState((s) => ({ ...s, saved: false })), 1200);
    } catch (err) {
      console.error(err);
      setNoteSaveState({ saving: false, saved: false });
      alert("บันทึกไม่สำเร็จ");
    }
  };

  // ตัวอย่าง payload ใหญ่ (หน้า SAVE ด้านล่าง)
  const buildPayload = () => ({
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
            <button className="pui-hero-btn" type="button">
              + เพิ่มแปลง
            </button>
          </div>

          <div className="pui-hero-grid">
            <div className="pui-field">
              <div className="pui-label">แปลง</div>
              <select className="pui-select" defaultValue="1">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
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
                  defaultValue="แปลง D"
                />
              </div>

              <div className="pui-field">
                <div className="pui-label-dark">ชื่อผู้ดูแล</div>
                <input
                  className="pui-input pui-input-short"
                  defaultValue="สมใจ สวัสดิ์"
                />
              </div>

              <div className="pui-field">
                <div className="pui-label-dark">ประเภทพืช</div>
                <input
                  className="pui-input pui-input-short"
                  defaultValue="ทุเรียน"
                />
              </div>

              <div className="pui-field">
                <div className="pui-label-dark">วันที่เริ่มปลูก</div>
                <input
                  className="pui-input pui-input-short"
                  defaultValue="11/02/2568"
                />
              </div>
            </div>

            {/* ===== ✅ เพิ่มข้อมูล (2 ช่อง + ปุ่มบันทึก) ===== */}
            <div className="pui-notes">
              <div className="pui-notes-head">
                <div className="pui-notes-title">
                  เพิ่มข้อมูล (หัวข้อเรื่อง + เนื้อหา)
                </div>

                <div className="pui-notes-actions">
                  <button
                    className="pui-plus"
                    type="button"
                    onClick={addNote}
                    title="เพิ่มรายการ"
                  >
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
                          onChange={(e) =>
                            updateNote(n.id, { topic: e.target.value })
                          }
                          placeholder="เช่น โซนเนินสูง"
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
                        onChange={(e) =>
                          updateNote(n.id, { content: e.target.value })
                        }
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
                  className={
                    currentColor === c.value ? "pui-color active" : "pui-color"
                  }
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
                    <span
                      className="pui-polychip"
                      style={{ background: poly.color }}
                    />
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
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI,
            Roboto, Arial, "Noto Sans Thai", "Noto Sans", sans-serif;
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
          margin: 0 0 6px 6px;
        }

        .pui-select,
        .pui-input {
          width: 100%;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 12px;
          outline: none;
          background: rgba(255, 255, 255, 0.9);
        }

        /* ✅ make these 4 inputs shorter */
        .pui-input-short {
          width: 260px;
          max-width: 100%;
        }

        .pui-textarea {
          width: 100%;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 12px;
          outline: none;
          background: rgba(255, 255, 255, 0.9);
          resize: vertical;
        }

        /* ===== NOTES ===== */
        .pui-notes {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px dashed rgba(0, 0, 0, 0.18);
        }
        .pui-notes-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .pui-notes-title {
          font-weight: 1000;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.7);
        }
        .pui-notes-actions {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .pui-plus {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: rgba(255, 255, 255, 0.85);
          font-weight: 1000;
          cursor: pointer;
        }
        .pui-save-mini {
          border: none;
          border-radius: 10px;
          padding: 9px 12px;
          font-weight: 1000;
          font-size: 12px;
          cursor: pointer;
          color: #fff;
          background: linear-gradient(180deg, #5b7cff, #4c63ff);
          box-shadow: 0 10px 18px rgba(76, 99, 255, 0.22);
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
          background: rgba(255, 255, 255, 0.55);
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 12px;
          padding: 10px;
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
          padding: 6px 10px;
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

        /* responsive */
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
      `}</style>
    </div>
  );
}
