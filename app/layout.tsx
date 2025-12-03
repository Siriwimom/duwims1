// app/layout.tsx
import "./globals.css";
import TopBar from "./TopBar";

export const metadata = {
  title: "DuWIMS",
  description: "Smart Durian Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        {/* ท็อปบาร์ใช้ร่วมกันทุกหน้า */}
        <TopBar />

        {/* กล่องเนื้อหากลางจอ ใช้ร่วมกันทุกหน้า */}
        <div className="du-main">{children}</div>
      </body>
    </html>
  );
}
