import type { Metadata } from "next";
import { MobileHeader, DesktopSidebar } from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "okay3 - x402 disputes",
  description: "x402 payment dispute resolution with multi-layer arbitration",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-background">
        <div className="max-w-7xl mx-auto w-full h-full">
          <MobileHeader />
          <div className="md:flex h-full">
            <DesktopSidebar />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
