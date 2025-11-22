'use client';

interface ResourceRequest {
  id: string;
  request_path: string;
  request_params: any;
  response_status: number | null;
  tx_hash: string | null;
  payment_amount: string | null;
  status: string;
  created_at: string;
  resources?: {
    name: string;
    base_url: string;
  };
}

export default function ResourceRequestHistory({
  requests,
}: {
  requests: ResourceRequest[];
}) {
  if (!requests || requests.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-gray-500">
        No requests yet. Test a resource above to see request history.
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <div
          key={request.id}
          className="border rounded-lg p-4 bg-white shadow-sm hover:shadow transition"
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              {request.resources && (
                <div className="text-sm font-semibold text-gray-900">
                  {request.resources.name}
                </div>
              )}
              <div className="text-sm text-gray-600 font-mono">
                {request.request_path}
              </div>
            </div>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                request.status
              )}`}
            >
              {request.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {request.request_params && Object.keys(request.request_params).length > 0 && (
              <div className="col-span-2">
                <span className="font-semibold">Params:</span>{' '}
                {Object.entries(request.request_params)
                  .map(([k, v]) => `${k}=${v}`)
                  .join(', ')}
              </div>
            )}

            {request.response_status && (
              <div>
                <span className="font-semibold">Status:</span>{' '}
                <span
                  className={
                    request.response_status === 200
                      ? 'text-green-600'
                      : 'text-red-600'
                  }
                >
                  {request.response_status}
                </span>
              </div>
            )}

            {request.payment_amount && (
              <div>
                <span className="font-semibold">Amount:</span> {request.payment_amount}
              </div>
            )}

            {request.tx_hash && (
              <div className="col-span-2">
                <span className="font-semibold">Tx:</span>{' '}
                <code className="bg-gray-100 px-1 py-0.5 rounded">
                  {request.tx_hash.slice(0, 10)}...{request.tx_hash.slice(-8)}
                </code>
              </div>
            )}

            <div className="col-span-2 text-gray-500">
              {new Date(request.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
