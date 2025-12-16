"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export default function TopBar() {
  const pathname = usePathname();

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
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const tabs = useMemo(
    () => [
      { key: "dashboard", href: "/", icon: "🏠", label: "Dashboard" },
      { key: "history", href: "/history", icon: "📊", label: "History & Analytics" },
      { key: "management", href: "/management", icon: "🛠️", label: "Management" },
    ],
    []
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
  });

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
          <span style={{ fontWeight: 700, fontSize: isMobile ? 18 : 20 }}>
            DuWIMS
          </span>
        </div>

        {/* Desktop / Tablet */}
        {!isMobile && (
          <nav
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: isTablet ? 10 : 16,
            }}
          >
            {tabs.map((t) => {
              const active = activeTab === t.key;
              return (
                <Link key={t.key} href={t.href} style={{ textDecoration: "none" }}>
                  <div style={pillStyle(active)}>
                    <span style={{ fontSize: 16 }}>{t.icon}</span>
                    <span
                      style={{
                        maxWidth: isTablet ? 170 : "none",
                        overflow: isTablet ? "hidden" : "visible",
                        textOverflow: isTablet ? "ellipsis" : "clip",
                      }}
                    >
                      {t.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </nav>
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
                  width: 260,
                  background: "#ffffff",
                  borderRadius: 16,
                  boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
                  padding: 10,
                }}
              >
                {tabs.map((t) => {
                  const active = activeTab === t.key;
                  return (
                    <Link key={t.key} href={t.href} style={{ textDecoration: "none" }}>
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
                        <span>{t.icon}</span>
                        <span>{t.label}</span>
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
