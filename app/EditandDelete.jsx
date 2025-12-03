"use client";

export default function EditDelete() {
  return (
    <div className="du-edit-delete">
      {/* Select Plot */}
      <div className="du-card" style={{ marginBottom: 16 }}>
        <div className="du-card-title">แก้ไข / ลบแปลง และเซนเซอร์</div>
        <div className="du-form-row">
          <div className="du-field">
            <label>เลือกแปลง</label>
            <select defaultValue="A">
              <option value="A">แปลง A</option>
              <option value="B">แปลง B</option>
            </select>
          </div>
          <div className="du-field">
            <label>ประเภทเซนเซอร์</label>
            <select defaultValue="soil">
              <option value="soil">ความชื้นดิน</option>
              <option value="temp">อุณหภูมิ</option>
              <option value="npk">NPK</option>
              <option value="wind">ความเร็วลม</option>
            </select>
          </div>
        </div>
        <button className="du-btn-danger" style={{ marginTop: 8 }}>
          ลบ / ยกเลิกแปลงนี้
        </button>
      </div>

      {/* Polygon Map (เดิม + แก้ไขได้) */}
      <div className="du-card" style={{ marginBottom: 16 }}>
        <div className="du-card-title">Polygon เดิมของแปลง</div>
        <div className="map-placeholder" style={{ marginBottom: 10 }}>
          Map – Polygon ปัจจุบัน
        </div>
        <p style={{ fontSize: 12, color: "#4b5563", margin: 0 }}>
          สามารถลากแก้ไขจุดมุมของ Polygon เพื่ออัปเดตขอบเขตแปลง
        </p>
      </div>

      {/* Pin map & list */}
      <div className="du-card">
        <div className="du-card-title">Pin เซนเซอร์</div>
        <div className="map-placeholder" style={{ marginBottom: 10 }}>
          Map – ตำแหน่ง Pin เซนเซอร์
        </div>

        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            style={{
              display: "grid",
              gridTemplateColumns: "80px 1fr 1fr 60px",
              gap: 8,
              alignItems: "center",
              padding: "6px 8px",
              background: "#f1f5f9",
              borderRadius: 14,
              marginBottom: 6,
              fontSize: 13,
            }}
          >
            <div>number #{n}</div>
            <div>
              <span style={{ fontSize: 12, color: "#4b5563" }}>lat</span>{" "}
              13.0{n}234
            </div>
            <div>
              <span style={{ fontSize: 12, color: "#4b5563" }}>lon</span>{" "}
              99.2{n}567
            </div>
            <button className="du-btn-danger">🗑️</button>
          </div>
        ))}

        <button className="du-btn-primary">SAVE</button>
      </div>
    </div>
  );
}
