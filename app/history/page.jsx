"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Image from "next/image";

const pageStyle = {
  fontFamily:
    '"Prompt", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  background: "#e5edf8",
  minHeight: "100vh",
  color: "#111827",
  overflowX: "hidden",
};

const outerWrap = {
  width: "100%",
  display: "flex",
  justifyContent: "center",
  overflowX: "hidden",
};

const bodyStyle = {
  width: "100%",
  maxWidth: 1120,
  margin: "22px auto 40px",
  padding: "0 16px 30px",
  boxSizing: "border-box",
};

const cardBase = {
  background: "#f9fafb",
  borderRadius: 24,
  padding: "18px 20px",
  boxShadow: "0 4px 10px rgba(15,23,42,0.12)",
  minWidth: 0,
  boxSizing: "border-box",
};

const SENSOR_OPTIONS = [
  { key: "soil", label: "ความชื้นในดิน", unit: "%" },
  { key: "temp", label: "อุณหภูมิ", unit: "°C" },
  { key: "rh", label: "ความชื้นสัมพัทธ์", unit: "%" },
  { key: "npk", label: "NPK", unit: "" },
  { key: "light", label: "ความเข้มแสง", unit: "lux" },
  { key: "rain", label: "ปริมาณน้ำฝน", unit: "mm" },
  { key: "wind", label: "ความเร็วลม", unit: "m/s" },
  { key: "water", label: "การให้น้ำ", unit: "L" },
];

// ---- Thailand points (ตัวอย่างตำแหน่งบน SVG) ----
const TH_POINTS = [
  { id: "cnx", name: "เชียงใหม่", x: 112, y: 90, value: 18 },
  { id: "lpg", name: "ลำปาง", x: 122, y: 110, value: 22 },
  { id: "kkc", name: "ขอนแก่น", x: 154, y: 170, value: 34 },
  { id: "ubn", name: "อุบลฯ", x: 172, y: 205, value: 49 },
  { id: "bkk", name: "กรุงเทพฯ", x: 142, y: 260, value: 56 },
  { id: "pkn", name: "ประจวบฯ", x: 124, y: 310, value: 44 },
  { id: "pkt", name: "ภูเก็ต", x: 92, y: 360, value: 72 },
  { id: "sri", name: "สงขลา", x: 132, y: 382, value: 61 },
];

const PLOT_OPTIONS = [
  { id: "1", name: "แปลง 1" },
  { id: "2", name: "แปลง 2" },
  { id: "3", name: "แปลง 3" },
];

// palette สำหรับ compare plot
const PLOT_COLORS = ["#2563eb", "#16a34a", "#f97316", "#a855f7", "#ef4444"];

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

// map 0..100 -> rgba blue intensity
function blue(v) {
  const alpha = 0.15 + (clamp(v, 0, 100) / 100) * 0.75;
  return `rgba(37,99,235,${alpha})`;
}

// deterministic pseudo random (stable)
function hashTo01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // 0..1
  return ((h >>> 0) % 100000) / 100000;
}

