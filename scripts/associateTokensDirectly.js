require('dotenv').config({ path: './.env.local' });
const {
  Client,
  AccountId,
  PrivateKey,
  ContractId,
  TokenAssociateTransaction,
  TokenId
} = require("@hashgraph/sdk");

async function associateTokensDirectly() {
  console.log("Starting direct token association process...");

  // Check required environment variables
  console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
  console.log("LYNX_CONTRACT_ADDRESS:", process.env.LYNX_CONTRACT_ADDRESS);
  console.log("SAUCE_TOKEN_ID:", process.env.SAUCE_TOKEN_ID);
  console.log("CLXY_TOKEN_ID:", process.env.CLXY_TOKEN_ID);
  console.log("LYNX_TOKEN_ID:", process.env.LYNX_TOKEN_ID);

  if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY ||
      !process.env.LYNX_CONTRACT_ADDRESS || !process.env.SAUCE_TOKEN_ID ||
      !process.env.CLXY_TOKEN_ID || !process.env.LYNX_TOKEN_ID) {
    throw new Error("Missing required environment variables");
  }

  // Use the variables
  const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
  const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
  const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
  const contractAccountId = AccountId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
  
  // Token IDs
  const lynxTokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
  const sauceTokenId = TokenId.fromString(process.env.SAUCE_TOKEN_ID);
  const clxyTokenId = TokenId.fromString(process.env.CLXY_TOKEN_ID);
  
  // Set up client
  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);
  
  try {
    console.log("Associating tokens with contract account directly...");
    
    // Create the token associate transaction for all tokens
    const associateTransaction = new TokenAssociateTransaction()
      .setAccountId(contractAccountId)
      .setTokenIds([lynxTokenId, sauceTokenId, clxyTokenId])
      .freezeWith(client);
    
    // Sign the transaction with the operator key
    const signedTx = await associateTransaction.sign(operatorKey);
    
    // Execute the transaction
    const txResponse = await signedTx.execute(client);
    
    // Get the receipt
    const receipt = await txResponse.getReceipt(client);
    
    console.log("Association status:", receipt.status.toString());
    
    if (receipt.status.toString() === "SUCCESS") {
      console.log("Successfully associated tokens with the contract!");
    } else {
      console.error("Failed to associate tokens with the contract");
    }
  } catch (error) {
    console.error("Error during association process:", error);
    console.error(error.stack);
  }
}

// Run the association function
associateTokensDirectly()
  .then(() => {
    console.log("Association complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Association failed:", error);
    process.exit(1);
  }); 