const {
  Client,
  AccountId,
  PrivateKey,
  TokenId,
  TokenMintTransaction,
  Hbar,
  TokenInfoQuery
} = require('@hashgraph/sdk');
require('dotenv').config({ path: '.env.local' });

async function adminMintLynx() {
  console.log("Starting admin LYNX token mint process...");

  // Log environment variables
  console.log("Environment variables:");
  console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
  console.log("LYNX_TOKEN_ID:", process.env.LYNX_TOKEN_ID);
  console.log("ADMIN_PRIVATE_KEY:", process.env.ADMIN_PRIVATE_KEY ? "Available (length: " + process.env.ADMIN_PRIVATE_KEY.length + ")" : "Not available");
  console.log("HEDERA_PRIVATE_KEY:", process.env.HEDERA_PRIVATE_KEY ? "Available (length: " + process.env.HEDERA_PRIVATE_KEY.length + ")" : "Not available");

  // Check if required environment variables are present
  if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.HEDERA_PRIVATE_KEY || !process.env.LYNX_TOKEN_ID || !process.env.ADMIN_PRIVATE_KEY) {
    console.error("Required environment variables are missing. Please check your .env.local file.");
    console.error("Required variables: NEXT_PUBLIC_OPERATOR_ID, HEDERA_PRIVATE_KEY, LYNX_TOKEN_ID, ADMIN_PRIVATE_KEY");
    process.exit(1);
  }

  try {
    // Set up client for testnet
    const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
    // HEDERA_PRIVATE_KEY appears to be in ED25519 format
    const operatorKey = PrivateKey.fromStringED25519(process.env.HEDERA_PRIVATE_KEY);
    
    // ADMIN_PRIVATE_KEY appears to be in DER format
    let adminKey;
    try {
      // Try DER format first
      adminKey = PrivateKey.fromStringDer(process.env.ADMIN_PRIVATE_KEY);
      console.log("Successfully parsed ADMIN_PRIVATE_KEY as DER format");
    } catch (error) {
      console.log("Failed to parse ADMIN_PRIVATE_KEY as DER, trying ED25519 format");
      try {
        // Fall back to ED25519 format
        adminKey = PrivateKey.fromStringED25519(process.env.ADMIN_PRIVATE_KEY);
        console.log("Successfully parsed ADMIN_PRIVATE_KEY as ED25519 format");
      } catch (innerError) {
        console.error("Error parsing ADMIN_PRIVATE_KEY in both formats:");
        console.error("DER error:", error.message);
        console.error("ED25519 error:", innerError.message);
        process.exit(1);
      }
    }
    
    const client = Client.forTestnet();
    client.setOperator(operatorId, operatorKey);

    // Get token ID
    const tokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
    console.log(`LYNX Token ID: ${tokenId.toString()}`);

    // Check token properties
    console.log("Checking LYNX token properties...");
    const tokenInfo = await new TokenInfoQuery()
      .setTokenId(tokenId)
      .execute(client);

    console.log(`Token Info:`);
    console.log(`- Name: ${tokenInfo.name}`);
    console.log(`- Symbol: ${tokenInfo.symbol}`);
    console.log(`- Decimals: ${tokenInfo.decimals}`);
    console.log(`- Supply: ${tokenInfo.totalSupply.toString()}`);
    console.log(`- Treasury Account: ${tokenInfo.treasuryAccountId.toString()}`);
    
    // Amount to mint (in token units with decimals)
    const mintAmount = 1000; // This will mint 1000 tokens
    const adjustedAmount = mintAmount * (10 ** tokenInfo.decimals);
    
    console.log(`Minting ${mintAmount} LYNX tokens (${adjustedAmount} in lowest denomination)...`);

    // Create the token mint transaction
    const transaction = await new TokenMintTransaction()
      .setTokenId(tokenId)
      .setAmount(adjustedAmount)
      .freezeWith(client);

    // Sign with the admin key (supply key)
    const signedTx = await transaction.sign(adminKey);
    
    // Submit the transaction to a Hedera network    
    const txResponse = await signedTx.execute(client);
    
    // Request the receipt of the transaction
    const receipt = await txResponse.getReceipt(client);
    
    // Get the transaction status
    const transactionStatus = receipt.status;
    console.log(`Mint transaction status: ${transactionStatus.toString()}`);

    // Check updated token supply
    const updatedTokenInfo = await new TokenInfoQuery()
      .setTokenId(tokenId)
      .execute(client);
    
    console.log(`Updated token supply: ${updatedTokenInfo.totalSupply.toString()}`);
    console.log("LYNX token minting completed successfully.");

  } catch (error) {
    console.error(`Error in LYNX token minting process: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  }

  console.log("Script execution completed.");
  process.exit(0);
}

// Execute the function
adminMintLynx(); 