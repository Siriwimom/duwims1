"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const LANG_KEY = "duwims_lang"; // th | en

const DICT = {
  th: {
    dashboard: "แดชบอร์ด",
    history: "ประวัติ & วิเคราะห์",
    management: "จัดการ",
    login: "เข้าสู่ระบบ",
    logout: "ออกจากระบบ",
    langBtn: "ไทย / English",

    // ✅ เพิ่มคำของทุกหน้าที่คุณต้องการแปลไว้ที่นี่
    // addSensorTitle: "การจัดการ PIN และ Sensor",
    // editDeleteTitle: "ลบ/แก้ไข PIN และ Sensor",
  },
  en: {
    dashboard: "Dashboard",
    history: "History & Analytics",
    management: "Management",
    login: "Login",
    logout: "Logout",
    langBtn: "TH / EN",

    // addSensorTitle: "Pin & Sensor Management",
    // editDeleteTitle: "Delete/Edit Pins & Sensors",
  },
};

function readLang() {
  if (typeof window === "undefined") return "th";
  return localStorage.getItem(LANG_KEY) || "th";
}

function applyHtmlLang(lang) {
  try {
    document.documentElement.lang = lang === "en" ? "en" : "th";
    document.documentElement.setAttribute("data-duwims-lang", lang === "en" ? "en" : "th");
  } catch {}
}

const I18nCtx = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState("th");

  useEffect(() => {
    const l = readLang();
    setLang(l);
    applyHtmlLang(l);
  }, []);

  // sync ข้ามแท็บ
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === LANG_KEY) {
        const l = readLang();
        setLang(l);
        applyHtmlLang(l);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // sync ในแท็บเดียว (จาก TopBar dispatch event)
  useEffect(() => {
    const onLang = (e) => {
      const next = e?.detail?.lang;
      if (!next) return;
      const l = next === "en" ? "en" : "th";
      setLang(l);
      applyHtmlLang(l);
      try {
        localStorage.setItem(LANG_KEY, l);
      } catch {}
    };
    window.addEventListener("duwims:lang", onLang);
    return () => window.removeEventListener("duwims:lang", onLang);
  }, []);

  const api = useMemo(() => {
    const table = DICT[lang] || DICT.th;
    const t = (key, fallback) => table?.[key] ?? fallback ?? key;

    const setLanguage = (next) => {
      const l = next === "en" ? "en" : "th";
      try {
        localStorage.setItem(LANG_KEY, l);
      } catch {}
      setLang(l);
      applyHtmlLang(l);
      window.dispatchEvent(new CustomEvent("duwims:lang", { detail: { lang: l } }));
    };

    const toggle = () => setLanguage(lang === "th" ? "en" : "th");

    return { lang, t, setLanguage, toggle };
  }, [lang]);

  return <I18nCtx.Provider value={api}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider />");
  return ctx;
}