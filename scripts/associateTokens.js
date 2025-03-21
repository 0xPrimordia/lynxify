require('dotenv').config({ path: './.env.local' });
const {
  Client,
  AccountId,
  PrivateKey,
  ContractId,
  ContractExecuteTransaction,
  Hbar,
  ContractFunctionParameters,
  Status,
  TokenId
} = require("@hashgraph/sdk");

async function associateTokens() {
  try {
    // Log all relevant environment variables
    console.log("Environment variables:");
    console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
    console.log("LYNX_CONTRACT_ADDRESS:", process.env.LYNX_CONTRACT_ADDRESS);
    console.log("SAUCE_TOKEN_ID:", process.env.SAUCE_TOKEN_ID);
    console.log("CLXY_TOKEN_ID:", process.env.CLXY_TOKEN_ID);
    console.log("LYNX_TOKEN_ID:", process.env.LYNX_TOKEN_ID);

    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || !process.env.LYNX_CONTRACT_ADDRESS || 
        !process.env.SAUCE_TOKEN_ID || !process.env.CLXY_TOKEN_ID || !process.env.LYNX_TOKEN_ID) {
      throw new Error("Missing environment variables. Required: NEXT_PUBLIC_OPERATOR_ID, OPERATOR_KEY, LYNX_CONTRACT_ADDRESS, SAUCE_TOKEN_ID, CLXY_TOKEN_ID, LYNX_TOKEN_ID");
    }

    console.log("Using operator ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
    console.log("Using contract address:", process.env.LYNX_CONTRACT_ADDRESS);

    // Setup client
    const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    // Convert IDs 
    const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
    const lynxTokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
    const sauceTokenId = TokenId.fromString(process.env.SAUCE_TOKEN_ID);
    const clxyTokenId = TokenId.fromString(process.env.CLXY_TOKEN_ID);

    console.log("LYNX Token ID:", lynxTokenId.toString());
    console.log("SAUCE Token ID:", sauceTokenId.toString());
    console.log("CLXY Token ID:", clxyTokenId.toString());

    // Associate each token with the contract using the HTS precompile directly
    const htsAddress = "0x0000000000000000000000000000000000000167"; // HTS Precompile address

    // Function to create a token association transaction
    async function associateToken(tokenId, tokenName) {
      console.log(`Associating ${tokenName} token (${tokenId}) with contract...`);
      
      // Convert token ID to Solidity address
      const tokenAddress = tokenId.toSolidityAddress();
      console.log(`${tokenName} Solidity address: ${tokenAddress}`);
      
      try {
        // Use ContractExecuteTransaction to call associateToken on the HTS precompile
        const associateTx = await new ContractExecuteTransaction()
          .setContractId(htsAddress)
          .setGas(1000000)
          .setFunction(
            "associateToken",
            new ContractFunctionParameters()
              .addAddress(contractId.toSolidityAddress())
              .addAddress(tokenAddress)
          )
          .execute(client);
        
        const associateReceipt = await associateTx.getReceipt(client);
        console.log(`${tokenName} association status: ${associateReceipt.status.toString()}`);
        return associateReceipt.status;
      } catch (error) {
        console.error(`Error associating ${tokenName} token:`, error.message);
        return null;
      }
    }

    // Associate LYNX token
    await associateToken(lynxTokenId, "LYNX");
    
    // Associate SAUCE token
    await associateToken(sauceTokenId, "SAUCE");
    
    // Associate CLXY token
    await associateToken(clxyTokenId, "CLXY");

    console.log("Token association process completed.");
  } catch (error) {
    console.error("Error in associateTokens function:", error);
    console.error("Error message:", error.message);
  }
}

// Run the function and ensure the script exits
associateTokens()
  .then(() => {
    console.log("Script execution completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error in script execution:", error);
    process.exit(1);
  }); 