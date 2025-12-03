"use client";

import TopBar from "./TopBar";

const pageStyle = {
  fontFamily:
    '"Prompt", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  background: "#e5edf8",
  minHeight: "100vh",
  color: "#111827",
};

const bodyStyle = {
  maxWidth: 1120,
  margin: "22px auto 40px",
  padding: "0 16px 30px",
};

export default function DashboardPage() {
  return (
    <div >
      

      <main  className="du-dashboard">
        {/* แถวบน: พยากรณ์ + ค่า ณ ปัจจุบัน + คำแนะนำ */}
        <div className="du-grid-3" style={{ marginBottom: 16 }}>
          {/* พยากรณ์ 7 วัน */}
          <div className="du-card">
            <div className="du-card-title">พยากรณ์อากาศ 7 วันข้างหน้า</div>
            <div className="du-grid-4" style={{ marginTop: 8 }}>
              {[
                { day: "จันทร์", temp: "32°", rain: "40%" },
                { day: "อังคาร", temp: "31°", rain: "60%" },
                { day: "พุธ", temp: "30°", rain: "80%" },
                { day: "พฤหัส", temp: "32°", rain: "20%" },
                { day: "ศุกร์", temp: "34°", rain: "10%" },
                { day: "เสาร์", temp: "31°", rain: "50%" },
                { day: "อาทิตย์", temp: "32°", rain: "30%" },
              ].map((d) => (
                <div
                  key={d.day}
                  style={{
                    background: "#f3f7ff",
                    borderRadius: 14,
                    padding: 8,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{d.day}</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{d.temp}</div>
                  <div style={{ fontSize: 12, color: "#4b5563" }}>
                    โอกาสฝนตก {d.rain}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ค่าอุณหภูมิ/โอกาสฝน + Smart Advisory short */}
          <div className="du-card">
            <div className="du-card-title">อุณหภูมิปัจจุบัน</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
              25 – 32 °C
            </div>
            <div style={{ fontSize: 13, color: "#4b5563", marginBottom: 10 }}>
              เหมาะสมกับการเจริญเติบโตของทุเรียน
            </div>

            <div
              style={{
                background: "#fff7cc",
                borderRadius: 14,
                padding: 10,
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>โอกาสฝนตก</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>40%</div>
              <div style={{ fontSize: 12, color: "#4b5563" }}>
                ฝนตกเล็กน้อยช่วงบ่าย
              </div>
            </div>

            <div
              style={{
                background: "#dcfce7",
                borderRadius: 14,
                padding: 10,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                Smart Advisory
              </div>
              <div style={{ fontSize: 12 }}>
                📡 ระบบวิเคราะห์ข้อมูลจากเซนเซอร์ + พยากรณ์อากาศ
                เพื่อสร้างคำแนะนำอัจฉริยะให้เกษตรกร
              </div>
            </div>
          </div>

          {/* คำแนะนำ */}
          <div className="du-card" style={{ background: "#fee2e2" }}>
            <div className="du-card-title">คำแนะนำ</div>
            <p style={{ fontSize: 14, margin: 0 }}>
              ควรชะลอการรดน้ำในช่วงเย็น เนื่องจากอากาศชื้นสูง
              และมีโอกาสฝนตกในอีก 2–3 วันข้างหน้า
            </p>
            <p style={{ fontSize: 12, marginTop: 10 }}>
              ⚠️ หากความชื้นในดิน &gt; 80%
              ระบบจะเตือนให้หยุดรดน้ำอัตโนมัติ
            </p>
          </div>
        </div>

        {/* แถวกลาง : แผนที่ + สถานะอุปกรณ์ + ปัญหาพื้นที่ */}
        <div className="du-grid-3" style={{ marginBottom: 16 }}>
          <div className="du-card">
            <div className="du-card-title">แผนที่และการทำงาน</div>
            <div className="map-placeholder">Map – พื้นที่สวนทุเรียน</div>
          </div>

          <div className="du-card">
            <div className="du-card-title">สถานะการทำงานของอุปกรณ์</div>
            <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>
              3 <span style={{ fontSize: 14 }}>เครื่อง</span>
            </div>
            <div className="du-tag du-badge-success">ON 3 เครื่อง</div>
            <div className="du-tag" style={{ marginLeft: 8 }}>
              OFF 0 เครื่อง
            </div>
          </div>

          <div className="du-card">
            <div className="du-card-title">ปัญหาพื้นที่</div>
            <p style={{ fontSize: 13, marginBottom: 4 }}>
              ตรวจพบความชื้นเกินเกณฑ์ที่ PIN 3
            </p>
            <span className="du-tag du-badge-danger">
              ⚠️ ต้องตรวจสอบระบบให้น้ำ
            </span>
          </div>
        </div>

        {/* แถวล่าง : ข้อมูล Pin 1–3 แบบการ์ด */}
        <div className="du-grid-3">
          {[1, 2, 3].map((pin) => (
            <div
              key={pin}
              className="du-card"
              style={{
                background:
                  pin === 2
                    ? "#e0f7ff"
                    : pin === 3
                    ? "#ffe4e6"
                    : "#e0ffe5",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <div className="du-card-title">ข้อมูล : Pin {pin}</div>
                <span className="du-tag du-badge-success">ON</span>
              </div>
              <table className="du-table">
                <tbody>
                  <tr>
                    <th>ความชื้นในดิน</th>
                    <td>{pin === 3 ? "92%" : pin === 2 ? "78%" : "65%"}</td>
                  </tr>
                  <tr>
                    <th>อุณหภูมิ</th>
                    <td>{pin === 3 ? "34°C" : "31°C"}</td>
                  </tr>
                  <tr>
                    <th>ความชื้นสัมพัทธ์</th>
                    <td>{pin === 3 ? "88%" : "72%"}</td>
                  </tr>
                  <tr>
                    <th>NPK</th>
                    <td>N: 15 &nbsp;P: 8 &nbsp;K: 12</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
