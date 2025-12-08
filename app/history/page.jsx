"use client";

import TopBar from "../TopBar";

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
  return (
    <div style={pageStyle}>
      

      <main style={bodyStyle} className="du-history">
        {/* FILTER PANEL */}
        <div
          className="du-card"
          style={{
            ...cardBase,
            marginBottom: 16,
            background: "linear-gradient(135deg,#0f766e,#22c55e)",
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
              <label style={{ display: "block", marginBottom: 4 }}>
                วันที่เริ่มต้น
              </label>
              <input
                type="date"
                defaultValue="2025-09-01"
                style={{
                  width: "100%",
                  borderRadius: 14,
                  border: "none",
                  padding: "6px 10px",
                  fontSize: 13,
                }}
              />
            </div>
            <div className="du-field" style={{ fontSize: 13 }}>
              <label style={{ display: "block", marginBottom: 4 }}>
                วันที่สิ้นสุด
              </label>
              <input
                type="date"
                defaultValue="2025-09-30"
                style={{
                  width: "100%",
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
              <label style={{ display: "block", marginBottom: 4 }}>
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
              <label style={{ display: "block", marginBottom: 4 }}>โหนด</label>
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

        {/* ACTIVE CONTAINERS STATUS */}
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

        {/* GRAPH SECTION */}
        <div className="du-card" style={{ ...cardBase, marginBottom: 16 }}>
          <div
            className="du-card-title"
            style={{ fontSize: 18, fontWeight: 700 }}
          >
            กราฟแสดงค่าข้อมูลย้อนหลัง
          </div>
          <p
            style={{
              fontSize: 12,
              marginTop: 4,
              marginBottom: 10,
              color: "#4b5563",
            }}
          >
            ค่าความชื้นดินเฉลี่ยรายชั่วโมง – โหนด 1, เซนเซอร์ความชื้นดิน A
          </p>
          <div
            className="graph-placeholder"
            style={{
              borderRadius: 22,
              background:
                "linear-gradient(135deg,#e0f2fe 0%,#fef9c3 50%,#dcfce7 100%)",
              height: 260,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              color: "#0f172a",
              fontWeight: 500,
            }}
          >
            Graph Placeholder – ความชื้นดิน (%)
          </div>
        </div>

        {/* SUMMARY TABLE */}
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
