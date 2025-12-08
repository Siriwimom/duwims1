"use client";

import TopBar from "./TopBar";

const pageStyle = {
  fontFamily:
    '"Prompt", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  background: "#e5edf8", // พื้นหลังเทาอมน้ำเงินเหมือนรูป
  minHeight: "100vh",
  color: "#111827",
};

const bodyStyle = {
  maxWidth: 1120,
  margin: "22px auto 40px",
  padding: "0 16px 30px",
};

const cardBase = {
  background: "#f9fafb",
  borderRadius: 24,
  padding: "18px 20px",
  boxShadow: "0 4px 10px rgba(15,23,42,0.12)",
};

const grid3  = {
  display: "grid",
  gridTemplateColumns: "2fr 1.1fr 1.1fr", // ซ้ายกว้าง ขวา 2 ช่องเท่ากัน
  gap: 16,
};

const grid4  = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: 8,
};

export default function DashboardPage() {
  return (
    <div style={pageStyle}>
      

      <main style={bodyStyle} className="du-dashboard">
        {/* แถวบน: พยากรณ์ + ค่า ณ ปัจจุบัน + คำแนะนำ */}
        <div style={{ ...grid3, marginBottom: 16 }}>
          {/* พยากรณ์ 7 วัน */}
          <div style={cardBase} className="du-card">
            <div
              className="du-card-title"
              style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}
            >
              พยากรณ์อากาศ 7 วันข้างหน้า
            </div>
            <div style={{ ...grid4, marginTop: 8 }} className="du-grid-4">
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
                    background: "#eef3ff",
                    borderRadius: 18,
                    padding: "8px 4px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{d.day}</div>

                  {/* ไอคอนเมฆ/ฝนแบบง่าย ๆ */}
                  <div
                    style={{
                      fontSize: 20,
                      margin: "4px 0",
                    }}
                  >
                    🌤️
                  </div>

                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      lineHeight: 1.1,
                    }}
                  >
                    {d.temp}
                  </div>
                  <div style={{ fontSize: 11, color: "#4b5563" }}>
                    โอกาสฝนตก {d.rain}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ค่าอุณหภูมิ/โอกาสฝน + Smart Advisory short */}
          <div style={cardBase} className="du-card">
            <div
              className="du-card-title"
              style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}
            >
              อุณหภูมิปัจจุบัน
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                marginBottom: 4,
                color: "#0f766e",
              }}
            >
              25 – 32 °C
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#4b5563",
                marginBottom: 12,
              }}
            >
              เหมาะสมกับการเจริญเติบโตของทุเรียน
            </div>

            <div
              style={{
                background: "#fef9c3",
                borderRadius: 18,
                padding: "10px 12px",
                marginBottom: 10,
              }}
            >
              <div
                style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}
              >
                โอกาสฝนตก
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  marginBottom: 2,
                }}
              >
                40%
              </div>
              <div style={{ fontSize: 12, color: "#4b5563" }}>
                ฝนตกเล็กน้อยช่วงบ่าย
              </div>
            </div>

            <div
              style={{
                background: "#dcfce7",
                borderRadius: 18,
                padding: "10px 12px",
              }}
            >
              <div
                style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}
              >
                Smart Advisory
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                📡 ระบบวิเคราะห์ข้อมูลจากเซนเซอร์ + พยากรณ์อากาศ
                เพื่อสร้างคำแนะนำอัจฉริยะให้เกษตรกร
              </div>
            </div>
          </div>

          {/* คำแนะนำ – พื้นหลังแดงเต็มเหมือนรูป */}
          <div
            className="du-card"
            style={{
              ...cardBase,
              background: "#ef4444",
              color: "#ffffff",
            }}
          >
            <div
              className="du-card-title"
              style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}
            >
              คำแนะนำ
            </div>
            <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6 }}>
              ควรเตรียมระบบน้ำในแปลง เนื่องจากคาดว่าจะมีฝนตกหนักในอีก
              2–3 วันข้างหน้า
            </p>
            <p style={{ fontSize: 12, marginTop: 10 }}>
              ⚠️ หากความชื้นในดิน &gt; 80% ระบบจะเตือนให้หยุดรดน้ำอัตโนมัติ
            </p>
          </div>
        </div>

        {/* แถวกลาง : แผนที่ + สถานะอุปกรณ์ + ปัญหาพื้นที่ */}
        <div style={{ ...grid3, marginBottom: 16 }} className="du-grid-3">
          {/* แผนที่ */}
          <div style={cardBase} className="du-card">
            <div
              className="du-card-title"
              style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}
            >
              แผนที่และทรัพยากร
            </div>
            <div
              className="map-placeholder"
              style={{
                borderRadius: 22,
                background:
                  "linear-gradient(135deg, #dbeafe 0%, #bbf7d0 50%, #fed7aa 100%)",
                height: 220,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                color: "#0f172a",
                fontWeight: 500,
              }}
            >
              แผนที่พื้นที่สวนทุเรียน
            </div>
          </div>

          {/* สถานะอุปกรณ์ */}
          <div style={cardBase} className="du-card">
            <div
              className="du-card-title"
              style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}
            >
              สถานะการทำงานของอุปกรณ์
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 6,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "#15803d",
                }}
              >
                3
              </span>
              <span style={{ fontSize: 14 }}>เครื่องกำลังทำงาน</span>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <span
                className="du-tag du-badge-success"
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "#22c55e",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                ON 3 เครื่อง
              </span>
              <span
                className="du-tag"
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "#e5e7eb",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                OFF 0 เครื่อง
              </span>
            </div>
          </div>

          {/* ปัญหาพื้นที่ */}
          <div style={cardBase} className="du-card">
            <div
              className="du-card-title"
              style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}
            >
              ปัญหาพื้นที่
            </div>
            <p style={{ fontSize: 13, marginBottom: 6 }}>
              ตรวจพบความชื้นเกินเกณฑ์ที่ PIN 3
            </p>
            <span
              className="du-tag du-badge-danger"
              style={{
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: 999,
                background: "#f97316",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              ⚠️ ต้องตรวจสอบระบบให้น้ำ
            </span>
          </div>
        </div>

        {/* แถวล่าง : ข้อมูล Pin 1–3 */}
        <div style={grid3} className="du-grid-3">
          {[1, 2, 3].map((pin) => {
            const bg =
              pin === 1 ? "#e0ffe5" : pin === 2 ? "#e0f7ff" : "#ffe4e6";

            return (
              <div
                key={pin}
                className="du-card"
                style={{ ...cardBase, background: bg }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <div
                    className="du-card-title"
                    style={{ fontSize: 16, fontWeight: 700 }}
                  >
                    ข้อมูล : Pin {pin}
                  </div>
                  <span
                    className="du-tag du-badge-success"
                    style={{
                      padding: "4px 12px",
                      borderRadius: 999,
                      background: "#22c55e",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    ON
                  </span>
                </div>

                {/* ตารางข้อมูลให้ฟีลเหมือนในรูป */}
                <table
                  className="du-table"
                  style={{
                    width: "100%",
                    borderCollapse: "separate",
                    borderSpacing: 0,
                    fontSize: 12,
                  }}
                >
                  <tbody>
                    <tr>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "6px 8px",
                          fontWeight: 600,
                          width: "50%",
                        }}
                      >
                        เซนเซอร์ความชื้นในดิน
                      </th>
                      <td
                        style={{
                          padding: "6px 8px",
                          background:
                            pin === 3 ? "#fed7aa" : "rgba(255,255,255,0.7)",
                        }}
                      >
                        {pin === 3 ? "92% (เกินเกณฑ์)" : "65–78%"}
                      </td>
                    </tr>
                    <tr>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "6px 8px",
                          fontWeight: 600,
                        }}
                      >
                        อุณหภูมิอากาศ
                      </th>
                      <td
                        style={{
                          padding: "6px 8px",
                          background: "rgba(255,255,255,0.7)",
                        }}
                      >
                        {pin === 3 ? "34°C" : "31°C"}
                      </td>
                    </tr>
                    <tr>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "6px 8px",
                          fontWeight: 600,
                        }}
                      >
                        ความชื้นสัมพัทธ์
                      </th>
                      <td
                        style={{
                          padding: "6px 8px",
                          background: "rgba(255,255,255,0.7)",
                        }}
                      >
                        {pin === 3 ? "88%" : "72%"}
                      </td>
                    </tr>
                    <tr>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "6px 8px",
                          fontWeight: 600,
                        }}
                      >
                        ค่า NPK
                      </th>
                      <td
                        style={{
                          padding: "6px 8px",
                          background: "rgba(255,255,255,0.7)",
                        }}
                      >
                        N: 15 &nbsp; P: 8 &nbsp; K: 12
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
