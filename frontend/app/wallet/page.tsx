import { SessionWalletInfo } from "@/components/SessionWalletInfo";
import Link from "next/link";

export default function WalletPage() {
  return (
    <div className="min-h-screen ">
      <div className="max-w-7xl p-8 mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            ← Back to Home
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Wallet</h1>
          <p className="mt-2 text-gray-600">
            Manage your anonymous session wallet for x402 payments
          </p>
        </div>

        <SessionWalletInfo />

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            How it works
          </h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>
              • Your wallet is automatically created and tied to this browser
              session
            </li>
            <li>• Fund it with USDC on Base to make x402 payments</li>
            <li>
              • Payments are processed automatically when you use resources
            </li>
            <li>• Balance updates every 10 seconds</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
