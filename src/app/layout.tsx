import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MedSupply360", template: "%s · MedSupply360" },
  description: "Business control tower for medical equipment, devices and consumables distributors.",
  robots: { index: false, follow: false }, // private business data: keep out of search engines
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#176e60" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
