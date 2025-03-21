const { Client, AccountId, TokenId, AccountBalanceQuery, PrivateKey } = require('@hashgraph/sdk');
require('dotenv').config({ path: './.env.local' });

async function checkTokenMintCapability() {
    try {
        console.log("=== Token Mint Capability Check ===");
        console.log("Environment variables:");
        console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
        console.log("LYNX_CONTRACT_ADDRESS:", process.env.LYNX_CONTRACT_ADDRESS);
        console.log("SAUCE_TOKEN_ID:", process.env.SAUCE_TOKEN_ID);
        console.log("CLXY_TOKEN_ID:", process.env.CLXY_TOKEN_ID);
        console.log("LYNX_TOKEN_ID:", process.env.LYNX_TOKEN_ID);

        // Setup client
        const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
        const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
        const client = Client.forTestnet().setOperator(operatorId, operatorKey);

        console.log("\n=== Checking Operator (Treasury) Token Balances ===");
        
        // Query account balance
        const balanceQuery = new AccountBalanceQuery()
            .setAccountId(operatorId);
        
        const accountBalance = await balanceQuery.execute(client);
        
        // Log HBAR balance
        console.log(`HBAR Balance: ${accountBalance.hbars.toString()}`);
        
        // Check token balances
        const lynxTokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
        const sauceTokenId = TokenId.fromString(process.env.SAUCE_TOKEN_ID);
        const clxyTokenId = TokenId.fromString(process.env.CLXY_TOKEN_ID);
        
        // Check LYNX balance
        const lynxBalance = accountBalance.tokens.get(lynxTokenId);
        console.log(`LYNX Balance: ${lynxBalance !== undefined ? lynxBalance.toString() : 'None'}`);
        
        // Check SAUCE balance
        const sauceBalance = accountBalance.tokens.get(sauceTokenId);
        console.log(`SAUCE Balance: ${sauceBalance !== undefined ? sauceBalance.toString() : 'None'}`);
        
        // Check CLXY balance
        const clxyBalance = accountBalance.tokens.get(clxyTokenId);
        console.log(`CLXY Balance: ${clxyBalance !== undefined ? clxyBalance.toString() : 'None'}`);
        
        // Check if we can mint
        console.log("\n=== Mint Capability Check ===");
        console.log("To mint LYNX tokens, we need:");
        console.log("1. The treasury (operator) must have LYNX tokens to transfer");
        console.log("2. The contract must be approved to spend treasury's LYNX tokens");
        console.log("3. The user must have HBAR, SAUCE, and CLXY tokens to spend");
        console.log("4. The contract must be associated with all three tokens");
        
        if (lynxBalance === undefined || lynxBalance <= 0) {
            console.log("\n❌ Treasury has no LYNX tokens to distribute. Minting will fail.");
            console.log("Solution: Transfer LYNX tokens to the treasury account (currently the operator account).");
        } else {
            console.log("\n✅ Treasury has LYNX tokens that can be distributed!");
        }
        
        if (sauceBalance === undefined || sauceBalance <= 0) {
            console.log("\n⚠️ Treasury (operator) has no SAUCE tokens. If this same account is used to test minting, it will fail.");
            console.log("Solution: Add SAUCE tokens to the account that will test minting.");
        } else {
            console.log("\n✅ Operator has SAUCE tokens that can be used for testing!");
        }
        
        if (clxyBalance === undefined || clxyBalance <= 0) {
            console.log("\n⚠️ Treasury (operator) has no CLXY tokens. If this same account is used to test minting, it will fail.");
            console.log("Solution: Add CLXY tokens to the account that will test minting.");
        } else {
            console.log("\n✅ Operator has CLXY tokens that can be used for testing!");
        }
        
        console.log("\n=== Token Approval ===");
        console.log("We've already run the approveTreasury.js script to approve the contract to spend LYNX tokens.");
        console.log("When testing mint, we also need to approve the contract to spend SAUCE and CLXY tokens from the user.");
        
        console.log("\n=== Next Steps ===");
        console.log("1. If you need LYNX tokens in the treasury: transfer them to", operatorId.toString());
        console.log("2. If you need SAUCE/CLXY tokens for testing: transfer them to the account that will call mint");
        console.log("3. Run testMint.js to approve SAUCE/CLXY and test the mint function");
        
    } catch (error) {
        console.error("Error in token mint capability check:", error);
        console.error("Error message:", error.message);
    }
}

// Run the function and ensure the script exits
checkTokenMintCapability()
    .then(() => {
        console.log("\nScript execution completed.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Error in script execution:", error);
        process.exit(1);
    }); 