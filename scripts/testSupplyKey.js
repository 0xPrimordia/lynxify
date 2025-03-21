const {
  Client,
  AccountId,
  PrivateKey,
  PublicKey,
  TokenId,
  TokenInfoQuery
} = require('@hashgraph/sdk');
require('dotenv').config({ path: '.env.local' });

async function testSupplyKey() {
  console.log("Testing LYNX token supply key...");

  // Log environment variables
  console.log("Environment variables:");
  console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
  console.log("LYNX_TOKEN_ID:", process.env.LYNX_TOKEN_ID);
  console.log("ADMIN_PRIVATE_KEY:", process.env.ADMIN_PRIVATE_KEY ? "Available" : "Not available");
  console.log("HEDERA_PRIVATE_KEY:", process.env.HEDERA_PRIVATE_KEY ? "Available" : "Not available");

  // Check if required environment variables are present
  if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.HEDERA_PRIVATE_KEY || !process.env.LYNX_TOKEN_ID || !process.env.ADMIN_PRIVATE_KEY) {
    console.error("Required environment variables are missing. Please check your .env.local file.");
    process.exit(1);
  }

  try {
    // Set up client for testnet
    const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringED25519(process.env.HEDERA_PRIVATE_KEY);
    
    const client = Client.forTestnet();
    client.setOperator(operatorId, operatorKey);

    // Get token ID
    const tokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
    console.log(`LYNX Token ID: ${tokenId.toString()}`);

    // Check token properties with SDK
    console.log("Checking LYNX token properties...");
    const tokenInfo = await new TokenInfoQuery()
      .setTokenId(tokenId)
      .execute(client);

    console.log("Token Info:");
    console.log(`- Name: ${tokenInfo.name}`);
    console.log(`- Symbol: ${tokenInfo.symbol}`);
    console.log(`- Decimals: ${tokenInfo.decimals}`);
    console.log(`- Total Supply: ${tokenInfo.totalSupply.toString()}`);
    console.log(`- Treasury Account: ${tokenInfo.treasuryAccountId.toString()}`);
    
    console.log("Supply Key Info from Token:");
    const tokenSupplyKey = tokenInfo.supplyKey;
    if (tokenSupplyKey) {
      console.log(`- Supply Key Type: ${tokenSupplyKey.toString()}`);
    } else {
      console.log("- No supply key found on token");
    }

    // Parse the admin private key
    console.log("\nTesting ADMIN_PRIVATE_KEY...");
    let adminKey;
    
    try {
      // Try as DER format first
      adminKey = PrivateKey.fromStringDer(process.env.ADMIN_PRIVATE_KEY);
      console.log("ADMIN_PRIVATE_KEY parsed as DER format");
    } catch (error) {
      console.log("Failed to parse as DER, trying ED25519...");
      try {
        adminKey = PrivateKey.fromStringED25519(process.env.ADMIN_PRIVATE_KEY);
        console.log("ADMIN_PRIVATE_KEY parsed as ED25519 format");
      } catch (innerError) {
        console.error("Error parsing admin key in both formats:");
        console.error("DER error:", error.message);
        console.error("ED25519 error:", innerError.message);
        process.exit(1);
      }
    }

    // Get public key from admin key
    const publicKey = adminKey.publicKey;
    console.log("Admin Public Key (hex):", publicKey.toString());
    console.log("Admin Public Key (raw):", publicKey.toStringRaw());
    
    // Check if the public key matches the token's supply key
    if (tokenSupplyKey) {
      const tokenSupplyKeyString = tokenSupplyKey.toString();
      const publicKeyString = publicKey.toString();
      const publicKeyRawString = publicKey.toStringRaw();
      
      console.log("\nKey Comparison:");
      console.log("Token Supply Key:", tokenSupplyKeyString);
      console.log("Admin Public Key:", publicKeyString);
      console.log("Admin Public Key (raw):", publicKeyRawString);
      
      if (tokenSupplyKeyString === publicKeyString || tokenSupplyKeyString === publicKeyRawString) {
        console.log("✅ MATCH: The Admin key matches the token's supply key");
      } else {
        console.log("❌ NO MATCH: The Admin key does NOT match the token's supply key");
      }
    }

  } catch (error) {
    console.error(`Error testing supply key: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  }

  console.log("Script execution completed.");
  process.exit(0);
}

// Execute the function
testSupplyKey(); 