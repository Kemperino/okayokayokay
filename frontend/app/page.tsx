import { RealtimeResourceRequests } from '@/components/events/RealtimeResourceRequests';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">okay okay okay</h1>
        <p className="text-gray-600 mb-8">
          Dispute resolution platform for x402 payments with multi-layer arbitration
        </p>

        {/* Quick Links */}
        <div className="mb-8 flex gap-4">
          <Link
            href="/wallet"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            View Wallet
          </Link>
          <Link
            href="/resources"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
          >
            Browse Resources
          </Link>
        </div>

        {/* Resource Requests Feed */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">Resource Requests</h2>
              <p className="text-sm text-gray-500">
                Live view of x402 resource requests and responses
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Live</span>
            </div>
          </div>
          <div className="border rounded-lg bg-gray-50 p-4 max-h-[600px] overflow-y-auto">
            <RealtimeResourceRequests />
          </div>
        </div>
      </div>
    </main>
  );
}
