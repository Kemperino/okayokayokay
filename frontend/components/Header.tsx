import Link from "next/link";
import { WalletBadge } from "@/components/WalletBadge";

export function Header() {
  return (
    <nav className="bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link
              href="/"
              className="flex items-center px-2 text-gray-900 font-bold text-xl"
            >
              okayokayokay
            </Link>
            <div className="ml-6 flex space-x-4">
              <Link
                href="/resources"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              >
                Resources
              </Link>
              <Link
                href="/disputes"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              >
                My Disputes
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <WalletBadge />
          </div>
        </div>
      </div>
    </nav>
  );
}
