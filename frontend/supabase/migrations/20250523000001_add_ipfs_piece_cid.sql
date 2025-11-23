-- Add ipfs_piece_cid column to resource_requests table
-- This stores the Filecoin PieceCID for uploaded request data (input + output)

ALTER TABLE resource_requests
ADD COLUMN IF NOT EXISTS ipfs_piece_cid TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN resource_requests.ipfs_piece_cid IS 'Filecoin PieceCID for the uploaded request data (input + output). Used to verify apiResponseHash stored on-chain.';

-- Add an index for lookups by ipfs_piece_cid (optional, for future queries)
CREATE INDEX IF NOT EXISTS idx_resource_requests_ipfs_piece_cid
ON resource_requests(ipfs_piece_cid)
WHERE ipfs_piece_cid IS NOT NULL;
