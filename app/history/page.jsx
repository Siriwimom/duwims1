"use client";

// import TopBar from "../TopBar"; // ถ้าใช้ TopBar ผ่าน layout แล้ว ไม่ต้อง import ก็ได้

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

const cardBase = {
  background: "#f9fafb",
  borderRadius: 24,
  padding: "18px 20px",
  boxShadow: "0 4px 10px rgba(15,23,42,0.12)",
};

export default function HistoryPage() {
  // ข้อมูลตัวอย่างค่าความชื้นดินรายชั่วโมง
  const soilSeries = [
    { time: "08:00", value: 68 },
    { time: "10:00", value: 72 },
    { time: "12:00", value: 78 },
    { time: "14:00", value: 81 },
    { time: "16:00", value: 76 },
    { time: "18:00", value: 70 },
    { time: "20:00", value: 65 },
  ];

  const values = soilSeries.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  const avgVal =
    Math.round(
      (values.reduce((sum, v) => sum + v, 0) / values.length) * 10
    ) / 10;

  const lastPoint = soilSeries[soilSeries.length - 1];
  const currentVal = lastPoint.value;

  return (
    <div style={pageStyle}>
      <main style={bodyStyle} className="du-history">
        {/* ===== FILTER PANEL ===== */}
        <div
          className="du-card"
          style={{
            ...cardBase,
            marginBottom: 16,
            background: "linear-gradient(135deg,#40B596,#676FC7)",
            color: "#fff",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 10,
              alignItems: "center",
            }}
          >
            <div
              className="du-card-title"
              style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}
            >
              ฟิลเตอร์ข้อมูลย้อนหลัง
            </div>
            <span style={{ fontSize: 12, opacity: 0.9 }}>
              เลือกช่วงวันที่ / เซนเซอร์ / โหนด เพื่อดูข้อมูลย้อนหลังและกราฟ
            </span>
          </div>

          {/* quick chips */}
          <div style={{ marginBottom: 10, fontSize: 12 }}>
            <span style={{ marginRight: 6 }}>ช่วงเวลาเร็ว:</span>
            {["วันนี้", "7 วันล่าสุด", "30 วันล่าสุด"].map((l, idx) => (
              <button
                key={l}
                style={{
                  borderRadius: 999,
                  border: "none",
                  padding: "4px 10px",
                  marginRight: 6,
                  fontSize: 11,
                  cursor: "pointer",
                  background: idx === 1 ? "#facc15" : "rgba(255,255,255,0.18)",
                  color: "#0f172a",
                  fontWeight: 600,
                }}
              >
                {l}
              </button>
            ))}
          </div>

          {/* form rows */}
          <div
            className="du-form-row"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,minmax(0,1fr))",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div className="du-field" style={{ fontSize: 13 }}>
              <label style={{ display: "block", marginBottom: 4 ,color: "#fff"}}>
                วันที่เริ่มต้น
              </label>
              <input
                type="date"
                defaultValue="2025-09-01"
                style={{
                  width: "515px",
                  borderRadius: 14,
                  border: "none",
                  padding: "6px 10px",
                  fontSize: 13,
                }}
              />
            </div>
            <div className="du-field" style={{ fontSize: 13 }}>
              <label style={{ display: "block", marginBottom: 4 ,color: "#fff"}}>
                วันที่สิ้นสุด
              </label>
              <input
                type="date"
                defaultValue="2025-09-30"
                style={{
                  width: "515px",
                  borderRadius: 14,
                  border: "none",
                  padding: "6px 10px",
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          <div
            className="du-form-row"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,minmax(0,1fr))",
              gap: 12,
            }}
          >
            <div className="du-field" style={{ fontSize: 13 }}>
              <label style={{ display: "block", marginBottom: 4 ,color: "#fff"}}>
                ประเภทเซนเซอร์
              </label>
              <select
                defaultValue="soil"
                style={{
                  width: "100%",
                  borderRadius: 14,
                  border: "none",
                  padding: "6px 10px",
                  fontSize: 13,
                }}
              >
                <option value="soil">ความชื้นดิน</option>
                <option value="temp">อุณหภูมิ</option>
                <option value="rh">ความชื้นสัมพัทธ์</option>
                <option value="npk">NPK</option>
              </select>
            </div>
            <div className="du-field" style={{ fontSize: 13 }}>
              <label style={{ display: "block", marginBottom: 4 ,color:"#fff"}}>โหนด</label>
              <select
                defaultValue="all"
                style={{
                  width: "100%",
                  borderRadius: 14,
                  border: "none",
                  padding: "6px 10px",
                  fontSize: 13,
                }}
              >
                <option value="all">ทั้งหมด</option>
                <option value="1">Node 1</option>
                <option value="2">Node 2</option>
                <option value="3">Node 3</option>
              </select>
            </div>
          </div>
        </div>

        {/* ===== SUMMARY BADGE ROW: 4 กล่องสรุปค่า ===== */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,minmax(0,1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          {/* ค่าปัจจุบัน */}
          <div
            style={{
              ...cardBase,
              padding: "12px 14px",
              borderRadius: 18,
              background:
                "linear-gradient(135deg,#dbeafe 0%,#eff6ff 45%,#ffffff 100%)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#64748b",
                marginBottom: 4,
                fontWeight: 500,
              }}
            >
              ค่าปัจจุบัน
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#1d4ed8" }}>
              {currentVal}%
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>
              อัปเดตล่าสุด {lastPoint.time}
            </div>
          </div>

          {/* ค่าเฉลี่ย */}
          <div
            style={{
              ...cardBase,
              padding: "12px 14px",
              borderRadius: 18,
              background:
                "linear-gradient(135deg,#dcfce7 0%,#ecfdf5 45%,#ffffff 100%)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#166534",
                marginBottom: 4,
                fontWeight: 500,
              }}
            >
              ค่าเฉลี่ยช่วงที่เลือก
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#16a34a" }}>
              {avgVal}%
            </div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              ความชื้นเฉลี่ยของเซนเซอร์นี้
            </div>
          </div>

          {/* ต่ำสุด */}
          <div
            style={{
              ...cardBase,
              padding: "12px 14px",
              borderRadius: 18,
              background:
                "linear-gradient(135deg,#fef9c3 0%,#fffbeb 45%,#ffffff 100%)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#92400e",
                marginBottom: 4,
                fontWeight: 500,
              }}
            >
              ค่าต่ำสุด
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#f97316" }}>
              {minVal}%
            </div>
            <div style={{ fontSize: 11, color: "#a3a3a3" }}>
              ช่วงที่ดินค่อนข้างแห้ง
            </div>
          </div>

          {/* สูงสุด */}
          <div
            style={{
              ...cardBase,
              padding: "12px 14px",
              borderRadius: 18,
              background:
                "linear-gradient(135deg,#fee2e2 0%,#fef2f2 45%,#ffffff 100%)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#b91c1c",
                marginBottom: 4,
                fontWeight: 500,
              }}
            >
              ค่าสูงสุด
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#dc2626" }}>
              {maxVal}%
            </div>
            <div style={{ fontSize: 11, color: "#b91c1c" }}>
              ถ้าเกิน 80% อาจต้องชะลอการให้น้ำ
            </div>
          </div>
        </section>

        {/* ===== ACTIVE CONTAINERS STATUS ===== */}
        <div className="du-card" style={{ ...cardBase, marginBottom: 16 }}>
          <div
            className="du-card-title"
            style={{ marginBottom: 10, fontSize: 18, fontWeight: 700 }}
          >
            Active Containers Status
          </div>
          <table className="du-table" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>สถานะ</th>
                <th>โหนด</th>
                <th>วันที่ล่าสุด</th>
                <th>สัดส่วนข้อมูล</th>
                <th style={{ textAlign: "right" }}>EXPORT</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: "#fee2e2" }}>
                <td>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "#ef4444",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    🟥 ผิดปกติ
                  </span>
                </td>
                <td>Node 1</td>
                <td>01/09/2568</td>
                <td>
                  <div
                    style={{
                      background: "#fecaca",
                      borderRadius: 999,
                      overflow: "hidden",
                      height: 8,
                    }}
                  >
                    <div
                      style={{
                        width: "66%",
                        height: "100%",
                        background: "#b91c1c",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 11 }}>66%</span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    className="du-btn-danger"
                    style={{
                      borderRadius: 999,
                      padding: "4px 10px",
                      fontSize: 12,
                      border: "none",
                      background: "#b91c1c",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    EXPORT CSV
                  </button>
                </td>
              </tr>
              <tr style={{ background: "#dcfce7" }}>
                <td>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "#22c55e",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    🟩 ปกติ
                  </span>
                </td>
                <td>Node 2</td>
                <td>04/09/2568</td>
                <td>
                  <div
                    style={{
                      background: "#bbf7d0",
                      borderRadius: 999,
                      overflow: "hidden",
                      height: 8,
                    }}
                  >
                    <div
                      style={{
                        width: "95%",
                        height: "100%",
                        background: "#16a34a",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 11 }}>95%</span>
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        {/* ===== GRAPH SECTION – กราฟความชื้นแบบในรูป ===== */}
        <div
          className="du-card"
          style={{
            ...cardBase,
            marginBottom: 16,
            background:
              "linear-gradient(180deg,#e0f2fe 0%,#eff6ff 35%,#ffffff 100%)",
          }}
        >
          <div
            className="du-card-title"
            style={{ fontSize: 18, fontWeight: 700 }}
          >
            กราฟแสดงค่าตามเวลา
          </div>
          <p
            style={{
              fontSize: 12,
              marginTop: 2,
              marginBottom: 10,
              color: "#4b5563",
            }}
          >
            เซนเซอร์ความชื้นดิน #1 • ความชื้นดิน • แปลง A
          </p>

          <div
            style={{
              borderRadius: 18,
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              padding: "10px 12px 6px",
            }}
          >
            <svg
              viewBox="0 0 100 60"
              preserveAspectRatio="none"
              style={{ width: "100%", height: 220 }}
            >
              {[10, 20, 30, 40, 50].map((y) => (
                <line
                  key={y}
                  x1="6"
                  x2="98"
                  y1={y}
                  y2={y}
                  stroke="#e5edf7"
                  strokeWidth="0.4"
                />
              ))}

              <line
                x1="6"
                x2="6"
                y1="6"
                y2="54"
                stroke="#cbd5e1"
                strokeWidth="0.6"
              />

              {[
                { y: 50, t: "20" },
                { y: 40, t: "30" },
                { y: 30, t: "40" },
                { y: 20, t: "50" },
                { y: 10, t: "60" },
              ].map((p) => (
                <text
                  key={p.y}
                  x="2"
                  y={p.y + 1.5}
                  fontSize="2"
                  fill="#94a3b8"
                >
                  {p.t}
                </text>
              ))}

              <text x="2" y="7" fontSize="3" fill="#94a3b8">
                %
              </text>

              <defs>
                <linearGradient id="moistBlue" x1="0" x2="0" y1="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="#60a5fa"
                    stopOpacity="0.45"
                  />
                  <stop
                    offset="100%"
                    stopColor="#60a5fa"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>

              <polygon
                fill="url(#moistBlue)"
                points="
                  6,32  12,20  18,23  24,21  30,24  36,22  42,19  48,24
                  54,22 60,25  66,23  72,26  78,21  84,24  90,22 96,27
                  96,54 6,54
                "
              />

              <polyline
                fill="none"
                stroke="#2563eb"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="
                  6,32  12,20  18,23  24,21  30,24  36,22  42,19  48,24
                  54,22 60,25  66,23  72,26  78,21  84,24  90,22 96,27
                "
              />

              {[
                [6, 32],
                [12, 20],
                [18, 23],
                [24, 21],
                [30, 24],
                [36, 22],
                [42, 19],
                [48, 24],
                [54, 22],
                [60, 25],
                [66, 23],
                [72, 26],
                [78, 21],
                [84, 24],
                [90, 22],
                [96, 27],
              ].map(([x, y], i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="0.9"
                  fill="#2563eb"
                  stroke="#ffffff"
                  strokeWidth="0.3"
                />
              ))}
            </svg>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 4,
                padding: "0 4px",
              }}
            >
              {[
                "21 ส.ค.",
                "22 ส.ค.",
                "23 ส.ค.",
                "24 ส.ค.",
                "25 ส.ค.",
                "26 ส.ค.",
                "27 ส.ค.",
                "28 ส.ค.",
              ].map((d) => (
                <span
                  key={d}
                  style={{
                    fontSize: 10,
                    color: "#94a3b8",
                    transform: "rotate(-30deg)",
                    transformOrigin: "left top",
                    display: "inline-block",
                  }}
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ===== SUMMARY TABLE ===== */}
        <div className="du-card" style={cardBase}>
          <div
            className="du-card-title"
            style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}
          >
            สรุปการวัดข้อมูล
          </div>
          <table className="du-table" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th>เซนเซอร์</th>
                <th>โหนด</th>
                <th>ค่าเฉลี่ย</th>
                <th>ค่าสูงสุด</th>
                <th>ค่าต่ำสุด</th>
                <th>จำนวนข้อมูล</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: "#f9fafb" }}>
                <td>ความชื้นดิน A</td>
                <td>Node 1</td>
                <td>72%</td>
                <td>94%</td>
                <td>48%</td>
                <td>1,280</td>
              </tr>
              <tr style={{ background: "#eef2ff" }}>
                <td>อุณหภูมิอากาศ</td>
                <td>Node 2</td>
                <td>31.3°C</td>
                <td>36.0°C</td>
                <td>26.1°C</td>
                <td>1,140</td>
              </tr>
              <tr style={{ background: "#fef9c3" }}>
                <td>NPK</td>
                <td>Node 3</td>
                <td>23.1%</td>
                <td>30.2%</td>
                <td>15.4%</td>
                <td>640</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
