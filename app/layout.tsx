import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RHTS Milling Cells — Configurator",
  description: "Configure robotic milling cells and get an instant PDF offer.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
