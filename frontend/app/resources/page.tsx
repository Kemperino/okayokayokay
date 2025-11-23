import {
  getActiveResources,
  getRecentResourceRequests,
} from "@/lib/queries/resources.server";
import AddResourceForm from "@/components/AddResourceForm";
import ResourceList from "@/components/ResourceList";
import ResourceRequestHistory from "@/components/ResourceRequestHistory";

// Force dynamic rendering - don't cache this page
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ResourcesPage() {
  const [resourcesResult, requestsResult] = await Promise.all([
    getActiveResources(),
    getRecentResourceRequests(20),
  ]);

  const { data: resources, error: resourcesError } = resourcesResult;
  const { data: requests, error: requestsError } = requestsResult;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <h1 className="text-2xl font-bold mb-2 text-[#41EAD4]">
          x402 RESOURCES
        </h1>
        <p className="text-primary">Browse and use x402-powered resources</p>
      </div>

      {/* Add Resource Form */}
      <div className="mb-8">
        <AddResourceForm />
      </div>

      {/* Resources List */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-primary">
          Available Resources
        </h2>
        {resourcesError && (
          <div className="text-error mb-4">
            Error loading resources: {resourcesError.message}
          </div>
        )}
        {resources && <ResourceList resources={resources} />}
      </div>
    </div>
  );
}
