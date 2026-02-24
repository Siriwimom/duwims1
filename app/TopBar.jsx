"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const LOGIN_PATH = "/login";
const TOKEN_KEY = "token";
const LANG_KEY = "duwims_lang"; // th | en

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

function getLang() {
  if (typeof window === "undefined") return "th";
  return localStorage.getItem(LANG_KEY) || "th";
}

// ✅ ศูนย์กลาง: apply language to whole document + broadcast
function applyLang(lang) {
  const v = lang === "en" ? "en" : "th";

  // persist
  try {
    localStorage.setItem(LANG_KEY, v);
  } catch {}

  // apply to document (ทั้งระบบ)
  try {
    document.documentElement.lang = v === "en" ? "en" : "th";
    document.documentElement.setAttribute("data-duwims-lang", v);
  } catch {}

  // broadcast for any page that wants to react
  try {
    window.dispatchEvent(new CustomEvent("duwims:lang", { detail: { lang: v } }));
  } catch {}

  return v;
}

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();

  const activeTab =
    pathname === "/"
      ? "dashboard"
      : pathname.startsWith("/history")
      ? "history"
      : pathname.startsWith("/management")
      ? "management"
      : "";

  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef(null);

  // auth + lang
  const [authed, setAuthed] = useState(false);
  const [lang, setLangState] = useState("th");

  // ✅ Dictionary กลาง (อยู่ในไฟล์เดียว)
  const dict = useMemo(
    () => ({
      th: {
        dashboard: "แดชบอร์ด",
        history: "ประวัติ & วิเคราะห์",
        management: "จัดการ",
        login: "เข้าสู่ระบบ",
        logout: "ออกจากระบบ",
        langBtn: "ไทย / English",
      },
      en: {
        dashboard: "Dashboard",
        history: "History & Analytics",
        management: "Management",
        login: "Login",
        logout: "Logout",
        langBtn: "TH / EN",
      },
    }),
    []
  );

  // ✅ translator function
  const t = useMemo(() => {
    const table = dict[lang] || dict.th;
    return (key, fallback) => table?.[key] ?? fallback ?? key;
  }, [dict, lang]);

  // ✅ expose global helpers (optional แต่ช่วยให้หน้าอื่น “เรียกใช้ได้” โดยไม่ต้องทำ provider)
  useEffect(() => {
    if (typeof window === "undefined") return;

    window.duwimsGetLang = () => getLang();
    window.duwimsSetLang = (l) => {
      const next = applyLang(l);
      setLangState(next);
      return next;
    };
    window.__DUWIMS_T = (key, fallback) => {
      const current = getLang();
      const table = dict[current] || dict.th;
      return table?.[key] ?? fallback ?? key;
    };
  }, [dict]);

  // init
  useEffect(() => {
    setAuthed(!!getToken());
    const l = applyLang(getLang()); // ✅ apply to whole doc on mount
    setLangState(l);
  }, []);

  // sync authed + lang across tabs/windows
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === TOKEN_KEY) setAuthed(!!getToken());
      if (e.key === LANG_KEY) {
        const l = applyLang(getLang());
        setLangState(l);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // sync inside same tab via custom event
  useEffect(() => {
    const onLang = (e) => {
      const next = e?.detail?.lang;
      if (!next) return;
      const l = applyLang(next);
      setLangState(l);
    };
    window.addEventListener("duwims:lang", onLang);
    return () => window.removeEventListener("duwims:lang", onLang);
  }, []);

  // responsive
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

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const tabs = useMemo(
    () => [
      { key: "dashboard", href: "/", icon: "🏠", label: t("dashboard") },
      { key: "history", href: "/history", icon: "📊", label: t("history") },
      { key: "management", href: "/management", icon: "🛠️", label: t("management") },
    ],
    [t]
  );

  const pillStyle = (active) => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: isTablet ? "8px 14px" : "8px 22px",
    borderRadius: 999,
    fontSize: 14,
    cursor: "pointer",
    background: active ? "#ffffff" : "transparent",
    color: active ? "#166534" : "rgba(255,255,255,0.9)",
    boxShadow: active ? "0 6px 14px rgba(0,0,0,0.18)" : "none",
    whiteSpace: "nowrap",
    userSelect: "none",
  });

  const actionBtnStyle = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "none",
    borderRadius: 999,
    padding: isTablet ? "8px 12px" : "8px 16px",
    fontSize: 13,
    cursor: "pointer",
    background: "rgba(255,255,255,0.16)",
    color: "#fff",
    whiteSpace: "nowrap",
    userSelect: "none",
  };

  const actionBtnSolidStyle = {
    ...actionBtnStyle,
    background: "#ffffff",
    color: "#166534",
    boxShadow: "0 6px 14px rgba(0,0,0,0.18)",
    fontWeight: 800,
  };

  const toggleLang = () => {
    const next = lang === "th" ? "en" : "th";
    const l = applyLang(next); // ✅ apply to whole system
    setLangState(l);
  };

  const handleLogout = () => {
    clearToken();
    setAuthed(false);
    setMenuOpen(false);
    router.push(LOGIN_PATH);
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
        {/* Logo */}
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
            }}
          >
            🌱
          </div>
          <span style={{ fontWeight: 700, fontSize: isMobile ? 18 : 20 }}>DuWIMS</span>
        </div>

        {/* Desktop / Tablet */}
        {!isMobile && (
          <>
            <nav
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: isTablet ? 10 : 16,
                alignItems: "center",
              }}
            >
              {tabs.map((tItem) => {
                const active = activeTab === tItem.key;
                return (
                  <Link key={tItem.key} href={tItem.href} style={{ textDecoration: "none" }}>
                    <div style={pillStyle(active)}>
                      <span style={{ fontSize: 16 }}>{tItem.icon}</span>
                      <span
                        style={{
                          maxWidth: isTablet ? 170 : "none",
                          overflow: isTablet ? "hidden" : "visible",
                          textOverflow: isTablet ? "ellipsis" : "clip",
                        }}
                      >
                        {tItem.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button type="button" onClick={toggleLang} style={actionBtnStyle} title="Change language">
                🌐 <span>{t("langBtn")}</span>
              </button>

              {authed ? (
                <button type="button" onClick={handleLogout} style={actionBtnSolidStyle} title="Logout">
                  🚪 <span>{t("logout")}</span>
                </button>
              ) : (
                <Link href={LOGIN_PATH} style={{ textDecoration: "none" }}>
                  <div style={actionBtnSolidStyle} title="Login">
                    🔐 <span>{t("login")}</span>
                  </div>
                </Link>
              )}
            </div>
          </>
        )}

        {/* Mobile */}
        {isMobile && (
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
                  width: 270,
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

                {tabs.map((tItem) => {
                  const active = activeTab === tItem.key;
                  return (
                    <Link key={tItem.key} href={tItem.href} style={{ textDecoration: "none" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: 12,
                          background: active ? "#eef2ff" : "#fff",
                          color: "#0f172a",
                          fontWeight: active ? 900 : 700,
                        }}
                      >
                        <span>{tItem.icon}</span>
                        <span>{tItem.label}</span>
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