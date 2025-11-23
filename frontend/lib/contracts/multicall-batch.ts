import { createPublicClient, http, type Address, type Hex } from "viem";
import { base } from "viem/chains";
import { DisputeEscrowABI, RequestStatus, RequestStatusLabels } from "./DisputeEscrowABI";

const publicClient = createPublicClient({
  chain: base,
  transport: http(
    process.env.BASE_RPC_URL ||
      process.env.NEXT_PUBLIC_BASE_RPC_URL ||
      undefined
  ),
});

export interface RequestBatchData {
  requestId: string;
  escrowContractAddress: string;
  status: RequestStatus | null;
  statusLabel: string;
  nextDeadline: number | null;
  hasStatus: boolean;
  buyerRefunded?: boolean;
  amount?: bigint;
}

export async function batchGetRequestData(
  requests: Array<{ requestId: string; escrowContractAddress: string | null }>
): Promise<Map<string, RequestBatchData>> {
  const results = new Map<string, RequestBatchData>();

  const validRequests = requests.filter(
    (req) => req.escrowContractAddress !== null
  );

  if (validRequests.length === 0) {
    requests.forEach((req) => {
      results.set(req.requestId, {
        requestId: req.requestId,
        escrowContractAddress: req.escrowContractAddress || "",
        status: null,
        statusLabel: "No escrow",
        nextDeadline: null,
        hasStatus: false,
      });
    });
    return results;
  }

  const multicallContracts = validRequests.flatMap((req) => {
    const requestIdHex = req.requestId.startsWith("0x")
      ? (req.requestId as Hex)
      : (`0x${req.requestId}` as Hex);

    return [
      {
        address: req.escrowContractAddress as Address,
        abi: DisputeEscrowABI,
        functionName: "requests" as const,
        args: [requestIdHex],
      },
    ];
  });

  try {
    const multicallResults = await publicClient.multicall({
      contracts: multicallContracts,
      allowFailure: true,
    });

    validRequests.forEach((req, index) => {
      const result = multicallResults[index];

      if (result.status === "failure" || !result.result) {
        results.set(req.requestId, {
          requestId: req.requestId,
          escrowContractAddress: req.escrowContractAddress!,
          status: null,
          statusLabel: "Error fetching",
          nextDeadline: null,
          hasStatus: false,
        });
        return;
      }

      const [
        buyer,
        amount,
        escrowedAt,
        nextDeadline,
        status,
        apiResponseHash,
        disputeAgent,
        buyerRefunded,
        sellerRejected,
      ] = result.result as [
        Address,
        bigint,
        bigint,
        bigint,
        number,
        Hex,
        Address,
        boolean,
        boolean
      ];

      if (buyer === "0x0000000000000000000000000000000000000000") {
        results.set(req.requestId, {
          requestId: req.requestId,
          escrowContractAddress: req.escrowContractAddress!,
          status: null,
          statusLabel: "Not found",
          nextDeadline: null,
          hasStatus: false,
        });
        return;
      }

      const requestStatus = status as RequestStatus;
      results.set(req.requestId, {
        requestId: req.requestId,
        escrowContractAddress: req.escrowContractAddress!,
        status: requestStatus,
        statusLabel: RequestStatusLabels[requestStatus],
        nextDeadline: Number(nextDeadline),
        hasStatus: true,
        buyerRefunded,
        amount,
      });
    });

    requests
      .filter((req) => req.escrowContractAddress === null)
      .forEach((req) => {
        results.set(req.requestId, {
          requestId: req.requestId,
          escrowContractAddress: "",
          status: null,
          statusLabel: "No escrow",
          nextDeadline: null,
          hasStatus: false,
        });
      });

    return results;
  } catch (error) {
    console.error("[batchGetRequestData] Multicall error:", error);

    requests.forEach((req) => {
      results.set(req.requestId, {
        requestId: req.requestId,
        escrowContractAddress: req.escrowContractAddress || "",
        status: null,
        statusLabel: "Error fetching",
        nextDeadline: null,
        hasStatus: false,
      });
    });

    return results;
  }
}

