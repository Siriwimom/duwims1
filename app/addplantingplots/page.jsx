"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

// --- dynamic import React-Leaflet & React-Leaflet-Draw เฉพาะฝั่ง client ---
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

export default function AddPlantingPlotsPage() {
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  // เก็บ polygon ทั้งหมด
  const [polygons, setPolygons] = useState([]);
  // สีที่กำลังเลือกอยู่ (ใช้ตอนวาดใหม่)
  const [currentColor, setCurrentColor] = useState("#16a34a");

  // วาด polygon เสร็จ (กด Finish)
  const handleCreated = (e) => {
    if (e.layerType === "polygon") {
      const layer = e.layer;
      const latlngs = layer.getLatLngs()[0] || [];
      const coords = latlngs.map((p) => [p.lat, p.lng]);

      const newPoly = {
        id: polygonIdCounter++,
        coords,
        color: currentColor,
      };

      setPolygons((prev) => [...prev, newPoly]);

      // ไม่ใช้ layer เดิมของ draw → ลบออกไป
      layer.remove();
    }
  };

  // ลบ polygon ตาม id
  const handleDeletePolygon = (id) => {
    setPolygons((prev) => prev.filter((p) => p.id !== id));
  };

  // สีให้เลือก
  const colorOptions = [
    { value: "#16a34a", label: "เขียว" },
    { value: "#22c55e", label: "เขียวอ่อน" },
    { value: "#f97316", label: "ส้ม" },
    { value: "#ef4444", label: "แดง" },
    { value: "#3b82f6", label: "น้ำเงิน" },
  ];

  return (
    <div className="du-add-plot" style={{ padding: "20px 40px" }}>
      {/* Card: Filter / Info */}
      <div
        className="du-card"
        style={{
          marginBottom: 16,
          background: "linear-gradient(135deg,#40B596,#676FC7)",
          color: "#fff",
        }}
      >
        <div className="du-card-title" style={{ color: "#fff" }}>
          การจัดการ Polygons
        </div>
        <div className="du-form-row">
          <div className="du-field">
            <label>เลือกแปลง</label>
            <select defaultValue="A">
              <option value="A">แปลง A</option>
              <option value="B">แปลง B</option>
              <option value="C">แปลง C</option>
            </select>
          </div>
          <div className="du-field">
            <label>โหมด</label>
            <select defaultValue="add">
              <option value="add">เพิ่มข้อมูล</option>
              <option value="edit">แก้ไข (mock)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Form + Map */}
      <div className="du-grid-2">
        {/* Left Panel: Form */}
        <div className="du-card" style={{ background: "#fff7ed" }}>
          <div className="du-card-title">กรอกข้อมูลแปลง</div>
          <div className="du-form-row">
            <div className="du-field">
              <label>ชื่อแปลง</label>
              <input placeholder="เช่น แปลง A" defaultValue="แปลง A" />
            </div>
            <div className="du-field">
              <label>ชื่อผู้ดูแล</label>
              <input defaultValue="คุณสมชาย สวนทุเรียน" />
            </div>
          </div>

          <div className="du-form-row">
            <div className="du-field">
              <label>ประเภทพืช</label>
              <input defaultValue="ทุเรียนหมอนทอง" />
            </div>
            <div className="du-field">
              <label>วันที่ปลูก</label>
              <input defaultValue="11/03/2568" />
            </div>
          </div>

          <div className="du-field">
            <label>คำอธิบาย</label>
            <textarea
              rows={3}
              style={{
                borderRadius: 16,
                border: "1px solid var(--border-soft)",
                padding: "8px 12px",
                fontSize: 13,
              }}
              defaultValue="โซนเนินสูง น้ำไหลดี เหมาะสำหรับทดลองระบบให้น้ำอัตโนมัติ"
            />
          </div>

          <button className="du-btn-primary">SAVE</button>
        </div>

        {/* Right Panel: Map + Draw */}
        <div className="du-card">
          <div className="du-card-title">Draw Polygons on a Map</div>

          {/* ตัวเลือกสีของกรอบที่กำลังจะวาด */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              margin: "8px 0 4px",
              fontSize: 13,
            }}
          >
            <span style={{ marginRight: 4 }}>เลือกสีกรอบ:</span>
            {colorOptions.map((c) => (
              <button
                key={c.value}
                onClick={() => setCurrentColor(c.value)}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "999px",
                  border:
                    currentColor === c.value
                      ? "3px solid #111827"
                      : "2px solid #e5e7eb",
                  background: c.value,
                  cursor: "pointer",
                }}
                title={c.label}
              />
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>
            * เลือกสีด้านบนก่อน แล้วใช้ปุ่ม Polygon (บนแผนที่) เพื่อวาดกรอบแปลง
          </div>

          <div className="du-leaflet-wrapper" style={{ marginTop: 4 }}>
            <MapContainer
              center={[13.3, 101.0]}
              zoom={16}
              scrollWheelZoom={true}
              style={{ height: 360, width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <FeatureGroup>
                {/* Polygon ที่ถูกบันทึกแล้ว – แสดงเป็นสีที่เลือก */}
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
                    marker: false,
                    circle: false,
                    rectangle: false,
                    polyline: false,
                    circlemarker: false,
                    polygon: {
                      allowIntersection: false,
                      showArea: true,
                      shapeOptions: {
                        color: currentColor,
                        fillColor: currentColor,
                        fillOpacity: 0.25,
                      },
                    },
                  }}
                  // ไม่ให้ใช้ปุ่ม edit/remove ของ plugin (เราจัดการเอง)
                  edit={{ edit: false, remove: false }}
                />
              </FeatureGroup>
            </MapContainer>
          </div>

          {/* รายการ polygon + ปุ่มลบ */}
          {polygons.length > 0 && (
            <div
              style={{
                marginTop: 10,
                paddingTop: 8,
                borderTop: "1px dashed #e5e7eb",
                fontSize: 12,
              }}
            >
              <div style={{ marginBottom: 4, fontWeight: 600 }}>
                กรอบที่วาดไว้ ({polygons.length})
              </div>
              <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}>
                {polygons.map((poly) => (
                  <li
                    key={poly.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "4px 0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span># {poly.id}</span>
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 999,
                          background: poly.color,
                          border: "1px solid #e5e7eb",
                        }}
                      />
                      <span style={{ color: "#6b7280" }}>
                        จุด {poly.coords.length} จุด
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeletePolygon(poly.id)}
                      style={{
                        fontSize: 11,
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: "none",
                        background: "#fee2e2",
                        color: "#b91c1c",
                        cursor: "pointer",
                      }}
                    >
                      ลบกรอบ
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
