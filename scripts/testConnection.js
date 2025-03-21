const {
  Client,
  AccountId,
  PrivateKey,
  AccountBalanceQuery
} = require('@hashgraph/sdk');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  console.log("Testing connection to Hedera Testnet...");

  // Log environment variables
  console.log("Environment variables:");
  console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
  console.log("HEDERA_PRIVATE_KEY:", process.env.HEDERA_PRIVATE_KEY ? `Available (length: ${process.env.HEDERA_PRIVATE_KEY.length})` : "Not available");

  // Check if required environment variables are present
  if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.HEDERA_PRIVATE_KEY) {
    console.error("Required environment variables are missing. Please check your .env.local file.");
    console.error("Required variables: NEXT_PUBLIC_OPERATOR_ID, HEDERA_PRIVATE_KEY");
    process.exit(1);
  }

  try {
    // Set up client for testnet
    const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringED25519(process.env.HEDERA_PRIVATE_KEY);

    console.log("Operator ID:", operatorId.toString());
    
    const client = Client.forTestnet();
    client.setOperator(operatorId, operatorKey);

    // Test connection by checking account balance
    console.log("Checking account balance...");
    const balance = await new AccountBalanceQuery()
      .setAccountId(operatorId)
      .execute(client);

    console.log(`Account balance: ${balance.hbars.toString()}`);
    console.log(`Token balances: ${JSON.stringify(balance.tokens._map)}`);
    console.log("Connection test completed successfully.");

  } catch (error) {
    console.error(`Error testing connection: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  }

  console.log("Script execution completed.");
  process.exit(0);
}

// Execute the function
testConnection(); 