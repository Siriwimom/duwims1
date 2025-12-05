"use client";

export default function AddSensor() {
  return (
    <div className="du-add-sensor">
      {/* Top gradient bar: เลือกแปลง / Node / Sensor type */}
      <div
        className="du-card"
        style={{
          marginBottom: 16,
          background: "linear-gradient(135deg,#1d4ed8,#a855f7)",
          color: "#fff",
        }}
      >
        <div className="du-card-title" style={{ color: "#fff" }}>
          การจัดการ PIN และ Sensor
        </div>
        <div className="du-form-row">
          <div className="du-field">
            <label>เลือกแปลง</label>
            <select defaultValue="A">
              <option value="A">แปลง A</option>
              <option value="B">แปลง B</option>
            </select>
          </div>
          <div className="du-field">
            <label>Node</label>
            <select defaultValue="1">
              <option value="1">Node 1</option>
              <option value="2">Node 2</option>
            </select>
          </div>
        </div>
        <div className="du-form-row">
          <div className="du-field">
            <label>ประเภทเซนเซอร์</label>
            <select defaultValue="soil">
              <option value="soil">ความชื้นดิน</option>
              <option value="temp">อุณหภูมิ</option>
              <option value="npk">NPK</option>
            </select>
          </div>
          <div className="du-field">
            <label>Polygon แปลง</label>
            <select defaultValue="polygon1">
              <option value="polygon1">polygon #1</option>
              <option value="polygon2">polygon #2</option>
            </select>
          </div>
        </div>
      </div>

      {/* Plot info + map pin */}
      <div className="du-card" style={{ marginBottom: 16 }}>
        <div className="du-card-title">ข้อมูลแปลง</div>
        <div className="du-form-row">
          <div className="du-field">
            <label>ชื่อแปลง</label>
            <input defaultValue="แปลง A" />
          </div>
          <div className="du-field">
            <label>วันที่ปลูก</label>
            <input defaultValue="11/03/2568" />
          </div>
        </div>
        <div className="du-form-row">
          <div className="du-field">
            <label>ผู้ดูแล</label>
            <input defaultValue="คุณสมชาย สวนทุเรียน" />
          </div>
          <div className="du-field">
            <label>จำนวน PIN ปัจจุบัน</label>
            <input defaultValue="3 จุด" />
          </div>
        </div>
      </div>

      <div className="du-card" style={{ marginBottom: 16 }}>
        <div className="du-card-title">Pin บนแผนที่</div>
        <div className="map-placeholder" style={{ height: 220 }}>
          Map – pin เซนเซอร์
        </div>
      </div>

      {/* Pin list */}
      <div className="du-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <div className="du-card-title">Pin number #1</div>
          <button className="du-btn-primary">+ เพิ่ม Pin</button>
        </div>

        {[1, 2, 3].map((n) => (
          <div
            key={n}
            style={{
              background: n === 1 ? "#fce7f3" : "#e0f2fe",
              borderRadius: 16,
              padding: "8px 10px",
              marginBottom: 6,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              📍 เซนเซอร์ความชื้นดิน #{n}
            </div>
            <div style={{ fontSize: 12, color: "#4b5563" }}>
              lat 13.0{n} / lon 99.28{n} – NPK: 45 ppm – RH: 76%
            </div>
          </div>
        ))}

        <button className="du-btn-primary">SAVE</button>
      </div>
    </div>
  );
}
