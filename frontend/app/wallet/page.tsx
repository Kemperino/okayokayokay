import { SessionWalletInfo } from "@/components/SessionWalletInfo";
import Link from "next/link";

export default function WalletPage() {
  return (
    <div className="min-h-screen ">
      <div className="max-w-7xl p-8 mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm text-primary/70 hover:text-primary flex items-center gap-2"
          >
            ← Back to Home
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Your Wallet</h1>
          <p className="mt-2 text-primary/70">
            Manage your anonymous session wallet for x402 payments
          </p>
        </div>

        <SessionWalletInfo />

        <div className="mt-6 bg-highlight/20 border border-highlight rounded-lg p-6">
          <h3 className="text-sm font-semibold text-highlight mb-2">
            How it works
          </h3>
          <ul className="text-sm text-primary/80 space-y-2">
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
