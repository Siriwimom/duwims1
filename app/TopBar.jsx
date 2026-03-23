"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const LOGIN_PATH = "/login";
const ADD_NODE_PATH = "/AddSensor";
const YIELD_PATH = "/management"; // หน้า "ผลผลิต"
const TOKEN_KEYS = ["AUTH_TOKEN_V1", "token", "pmtool_token", "duwims_token"];
const LANG_KEY = "duwims_lang";

function getToken() {
  if (typeof window === "undefined") return null;
  for (const key of TOKEN_KEYS) {
    const v = localStorage.getItem(key);
    if (v) return v;
  }
  return null;
}

function clearToken() {
  if (typeof window === "undefined") return;
  for (const key of TOKEN_KEYS) {
    localStorage.removeItem(key);
  }
}

export const DUWIMS_DICT = {
  th: {
    dashboard: "แดชบอร์ด",
    history: "ประวัติ",
    heatMap: "Heat Map",
    management: "จัดการ",
    plantingPlots: "แปลงปลูก",
    nodeSensor: "Node Sensor",
    yield: "ผลผลิต",
    login: "เข้าสู่ระบบ",
    logout: "ออกจากระบบ",
    langBtn: "TH / EN",
  },
  en: {
    dashboard: "Dashboard",
    history: "History",
    heatMap: "Heat Map",
    management: "Management",
    plantingPlots: "Planting Plots",
    nodeSensor: "Node Sensor",
    yield: "Yield",
    login: "Login",
    logout: "Logout",
    langBtn: "TH / EN",
  },
};

export function getDuwimsLang() {
  if (typeof window === "undefined") return "th";
  return localStorage.getItem(LANG_KEY) === "en" ? "en" : "th";
}

export function setDuwimsLang(lang) {
  const next = lang === "en" ? "en" : "th";

  try {
    localStorage.setItem(LANG_KEY, next);
  } catch {}

  try {
    document.documentElement.lang = next;
    document.documentElement.setAttribute("data-duwims-lang", next);
  } catch {}

  try {
    window.dispatchEvent(
      new CustomEvent("duwims:lang", {
        detail: { lang: next },
      })
    );
  } catch {}

  return next;
}

export function translateDuwims(key, fallback, lang) {
  const current = lang === "en" ? "en" : "th";
  const table = DUWIMS_DICT[current] || DUWIMS_DICT.th;
  return table?.[key] ?? fallback ?? key;
}

