contract DisputeEscrowFactory {
      address public usdc;

      mapping(address => address) public serviceToEscrow;  // service address -> escrow contract
      mapping(address => bool) public isValidEscrow;       // escrow address -> is valid
      address[] public allEscrows;

      event ServiceRegistered(address indexed service, address escrowContract, bytes publicKey);

      constructor(address _usdc) {
          usdc = _usdc;
      }

      function registerService(
          bytes calldata publicKey,
          string calldata metadataURI
      ) external returns (address escrowContract) {
          address sender = msg.sender;
          // Deploy new DisputeEscrow for this service
          escrowContract = address(new DisputeEscrow(
              sender,
              publicKey,
              metadataURI,
              usdc
          ));

          serviceToEscrow[sender] = escrowContract;
          isValidEscrow[escrowContract] = true;
          allEscrows.push(escrowContract);

          emit ServiceRegistered(service, escrowContract, publicKey);
      }

}