"use client";

import { useDuwimsT } from "@/app/TopBar";
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

// ---- Thailand points (ชลบุรีขึ้นก่อน) ----
const TH_POINTS = [
  { id: "chon", nameTh: "ชลบุรี", nameEn: "Chonburi", x: 146, y: 248, value: 58 },
  { id: "cnx", nameTh: "เชียงใหม่", nameEn: "Chiang Mai", x: 112, y: 90, value: 18 },
  { id: "lpg", nameTh: "ลำปาง", nameEn: "Lampang", x: 122, y: 110, value: 22 },
  { id: "kkc", nameTh: "ขอนแก่น", nameEn: "Khon Kaen", x: 154, y: 170, value: 34 },
  { id: "ubn", nameTh: "อุบลฯ", nameEn: "Ubon", x: 172, y: 205, value: 49 },
  { id: "bkk", nameTh: "กรุงเทพฯ", nameEn: "Bangkok", x: 142, y: 260, value: 56 },
  { id: "pkn", nameTh: "ประจวบฯ", nameEn: "Prachuap", x: 124, y: 310, value: 44 },
  { id: "pkt", nameTh: "ภูเก็ต", nameEn: "Phuket", x: 92, y: 360, value: 72 },
  { id: "sgk", nameTh: "สงขลา", nameEn: "Songkhla", x: 132, y: 382, value: 61 },
];

const PLOT_OPTIONS = [
  { id: "1", name: "แปลง 1" },
  { id: "2", name: "แปลง 2" },
  { id: "3", name: "แปลง 3" },
];

const PLOT_COLORS = ["#2563eb", "#16a34a", "#f97316", "#a855f7", "#ef4444"];

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function blue(v) {
  const alpha = 0.15 + (clamp(v, 0, 100) / 100) * 0.75;
  return `rgba(37,99,235,${alpha})`;
}