export function useDuwimsT() {
  const [lang, setLang] = useState("th");

  useEffect(() => {
    const current = getDuwimsLang();
    setLang(current);
    setDuwimsLang(current);

    const onLang = (e) => {
      const next = e?.detail?.lang === "en" ? "en" : "th";
      setLang(next);
    };

    const onStorage = (e) => {
      if (e.key === LANG_KEY) setLang(getDuwimsLang());
    };

    window.addEventListener("duwims:lang", onLang);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("duwims:lang", onLang);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const t = useMemo(() => {
    return (key, fallback) => translateDuwims(key, fallback, lang);
  }, [lang]);

  return { lang, setLang, t };
}

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, t } = useDuwimsT();

  const isManagementPath =
    pathname.startsWith("/management") ||
    pathname.startsWith("/addplantingplots") ||
    pathname.startsWith(ADD_NODE_PATH) ||
    pathname.startsWith(YIELD_PATH);

  const activeTab =
    pathname === "/"
      ? "dashboard"
      : pathname.startsWith("/history")
      ? "history"
      : pathname.startsWith("/heatmap")
      ? "heatmap"
      : isManagementPath
      ? "management"
      : "";

  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [managementOpen, setManagementOpen] = useState(false);
  const [authed, setAuthed] = useState(false);

  const menuRef = useRef(null);
  const managementRef = useRef(null);

  useEffect(() => {
    setAuthed(!!getToken());
  }, []);

  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      setIsMobile(w < 980);
      setIsTablet(w >= 980 && w < 1180);
      if (w >= 980) setMenuOpen(false);
    };

    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setManagementOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const onDoc = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    };

    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  useEffect(() => {
    if (!managementOpen) return;

    const onDoc = (e) => {
      if (!managementRef.current) return;
      if (!managementRef.current.contains(e.target)) setManagementOpen(false);
    };

    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [managementOpen]);

  const tabs = useMemo(
    () => [
      { key: "dashboard", href: "/", label: t("dashboard") },
      { key: "history", href: "/history", label: t("history") },
      { key: "heatmap", href: "/heatmap", label: `🌡 ${t("heatMap")}` },
    ],
    [t]
  );

  const managementItems = useMemo(
    () => [
      {
        key: "plantingplots",
        href: "/addplantingplots",
        label: `🌿 ${t("plantingPlots")}`,
      },
      {
        key: "nodesensor",
        href: ADD_NODE_PATH,
        label: `📡 ${t("nodeSensor")}`,
      },
      {
        key: "yield",
        href: YIELD_PATH,
        label: `🌾 ${t("yield")}`,
      },
    ],
    [t]
  );

  const toggleLang = () => {
    const next = lang === "th" ? "en" : "th";
    setDuwimsLang(next);
  };

  const handleLogout = () => {
    clearToken();
    setAuthed(false);
    setMenuOpen(false);
    setManagementOpen(false);
    router.push(LOGIN_PATH);
  };

  const navBtnStyle = (active) => ({
    border: 0,
    outline: "none",
    borderRadius: 999,
    padding: isTablet ? "9px 14px" : "10px 16px",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    transition: "0.2s ease",
    background: active ? "#ffffff" : "rgba(255,255,255,0.18)",
    color: active ? "#355a96" : "#ffffff",
    transform: active ? "translateY(-1px)" : "translateY(0px)",
    boxShadow: active ? "0 8px 20px rgba(17,24,39,0.14)" : "none",
    whiteSpace: "nowrap",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    lineHeight: 1,
    fontFamily: "inherit",
  });

  const actionBtnStyle = {
    border: 0,
    outline: "none",
    borderRadius: 999,
    padding: "10px 14px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    transition: "0.2s ease",
    background: "rgba(255,255,255,0.18)",
    color: "#ffffff",
    minHeight: 40,
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    textDecoration: "none",
    fontFamily: "inherit",
  };

  const actionBtnSolidStyle = {
    ...actionBtnStyle,
    background: "#ffffff",
    color: "#355a96",
    boxShadow: "0 8px 20px rgba(17,24,39,0.14)",
  };

  const managementItemStyle = (active) => ({
    display: "flex",
    alignItems: "center",
    padding: "11px 12px",
    borderRadius: 12,
    background: active ? "#eef4ff" : "#ffffff",
    color: active ? "#355a96" : "#0f172a",
    fontWeight: active ? 800 : 700,
    marginBottom: 6,
    border: active ? "1px solid #c7d2fe" : "1px solid transparent",
    boxShadow: active ? "0 6px 14px rgba(103,111,199,0.10)" : "none",
    transition: "all .18s ease",
    cursor: "pointer",
  });

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: isMobile ? "14px 16px" : "14px 22px",
        background: "linear-gradient(90deg, #40b596 0%, #676fc7 100%)",
        color: "#fff",
        boxShadow: "0 8px 24px rgba(64, 181, 150, 0.18)",
        position: "sticky",
        top: 0,
        zIndex: 80,
        flexWrap: isMobile ? "wrap" : "nowrap",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: isMobile ? 22 : 24,
          fontWeight: 800,
          letterSpacing: "0.5px",
          whiteSpace: "nowrap",
          minWidth: isMobile ? "100%" : "auto",
          justifyContent: isMobile ? "center" : "flex-start",
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            background: "#fff",
            boxShadow: "0 0 0 4px rgba(255,255,255,0.2)",
            flexShrink: 0,
          }}
        />
        DUWIMS
      </div>

      {!isMobile ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "flex-end",
            flex: 1,
            marginLeft: 24,
          }}
        >
          {tabs.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              style={{ textDecoration: "none" }}
            >
              <div style={navBtnStyle(activeTab === item.key)}>{item.label}</div>
            </Link>
          ))}

          <div style={{ position: "relative" }} ref={managementRef}>
            <button
              type="button"
              onClick={() => setManagementOpen((v) => !v)}
              style={{
                ...navBtnStyle(activeTab === "management" || managementOpen),
                gap: 8,
              }}
            >
              {t("management")} ▾
            </button>

            {managementOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 10px)",
                  left: 0,
                  minWidth: 230,
                  background: "#ffffff",
                  borderRadius: 16,
                  boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
                  padding: 10,
                  zIndex: 120,
                }}
              >
                {managementItems.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      style={{ textDecoration: "none" }}
                    >
                      <div
                        style={managementItemStyle(active)}
                        onMouseEnter={(e) => {
                          if (active) return;
                          e.currentTarget.style.background = "#f8fbff";
                          e.currentTarget.style.color = "#355a96";
                          e.currentTarget.style.transform = "translateX(2px)";
                        }}
                        onMouseLeave={(e) => {
                          if (active) return;
                          e.currentTarget.style.background = "#ffffff";
                          e.currentTarget.style.color = "#0f172a";
                          e.currentTarget.style.transform = "translateX(0px)";
                        }}
                      >
                        {item.label}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <button type="button" onClick={toggleLang} style={actionBtnStyle}>
            🌐 {t("langBtn")}
          </button>

          {authed ? (
            <button
              type="button"
              onClick={handleLogout}
              style={actionBtnSolidStyle}
            >
              🚪 {t("logout")}
            </button>
          ) : (
            <Link href={LOGIN_PATH} style={{ textDecoration: "none" }}>
              <div style={actionBtnSolidStyle}>🔐 {t("login")}</div>
            </Link>
          )}
        </div>
      ) : (
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            {tabs.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                style={{ textDecoration: "none" }}
              >
                <div style={navBtnStyle(activeTab === item.key)}>{item.label}</div>
              </Link>
            ))}

            <div style={{ position: "relative" }} ref={managementRef}>
              <button
                type="button"
                onClick={() => setManagementOpen((v) => !v)}
                style={{
                  ...navBtnStyle(activeTab === "management" || managementOpen),
                  gap: 8,
                }}
              >
                {t("management")} ▾
              </button>

              {managementOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    minWidth: 230,
                    background: "#ffffff",
                    borderRadius: 16,
                    boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
                    padding: 10,
                    zIndex: 120,
                  }}
                >
                  {managementItems.map((item) => {
                    const active =
                      pathname === item.href || pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        style={{ textDecoration: "none" }}
                      >
                        <div style={managementItemStyle(active)}>{item.label}</div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button type="button" onClick={toggleLang} style={actionBtnStyle}>
              🌐 {t("langBtn")}
            </button>

            {authed ? (
              <button
                type="button"
                onClick={handleLogout}
                style={actionBtnSolidStyle}
              >
                🚪 {t("logout")}
              </button>
            ) : (
              <Link href={LOGIN_PATH} style={{ textDecoration: "none" }}>
                <div style={actionBtnSolidStyle}>🔐 {t("login")}</div>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}