const {
  Client,
  AccountId,
  PrivateKey,
  TransferTransaction,
  TokenId,
  AccountBalanceQuery,
  Hbar
} = require('@hashgraph/sdk');
require('dotenv').config({ path: '.env.local' });

async function transferExistingLynx() {
  console.log("Starting LYNX token transfer process...");

  // Use the variables we know are correct
  const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
  const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
  const lynxTokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
  const recipientId = process.env.RECIPIENT_ID || operatorId; // Default to self if no recipient specified
  
  // Set up client
  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);
  
  try {
    // First check the balance of LYNX tokens in our account
    console.log("Checking token balances...");
    const balanceQuery = new AccountBalanceQuery()
      .setAccountId(operatorId);
    
    const accountBalance = await balanceQuery.execute(client);
    const hbarBalance = accountBalance.hbars;
    const tokens = accountBalance.tokens;
    
    console.log(`HBAR Balance: ${hbarBalance.toString()}`);
    console.log("Token balances:");
    
    let lynxBalance = 0;
    tokens._map.forEach((value, key) => {
      const tokenIdStr = TokenId.fromString(key).toString();
      const tokenBalance = value.toString();
      console.log(`- ${tokenIdStr}: ${tokenBalance}`);
      
      if (tokenIdStr === lynxTokenId.toString()) {
        lynxBalance = parseInt(tokenBalance);
      }
    });
    
    console.log(`LYNX balance: ${lynxBalance / (10 ** 8)} (${lynxBalance} units)`);
    
    if (lynxBalance === 0) {
      console.error("No LYNX tokens available to transfer!");
      process.exit(1);
    }

    // Amount to transfer (0.001 LYNX with 8 decimals = 100000 units or available balance if less)
    const transferAmount = Math.min(0.001 * (10 ** 8), lynxBalance);
    console.log(`Transferring ${transferAmount / (10 ** 8)} LYNX tokens to ${recipientId.toString()}...`);
    
    // Execute the token transfer
    const tokenTransferTx = await new TransferTransaction()
      .addTokenTransfer(lynxTokenId, operatorId, -transferAmount)
      .addTokenTransfer(lynxTokenId, recipientId, transferAmount)
      .freezeWith(client)
      .sign(operatorKey);
      
    const tokenTransferSubmit = await tokenTransferTx.execute(client);
    const tokenTransferReceipt = await tokenTransferSubmit.getReceipt(client);
    
    console.log(`LYNX transfer status: ${tokenTransferReceipt.status.toString()}`);
    
    if (tokenTransferReceipt.status.toString() === "SUCCESS") {
      console.log(`Successfully transferred ${transferAmount / (10 ** 8)} LYNX tokens to ${recipientId.toString()}`);
    }
    
    // Check updated balance
    console.log("Checking updated balances...");
    const updatedBalance = await new AccountBalanceQuery()
      .setAccountId(operatorId)
      .execute(client);
      
    let updatedLynxBalance = 0;
    updatedBalance.tokens._map.forEach((value, key) => {
      const tokenIdStr = TokenId.fromString(key).toString();
      if (tokenIdStr === lynxTokenId.toString()) {
        updatedLynxBalance = parseInt(value.toString());
      }
    });
    
    console.log(`Updated LYNX balance: ${updatedLynxBalance / (10 ** 8)} (${updatedLynxBalance} units)`);
  } catch (error) {
    console.error("Error transferring tokens:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
  
  console.log("Script execution completed.");
}

// Execute the function
transferExistingLynx()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Unhandled error:", error);
    process.exit(1);
  }); 