// app/layout.tsx
import "./globals.css";
import TopBar from "./TopBar";
import "leaflet/dist/leaflet.css";

export const metadata = {
  title: "DuWIMS",
  description: "Smart Durian Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>

      <body>
        <TopBar />

        <div className="du-main">
          <div className="du-container">{children}</div>
        </div>
      </body>
    </html>
  );
}
