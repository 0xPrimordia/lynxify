require('dotenv').config({ path: './.env.local' });
const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", await deployer.getAddress());
    
    // Convert the Hedera token ID to a Solidity address format
    function tokenIdToSolidityAddress(tokenId) {
        const parts = tokenId.split('.');
        const num = parseInt(parts[2]);
        return ethers.getAddress(`0x${num.toString(16).padStart(40, '0')}`);
    }
    
    // Get the token addresses from environment variables
    const lynxTokenId = process.env.LYNX_TOKEN_ID;
    const sauceTokenId = process.env.SAUCE_TOKEN_ID;
    const clxyTokenId = process.env.CLXY_TOKEN_ID;
    
    if (!lynxTokenId || !sauceTokenId || !clxyTokenId) {
        throw new Error("Missing token IDs in environment variables");
    }
    
    // Convert to Solidity addresses
    const lynxTokenAddress = tokenIdToSolidityAddress(lynxTokenId);
    const sauceTokenAddress = tokenIdToSolidityAddress(sauceTokenId);
    const clxyTokenAddress = tokenIdToSolidityAddress(clxyTokenId);
    
    console.log("Token Addresses:");
    console.log(`LYNX: ${lynxTokenId} -> ${lynxTokenAddress}`);
    console.log(`SAUCE: ${sauceTokenId} -> ${sauceTokenAddress}`);
    console.log(`CLXY: ${clxyTokenId} -> ${clxyTokenAddress}`);

    // Deploy the LynxMinter contract with pre-existing token addresses
    const LynxMinter = await ethers.getContractFactory("LynxMinter");
    console.log("Deploying LynxMinter...");
    const lynxMinter = await LynxMinter.deploy(lynxTokenAddress, sauceTokenAddress, clxyTokenAddress);
    await lynxMinter.waitForDeployment();
    
    const lynxMinterAddress = await lynxMinter.getAddress();
    console.log("LynxMinter deployed to:", lynxMinterAddress);
    
    // Extract the numeric part of the address for the Hedera format
    // Convert hex to decimal and format as 0.0.X
    const addressStr = lynxMinterAddress.slice(2).toLowerCase(); // Remove 0x prefix
    const contractId = `0.0.${parseInt(addressStr, 16)}`;
    console.log("Contract ID:", contractId);
    
    // Update .env.local file with the new contract address
    try {
        const envContent = fs.readFileSync('.env.local', 'utf8');
        const updatedEnvContent = envContent
            .replace(/^LYNX_CONTRACT_ADDRESS=.*$/m, `LYNX_CONTRACT_ADDRESS=${contractId}`)
            .replace(/^NEXT_PUBLIC_LYNX_CONTRACT_ADDRESS=.*$/m, `NEXT_PUBLIC_LYNX_CONTRACT_ADDRESS=${contractId}`);
        
        fs.writeFileSync('.env.local', updatedEnvContent);
        console.log("Updated .env.local with new contract address");
    } catch (error) {
        console.error("Failed to update .env.local:", error.message);
    }
    
    console.log("Deployment completed");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    }); 