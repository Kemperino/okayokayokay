import type { Metadata } from "next";
import { MobileHeader, DesktopSidebar } from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "okayokayokay - Dispute Resolution Platform",
  description: "x402 payment dispute resolution with multi-layer arbitration",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>",
      },
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
