"use client";

export default function History() {
  return (
    <div className="du-history">
      {/* Filter Panel */}
      <div
        className="du-card"
        style={{
          marginBottom: 16,
          background: "linear-gradient(135deg,#0f766e,#22c55e)",
          color: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div className="du-card-title" style={{ color: "#fff" }}>
            ฟิลเตอร์ข้อมูล
          </div>
          <span style={{ fontSize: 12 }}>
            เลือกช่วงวันที่ / เซนเซอร์ / โหนด เพื่อดูข้อมูลย้อนหลัง
          </span>
        </div>

        <div className="du-form-row">
          <div className="du-field">
            <label>วันที่เริ่มต้น</label>
            <input type="date" defaultValue="2025-09-01" />
          </div>
          <div className="du-field">
            <label>วันที่สิ้นสุด</label>
            <input type="date" defaultValue="2025-09-30" />
          </div>
        </div>
        <div className="du-form-row">
          <div className="du-field">
            <label>ประเภทเซนเซอร์</label>
            <select defaultValue="soil">
              <option value="soil">ความชื้นดิน</option>
              <option value="temp">อุณหภูมิ</option>
              <option value="rh">ความชื้นสัมพัทธ์</option>
              <option value="npk">NPK</option>
            </select>
          </div>
          <div className="du-field">
            <label>โหนด</label>
            <select defaultValue="all">
              <option value="all">ทั้งหมด</option>
              <option value="1">Node 1</option>
              <option value="2">Node 2</option>
              <option value="3">Node 3</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Containers Status */}
      <div className="du-card" style={{ marginBottom: 16 }}>
        <div className="du-card-title" style={{ marginBottom: 10 }}>
          Active Containers Status
        </div>
        <table className="du-table">
          <thead>
            <tr>
              <th>สถานะ</th>
              <th>โหนด</th>
              <th>วันที่ล่าสุด</th>
              <th>สัดส่วนข้อมูล</th>
              <th style={{ textAlign: "right" }}>EXPORT</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: "#fee2e2" }}>
              <td>🟥 ผิดปกติ</td>
              <td>Node 1</td>
              <td>01/09/2568</td>
              <td>66%</td>
              <td style={{ textAlign: "right" }}>
                <button className="du-btn-danger">EXPORT CSV</button>
              </td>
            </tr>
            <tr style={{ background: "#dcfce7" }}>
              <td>🟩 ปกติ</td>
              <td>Node 2</td>
              <td>04/09/2568</td>
              <td>95%</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Graph Section */}
      <div className="du-card" style={{ marginBottom: 16 }}>
        <div className="du-card-title">กราฟแสดงค่าข้อมูลย้อนหลัง</div>
        <p style={{ fontSize: 12, marginTop: 2, marginBottom: 8 }}>
          ค่าความชื้นดินเฉลี่ยรายชั่วโมง – โหนด 1, เซนเซอร์ความชื้นดิน A
        </p>
        <div className="graph-placeholder">
          Graph Placeholder – ความชื้นดิน %
        </div>
      </div>

      {/* Summary Table */}
      <div className="du-card">
        <div className="du-card-title">สรุปการวัดข้อมูล</div>
        <table className="du-table">
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
            <tr>
              <td>ความชื้นดิน A</td>
              <td>Node 1</td>
              <td>72%</td>
              <td>94%</td>
              <td>48%</td>
              <td>1,280</td>
            </tr>
            <tr>
              <td>อุณหภูมิอากาศ</td>
              <td>Node 2</td>
              <td>31.3°C</td>
              <td>36.0°C</td>
              <td>26.1°C</td>
              <td>1,140</td>
            </tr>
            <tr>
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
    </div>
  );
}
