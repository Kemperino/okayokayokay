import Link from "next/link";
import { getPaginatedResourceRequests } from "@/lib/queries/resources.server";
import ResourceRequestHistory from "@/components/ResourceRequestHistory";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function RequestsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentPage = parseInt(params.page || "1", 10);
  const pageSize = 20;

  const {
    data: requests,
    error,
    count,
    totalPages,
  } = await getPaginatedResourceRequests(currentPage, pageSize);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link
          href="/resources"
          className="text-sm text-primary/70 hover:text-primary flex items-center gap-2"
        >
          ← Back to Resources
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-primary">
          My Transactions
        </h1>
        <p className="text-primary/70">View all your x402 transactions</p>
      </div>

      {error && (
        <div className="bg-error/20 border border-error rounded-lg p-4 mb-6">
          <p className="text-error">Error loading requests: {error.message}</p>
        </div>
      )}

      {requests && requests.length > 0 && (
        <>
          <div className="mb-4">
            <p className="text-sm text-primary/60">
              Showing {(currentPage - 1) * pageSize + 1} -{" "}
              {Math.min(currentPage * pageSize, count || 0)} of {count || 0}{" "}
              requests
            </p>
          </div>

          <ResourceRequestHistory requests={requests} />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <Link
                href={`/requests?page=${Math.max(1, currentPage - 1)}`}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  currentPage === 1
                    ? "bg-contrast text-primary/30 cursor-not-allowed"
                    : "bg-default border border-contrast text-primary hover:bg-contrast"
                }`}
                aria-disabled={currentPage === 1}
              >
                <ChevronLeft size={20} />
                Previous
              </Link>

              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }

                  return (
                    <Link
                      key={pageNum}
                      href={`/requests?page=${pageNum}`}
                      className={`px-3 py-2 rounded-lg transition ${
                        currentPage === pageNum
                          ? "bg-highlight text-primary font-semibold"
                          : "bg-default border border-contrast text-primary hover:bg-contrast"
                      }`}
                    >
                      {pageNum}
                    </Link>
                  );
                })}
              </div>

              <Link
                href={`/requests?page=${Math.min(totalPages, currentPage + 1)}`}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  currentPage === totalPages
                    ? "bg-contrast text-primary/30 cursor-not-allowed"
                    : "bg-default border border-contrast text-primary hover:bg-contrast"
                }`}
                aria-disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight size={20} />
              </Link>
            </div>
          )}
        </>
      )}

      {requests && requests.length === 0 && (
        <div className="border border-contrast rounded-lg p-8 text-center text-primary/60 bg-default">
          No resource requests found.
        </div>
      )}
    </div>
  );
}
