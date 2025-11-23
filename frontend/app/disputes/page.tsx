import Link from "next/link";
import DisputesPageClient from "@/components/DisputesPageClient";

export default async function DisputesPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-primary/70 hover:text-primary flex items-center gap-2"
        >
          ← Back to Home
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-primary">My Disputes</h1>
        <p className="text-primary/70">
          View and manage your active disputes. Only transactions with open disputes, 
          escalations, or resolutions are shown here.
        </p>
      </div>

      <DisputesPageClient />
    </div>
  );
}
