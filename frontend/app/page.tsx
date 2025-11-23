import { RealtimeResourceRequests } from "@/components/events/RealtimeResourceRequests";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-primary">okay okay okay</h1>
        <p className="text-primary/70 mb-8">
          Dispute resolution platform for x402 payments with multi-layer
          arbitration
        </p>

        {/* Quick Links */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/wallet"
            className="px-4 py-3 bg-highlight text-primary rounded-lg hover:bg-highlight/90 transition text-center"
          >
            <div className="font-semibold">Wallet</div>
            <div className="text-xs opacity-90">Manage funds</div>
          </Link>
          <Link
            href="/resources"
            className="px-4 py-3 bg-contrast text-primary rounded-lg hover:bg-default transition text-center"
          >
            <div className="font-semibold">Resources</div>
            <div className="text-xs opacity-90">Browse & test</div>
          </Link>
          <Link
            href="/disputes"
            className="px-4 py-3 bg-warning text-background rounded-lg hover:bg-warning/90 transition text-center"
          >
            <div className="font-semibold">My Disputes</div>
            <div className="text-xs opacity-90">Track status</div>
          </Link>
        </div>

        {/* Resource Requests Feed */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-1 text-primary">
                Resource Requests
              </h2>
              <p className="text-sm text-primary/60">
                Live view of x402 resource requests and responses
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span className="text-sm text-primary/70">Live</span>
            </div>
          </div>
          <div className="border border-contrast rounded-lg bg-default p-4 max-h-[600px] overflow-y-auto">
            <RealtimeResourceRequests />
          </div>
        </div>
      </div>
    </main>
  );
}
