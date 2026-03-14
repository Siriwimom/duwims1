"use client";

import { useDuwimsT } from "@/app/TopBar";
import { useMemo, useRef, useState, useEffect } from "react";

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

const PLOT_COLORS = ["#2563eb", "#16a34a", "#f97316", "#a855f7", "#ef4444"];

const TH_POINTS = [
  { id: "chon", nameTh: "ชลบุรี", nameEn: "Chonburi", value: 58 },
  { id: "cnx", nameTh: "เชียงใหม่", nameEn: "Chiang Mai", value: 18 },
  { id: "lpg", nameTh: "ลำปาง", nameEn: "Lampang", value: 22 },
  { id: "kkc", nameTh: "ขอนแก่น", nameEn: "Khon Kaen", value: 34 },
  { id: "ubn", nameTh: "อุบลฯ", nameEn: "Ubon", value: 49 },
  { id: "bkk", nameTh: "กรุงเทพฯ", nameEn: "Bangkok", value: 56 },
  { id: "pkn", nameTh: "ประจวบฯ", nameEn: "Prachuap", value: 44 },
  { id: "pkt", nameTh: "ภูเก็ต", nameEn: "Phuket", value: 72 },
  { id: "sgk", nameTh: "สงขลา", nameEn: "Songkhla", value: 61 },
];

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function blue(v) {
  const alpha = 0.15 + (clamp(v, 0, 100) / 100) * 0.75;
  return `rgba(37,99,235,${alpha})`;
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

function formatDisplayValue(v, sensorKey) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  return formatTick(Number(v), sensorKey);
}