function formatDateLabel(iso, lang = "th") {
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
  const enMonths = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd} ${lang === "en" ? enMonths[d.getMonth()] : thMonths[d.getMonth()]}`;
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

function formatTick(v, sensorKey) {
  if (!isFinite(v)) return "-";

  const compactK = (num) => {
    const n = Math.round(num);
    if (Math.abs(n) >= 10000) return `${Math.round(n / 1000)}k`;
    return n.toLocaleString("en-US");
  };

  if (sensorKey === "light") return compactK(v);
  if (sensorKey === "water") return compactK(v);
  if (sensorKey === "rain") return (Math.round(v * 10) / 10).toFixed(1);
  if (sensorKey === "wind") return (Math.round(v * 10) / 10).toFixed(1);

  const vv = Math.round(v * 10) / 10;
  return Number.isInteger(vv) ? String(vv) : vv.toFixed(1);
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

async function apiFetch(path, opts = {}) {
  const method = opts.method || "GET";
  const body = opts.body;
  const token =
    opts.token ||
    (typeof window !== "undefined" &&
      (localStorage.getItem("AUTH_TOKEN_V1") ||
        localStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("jwt") ||
        localStorage.getItem("pmtool_token") ||
        localStorage.getItem("duwims_token"))) ||
    null;

  const res = await fetch(API_BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      `HTTP ${res.status} ${res.statusText}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export default function HistoryPage() {
  const { t, lang } = useDuwimsT();

  const sensorDropdownRef = useRef(null);
  const plotDropdownRef = useRef(null);

  const sensorOptionsI18n = useMemo(
    () => [
      { key: "soil", label: t("soilMoisture", "ความชื้นในดิน"), unit: "%" },
      { key: "temp", label: t("temperature", "อุณหภูมิ"), unit: "°C" },
      { key: "rh", label: t("relativeHumidity", "ความชื้นสัมพัทธ์"), unit: "%" },
      { key: "npk", label: "NPK", unit: "" },
      { key: "light", label: t("lightIntensity", "ความเข้มแสง"), unit: "lux" },
      { key: "rain", label: t("rainAmount", "ปริมาณน้ำฝน"), unit: "mm" },
      { key: "wind", label: t("windSpeed", "ความเร็วลม"), unit: "m/s" },
      { key: "water", label: t("irrigation", "การให้น้ำ"), unit: "L" },
    ],
    [t]
  );

  const defaultPlotOptionsI18n = useMemo(
    () => [
      { id: "1", name: `${t("plot", "แปลง")} 1` },
      { id: "2", name: `${t("plot", "แปลง")} 2` },
      { id: "3", name: `${t("plot", "แปลง")} 3` },
    ],
    [t]
  );

  const [vw, setVw] = useState(1280);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth || 1280);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isMobile = vw < 640;
  const isTablet = vw >= 640 && vw < 1024;

  const [quickRange, setQuickRange] = useState(t("last7Days", "7 วันล่าสุด"));

  useEffect(() => {
    setQuickRange((prev) => {
      const mapToKey = {
        วันนี้: "today",
        "7 วันล่าสุด": "last7Days",
        "30 วันล่าสุด": "last30Days",
        Today: "today",
        "Last 7 Days": "last7Days",
        "Last 30 Days": "last30Days",
      };
      const key = mapToKey[prev] || "last7Days";
      return t(key, prev);
    });
  }, [t]);

  const quickRangeOptions = useMemo(
    () => [
      t("today", "วันนี้"),
      t("last7Days", "7 วันล่าสุด"),
      t("last30Days", "30 วันล่าสุด"),
    ],
    [t]
  );

  const [sensorDropdownOpen, setSensorDropdownOpen] = useState(false);
  const [selectedSensors, setSelectedSensors] = useState(["soil"]);

  const [plotDropdownOpen, setPlotDropdownOpen] = useState(false);

  const [plotOptions, setPlotOptions] = useState([]);
  const [plotsLoading, setPlotsLoading] = useState(false);
  const [plotsError, setPlotsError] = useState("");

  const plotList = useMemo(() => {
    return plotOptions.length ? plotOptions : defaultPlotOptionsI18n;
  }, [plotOptions, defaultPlotOptionsI18n]);

  const [selectedPlots, setSelectedPlots] = useState(() =>
    PLOT_OPTIONS.map((p) => p.id)
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setPlotsLoading(true);
        setPlotsError("");
        const data = await apiFetch("/api/plots");
        const items = Array.isArray(data?.items) ? data.items : [];
        const mapped = items.map((p, i) => ({
          id: String(p.id || p._id || i),
          name: p.alias || p.plotName || p.name || `${t("plot", "แปลง")} ${i + 1}`,
          raw: p,
        }));
        if (!cancelled) {
          setPlotOptions(mapped);
          setSelectedPlots(
            mapped.length ? mapped.map((x) => x.id) : defaultPlotOptionsI18n.map((p) => p.id)
          );
        }
      } catch (e) {
        if (!cancelled) setPlotsError(String(e?.message || e));
      } finally {
        if (!cancelled) setPlotsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t, defaultPlotOptionsI18n]);

  const [startDate, setStartDate] = useState("2025-09-01");
  const [endDate, setEndDate] = useState("2025-09-30");

  const [sensorTypeItems, setSensorTypeItems] = useState([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch("/api/sensor-types");
        const items = Array.isArray(data?.items) ? data.items : [];
        if (!cancelled) setSensorTypeItems(items);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [summaryByPlot, setSummaryByPlot] = useState({});
  const [readingsByPlot, setReadingsByPlot] = useState({});

  const toIsoFromDate = (d, endOfDay = false) => {
    if (!d) return "";
    return endOfDay ? `${d}T23:59:59.999Z` : `${d}T00:00:00.000Z`;
  };

  const sensorMetaToKey = (meta) => {
    const st = String(meta?.sensorType || "");
    const name = String(meta?.name || "");
    const unit = String(meta?.unit || "");
    if (st === "soil_moisture") return "soil";
    if (st === "wind") return "wind";
    if (st === "ppfd") return "light";
    if (st === "rain") return "rain";
    if (st === "npk") return "npk";
    if (st === "irrigation") return "water";
    if (st === "temp_rh") {
      if (unit.includes("°") || name.includes("อุณหภูมิ") || name.toLowerCase().includes("temp")) return "temp";
      return "rh";
    }
    if (st === "temp") return "temp";
    if (st === "rh") return "rh";
    if (st === "light") return "light";
    if (st === "water") return "water";
    return null;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setHistoryLoading(true);
        setHistoryError("");

        const plots = (selectedPlots.length ? selectedPlots : plotList.map((p) => p.id))
          .filter(Boolean);

        if (!plots.length) {
          if (!cancelled) {
            setSummaryByPlot({});
            setReadingsByPlot({});
          }
          return;
        }

        const fromIso = toIsoFromDate(startDate, false);
        const toIso = toIsoFromDate(endDate, true);

        const summaries = await Promise.all(
          plots.map((pid) => apiFetch(`/api/plots/${encodeURIComponent(pid)}/summary`))
        );

        const readingsList = await Promise.all(
          plots.map((pid) =>
            apiFetch(
              `/api/readings?plotId=${encodeURIComponent(pid)}&from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`
            )
          )
        );

        if (cancelled) return;

        const nextSummary = {};
        plots.forEach((pid, i) => {
          nextSummary[pid] = Array.isArray(summaries[i]?.items) ? summaries[i].items : [];
        });

        const nextReadings = {};
        plots.forEach((pid, i) => {
          nextReadings[pid] = Array.isArray(readingsList[i]?.items) ? readingsList[i].items : [];
        });

        setSummaryByPlot(nextSummary);
        setReadingsByPlot(nextReadings);
      } catch (e) {
        if (!cancelled) setHistoryError(String(e?.message || e));
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedPlots, plotList, startDate, endDate]);

  const toggleSensor = (key) => {
    setSelectedSensors((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      return [...prev, key];
    });
  };

  const togglePlot = (id) => {
    setSelectedPlots((prev) => {
      const next = prev.includes(id)
        ? prev.filter((p) => p !== id)
        : [...prev, id];
      if (next.length === 0) return plotList.map((p) => p.id);
      return next;
    });
  };

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
      if (
        plotDropdownRef.current &&
        !plotDropdownRef.current.contains(e.target)
      ) {
        setPlotDropdownOpen(false);
      }
    }
  };

  const selectedSensorNames = useMemo(() => {
    return selectedSensors
      .map((k) => sensorOptionsI18n.find((s) => s.key === k)?.label)
      .filter(Boolean);
  }, [selectedSensors, sensorOptionsI18n]);

  const sensorDropdownLabel = useMemo(() => {
    if (selectedSensorNames.length === 0) return t("selectSensorType", "เลือกประเภทเซนเซอร์");
    if (selectedSensorNames.length === 1) return selectedSensorNames[0];
    return `${selectedSensorNames[0]} +${selectedSensorNames.length - 1}`;
  }, [selectedSensorNames, t]);

  const selectedPlotNames = useMemo(() => {
    return selectedPlots
      .map((id) => plotList.find((p) => p.id === id)?.name)
      .filter(Boolean);
  }, [selectedPlots, plotList]);

  const plotDropdownLabel = useMemo(() => {
    if (selectedPlots.length === plotList.length) return t("allPlots", "ทุกแปลง");
    if (selectedPlotNames.length === 0) return t("allPlots", "ทุกแปลง");
    if (selectedPlotNames.length === 1) return selectedPlotNames[0];
    return `${selectedPlotNames[0]} +${selectedPlotNames.length - 1}`;
  }, [selectedPlots, selectedPlotNames, plotList.length, t]);

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
    if (isMobile)
      return { display: "grid", gridTemplateColumns: "1fr", gap: 12 };
    return { display: "grid", gridTemplateColumns: "1fr 260px", gap: 12 };
  }, [isMobile]);

  const baseTimes = useMemo(() => {
    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return [];
    }
    const days = Math.max(0, Math.round((end - start) / 86400000)) + 1;
    const points = [];

    if (days <= 12) {
      for (let i = 0; i < days; i++) {
        const d = new Date(start.getTime() + i * 86400000);
        const ds = d.toISOString().slice(0, 10);
        points.push({ ts: `${ds}T12:00:00Z`, label: formatDateLabel(ds, lang), day: ds });
      }
      return points;
    }

    const N = 8;
    for (let i = 0; i < N; i++) {
      const tt = i / (N - 1);
      const d = new Date(start.getTime() + tt * (end.getTime() - start.getTime()));
      const ds = d.toISOString().slice(0, 10);
      points.push({ ts: `${ds}T12:00:00Z`, label: formatDateLabel(ds, lang), day: ds });
    }

    const uniq = [];
    const seen = new Set();
    for (const p of points) {
      if (seen.has(p.day)) continue;
      seen.add(p.day);
      uniq.push(p);
    }
    return uniq;
  }, [startDate, endDate, lang]);

  const seriesByPlot = useMemo(() => {
    const plots = selectedPlots.length ? selectedPlots : plotList.map((p) => p.id);
    const sensors = selectedSensors.length ? selectedSensors : ["soil"];
    const out = {};

    for (const pid of plots) {
      const metaItems = Array.isArray(summaryByPlot?.[pid]) ? summaryByPlot[pid] : [];
      const readings = Array.isArray(readingsByPlot?.[pid]) ? readingsByPlot[pid] : [];

      const metaBySensorId = new Map(metaItems.map((m) => [String(m.sensorId), m]));

      const bucket = new Map();
      for (const r of readings) {
        const sid = String(r.sensorId || "");
        if (!sid) continue;
        const day = String(r.ts || "").slice(0, 10);
        if (!day) continue;
        const v = Number(r.value);
        if (Number.isNaN(v)) continue;

        const byDay = bucket.get(day) || new Map();
        const acc = byDay.get(sid) || { sum: 0, count: 0 };
        acc.sum += v;
        acc.count += 1;
        byDay.set(sid, acc);
        bucket.set(day, byDay);
      }

      out[pid] = {};
      for (const sk of sensors) {
        const sensorIds = metaItems
          .filter((m) => sensorMetaToKey(m) === sk)
          .map((m) => String(m.sensorId));

        const pts = baseTimes.map((tt) => {
          let sum = 0;
          let count = 0;

          const byDay = bucket.get(tt.day);
          if (byDay && sensorIds.length) {
            for (const sid of sensorIds) {
              const acc = byDay.get(sid);
              if (acc && acc.count) {
                sum += acc.sum;
                count += acc.count;
              }
            }
          }

          let value = null;
          if (count > 0) value = Math.round((sum / count) * 10) / 10;
          else if (sensorIds.length) {
            const avgs = sensorIds
              .map((sid) => metaBySensorId.get(String(sid)))
              .filter(Boolean)
              .map((m) => Number(m.avg ?? m.last))
              .filter((v) => !Number.isNaN(v));
            if (avgs.length) value = Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 10) / 10;
          }

          return { ts: tt.ts, label: tt.label, value: value ?? 0 };
        });

        out[pid][sk] = pts;
      }
    }

    return out;
  }, [selectedPlots, plotList, selectedSensors, baseTimes, summaryByPlot, readingsByPlot, startDate, endDate, quickRange]);

  const activeSensorKey = selectedSensors[0] || "soil";
  const activeSensorMeta =
    sensorOptionsI18n.find((s) => s.key === activeSensorKey) || sensorOptionsI18n[0];

  const compareSeries = useMemo(() => {
    const plots = selectedPlots.length
      ? selectedPlots
      : plotList.map((p) => p.id);
    return plots
      .map((pid, idx) => {
        const pts = seriesByPlot?.[pid]?.[activeSensorKey] || [];
        return {
          plotId: pid,
          plotName:
            plotList.find((p) => p.id === pid)?.name || `${t("plot", "แปลง")} ${pid}`,
          color: PLOT_COLORS[idx % PLOT_COLORS.length],
          points: pts,
        };
      })
      .filter((s) => s.points.length);
  }, [selectedPlots, plotList, seriesByPlot, activeSensorKey, t]);

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
      compareSeries[0]?.points?.[compareSeries[0].points.length - 1]?.label ||
      "-";
    const currentVal =
      compareSeries[0]?.points?.[compareSeries[0].points.length - 1]?.value ?? 0;

    return { minVal, maxVal, avgVal, currentVal, lastLabel };
  }, [compareSeries]);

  const chart = useMemo(() => {
    const W = 100;
    const H = 60;
    const padL = 9;
    const padR = 2;
    const padT = 5;
    const padB = 10;

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
      const tt = i / (ticks - 1);
      const v = yMax - tt * span;
      const y = yFor(v);
      return { y, v: Math.round(v * 10) / 10 };
    });

    const xLabels = (compareSeries[0]?.points || []).map((p) => p.label);

    return { yMin, yMax, yTicks, polylines, xLabels, padL, padR, padT, padB };
  }, [compareSeries]);

  const onExportCSV = () => {
    const plots = selectedPlots.length
      ? selectedPlots
      : plotList.map((p) => p.id);
    const sensors = selectedSensors.length ? selectedSensors : ["soil"];

    const rows = [];
    for (const pid of plots) {
      const plotName =
        plotList.find((p) => p.id === pid)?.name || `${t("plot", "แปลง")} ${pid}`;
      for (const sk of sensors) {
        const meta = sensorOptionsI18n.find((s) => s.key === sk);
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

  const tableRows = useMemo(() => {
    const plots = selectedPlots.length ? selectedPlots : plotList.map((p) => p.id);

    const avgOf = (pid, sk) => {
      const metaItems = Array.isArray(summaryByPlot?.[pid]) ? summaryByPlot[pid] : [];
      const readings = Array.isArray(readingsByPlot?.[pid]) ? readingsByPlot[pid] : [];

      const sensorIds = metaItems
        .filter((m) => sensorMetaToKey(m) === sk)
        .map((m) => String(m.sensorId));

      if (!sensorIds.length) return "-";

      let sum = 0;
      let count = 0;
      for (const r of readings) {
        const sid = String(r.sensorId || "");
        if (!sid || !sensorIds.includes(sid)) continue;
        const v = Number(r.value);
        if (Number.isNaN(v)) continue;
        sum += v;
        count += 1;
      }

      let v = null;
      if (count > 0) v = sum / count;
      else {
        const avgs = metaItems
          .filter((m) => sensorIds.includes(String(m.sensorId)))
          .map((m) => Number(m.avg ?? m.last))
          .filter((x) => !Number.isNaN(x));
        if (avgs.length) v = avgs.reduce((a, b) => a + b, 0) / avgs.length;
      }

      if (v === null) return "-";
      const vv = Math.round(v * 10) / 10;
      if (sk === "light") return Math.round(vv).toLocaleString("en-US");
      return vv;
    };

    return plots.map((pid, i) => {
      const plotName = plotList.find((p) => p.id === pid)?.name || `${t("plot", "แปลง")} ${pid}`;
      return {
        plotId: String(pid),
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
  }, [selectedPlots, plotList, summaryByPlot, readingsByPlot, sensorOptionsI18n, t]);

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
                {t("historyFilters", "ฟิลเตอร์ข้อมูลย้อนหลัง")}
              </div>
              <span style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.4 }}>
                {t("historyFiltersDesc", "เลือกช่วงวันที่ / เซนเซอร์ / แปลง เพื่อดูข้อมูลย้อนหลังและกราฟ")}
              </span>
            </div>

            <div
              style={{
                marginBottom: 10,
                fontSize: 12,
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              <span style={{ marginRight: 2 }}>{t("quickRange", "ช่วงเวลาเร็ว")}:</span>
              {quickRangeOptions.map((l) => {
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

            <div style={{ ...grid2, marginBottom: 8 }}>
              <div className="du-field" style={{ fontSize: 13, minWidth: 0 }}>
                <label style={{ display: "block", marginBottom: 4, color: "#fff" }}>
                  {t("startDate", "วันที่เริ่มต้น")}
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
                  {t("endDate", "วันที่สิ้นสุด")}
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

            <div style={grid2}>
              <div className="du-field" style={{ fontSize: 13, minWidth: 0 }}>
                <label style={{ display: "block", marginBottom: 4, color: "#fff" }}>
                  {t("sensorType", "ประเภทเซนเซอร์")}
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
                        <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>
                          {t("multiSelectAllowed", "เลือกได้หลายตัว")}
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
                          {t("clear", "ล้าง")}
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
                        {sensorOptionsI18n.map((s) => {
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
                          {t("done", "Done")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 6, fontSize: 11, opacity: 0.95 }}>
                  {t("selected", "เลือกแล้ว")}:{" "}
                  {selectedSensorNames.length ? selectedSensorNames.join(", ") : "—"}
                </div>
              </div>

              <div className="du-field" style={{ fontSize: 13, minWidth: 0 }}>
                <label style={{ display: "block", marginBottom: 4, color: "#fff" }}>
                  {t("plotsMulti", "แปลง (เลือกได้หลายแปลง)")}
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
                          {t("selectMultiplePlotsToCompare", "เลือกหลายแปลงเพื่อเทียบกราฟ")}
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedPlots(plotList.map((p) => p.id))}
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
                          {t("selectAll", "เลือกทั้งหมด")}
                        </button>
                      </div>

                      <div style={{ display: "grid", gap: 8 }}>
                        {plotList.map((p, idx) => {
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
                          {t("done", "Done")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 6, fontSize: 11, opacity: 0.95 }}>
                  {t("selected", "เลือกแล้ว")}:{" "}
                  {selectedPlotNames.length ? selectedPlotNames.join(", ") : t("allPlots", "ทุกแปลง")}
                </div>
              </div>
            </div>
          </div>

          <section style={summaryGrid}>
            {[
              {
                title: t("currentValueFirstSelectedPlot", "ค่าปัจจุบัน (แปลงแรกที่เลือก)"),
                value: `${stats.currentVal}${activeSensorMeta.unit}`,
                sub: `${t("latestUpdate", "อัปเดตล่าสุด")} ${stats.lastLabel}`,
                bg: "linear-gradient(135deg,#dbeafe 0%,#eff6ff 45%,#ffffff 100%)",
                titleColor: "#64748b",
                valueColor: "#1d4ed8",
              },
              {
                title: t("averageAllSelectedPlots", "ค่าเฉลี่ย (รวมทุกแปลงที่เลือก)"),
                value: `${stats.avgVal}${activeSensorMeta.unit}`,
                sub: `sensor: ${activeSensorMeta.label}`,
                bg: "linear-gradient(135deg,#dcfce7 0%,#ecfdf5 45%,#ffffff 100%)",
                titleColor: "#166534",
                valueColor: "#16a34a",
              },
              {
                title: t("minimumValue", "ค่าต่ำสุด"),
                value: `${stats.minVal}${activeSensorMeta.unit}`,
                sub: t("minimumOfAllSelectedPlots", "ต่ำสุดของทุกแปลงที่เลือก"),
                bg: "linear-gradient(135deg,#fef9c3 0%,#fffbeb 45%,#ffffff 100%)",
                titleColor: "#92400e",
                valueColor: "#f97316",
              },
              {
                title: t("maximumValue", "ค่าสูงสุด"),
                value: `${stats.maxVal}${activeSensorMeta.unit}`,
                sub: t("maximumOfAllSelectedPlots", "สูงสุดของทุกแปลงที่เลือก"),
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
                  {t("weatherHeatMapThailand", "Weather Heat Map (Thailand)")}
                </div>
                <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.4 }}>
                  {t("weatherHeatMapDesc", "ตัวอย่างแผนที่ประเทศไทย + จุดข้อมูล (rain intensity)")}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>
                {t("range", "ช่วง")}: <b>{quickRange}</b> • {startDate} {t("to", "ถึง")} {endDate}
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
                    {t("legendRainIntensity", "Legend (Rain Intensity)")}
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
                    <span>{t("low", "น้อย")}</span>
                    <span>{t("high", "มาก")}</span>
                  </div>

                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>
                    {t("samplePoints", "จุดข้อมูลตัวอย่าง")}
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    {TH_POINTS.map((p) => {
                      const pointName = lang === "en" ? p.nameEn : p.nameTh;
                      return (
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
                              {pointName}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>
                              {lang === "en" ? "Intensity" : "ความเข้ม"}: <b>{p.value}</b>/100
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

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
                  {t("plotComparisonGraph", "กราฟเปรียบเทียบแปลง")}
                </div>
                <p style={{ fontSize: 12, marginTop: 2, color: "#4b5563" }}>
                  sensor: <b>{activeSensorMeta.label}</b> • {t("plots", "แปลง")}:{" "}
                  {selectedPlotNames.length ? selectedPlotNames.join(", ") : t("allPlots", "ทุกแปลง")}
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
              <svg viewBox="0 0 100 60" preserveAspectRatio="none" style={{ width: "100%", height: 220 }}>
                {chart.yTicks.map((tt, i) => (
                  <line
                    key={i}
                    x1={chart.padL}
                    x2="98"
                    y1={tt.y}
                    y2={tt.y}
                    stroke="#e5edf7"
                    strokeWidth="0.5"
                  />
                ))}

                <line
                  x1={chart.padL}
                  x2={chart.padL}
                  y1={chart.padT}
                  y2={60 - chart.padB}
                  stroke="#cbd5e1"
                  strokeWidth="0.8"
                />

                {chart.yTicks.map((tt, i) => (
                  <g key={i}>
                    <line
                      x1={chart.padL}
                      x2={chart.padL - 1.0}
                      y1={tt.y}
                      y2={tt.y}
                      stroke="#cbd5e1"
                      strokeWidth="0.6"
                    />
                    <text
                      x="1.4"
                      y={tt.y + 1.2}
                      fontSize="3.2"
                      fontWeight="900"
                      fill="#64748b"
                      textAnchor="start"
                    >
                      {formatTick(tt.v, activeSensorKey)}
                    </text>
                  </g>
                ))}

                <text
                  x="1.4"
                  y={chart.padT + 2.2}
                  fontSize="2.8"
                  fontWeight="900"
                  fill="#94a3b8"
                  textAnchor="start"
                >
                  {activeSensorMeta.unit || ""}
                </text>

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
              * {t("graphCompareNote", "กราฟนี้เทียบ “แปลง” ด้วย sensor ตัวแรกที่เลือก (เพื่ออ่านง่าย) • แต่ CSV จะ export ทุก sensor ที่เลือก")}
            </div>
          </div>

          <div className="du-card" style={cardR}>
            <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 900, marginBottom: 10 }}>
              {t("measurementSummarySelectedRange", "สรุปการวัดข้อมูล (เฉลี่ยช่วงที่เลือก)")}
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
                      t("plot", "แปลง"),
                      `${t("soilMoisture", "ความชื้นในดิน")} (%)`,
                      `${t("temperature", "อุณหภูมิ")} (°C)`,
                      `${t("relativeHumidity", "ความชื้นสัมพัทธ์")} (%)`,
                      "NPK",
                      `${t("lightIntensity", "ความเข้มแสง")} (lux)`,
                      `${t("rainAmount", "ปริมาณน้ำฝน")} (mm)`,
                      `${t("windSpeed", "ความเร็วลม")} (m/s)`,
                      `${t("irrigation", "การให้น้ำ")} (L)`,
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
                  {tableRows.map((row, idx) => (
                    <tr key={`${row.plotId}-${idx}`} style={{ background: row.bg }}>
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
                      ].map((cell, idx2) => (
                        <td
                          key={idx2}
                          style={{
                            padding: "9px 8px",
                            borderBottom: "1px solid #e5e7eb",
                            borderRight: "1px solid #e5e7eb",
                            textAlign: idx2 === 0 ? "left" : "center",
                            fontWeight: idx2 === 0 ? 900 : 700,
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
              * {t("summaryApiNote", "แสดงค่าจริงจาก API (ช่วงวันที่ที่เลือก ถ้าไม่มี reading จะ fallback เป็นค่า avg/last จาก summary)")}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}