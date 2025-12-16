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

export default function AddPlantingPlotsPage() {
  const [baseUrl, setBaseUrl] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

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

  return (
    <div className="du-add-plot">
      {/* ===== Header Card ===== */}
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

      {/* ===== Form + Map ===== */}
      <div className="du-grid-2">
        {/* Left: Form */}
        <div className="du-card" style={{ background: "#fff7ed" }}>
          <div className="du-card-title">กรอกข้อมูลแปลง</div>

          <div className="du-form-row">
            <div className="du-field">
              <label>ชื่อแปลง</label>
              <input defaultValue="แปลง A" />
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
            <textarea rows={3} defaultValue="โซนเนินสูง น้ำไหลดี" />
          </div>

          <button className="du-btn-primary">SAVE</button>
        </div>

        {/* Right: Map */}
        <div className="du-card">
          <div className="du-card-title">Draw Polygons on Map</div>

          {/* Color picker */}
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              margin: "6px 0",
            }}
          >
            {colorOptions.map((c) => (
              <button
                key={c.value}
                onClick={() => setCurrentColor(c.value)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "999px",
                  border:
                    currentColor === c.value
                      ? "3px solid #111827"
                      : "2px solid #e5e7eb",
                  background: c.value,
                }}
                title={c.label}
              />
            ))}
          </div>

          {/* Map */}
          <div className="du-leaflet-wrapper">
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
          </div>

          {/* Polygon list */}
          {polygons.length > 0 && (
            <div
              style={{
                marginTop: 10,
                borderTop: "1px dashed #e5e7eb",
                paddingTop: 6,
                fontSize: 12,
              }}
            >
              {polygons.map((poly) => (
                <div
                  key={poly.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <span># {poly.id}</span>
                  <button
                    onClick={() => handleDeletePolygon(poly.id)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: "none",
                      background: "#fee2e2",
                      color: "#b91c1c",
                    }}
                  >
                    ลบ
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
