"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { WalletBadge } from "@/components/WalletBadge";
import { Menu, X, Activity, Scale, HandCoins } from "lucide-react";

const links = [
  { href: "/", label: "My Transactions", icon: Activity },
  { href: "/resources", label: "Resources", icon: HandCoins },
  { href: "/disputes", label: "My Disputes", icon: Scale },
];

export function MobileHeader() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="md:hidden bg-default border-b border-contrast shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/"
              className="hover:opacity-80 transition-opacity flex items-center gap-3"
            >
              <Image
                src="/logo.png"
                alt="okayokayokay"
                width={40}
                height={40}
                className="rounded"
              />
              <span className="text-[#41EAD4] font-dalfitra text-2xl">
                OkayOkayOkay
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <WalletBadge />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-primary hover:bg-contrast transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </header>
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
          isMobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/80"
          onClick={() => setIsMobileMenuOpen(false)}
        />
        {/* Overlay Menu */}
        <div
          className={`absolute inset-y-0 right-0 w-full bg-default flex flex-col transition-transform duration-300 ease-out ${
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Close Button */}
          <div className="flex justify-between items-center p-4 border-b border-contrast">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:opacity-80 transition-opacity"
            >
              <Image
                src="/logo.png"
                alt="okayokayokay"
                width={40}
                height={40}
                className="rounded"
              />
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-lg text-primary hover:bg-contrast transition-colors"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>
          {/* Navigation */}
          <nav className="flex-1 flex flex-col px-4 py-6 space-y-2">
            {links.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`px-4 py-3 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                    isActive
                      ? "bg-contrast text-primary"
                      : "text-primary hover:text-highlight hover:bg-contrast"
                  }`}
                >
                  <Icon size={20} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
          {/* Wallet Badge in Mobile Menu */}
          <div className="p-4 border-t border-contrast">
            <WalletBadge />
          </div>
        </div>
      </div>
    </>
  );
}

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 bg-default border-r border-contrast shadow-sm sticky top-0 h-screen flex-col overflow-hidden">
      {/* Logo */}
      <div className="p-6 border-b border-contrast flex-shrink-0">
        <Link
          href="/"
          className="hover:opacity-80 transition-opacity flex items-center gap-3"
        >
          <Image
            src="/logo.png"
            alt="okayokayokay"
            width={48}
            height={48}
            className="rounded"
          />
          <span className="text-[#41EAD4] font-dalfitra text-xl">
            OkayOkayOkay
          </span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-3 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                isActive
                  ? "bg-contrast text-[#41EAD4]"
                  : "text-primary hover:text-primary hover:bg-contrast"
              }`}
            >
              <Icon size={20} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Wallet Badge */}
      <div className="p-4 border-t border-contrast flex-shrink-0">
        <WalletBadge />
      </div>
    </aside>
  );
}

export function Sidebar() {
  return (
    <>
      <MobileHeader />
      <DesktopSidebar />
    </>
  );
}
