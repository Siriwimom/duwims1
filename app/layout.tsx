import "./globals.css";
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "DuWIMS",
  description: "Smart Durian Farm Monitoring System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body style={{ margin: 0, background: "#f3f6fb" }}>{children}</body>
    </html>
  );
}
