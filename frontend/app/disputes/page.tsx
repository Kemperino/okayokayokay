import Link from "next/link";
import DisputesPageClient from "@/components/DisputesPageClient";

export default async function DisputesPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <h1 className="text-2xl font-bold mb-2 text-[#41EAD4]">DISPUTES</h1>
        <p className="text-primary">View and manage your active disputes</p>
      </div>

      <DisputesPageClient />
    </div>
  );
}
