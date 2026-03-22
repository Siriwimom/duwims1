"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const LOGIN_PATH = "/login";
const ADD_NODE_PATH = "/AddSensor"; // <- ถ้าหน้าจริงไม่ใช่ route นี้ ให้เปลี่ยนตรงนี้
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
    addPlantingPlots: "จัดการแปลงปลูก",
    addNode: "เพิ่ม Node",
    editAndDelete: "การจัดการผลผลิต",
    login: "เข้าสู่ระบบ",
    logout: "ออกจากระบบ",
    langBtn: "TH / EN",
  },
  en: {
    dashboard: "Dashboard",
    history: "History",
    heatMap: "Heat Map",
    management: "Management",
    addPlantingPlots: "Add Planting Plots",
    addNode: "Add Node",
    editAndDelete: "Edit / Delete",
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
    pathname.startsWith("/editanddelete");

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
    const onStorage = (e) => {
      if (TOKEN_KEYS.includes(e.key)) setAuthed(!!getToken());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1024);
      if (w >= 768) setMenuOpen(false);
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
        key: "addplantingplots",
        href: "/addplantingplots",
        label: t("addPlantingPlots"),
      },
      {
        key: "addnode",
        href: ADD_NODE_PATH,
        label: t("addNode"),
      },
      {
        key: "editanddelete",
        href: "/editanddelete",
        label: t("editAndDelete"),
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

  const navTabStyle = (active) => ({
    padding: isTablet ? "8px 14px" : "8px 18px",
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    border: "none",
    background: active ? "#ffffff" : "transparent",
    color: active ? "#166534" : "rgba(255,255,255,0.96)",
    boxShadow: active ? "0 6px 14px rgba(0,0,0,0.16)" : "none",
    transition: "all .18s ease",
    whiteSpace: "nowrap",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    lineHeight: 1,
    fontFamily: "inherit",
  });

  const actionBtnStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "none",
    borderRadius: 999,
    padding: isTablet ? "8px 12px" : "8px 16px",
    minHeight: 38,
    fontSize: 13,
    cursor: "pointer",
    background: "rgba(255,255,255,0.16)",
    color: "#ffffff",
    whiteSpace: "nowrap",
    userSelect: "none",
    textDecoration: "none",
    fontWeight: 700,
    lineHeight: 1,
  };

  const actionBtnSolidStyle = {
    ...actionBtnStyle,
    background: "#ffffff",
    color: "#166534",
    boxShadow: "0 6px 14px rgba(0,0,0,0.18)",
    fontWeight: 800,
  };

  return (
    <header
      style={{
        width: "100%",
        background: "#0b8f4a",
        color: "#ffffff",
        position: "sticky",
        top: 0,
        zIndex: 80,
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: isMobile ? "10px 14px" : "10px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              color: "#16a34a",
              flexShrink: 0,
            }}
          >
            🌱
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: isMobile ? 18 : 20,
              whiteSpace: "nowrap",
            }}
          >
            DUWIMS
          </span>
        </div>

        {!isMobile ? (
          <>
            <nav
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: isTablet ? 8 : 12,
                alignItems: "center",
              }}
            >
              {tabs.map((item) => (
                <Link key={item.key} href={item.href} style={{ textDecoration: "none" }}>
                  <div style={navTabStyle(activeTab === item.key)}>{item.label}</div>
                </Link>
              ))}

              <div style={{ position: "relative" }} ref={managementRef}>
                <button
                  type="button"
                  onClick={() => setManagementOpen((v) => !v)}
                  style={{
                    ...navTabStyle(activeTab === "management" || managementOpen),
                    gap: 8,
                    transform: managementOpen ? "translateY(-1px)" : "translateY(0)",
                    boxShadow: managementOpen
                      ? "0 8px 18px rgba(0,0,0,0.18)"
                      : activeTab === "management"
                      ? "0 6px 14px rgba(0,0,0,0.16)"
                      : "none",
                  }}
                >
                  <span>{t("management")}</span>
                  <span
                    style={{
                      fontSize: 10,
                      transition: "transform .18s ease",
                      transform: managementOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    ▾
                  </span>
                </button>

                {managementOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 10px)",
                      left: 0,
                      minWidth: 240,
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
                            style={{
                              display: "flex",
                              alignItems: "center",
                              padding: "11px 12px",
                              borderRadius: 12,
                              background: active ? "#dcfce7" : "#ffffff",
                              color: active ? "#166534" : "#0f172a",
                              fontWeight: active ? 900 : 700,
                              marginBottom: 6,
                              border: active
                                ? "1px solid #86efac"
                                : "1px solid transparent",
                              boxShadow: active
                                ? "0 6px 14px rgba(34,197,94,0.14)"
                                : "none",
                              transition: "all .18s ease",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => {
                              if (active) return;
                              e.currentTarget.style.background = "#f0fdf4";
                              e.currentTarget.style.color = "#166534";
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
            </nav>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button type="button" onClick={toggleLang} style={actionBtnStyle}>
                🌐 <span>{t("langBtn")}</span>
              </button>

              {authed ? (
                <button type="button" onClick={handleLogout} style={actionBtnSolidStyle}>
                  🚪 <span>{t("logout")}</span>
                </button>
              ) : (
                <Link href={LOGIN_PATH} style={{ textDecoration: "none" }}>
                  <div style={actionBtnSolidStyle}>
                    🔐 <span>{t("login")}</span>
                  </div>
                </Link>
              )}
            </div>
          </>
        ) : (
          <div style={{ marginLeft: "auto", position: "relative" }} ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                border: "none",
                background: "rgba(255,255,255,0.16)",
                color: "#fff",
                borderRadius: 12,
                padding: "8px 10px",
                cursor: "pointer",
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              {menuOpen ? "✖" : "☰"}
            </button>

            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 10px)",
                  width: 280,
                  background: "#ffffff",
                  borderRadius: 16,
                  boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
                  padding: 10,
                }}
              >
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <button
                    type="button"
                    onClick={toggleLang}
                    style={{
                      flex: 1,
                      border: "1px solid rgba(15,23,42,0.12)",
                      background: "#f8fafc",
                      borderRadius: 12,
                      padding: "10px 12px",
                      cursor: "pointer",
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    🌐 {t("langBtn")}
                  </button>

                  {authed ? (
                    <button
                      type="button"
                      onClick={handleLogout}
                      style={{
                        flex: 1,
                        border: "none",
                        background: "#0f172a",
                        color: "#fff",
                        borderRadius: 12,
                        padding: "10px 12px",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                    >
                      🚪 {t("logout")}
                    </button>
                  ) : (
                    <Link href={LOGIN_PATH} style={{ flex: 1, textDecoration: "none" }}>
                      <div
                        style={{
                          textAlign: "center",
                          border: "none",
                          background: "#0f172a",
                          color: "#fff",
                          borderRadius: 12,
                          padding: "10px 12px",
                          cursor: "pointer",
                          fontWeight: 900,
                        }}
                      >
                        🔐 {t("login")}
                      </div>
                    </Link>
                  )}
                </div>

                {tabs.map((item) => {
                  const active = activeTab === item.key;
                  return (
                    <Link key={item.key} href={item.href} style={{ textDecoration: "none" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "10px 12px",
                          borderRadius: 12,
                          background: active ? "#eefbf3" : "#fff",
                          color: active ? "#166534" : "#0f172a",
                          fontWeight: active ? 900 : 700,
                          marginBottom: 6,
                        }}
                      >
                        {item.label}
                      </div>
                    </Link>
                  );
                })}

                <div
                  style={{
                    marginTop: 8,
                    marginBottom: 6,
                    padding: "8px 10px",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#166534",
                  }}
                >
                  {t("management")}
                </div>

                {managementItems.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(item.href);

                  return (
                    <Link key={item.key} href={item.href} style={{ textDecoration: "none" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "11px 12px",
                          borderRadius: 12,
                          background: active ? "#dcfce7" : "#fff",
                          color: active ? "#166534" : "#0f172a",
                          fontWeight: active ? 900 : 700,
                          marginBottom: 6,
                          border: active
                            ? "1px solid #86efac"
                            : "1px solid transparent",
                          boxShadow: active
                            ? "0 6px 14px rgba(34,197,94,0.12)"
                            : "none",
                          transition: "all .18s ease",
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
        )}
      </div>
    </header>
  );
}