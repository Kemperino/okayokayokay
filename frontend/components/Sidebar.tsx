"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletBadge } from "@/components/WalletBadge";
import { FileIcon, Table2, Menu, X } from "lucide-react";

const links = [
  { href: "/resources", label: "Resources", icon: Table2 },
  { href: "/disputes", label: "My Disputes", icon: FileIcon },
];

export function MobileHeader() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="md:hidden bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/"
              className="text-gray-900 font-bold text-xl hover:text-gray-700 transition-colors"
            >
              okayokayokay
            </Link>
            <div className="flex items-center gap-4">
              <WalletBadge />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
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
          className={`absolute inset-y-0 right-0 w-full bg-white flex flex-col transition-transform duration-300 ease-out ${
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Close Button */}
          <div className="flex justify-between items-center p-4 border-b">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-gray-900 font-bold text-xl"
            >
              okayokayokay
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
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
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Icon size={20} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
          {/* Wallet Badge in Mobile Menu */}
          <div className="p-4 border-t">
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
    <aside className="hidden md:flex w-64 bg-white border-r shadow-sm sticky top-0 h-screen flex-col overflow-hidden">
      {/* Logo */}
      <div className="p-6 border-b flex-shrink-0">
        <Link
          href="/"
          className="text-gray-900 font-bold text-xl hover:text-gray-700 transition-colors"
        >
          okayokayokay
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
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Icon size={20} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Wallet Badge */}
      <div className="p-4 border-t flex-shrink-0">
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
