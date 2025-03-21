const {
  Client,
  AccountId,
  PrivateKey,
  TokenId,
  TokenMintTransaction
} = require('@hashgraph/sdk');
require('dotenv').config({ path: '.env.local' });

async function directMint() {
  console.log("Starting direct LYNX token mint process...");

  // Use the variables we know are correct
  const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
  const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
  const lynxTokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
  
  // Set up client
  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);
  
  try {
    // Amount to mint (1000 LYNX tokens with 8 decimals)
    const mintAmount = 1000 * (10 ** 8);
    console.log(`Attempting to mint ${mintAmount / (10 ** 8)} LYNX tokens...`);
    
    // Create mint transaction
    const transaction = await new TokenMintTransaction()
      .setTokenId(lynxTokenId)
      .setAmount(mintAmount)
      .freezeWith(client);
    
    // Sign with the operator key (which should be the supply key)
    const signedTx = await transaction.sign(operatorKey);
    
    // Execute transaction
    const txResponse = await signedTx.execute(client);
    const receipt = await txResponse.getReceipt(client);
    
    console.log("Mint status:", receipt.status.toString());
    if (receipt.status.toString() === "SUCCESS") {
      console.log(`Successfully minted ${mintAmount / (10 ** 8)} LYNX tokens!`);
    } else {
      console.error("Failed to mint LYNX tokens");
    }
  } catch (error) {
    console.error("Error minting tokens:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
  
  console.log("Script execution completed.");
}

// Execute the function
directMint()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Unhandled error:", error);
    process.exit(1);
  }); 