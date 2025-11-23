import BuyerDisputesWrapper from "@/components/BuyerDisputesWrapper";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ contract?: string }>;
}

export default async function DisputesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const contractAddress = params.contract;

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
          View your transaction history, track disputes, and monitor on-chain
          status
        </p>
      </div>

      {/* TODO: Put that in the dashboard  */}
      {/* <BuyerDisputesWrapper contractAddress={contractAddress} /> */}
    </div>
  );
}