function formatDateLabel(iso) {
  // "2025-09-01" -> "01 ก.ย."
  const d = new Date(iso + "T00:00:00");
  const thMonths = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];
  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd} ${thMonths[d.getMonth()]}`;
}

function toCSV(rows) {
  const esc = (v) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(esc).join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ];
  return lines.join("\n");
}

export default function HistoryPage() {
  const sensorDropdownRef = useRef(null);
  const plotDropdownRef = useRef(null);

  // responsive breakpoint
  const [vw, setVw] = useState(1280);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth || 1280);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isMobile = vw < 640;
  const isTablet = vw >= 640 && vw < 1024;

  // quick range state
  const [quickRange, setQuickRange] = useState("7 วันล่าสุด");

  // dropdown (checkbox) state
  const [sensorDropdownOpen, setSensorDropdownOpen] = useState(false);
  const [selectedSensors, setSelectedSensors] = useState(["soil"]);

  const [plotDropdownOpen, setPlotDropdownOpen] = useState(false);

  // ✅ เริ่มต้นเป็น "ทุกแปลง"
  const [selectedPlots, setSelectedPlots] = useState(() =>
    PLOT_OPTIONS.map((p) => p.id)
  );

  const [startDate, setStartDate] = useState("2025-09-01");
  const [endDate, setEndDate] = useState("2025-09-30");

  const toggleSensor = (key) => {
    setSelectedSensors((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      return [...prev, key];
    });
  };

  // ✅ ห้ามเหลือว่าง: ถ้ายกเลิกหมดจะกลับเป็นทุกแปลง
  const togglePlot = (id) => {
    setSelectedPlots((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      if (next.length === 0) return PLOT_OPTIONS.map((p) => p.id);
      return next;
    });
  };

  // ปิด dropdown เมื่อคลิกนอกกล่อง
  const onRootClick = (e) => {
    if (sensorDropdownOpen) {
      if (
        sensorDropdownRef.current &&
        !sensorDropdownRef.current.contains(e.target)
      ) {
        setSensorDropdownOpen(false);
      }
    }
    if (plotDropdownOpen) {
      if (plotDropdownRef.current && !plotDropdownRef.current.contains(e.target)) {
        setPlotDropdownOpen(false);
      }
    }
  };

  const selectedSensorNames = useMemo(() => {
    return selectedSensors
      .map((k) => SENSOR_OPTIONS.find((s) => s.key === k)?.label)
      .filter(Boolean);
  }, [selectedSensors]);

  const sensorDropdownLabel = useMemo(() => {
    if (selectedSensorNames.length === 0) return "เลือกประเภทเซนเซอร์";
    if (selectedSensorNames.length === 1) return selectedSensorNames[0];
    return `${selectedSensorNames[0]} +${selectedSensorNames.length - 1}`;
  }, [selectedSensorNames]);

  const selectedPlotNames = useMemo(() => {
    return selectedPlots
      .map((id) => PLOT_OPTIONS.find((p) => p.id === id)?.name)
      .filter(Boolean);
  }, [selectedPlots]);

  // ✅ เลือกครบ = "ทุกแปลง" (ไม่ขึ้น แปลง 1 +1)
  const plotDropdownLabel = useMemo(() => {
    if (selectedPlots.length === PLOT_OPTIONS.length) return "ทุกแปลง";
    if (selectedPlotNames.length === 0) return "ทุกแปลง";
    if (selectedPlotNames.length === 1) return selectedPlotNames[0];
    return `${selectedPlotNames[0]} +${selectedPlotNames.length - 1}`;
  }, [selectedPlots, selectedPlotNames]);

  // responsive card padding
  const cardPad = isMobile ? 14 : isTablet ? 16 : 20;
  const cardRadius = isMobile ? 18 : 24;
  const cardR = useMemo(() => {
    return {
      ...cardBase,
      borderRadius: cardRadius,
      padding: `${cardPad}px`,
    };
  }, [cardPad, cardRadius]);

  const grid2 = isMobile
    ? { display: "grid", gridTemplateColumns: "1fr", gap: 12 }
    : {
        display: "grid",
        gridTemplateColumns: "repeat(2,minmax(0,1fr))",
        gap: 12,
      };

  const summaryGrid = useMemo(() => {
    if (isMobile)
      return {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 12,
        marginBottom: 16,
      };
    if (isTablet)
      return {
        display: "grid",
        gridTemplateColumns: "repeat(2,minmax(0,1fr))",
        gap: 12,
        marginBottom: 16,
      };
    return {
      display: "grid",
      gridTemplateColumns: "repeat(4,minmax(0,1fr))",
      gap: 12,
      marginBottom: 16,
    };
  }, [isMobile, isTablet]);

  const heatGrid = useMemo(() => {
    if (isMobile) return { display: "grid", gridTemplateColumns: "1fr", gap: 12 };
    return { display: "grid", gridTemplateColumns: "1fr 260px", gap: 12 };
  }, [isMobile]);

  // =========================
  // MOCK SERIES (พร้อมเสียบ API)
  // =========================
  const baseTimes = useMemo(() => {
    const days = [
      "2025-09-21",
      "2025-09-22",
      "2025-09-23",
      "2025-09-24",
      "2025-09-25",
      "2025-09-26",
      "2025-09-27",
      "2025-09-28",
    ];
    return days.map((d) => ({ ts: d + "T12:00:00", label: formatDateLabel(d) }));
  }, []);

  // สร้าง series ต่อ plot ต่อ sensor (deterministic)
  const seriesByPlot = useMemo(() => {
    const plots = selectedPlots.length ? selectedPlots : PLOT_OPTIONS.map((p) => p.id);
    const sensors = selectedSensors.length ? selectedSensors : ["soil"];
    const map = {};

    for (const pid of plots) {
      map[pid] = {};
      for (const sk of sensors) {
        const seed = hashTo01(`${pid}-${sk}-${startDate}-${endDate}-${quickRange}`);

        const spec =
          {
            soil: { base: 62, amp: 22, min: 0, max: 100 },
            temp: { base: 30, amp: 4, min: 0, max: 60 },
            rh: { base: 72, amp: 18, min: 0, max: 100 },
            npk: { base: 18, amp: 8, min: 0, max: 50 },
            light: { base: 18000, amp: 9000, min: 0, max: 60000 },
            rain: { base: 2.2, amp: 7, min: 0, max: 60 },
            wind: { base: 1.8, amp: 1.6, min: 0, max: 20 },
            water: { base: 90, amp: 60, min: 0, max: 500 },
          }[sk] || { base: 50, amp: 20, min: 0, max: 100 };

        const points = baseTimes.map((t, i) => {
          const wave = Math.sin(
            (i / Math.max(1, baseTimes.length - 1)) * Math.PI * 2 + seed * 6.28
          );
          const wobble = (hashTo01(`${pid}-${sk}-${i}`) - 0.5) * 0.35;
          const v = spec.base + spec.amp * (0.55 * wave + wobble);
          const val = Math.round(clamp(v, spec.min, spec.max) * 10) / 10;
          return { ...t, value: val };
        });

        map[pid][sk] = points;
      }
    }
    return map;
  }, [selectedPlots, selectedSensors, startDate, endDate, quickRange, baseTimes]);

  // แสดงกราฟ: โฟกัส sensor ตัวแรก (เลือกไว้) เพื่อเปรียบเทียบแปลงแบบชัด ๆ
  const activeSensorKey = selectedSensors[0] || "soil";
  const activeSensorMeta =
    SENSOR_OPTIONS.find((s) => s.key === activeSensorKey) || SENSOR_OPTIONS[0];

  const compareSeries = useMemo(() => {
    const plots = selectedPlots.length ? selectedPlots : PLOT_OPTIONS.map((p) => p.id);
    return plots
      .map((pid, idx) => {
        const pts = seriesByPlot?.[pid]?.[activeSensorKey] || [];
        return {
          plotId: pid,
          plotName: PLOT_OPTIONS.find((p) => p.id === pid)?.name || `แปลง ${pid}`,
          color: PLOT_COLORS[idx % PLOT_COLORS.length],
          points: pts,
        };
      })
      .filter((s) => s.points.length);
  }, [selectedPlots, seriesByPlot, activeSensorKey]);

  const stats = useMemo(() => {
    const all = compareSeries.flatMap((s) => s.points.map((p) => p.value));
    if (!all.length) {
      return { minVal: 0, maxVal: 0, avgVal: 0, currentVal: 0, lastLabel: "-" };
    }
    const minVal = Math.min(...all);
    const maxVal = Math.max(...all);
    const avgVal =
      Math.round((all.reduce((sum, v) => sum + v, 0) / all.length) * 10) / 10;

    const lastLabel =
      compareSeries[0]?.points?.[compareSeries[0].points.length - 1]?.label || "-";
    const currentVal =
      compareSeries[0]?.points?.[compareSeries[0].points.length - 1]?.value ?? 0;

    return { minVal, maxVal, avgVal, currentVal, lastLabel };
  }, [compareSeries]);

  // =========================
  // SVG chart helpers
  // =========================
  const chart = useMemo(() => {
    const W = 100;
    const H = 60;
    const padL = 6;
    const padR = 2;
    const padT = 6;
    const padB = 6;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const allVals = compareSeries.flatMap((s) => s.points.map((p) => p.value));
    const yMin = allVals.length ? Math.min(...allVals) : 0;
    const yMax = allVals.length ? Math.max(...allVals) : 100;
    const span = Math.max(1e-6, yMax - yMin);

    const xFor = (i, n) =>
      padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const yFor = (v) => padT + (1 - (v - yMin) / span) * innerH;

    const polylines = compareSeries.map((s) => {
      const pts = s.points;
      const n = pts.length;
      const d = pts.map((p, i) => `${xFor(i, n)},${yFor(p.value)}`).join(" ");
      return { plotId: s.plotId, plotName: s.plotName, color: s.color, d };
    });

    const ticks = 5;
    const yTicks = Array.from({ length: ticks }, (_, i) => {
      const t = i / (ticks - 1);
      const v = yMax - t * span;
      const y = yFor(v);
      return { y, v: Math.round(v * 10) / 10 };
    });

    const xLabels = (compareSeries[0]?.points || []).map((p) => p.label);

    return { yMin, yMax, yTicks, polylines, xLabels };
  }, [compareSeries]);

  // =========================
  // EXPORT CSV (plots x sensors)
  // =========================
  const onExportCSV = () => {
    const plots = selectedPlots.length ? selectedPlots : PLOT_OPTIONS.map((p) => p.id);
    const sensors = selectedSensors.length ? selectedSensors : ["soil"];

    const rows = [];
    for (const pid of plots) {
      const plotName = PLOT_OPTIONS.find((p) => p.id === pid)?.name || `แปลง ${pid}`;
      for (const sk of sensors) {
        const meta = SENSOR_OPTIONS.find((s) => s.key === sk);
        const unit = meta?.unit ?? "";
        const pts = seriesByPlot?.[pid]?.[sk] || [];
        for (const p of pts) {
          rows.push({
            date_range_start: startDate,
            date_range_end: endDate,
            quick_range: quickRange,
            plot_id: pid,
            plot_name: plotName,
            sensor_key: sk,
            sensor_label: meta?.label ?? sk,
            unit,
            timestamp: p.ts,
            label: p.label,
            value: p.value,
          });
        }
      }
    }

    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    const fileName = `history_compare_${startDate}_to_${endDate}.csv`;
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // =========================
  // TABLE rows (ใช้ค่าจาก mock เฉลี่ย)
  // =========================
  const tableRows = useMemo(() => {
    const plots = selectedPlots.length ? selectedPlots : PLOT_OPTIONS.map((p) => p.id);

    const avgOf = (pid, sk) => {
      const pts = seriesByPlot?.[pid]?.[sk] || [];
      if (!pts.length) return "-";
      const avg = pts.reduce((s, x) => s + Number(x.value || 0), 0) / pts.length;
      const v = Math.round(avg * 10) / 10;
      if (sk === "light") return Math.round(v).toLocaleString("en-US");
      return v;
    };

    return plots.map((pid, i) => {
      const plotName = PLOT_OPTIONS.find((p) => p.id === pid)?.name || `แปลง ${pid}`;
      return {
        plot: plotName,
        soil: avgOf(pid, "soil"),
        temp: avgOf(pid, "temp"),
        rh: avgOf(pid, "rh"),
        npk: avgOf(pid, "npk"),
        light: avgOf(pid, "light"),
        rain: avgOf(pid, "rain"),
        wind: avgOf(pid, "wind"),
        water: avgOf(pid, "water"),
        bg: i % 2 === 0 ? "#f9fafb" : "#eef2ff",
      };
    });
  }, [selectedPlots, seriesByPlot]);

  return (
    <div style={pageStyle} onClick={onRootClick}>
      <div style={outerWrap}>
        <main
          style={{
            ...bodyStyle,
            paddingLeft: isMobile ? 12 : 16,
            paddingRight: isMobile ? 12 : 16,
            marginTop: isMobile ? 14 : 22,
          }}
          className="du-history"
        >
          {/* ===== FILTER PANEL ===== */}
          <div
            className="du-card"
            style={{
              ...cardR,
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
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div
                className="du-card-title"
                style={{
                  color: "#fff",
                  fontSize: isMobile ? 16 : 18,
                  fontWeight: 700,
                }}
              >
                ฟิลเตอร์ข้อมูลย้อนหลัง
              </div>
              <span style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.4 }}>
                เลือกช่วงวันที่ / เซนเซอร์ / แปลง เพื่อดูข้อมูลย้อนหลังและกราฟ
              </span>
            </div>

            {/* quick chips */}
            <div
              style={{
                marginBottom: 10,
                fontSize: 12,
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              <span style={{ marginRight: 2 }}>ช่วงเวลาเร็ว:</span>
              {["วันนี้", "7 วันล่าสุด", "30 วันล่าสุด"].map((l) => {
                const active = quickRange === l;
                return (
                  <button
                    key={l}
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuickRange(l);
                    }}
                    style={{
                      borderRadius: 999,
                      border: "none",
                      padding: "6px 10px",
                      fontSize: 11,
                      cursor: "pointer",
                      background: active ? "#facc15" : "rgba(255,255,255,0.18)",
                      color: "#0f172a",
                      fontWeight: 800,
                      boxShadow: active ? "0 6px 16px rgba(0,0,0,0.18)" : "none",
                      transform: active ? "translateY(-1px)" : "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {l}
                  </button>
                );
              })}
            </div>

            {/* dates */}
            <div style={{ ...grid2, marginBottom: 8 }}>
              <div className="du-field" style={{ fontSize: 13, minWidth: 0 }}>
                <label style={{ display: "block", marginBottom: 4, color: "#fff" }}>
                  วันที่เริ่มต้น
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: "100%",
                    maxWidth: "100%",
                    borderRadius: 14,
                    border: "none",
                    padding: "8px 10px",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div className="du-field" style={{ fontSize: 13, minWidth: 0 }}>
                <label style={{ display: "block", marginBottom: 4, color: "#fff" }}>
                  วันที่สิ้นสุด
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    width: "100%",
                    maxWidth: "100%",
                    borderRadius: 14,
                    border: "none",
                    padding: "8px 10px",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* sensor dropdown + plot checkbox dropdown */}
            <div style={grid2}>
              {/* sensor */}
              <div className="du-field" style={{ fontSize: 13, minWidth: 0 }}>
                <label style={{ display: "block", marginBottom: 4, color: "#fff" }}>
                  ประเภทเซนเซอร์
                </label>

                <div ref={sensorDropdownRef} style={{ position: "relative", minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSensorDropdownOpen((v) => !v);
                    }}
                    style={{
                      width: "100%",
                      borderRadius: 14,
                      border: "none",
                      padding: "10px 10px",
                      fontSize: 13,
                      background: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        color: "#111827",
                        fontWeight: 800,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {sensorDropdownLabel}
                    </span>
                    <span style={{ color: "#64748b", fontSize: 12 }}>
                      {sensorDropdownOpen ? "▲" : "▼"}
                    </span>
                  </button>

                  {sensorDropdownOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: "absolute",
                        zIndex: 60,
                        top: "calc(100% + 8px)",
                        left: 0,
                        right: 0,
                        background: "#ffffff",
                        borderRadius: 16,
                        border: "1px solid rgba(15,23,42,0.12)",
                        boxShadow: "0 18px 40px rgba(15,23,42,0.18)",
                        padding: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 8,
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 900,
                            color: "#0f172a",
                          }}
                        >
                          เลือกได้หลายตัว
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedSensors([])}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#b91c1c",
                            fontWeight: 900,
                            cursor: "pointer",
                            fontSize: 12,
                            whiteSpace: "nowrap",
                          }}
                        >
                          ล้าง
                        </button>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile
                            ? "1fr"
                            : "repeat(2,minmax(0,1fr))",
                          gap: 8,
                        }}
                      >
                        {SENSOR_OPTIONS.map((s) => {
                          const checked = selectedSensors.includes(s.key);
                          return (
                            <label
                              key={s.key}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "8px 10px",
                                borderRadius: 12,
                                cursor: "pointer",
                                border: "1px solid rgba(15,23,42,0.08)",
                                background: checked ? "#eef2ff" : "#fff",
                                minWidth: 0,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSensor(s.key)}
                              />
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "#0f172a",
                                  fontWeight: 800,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {s.label}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: "#64748b",
                                  marginLeft: "auto",
                                }}
                              >
                                {s.unit}
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => setSensorDropdownOpen(false)}
                          style={{
                            borderRadius: 999,
                            border: "none",
                            padding: "8px 12px",
                            background: "#0f172a",
                            color: "#fff",
                            fontWeight: 900,
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 6, fontSize: 11, opacity: 0.95 }}>
                  เลือกแล้ว: {selectedSensorNames.length ? selectedSensorNames.join(", ") : "—"}
                </div>
              </div>

              {/* plot (checkbox multi-select) */}
              <div className="du-field" style={{ fontSize: 13, minWidth: 0 }}>
                <label style={{ display: "block", marginBottom: 4, color: "#fff" }}>
                  แปลง (เลือกได้หลายแปลง)
                </label>

                <div ref={plotDropdownRef} style={{ position: "relative", minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlotDropdownOpen((v) => !v);
                    }}
                    style={{
                      width: "100%",
                      borderRadius: 14,
                      border: "none",
                      padding: "10px 10px",
                      fontSize: 13,
                      background: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        color: "#111827",
                        fontWeight: 800,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {plotDropdownLabel}
                    </span>
                    <span style={{ color: "#64748b", fontSize: 12 }}>
                      {plotDropdownOpen ? "▲" : "▼"}
                    </span>
                  </button>

                  {plotDropdownOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: "absolute",
                        zIndex: 60,
                        top: "calc(100% + 8px)",
                        left: 0,
                        right: 0,
                        background: "#ffffff",
                        borderRadius: 16,
                        border: "1px solid rgba(15,23,42,0.12)",
                        boxShadow: "0 18px 40px rgba(15,23,42,0.18)",
                        padding: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 8,
                          gap: 10,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>
                          เลือกหลายแปลงเพื่อเทียบกราฟ
                        </div>

                        {/* ✅ เปลี่ยน "ล้าง" -> "เลือกทั้งหมด" */}
                        <button
                          type="button"
                          onClick={() => setSelectedPlots(PLOT_OPTIONS.map((p) => p.id))}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#2563eb",
                            fontWeight: 900,
                            cursor: "pointer",
                            fontSize: 12,
                            whiteSpace: "nowrap",
                          }}
                        >
                          เลือกทั้งหมด
                        </button>
                      </div>

                      <div style={{ display: "grid", gap: 8 }}>
                        {PLOT_OPTIONS.map((p, idx) => {
                          const checked = selectedPlots.includes(p.id);
                          const c = PLOT_COLORS[idx % PLOT_COLORS.length];
                          return (
                            <label
                              key={p.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "8px 10px",
                                borderRadius: 12,
                                cursor: "pointer",
                                border: "1px solid rgba(15,23,42,0.08)",
                                background: checked ? "#ecfeff" : "#fff",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePlot(p.id)}
                              />
                              <span
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: 999,
                                  background: c,
                                  border: "1px solid rgba(15,23,42,0.18)",
                                  flex: "0 0 auto",
                                }}
                              />
                              <span style={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>
                                {p.name}
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => setPlotDropdownOpen(false)}
                          style={{
                            borderRadius: 999,
                            border: "none",
                            padding: "8px 12px",
                            background: "#0f172a",
                            color: "#fff",
                            fontWeight: 900,
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 6, fontSize: 11, opacity: 0.95 }}>
                  เลือกแล้ว: {selectedPlotNames.length ? selectedPlotNames.join(", ") : "ทุกแปลง"}
                </div>
              </div>
            </div>
          </div>

          {/* ===== SUMMARY BADGE ROW ===== */}
          <section style={summaryGrid}>
            {[
              {
                title: "ค่าปัจจุบัน (แปลงแรกที่เลือก)",
                value: `${stats.currentVal}${activeSensorMeta.unit}`,
                sub: `อัปเดตล่าสุด ${stats.lastLabel}`,
                bg: "linear-gradient(135deg,#dbeafe 0%,#eff6ff 45%,#ffffff 100%)",
                titleColor: "#64748b",
                valueColor: "#1d4ed8",
              },
              {
                title: "ค่าเฉลี่ย (รวมทุกแปลงที่เลือก)",
                value: `${stats.avgVal}${activeSensorMeta.unit}`,
                sub: `sensor: ${activeSensorMeta.label}`,
                bg: "linear-gradient(135deg,#dcfce7 0%,#ecfdf5 45%,#ffffff 100%)",
                titleColor: "#166534",
                valueColor: "#16a34a",
              },
              {
                title: "ค่าต่ำสุด",
                value: `${stats.minVal}${activeSensorMeta.unit}`,
                sub: "ต่ำสุดของทุกแปลงที่เลือก",
                bg: "linear-gradient(135deg,#fef9c3 0%,#fffbeb 45%,#ffffff 100%)",
                titleColor: "#92400e",
                valueColor: "#f97316",
              },
              {
                title: "ค่าสูงสุด",
                value: `${stats.maxVal}${activeSensorMeta.unit}`,
                sub: "สูงสุดของทุกแปลงที่เลือก",
                bg: "linear-gradient(135deg,#fee2e2 0%,#fef2f2 45%,#ffffff 100%)",
                titleColor: "#b91c1c",
                valueColor: "#dc2626",
              },
            ].map((b) => (
              <div
                key={b.title}
                style={{
                  ...cardR,
                  padding: "12px 14px",
                  borderRadius: 18,
                  background: b.bg,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: b.titleColor,
                    marginBottom: 4,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {b.title}
                </div>
                <div
                  style={{
                    fontSize: isMobile ? 22 : 24,
                    fontWeight: 900,
                    color: b.valueColor,
                  }}
                >
                  {b.value}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#6b7280",
                    marginTop: 2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {b.sub}
                </div>
              </div>
            ))}
          </section>

          {/* ===== WEATHER HEAT MAP: THAILAND MAP ===== */}
          <div
            className="du-card"
            style={{
              ...cardR,
              marginBottom: 16,
              background: "linear-gradient(180deg,#f0f9ff 0%,#eef2ff 45%,#ffffff 100%)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 900 }}>
                  Weather Heat Map (Thailand)
                </div>
                <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.4 }}>
                  ตัวอย่างแผนที่ประเทศไทย + จุดข้อมูล (rain intensity)
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>
                ช่วง: <b>{quickRange}</b> • {startDate} ถึง {endDate}
              </div>
            </div>

            <div
              style={{
                borderRadius: 18,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                padding: 12,
                minWidth: 0,
              }}
            >
              <div style={heatGrid}>
                {/* Map (Ventusky embed) */}
                <div
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(15,23,42,0.08)",
                    background: "#f8fafc",
                    overflow: "hidden",
                    minWidth: 0,
                  }}
                >
                  <div style={{ width: "100%", height: isMobile ? 360 : 540, position: "relative" }}>
                    <iframe
                      title="Ventusky"
                      src="https://embed.ventusky.com/"
                      width="100%"
                      height="100%"
                      style={{ border: "none" }}
                      loading="lazy"
                      allowFullScreen
                    />
                  </div>
                </div>

                {/* Legend + list */}
                <div
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(15,23,42,0.08)",
                    background: "#ffffff",
                    padding: 12,
                    minWidth: 0,
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 8 }}>
                    Legend (Rain Intensity)
                  </div>

                  <div
                    style={{
                      height: 12,
                      borderRadius: 999,
                      background:
                        "linear-gradient(90deg, rgba(37,99,235,0.15), rgba(37,99,235,0.90))",
                      border: "1px solid rgba(15,23,42,0.10)",
                      marginBottom: 6,
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      color: "#64748b",
                      marginBottom: 10,
                    }}
                  >
                    <span>น้อย</span>
                    <span>มาก</span>
                  </div>

                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>
                    จุดข้อมูลตัวอย่าง
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    {TH_POINTS.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 10px",
                          borderRadius: 12,
                          border: "1px solid rgba(15,23,42,0.08)",
                          background: "#f8fafc",
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 999,
                            background: blue(p.value),
                            border: "1px solid rgba(15,23,42,0.18)",
                            flex: "0 0 auto",
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 900,
                              color: "#0f172a",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {p.name}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>
                            intensity: <b>{p.value}</b>/100
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== GRAPH SECTION (COMPARE PLOTS) ===== */}
          <div
            className="du-card"
            style={{
              ...cardR,
              marginBottom: 16,
              background: "linear-gradient(180deg,#e0f2fe 0%,#eff6ff 35%,#ffffff 100%)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 8,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 900 }}>
                  กราฟเปรียบเทียบแปลง
                </div>
                <p style={{ fontSize: 12, marginTop: 2, color: "#4b5563" }}>
                  sensor: <b>{activeSensorMeta.label}</b> • แปลง:{" "}
                  {selectedPlotNames.length ? selectedPlotNames.join(", ") : "ทุกแปลง"}
                </p>
              </div>

              <button
                style={{
                  borderRadius: 999,
                  padding: "8px 12px",
                  fontSize: 12,
                  border: "none",
                  background: "#b91c1c",
                  color: "#fff",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: "0 6px 16px rgba(185,28,28,0.20)",
                }}
                onClick={onExportCSV}
              >
                EXPORT CSV
              </button>
            </div>

            {/* legend */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {compareSeries.map((s) => (
                <div
                  key={s.plotId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(15,23,42,0.08)",
                    fontSize: 12,
                    fontWeight: 900,
                    color: "#0f172a",
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: s.color,
                      border: "1px solid rgba(15,23,42,0.18)",
                    }}
                  />
                  {s.plotName}
                </div>
              ))}
            </div>

            <div
              style={{
                borderRadius: 18,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                padding: "10px 12px 6px",
                overflow: "hidden",
              }}
            >
              <svg
                viewBox="0 0 100 60"
                preserveAspectRatio="none"
                style={{ width: "100%", height: 220 }}
              >
                {/* grid */}
                {chart.yTicks.map((t, i) => (
                  <line
                    key={i}
                    x1="6"
                    x2="98"
                    y1={t.y}
                    y2={t.y}
                    stroke="#e5edf7"
                    strokeWidth="0.4"
                  />
                ))}
                <line x1="6" x2="6" y1="6" y2="54" stroke="#cbd5e1" strokeWidth="0.6" />

                {/* y labels */}
                {chart.yTicks.map((t, i) => (
                  <text key={i} x="2" y={t.y + 1.5} fontSize="2" fill="#94a3b8">
                    {t.v}
                  </text>
                ))}
                <text x="2" y="7" fontSize="3" fill="#94a3b8">
                  {activeSensorMeta.unit || ""}
                </text>

                {/* polylines */}
                {chart.polylines.map((pl) => (
                  <polyline
                    key={pl.plotId}
                    fill="none"
                    stroke={pl.color}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={pl.d}
                    opacity="0.95"
                  />
                ))}
              </svg>

              {/* x labels */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 4,
                  padding: "0 4px",
                  gap: 6,
                }}
              >
                {(chart.xLabels || []).map((d) => (
                  <span
                    key={d}
                    style={{
                      fontSize: 10,
                      color: "#94a3b8",
                      transform: isMobile ? "rotate(-20deg)" : "rotate(-30deg)",
                      transformOrigin: "left top",
                      display: "inline-block",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>
              * กราฟนี้เทียบ “แปลง” ด้วย sensor ตัวแรกที่เลือก (เพื่ออ่านง่าย) • แต่ CSV จะ export ทุก sensor ที่เลือก
            </div>
          </div>

          {/* ===== SUMMARY TABLE (WITH BORDER) ===== */}
          <div className="du-card" style={cardR}>
            <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 900, marginBottom: 10 }}>
              สรุปการวัดข้อมูล (เฉลี่ยช่วงที่เลือก)
            </div>

            <div
              style={{
                borderRadius: 16,
                overflowX: "auto",
                overflowY: "hidden",
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <table
                className="du-table"
                style={{
                  width: "100%",
                  minWidth: 980,
                  fontSize: 13,
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    {[
                      "แปลง",
                      "ความชื้นในดิน (%)",
                      "อุณหภูมิ (°C)",
                      "ความชื้นสัมพัทธ์ (%)",
                      "NPK",
                      "ความเข้มแสง (lux)",
                      "ปริมาณน้ำฝน (mm)",
                      "ความเร็วลม (m/s)",
                      "การให้น้ำ (L)",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 8px",
                          borderBottom: "1px solid #e5e7eb",
                          borderRight: "1px solid #e5e7eb",
                          fontWeight: 900,
                          color: "#0f172a",
                          textAlign: "center",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {tableRows.map((row) => (
                    <tr key={row.plot} style={{ background: row.bg }}>
                      {[
                        row.plot,
                        row.soil,
                        row.temp,
                        row.rh,
                        row.npk,
                        row.light,
                        row.rain,
                        row.wind,
                        row.water,
                      ].map((cell, idx) => (
                        <td
                          key={idx}
                          style={{
                            padding: "9px 8px",
                            borderBottom: "1px solid #e5e7eb",
                            borderRight: "1px solid #e5e7eb",
                            textAlign: idx === 0 ? "left" : "center",
                            fontWeight: idx === 0 ? 900 : 700,
                            color: "#0f172a",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>
              * ค่าเป็น mockup ตัวอย่าง (ถ้าใช้ API จริง ให้แทน seriesByPlot ด้วยข้อมูลจาก backend ได้เลย)
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
