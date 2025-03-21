const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

async function checkMirrorNode() {
  console.log("Checking LYNX token info via Mirror Node API...");

  // Log environment variables
  console.log("Environment variables:");
  console.log("LYNX_TOKEN_ID:", process.env.LYNX_TOKEN_ID);

  // Check if required environment variables are present
  if (!process.env.LYNX_TOKEN_ID) {
    console.error("Required environment variable LYNX_TOKEN_ID is missing. Please check your .env.local file.");
    process.exit(1);
  }

  try {
    const tokenId = process.env.LYNX_TOKEN_ID;
    console.log(`LYNX Token ID: ${tokenId}`);

    // Use the Hedera Testnet Mirror Node REST API
    const apiUrl = `https://testnet.mirrornode.hedera.com/api/v1/tokens/${tokenId}`;
    console.log(`Calling Mirror Node API: ${apiUrl}`);

    const response = await axios.get(apiUrl);
    const tokenInfo = response.data;

    console.log("\nToken Info from Mirror Node:");
    console.log(JSON.stringify(tokenInfo, null, 2));

    // Extract and display the important information
    console.log("\nToken Details:");
    console.log(`- Name: ${tokenInfo.name}`);
    console.log(`- Symbol: ${tokenInfo.symbol}`);
    console.log(`- Decimals: ${tokenInfo.decimals}`);
    console.log(`- Total Supply: ${tokenInfo.total_supply}`);
    console.log(`- Treasury Account: ${tokenInfo.treasury_account_id}`);
    
    // Check the supply key
    if (tokenInfo.supply_key) {
      console.log("\nSupply Key Info:");
      console.log(`- Type: ${tokenInfo.supply_key._type}`);
      console.log(`- Key: ${tokenInfo.supply_key.key}`);
    } else {
      console.log("\nNo supply key found in token info.");
    }

    // Check if any ADMIN_PRIVATE_KEY is available
    if (process.env.ADMIN_PRIVATE_KEY) {
      console.log("\nADMIN_PRIVATE_KEY is available in .env.local");
      // We won't print the actual key for security reasons
    } else {
      console.log("\nADMIN_PRIVATE_KEY is not available in .env.local");
    }

  } catch (error) {
    console.error("Error checking Mirror Node API:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }

  console.log("\nScript execution completed.");
  process.exit(0);
}

// Execute the function
checkMirrorNode(); 