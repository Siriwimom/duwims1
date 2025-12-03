"use client";

export default function AddPlot() {
  return (
    <div className="du-add-plot">
      {/* selector ด้านบน */}
      <div
        className="du-card"
        style={{
          marginBottom: 16,
          background: "linear-gradient(135deg,#2563eb,#22c55e)",
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
              <option value="edit">แก้ไข</option>
            </select>
          </div>
        </div>
      </div>

      {/* Plot information + Map polygon */}
      <div className="du-grid-2">
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

        <div className="du-card">
          <div className="du-card-title">Draw Polygons on a Map</div>
          <div className="map-placeholder" style={{ height: 260 }}>
            Map + Polygon Drawing Controls (mock)
          </div>
        </div>
      </div>
    </div>
  );
}
