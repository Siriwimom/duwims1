"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <header
      style={{
        width: "100%",
        background: "#0b8f4a",
        color: "#ffffff",
      }}
    >
      {/* กล่องด้านใน กว้างเท่ากันทุกหน้า */}
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
        {/* โลโก้ */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "999px",
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
          <span style={{ fontWeight: 700, fontSize: 20 }}>DuWIMS</span>
        </div>

        {/* แท็บเมนู */}
        <nav
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          {/* Dashboard */}
          <Link href="/" style={{ textDecoration: "none" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 22px",
                borderRadius: 999,
                fontSize: 14,
                cursor: "pointer",
                background:
                  activeTab === "dashboard" ? "#ffffff" : "transparent",
                color:
                  activeTab === "dashboard" ? "#166534" : "rgba(255,255,255,0.9)",
                boxShadow:
                  activeTab === "dashboard"
                    ? "0 6px 14px rgba(0,0,0,0.18)"
                    : "none",
              }}
            >
              <span style={{ fontSize: 16 }}>🏠</span>
              <span>Dashboard</span>
            </div>
          </Link>

          {/* History */}
          <Link href="/history" style={{ textDecoration: "none" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 22px",
                borderRadius: 999,
                fontSize: 14,
                cursor: "pointer",
                background:
                  activeTab === "history" ? "#ffffff" : "transparent",
                color:
                  activeTab === "history" ? "#166534" : "rgba(255,255,255,0.9)",
                boxShadow:
                  activeTab === "history"
                    ? "0 6px 14px rgba(0,0,0,0.18)"
                    : "none",
              }}
            >
              <span style={{ fontSize: 16 }}>📊</span>
              <span>History &amp; Analytics</span>
            </div>
          </Link>

          {/* Management */}
          <Link href="/management" style={{ textDecoration: "none" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 22px",
                borderRadius: 999,
                fontSize: 14,
                cursor: "pointer",
                background:
                  activeTab === "management" ? "#ffffff" : "transparent",
                color:
                  activeTab === "management"
                    ? "#166534"
                    : "rgba(255,255,255,0.9)",
                boxShadow:
                  activeTab === "management"
                    ? "0 6px 14px rgba(0,0,0,0.18)"
                    : "none",
              }}
            >
              <span style={{ fontSize: 16 }}>🛠️</span>
              <span>Management</span>
            </div>
          </Link>
        </nav>
      </div>
    </header>
  );
}