function formatDateLabel(iso, lang = "th") {
  if (!iso) return "-";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;

  const thMonths = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
  ];
  const enMonths = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd} ${lang === "en" ? enMonths[d.getMonth()] : thMonths[d.getMonth()]}`;
}

function getTodayInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function shiftDateInput(isoDate, offsetDays) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function rangeFromQuickLabel(label, t) {
  const todayLabel = t("today", "วันนี้");
  const last7Label = t("last7Days", "7 วันล่าสุด");
  const last30Label = t("last30Days", "30 วันล่าสุด");

  const end = getTodayInputValue();

  if (label === todayLabel) return { start: end, end };
  if (label === last30Label) return { start: shiftDateInput(end, -29), end };
  return { start: shiftDateInput(end, -6), end };
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "";

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

  const res = await fetch(`${API_BASE}${path}`, {
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

function normalizeSensorType(v) {
  return String(v || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_");
}

function normalizeText(v) {
  return String(v || "").toLowerCase().trim().replace(/\s+/g, " ");
}

function sensorMetaToKey(meta) {
  const st = normalizeSensorType(meta?.sensorType);
  const name = normalizeText(meta?.name);
  const unit = normalizeText(meta?.unit);

  if (st === "soil_moisture" || st === "soilmoisture" || st === "soil") {
    return "soil";
  }

  if (st === "temperature" || st === "temp" || st === "air_temp" || st === "air_temperature") {
    return "temp";
  }

  if (st === "humidity" || st === "rh" || st === "relative_humidity" || st === "air_humidity") {
    return "rh";
  }

  if (st === "temp_rh" || st === "temprh") {
    if (name.includes("temp") || name.includes("temperature") || name.includes("อุณหภูมิ") || unit.includes("°c")) {
      return "temp";
    }
    if (name.includes("humidity") || name.includes("rh") || name.includes("ความชื้น") || unit.includes("%")) {
      return "rh";
    }
    return null;
  }

  if (st === "light" || st === "ppfd" || st === "light_intensity" || st === "lightintensity") {
    return "light";
  }

  if (st === "rain" || st === "rainfall" || st === "rain_amount") {
    return "rain";
  }

  if (st === "wind" || st === "wind_speed" || st === "windspeed" || st === "wind_velocity") {
    return "wind";
  }

  if (st === "irrigation" || st === "water" || st === "water_flow" || st === "watering") {
    return "water";
  }

  if (st === "npk") {
    return "npk";
  }

  if (name.includes("soil") && name.includes("moist")) return "soil";
  if (name.includes("ดิน") && name.includes("ชื้น")) return "soil";

  if (name.includes("temperature") || name.includes("temp") || name.includes("อุณหภูมิ")) return "temp";
  if (name.includes("humidity") || name.includes("relative humidity") || name.includes("ความชื้น")) return "rh";
  if (name.includes("light") || name.includes("ppfd") || name.includes("แสง")) return "light";
  if (name.includes("rain") || name.includes("ฝน")) return "rain";
  if (name.includes("wind") || name.includes("ลม")) return "wind";
  if (name.includes("water") || name.includes("irrigation") || name.includes("น้ำ")) return "water";
  if (name.includes("npk")) return "npk";

  return null;
}

function getFallbackNumeric(meta) {
  const candidates = [
    meta?.avg,
    meta?.average,
    meta?.avgValue,
    meta?.mean,
    meta?.last,
    meta?.lastValue,
    meta?.value,
    meta?.latestValue,
    meta?.lastReading?.value,
  ];

  for (const v of candidates) {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function getPlotDisplayName(plot, idx, t) {
  return (
    plot?.alias ||
    plot?.plotName ||
    plot?.name ||
    `${t("plot", "แปลง")} ${idx + 1}`
  );
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
  const quickRangeOptions = useMemo(
    () => [
      t("today", "วันนี้"),
      t("last7Days", "7 วันล่าสุด"),
      t("last30Days", "30 วันล่าสุด"),
    ],
    [t]
  );

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

  const initialRange = useMemo(() => {
    return rangeFromQuickLabel(t("last7Days", "7 วันล่าสุด"), t);
  }, [t]);

  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);

  useEffect(() => {
    const next = rangeFromQuickLabel(quickRange, t);
    setStartDate(next.start);
    setEndDate(next.end);
  }, [quickRange, t]);

  const [sensorDropdownOpen, setSensorDropdownOpen] = useState(false);
  const [selectedSensors, setSelectedSensors] = useState(["soil"]);

  const [plotDropdownOpen, setPlotDropdownOpen] = useState(false);

  const [plotOptions, setPlotOptions] = useState([]);
  const [plotsLoading, setPlotsLoading] = useState(false);
  const [plotsError, setPlotsError] = useState("");

  const plotList = useMemo(() => {
    return plotOptions.length ? plotOptions : defaultPlotOptionsI18n;
  }, [plotOptions, defaultPlotOptionsI18n]);

  const [selectedPlots, setSelectedPlots] = useState([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setPlotsLoading(true);
        setPlotsError("");

        const data = await apiFetch("/api/plots");
        const items = Array.isArray(data?.items) ? data.items : [];

        const mapped = items.map((p, i) => ({
          id: String(p.id || p._id || i + 1),
          name: getPlotDisplayName(p, i, t),
          raw: p,
        }));

        if (!cancelled) {
          const nextList = mapped.length ? mapped : defaultPlotOptionsI18n;
          setPlotOptions(mapped);
          setSelectedPlots(nextList.map((x) => x.id));
        }
      } catch (e) {
        if (!cancelled) {
          setPlotsError(String(e?.message || e));
          setPlotOptions([]);
          setSelectedPlots(defaultPlotOptionsI18n.map((p) => p.id));
        }
      } finally {
        if (!cancelled) setPlotsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [t, defaultPlotOptionsI18n]);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [summaryByPlot, setSummaryByPlot] = useState({});
  const [readingsByPlot, setReadingsByPlot] = useState({});
  const [sensorsByPlot, setSensorsByPlot] = useState({});

  const hasDateError =
    !!startDate &&
    !!endDate &&
    new Date(`${startDate}T00:00:00`).getTime() >
      new Date(`${endDate}T00:00:00`).getTime();

  function toIsoFromDate(d, endOfDay = false) {
    if (!d) return "";
    return endOfDay ? `${d}T23:59:59.999Z` : `${d}T00:00:00.000Z`;
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (hasDateError) {
          setHistoryError(
            t("dateRangeInvalid", "วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด")
          );
          setSummaryByPlot({});
          setReadingsByPlot({});
          setSensorsByPlot({});
          return;
        }

        setHistoryLoading(true);
        setHistoryError("");

        const plots = (selectedPlots.length ? selectedPlots : plotList.map((p) => p.id))
          .filter(Boolean);

        if (!plots.length) {
          if (!cancelled) {
            setSummaryByPlot({});
            setReadingsByPlot({});
            setSensorsByPlot({});
          }
          return;
        }

        const fromIso = toIsoFromDate(startDate, false);
        const toIso = toIsoFromDate(endDate, true);

        const [summaries, readingsList, sensorsList] = await Promise.all([
          Promise.all(
            plots.map((pid) =>
              apiFetch(`/api/plots/${encodeURIComponent(pid)}/summary`)
            )
          ),
          Promise.all(
            plots.map((pid) =>
              apiFetch(
                `/api/readings?plotId=${encodeURIComponent(
                  pid
                )}&from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`
              )
            )
          ),
          Promise.all(
            plots.map((pid) =>
              apiFetch(`/api/sensors?plotId=${encodeURIComponent(pid)}&sensorType=all`)
            )
          ),
        ]);

        if (cancelled) return;

        const nextSummary = {};
        const nextReadings = {};
        const nextSensors = {};

        plots.forEach((pid, i) => {
          nextSummary[pid] = Array.isArray(summaries[i]?.items)
            ? summaries[i].items
            : [];
          nextReadings[pid] = Array.isArray(readingsList[i]?.items)
            ? readingsList[i].items
            : [];
          nextSensors[pid] = Array.isArray(sensorsList[i]?.items)
            ? sensorsList[i].items
            : [];
        });

        setSummaryByPlot(nextSummary);
        setReadingsByPlot(nextReadings);
        setSensorsByPlot(nextSensors);
      } catch (e) {
        if (!cancelled) {
          setHistoryError(String(e?.message || e));
          setSummaryByPlot({});
          setReadingsByPlot({});
          setSensorsByPlot({});
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedPlots, plotList, startDate, endDate, hasDateError, t]);

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
    if (
      sensorDropdownOpen &&
      sensorDropdownRef.current &&
      !sensorDropdownRef.current.contains(e.target)
    ) {
      setSensorDropdownOpen(false);
    }

    if (
      plotDropdownOpen &&
      plotDropdownRef.current &&
      !plotDropdownRef.current.contains(e.target)
    ) {
      setPlotDropdownOpen(false);
    }
  };

  const selectedSensorNames = useMemo(() => {
    return selectedSensors
      .map((k) => sensorOptionsI18n.find((s) => s.key === k)?.label)
      .filter(Boolean);
  }, [selectedSensors, sensorOptionsI18n]);

  const sensorDropdownLabel = useMemo(() => {
    if (selectedSensorNames.length === 0) {
      return t("selectSensorType", "เลือกประเภทเซนเซอร์");
    }
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
    if (isMobile) {
      return {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 12,
        marginBottom: 16,
      };
    }
    if (isTablet) {
      return {
        display: "grid",
        gridTemplateColumns: "repeat(2,minmax(0,1fr))",
        gap: 12,
        marginBottom: 16,
      };
    }
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

  const baseTimes = useMemo(() => {
    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    if (start > end) return [];

    const days = Math.max(0, Math.round((end - start) / 86400000)) + 1;
    const points = [];

    if (days <= 12) {
      for (let i = 0; i < days; i++) {
        const d = new Date(start.getTime() + i * 86400000);
        const ds = d.toISOString().slice(0, 10);
        points.push({
          ts: `${ds}T12:00:00Z`,
          label: formatDateLabel(ds, lang),
          day: ds,
        });
      }
      return points;
    }

    const N = 8;
    for (let i = 0; i < N; i++) {
      const tt = i / (N - 1);
      const d = new Date(start.getTime() + tt * (end.getTime() - start.getTime()));
      const ds = d.toISOString().slice(0, 10);
      points.push({
        ts: `${ds}T12:00:00Z`,
        label: formatDateLabel(ds, lang),
        day: ds,
      });
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

  const selectedPlotIdsResolved = useMemo(() => {
    return selectedPlots.length ? selectedPlots : plotList.map((p) => p.id);
  }, [selectedPlots, plotList]);

  const seriesByPlot = useMemo(() => {
    const plots = selectedPlotIdsResolved;
    const sensors = selectedSensors.length ? selectedSensors : ["soil"];
    const out = {};

    for (const pid of plots) {
      const summaryItems = Array.isArray(summaryByPlot?.[pid]) ? summaryByPlot[pid] : [];
      const readings = Array.isArray(readingsByPlot?.[pid]) ? readingsByPlot[pid] : [];
      const sensorMetaItems = Array.isArray(sensorsByPlot?.[pid]) ? sensorsByPlot[pid] : [];

      const metaBySensorId = new Map();

      for (const s of sensorMetaItems) {
        metaBySensorId.set(String(s._id || s.id), s);
      }

      for (const s of summaryItems) {
        const sid = String(s.sensorId || "");
        if (!sid) continue;
        if (!metaBySensorId.has(sid)) {
          metaBySensorId.set(sid, {
            _id: sid,
            sensorType: s.sensorType,
            name: s.name || "",
            unit: s.unit || "",
            avg: s.avg,
            last: s.last,
            lastAt: s.lastAt,
          });
        }
      }

      const bucket = new Map();

      for (const r of readings) {
        const sid = String(r.sensorId || "");
        if (!sid) continue;

        const day = String(r.ts || r.timestamp || "").slice(0, 10);
        if (!day) continue;

        const v = Number(r.value ?? r.readingValue ?? r.lastValue);
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
        const sensorIds = [...metaBySensorId.entries()]
          .filter(([, m]) => sensorMetaToKey(m) === sk)
          .map(([sid]) => sid);

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

          if (count > 0) {
            value = Math.round((sum / count) * 10) / 10;
          } else if (sensorIds.length) {
            const fallbackValues = sensorIds
              .map((sid) => metaBySensorId.get(String(sid)))
              .filter(Boolean)
              .map((m) => getFallbackNumeric(m))
              .filter((v) => v !== null && !Number.isNaN(v));

            if (fallbackValues.length) {
              value =
                Math.round(
                  (fallbackValues.reduce((a, b) => a + b, 0) / fallbackValues.length) * 10
                ) / 10;
            }
          }

          return { ts: tt.ts, label: tt.label, day: tt.day, value };
        });

        out[pid][sk] = pts;
      }
    }

    return out;
  }, [selectedPlotIdsResolved, selectedSensors, baseTimes, summaryByPlot, readingsByPlot, sensorsByPlot]);

  const activeSensorKey = selectedSensors[0] || "soil";
  const activeSensorMeta =
    sensorOptionsI18n.find((s) => s.key === activeSensorKey) || sensorOptionsI18n[0];

  const compareSeries = useMemo(() => {
    return selectedPlotIdsResolved.map((pid, idx) => {
      const pts = seriesByPlot?.[pid]?.[activeSensorKey] || [];
      return {
        plotId: pid,
        plotName:
          plotList.find((p) => p.id === pid)?.name || `${t("plot", "แปลง")} ${pid}`,
        color: PLOT_COLORS[idx % PLOT_COLORS.length],
        points: pts,
      };
    });
  }, [selectedPlotIdsResolved, plotList, seriesByPlot, activeSensorKey, t]);

  const allValidValues = useMemo(() => {
    return compareSeries.flatMap((s) =>
      s.points
        .map((p) => p.value)
        .filter((v) => v !== null && v !== undefined && !Number.isNaN(v))
    );
  }, [compareSeries]);

  const stats = useMemo(() => {
    if (!allValidValues.length) {
      return {
        minVal: null,
        maxVal: null,
        avgVal: null,
        currentVal: null,
        lastLabel: "-",
      };
    }

    const minVal = Math.min(...allValidValues);
    const maxVal = Math.max(...allValidValues);
    const avgVal =
      Math.round(
        (allValidValues.reduce((sum, v) => sum + v, 0) / allValidValues.length) * 10
      ) / 10;

    const firstSeries = compareSeries[0]?.points || [];
    const lastValidPoint = [...firstSeries].reverse().find(
      (p) => p.value !== null && p.value !== undefined && !Number.isNaN(p.value)
    );

    return {
      minVal,
      maxVal,
      avgVal,
      currentVal: lastValidPoint?.value ?? null,
      lastLabel: lastValidPoint?.label || "-",
    };
  }, [allValidValues, compareSeries]);

  const chart = useMemo(() => {
    const W = 100;
    const H = 60;
    const padL = 9;
    const padR = 2;
    const padT = 5;
    const padB = 10;

    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const allVals = compareSeries.flatMap((s) =>
      s.points
        .map((p) => p.value)
        .filter((v) => v !== null && v !== undefined && !Number.isNaN(v))
    );

    const yMin = allVals.length ? Math.min(...allVals) : 0;
    const yMax = allVals.length ? Math.max(...allVals) : 100;
    const span = Math.max(1e-6, yMax - yMin || 1);

    const xFor = (i, n) =>
      padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const yFor = (v) => padT + (1 - (v - yMin) / span) * innerH;

    const polylines = compareSeries.map((s) => {
      const pts = s.points;
      const n = pts.length;
      const validPoints = pts
        .map((p, i) =>
          p.value === null || p.value === undefined || Number.isNaN(p.value)
            ? null
            : `${xFor(i, n)},${yFor(p.value)}`
        )
        .filter(Boolean)
        .join(" ");

      return {
        plotId: s.plotId,
        plotName: s.plotName,
        color: s.color,
        points: validPoints,
      };
    });

    const ticks = 5;
    const yTicks = Array.from({ length: ticks }, (_, i) => {
      const tt = i / (ticks - 1);
      const v = yMax - tt * span;
      const y = yFor(v);
      return { y, v: Math.round(v * 10) / 10 };
    });

    const xLabels = baseTimes.map((p) => p.label);

    return {
      yTicks,
      polylines,
      xLabels,
      padL,
      padR,
      padT,
      padB,
      hasData: allVals.length > 0,
    };
  }, [compareSeries, baseTimes]);

  const onExportCSV = () => {
    const plots = selectedPlotIdsResolved;
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
            value: p.value ?? "",
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
    const avgOf = (pid, sk) => {
      const readings = Array.isArray(readingsByPlot?.[pid]) ? readingsByPlot[pid] : [];
      const sensorMetaItems = Array.isArray(sensorsByPlot?.[pid]) ? sensorsByPlot[pid] : [];
      const summaryItems = Array.isArray(summaryByPlot?.[pid]) ? summaryByPlot[pid] : [];

      const sensorIds = [
        ...sensorMetaItems
          .filter((m) => sensorMetaToKey(m) === sk)
          .map((m) => String(m._id || m.id)),
        ...summaryItems
          .filter((m) => sensorMetaToKey(m) === sk)
          .map((m) => String(m.sensorId)),
      ];

      const uniqSensorIds = [...new Set(sensorIds)].filter(Boolean);
      if (!uniqSensorIds.length) return "-";

      let sum = 0;
      let count = 0;

      for (const r of readings) {
        const sid = String(r.sensorId || "");
        if (!sid || !uniqSensorIds.includes(sid)) continue;
        const v = Number(r.value ?? r.readingValue ?? r.lastValue);
        if (Number.isNaN(v)) continue;
        sum += v;
        count += 1;
      }

      let v = null;

      if (count > 0) {
        v = sum / count;
      } else {
        const fallbackValues = summaryItems
          .filter((m) => uniqSensorIds.includes(String(m.sensorId)))
          .map((m) => getFallbackNumeric(m))
          .filter((x) => x !== null && !Number.isNaN(x));

        if (fallbackValues.length) {
          v = fallbackValues.reduce((a, b) => a + b, 0) / fallbackValues.length;
        }
      }

      if (v === null) return "-";

      const vv = Math.round(v * 10) / 10;
      if (sk === "light") return Math.round(vv).toLocaleString("en-US");
      return vv;
    };

    return selectedPlotIdsResolved.map((pid, i) => {
      const plotName =
        plotList.find((p) => p.id === pid)?.name || `${t("plot", "แปลง")} ${pid}`;

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
  }, [selectedPlotIdsResolved, plotList, summaryByPlot, readingsByPlot, sensorsByPlot, t]);

  const statusMessage = hasDateError
    ? t("dateRangeInvalid", "วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด")
    : historyError || plotsError;

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
                {t(
                  "historyFiltersDesc",
                  "เลือกช่วงวันที่ / เซนเซอร์ / แปลง เพื่อดูข้อมูลย้อนหลังและกราฟ"
                )}
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
                    type="button"
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
                          gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))",
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
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 900,
                                  color: "#0f172a",
                                }}
                              >
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
                  {selectedPlotNames.length
                    ? selectedPlotNames.join(", ")
                    : t("allPlots", "ทุกแปลง")}
                </div>
              </div>
            </div>

            {(plotsLoading || historyLoading || statusMessage) && (
              <div
                style={{
                  marginTop: 12,
                  borderRadius: 14,
                  padding: "10px 12px",
                  background: statusMessage
                    ? "rgba(255,255,255,0.95)"
                    : "rgba(255,255,255,0.18)",
                  color: statusMessage ? "#b91c1c" : "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {statusMessage
                  ? `${t("status", "สถานะ")}: ${statusMessage}`
                  : `${t("loading", "กำลังโหลดข้อมูล")}...`}
              </div>
            )}
          </div>

          <section style={summaryGrid}>
            {[
              {
                title: t("currentValueFirstSelectedPlot", "ค่าปัจจุบัน (แปลงแรกที่เลือก)"),
                value:
                  stats.currentVal === null
                    ? "—"
                    : `${formatDisplayValue(stats.currentVal, activeSensorKey)}${activeSensorMeta.unit}`,
                sub:
                  stats.currentVal === null
                    ? t("noDataInSelectedRange", "ไม่มีข้อมูลในช่วงที่เลือก")
                    : `${t("latestUpdate", "อัปเดตล่าสุด")} ${stats.lastLabel}`,
                bg: "linear-gradient(135deg,#dbeafe 0%,#eff6ff 45%,#ffffff 100%)",
                titleColor: "#64748b",
                valueColor: "#1d4ed8",
              },
              {
                title: t("averageAllSelectedPlots", "ค่าเฉลี่ย (รวมทุกแปลงที่เลือก)"),
                value:
                  stats.avgVal === null
                    ? "—"
                    : `${formatDisplayValue(stats.avgVal, activeSensorKey)}${activeSensorMeta.unit}`,
                sub: `sensor: ${activeSensorMeta.label}`,
                bg: "linear-gradient(135deg,#dcfce7 0%,#ecfdf5 45%,#ffffff 100%)",
                titleColor: "#166534",
                valueColor: "#16a34a",
              },
              {
                title: t("minimumValue", "ค่าต่ำสุด"),
                value:
                  stats.minVal === null
                    ? "—"
                    : `${formatDisplayValue(stats.minVal, activeSensorKey)}${activeSensorMeta.unit}`,
                sub: t("minimumOfAllSelectedPlots", "ต่ำสุดของทุกแปลงที่เลือก"),
                bg: "linear-gradient(135deg,#fef9c3 0%,#fffbeb 45%,#ffffff 100%)",
                titleColor: "#92400e",
                valueColor: "#f97316",
              },
              {
                title: t("maximumValue", "ค่าสูงสุด"),
                value:
                  stats.maxVal === null
                    ? "—"
                    : `${formatDisplayValue(stats.maxVal, activeSensorKey)}${activeSensorMeta.unit}`,
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
                  {t(
                    "weatherHeatMapDesc",
                    "ตัวอย่างแผนที่ประเทศไทย + จุดข้อมูล (rain intensity)"
                  )}
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
                  {selectedPlotNames.length
                    ? selectedPlotNames.join(", ")
                    : t("allPlots", "ทุกแปลง")}
                </p>
              </div>

              <button
                type="button"
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
                position: "relative",
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

                {chart.polylines.map((pl) =>
                  pl.points ? (
                    <polyline
                      key={pl.plotId}
                      fill="none"
                      stroke={pl.color}
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={pl.points}
                      opacity="0.95"
                    />
                  ) : null
                )}
              </svg>

              {!chart.hasData && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#64748b",
                    fontSize: 13,
                    fontWeight: 700,
                    background: "rgba(255,255,255,0.82)",
                    pointerEvents: "none",
                  }}
                >
                  {t("noDataInSelectedRange", "ไม่มีข้อมูลในช่วงที่เลือก")}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 4,
                  padding: "0 4px",
                  gap: 6,
                  minHeight: 22,
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
              *{" "}
              {t(
                "graphCompareNote",
                "กราฟนี้เทียบ “แปลง” ด้วย sensor ตัวแรกที่เลือก (เพื่ออ่านง่าย) • CSV จะ export ทุก sensor ที่เลือก"
              )}
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
              *{" "}
              {t(
                "summaryApiNote",
                "แสดงค่าจริงจาก API ตามช่วงวันที่ที่เลือก และจะ fallback เป็นค่า avg/last จาก summary เมื่อไม่มี reading ในช่วงนั้น"
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}