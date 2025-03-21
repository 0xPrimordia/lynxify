const {
  Client,
  AccountId,
  PrivateKey,
  TokenId,
  TokenUpdateTransaction,
  ContractId,
  AccountBalanceQuery
} = require('@hashgraph/sdk');
require('dotenv').config({ path: '.env.local' });

async function updateSupplyKey() {
  console.log("Starting LYNX token supply key update...");

  // Use the operator credentials
  const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
  const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
  const lynxTokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
  const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
  
  // Set up client
  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);
  
  try {
    console.log("Operator ID:", operatorId.toString());
    console.log("LYNX Token ID:", lynxTokenId.toString());
    console.log("Contract ID:", contractId.toString());
    
    // First check if we own the LYNX token
    console.log("Checking token balances...");
    const balanceQuery = new AccountBalanceQuery()
      .setAccountId(operatorId);
    
    const accountBalance = await balanceQuery.execute(client);
    let ownsLynx = false;
    
    accountBalance.tokens._map.forEach((value, key) => {
      const tokenIdStr = TokenId.fromString(key).toString();
      if (tokenIdStr === lynxTokenId.toString() && parseInt(value.toString()) > 0) {
        ownsLynx = true;
      }
    });
    
    if (ownsLynx) {
      console.log("✅ Account owns LYNX tokens, likely the treasury account");
    } else {
      console.log("⚠️ Account doesn't own LYNX tokens, might not be the treasury");
    }
    
    // Create a token update transaction to change the supply key to the contract
    console.log("Updating LYNX token supply key to contract...");
    const transaction = await new TokenUpdateTransaction()
      .setTokenId(lynxTokenId)
      .setSupplyKey(contractId)
      .freezeWith(client)
      .sign(operatorKey);
    
    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);
    
    console.log("Update status:", receipt.status.toString());
    
    if (receipt.status.toString() === "SUCCESS") {
      console.log("✅ Successfully updated LYNX token supply key to the contract!");
      console.log("The contract can now mint LYNX tokens.");
    } else {
      console.error("❌ Failed to update LYNX token supply key");
    }
  } catch (error) {
    console.error("Error updating supply key:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
  
  console.log("Script execution completed.");
}

// Execute the function
updateSupplyKey()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Unhandled error:", error);
    process.exit(1);
  }); 