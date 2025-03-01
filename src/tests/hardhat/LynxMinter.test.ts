/**
 * Contract Test Flow:
 * 1. Deploy contract first using: `npx ts-node scripts/deployMinter.ts`
 * 2. Contract address will be saved in .env.local
 * 3. Run tests against deployed contract: `npx hardhat test src/tests/hardhat/LynxMinter.test.ts`
 */

const { expect: lynxExpect } = require("chai");
const {
    Client: LynxTestClient,
    ContractCallQuery: LynxCallQuery,
    ContractExecuteTransaction: LynxExecuteTx,
    ContractId: LynxContractId,
    AccountId: LynxAccountId,
    PrivateKey: LynxPrivateKey,
    ContractFunctionParameters: LynxFunctionParams,
    TokenAssociateTransaction,
    TransferTransaction,
    TokenId: LynxTokenId,
    ContractCreateTransaction: LynxContractCreate,
    FileCreateTransaction: LynxFileCreate,
    FileAppendTransaction: LynxFileAppend,
    AccountBalanceQuery,
    TokenMintTransaction,
    Hbar
} = require("@hashgraph/sdk");
const lynxDotenv = require("dotenv");
const lynxFs = require("fs");
const lynxHre = require("hardhat");

lynxDotenv.config({ path: '.env.local' });

describe("LynxMinter", function(this: Mocha.Suite) {
    this.timeout(120000); // Increase timeout to 2 minutes
    let client: typeof LynxTestClient;
    let contractId: typeof LynxContractId;
    let lynxTokenId: string;
    let sauceTokenId: string;
    let clxyTokenId: string;
    let operatorId: typeof LynxAccountId;
    let operatorKey: typeof LynxPrivateKey;
    let inAppAccount: string;

    beforeEach(async function(this: Mocha.Context) {
        this.timeout(120000); // Increase timeout for beforeEach
        // Compile first using Hardhat
        await lynxHre.run('compile');

        // Initialize client with multiple nodes
        client = LynxTestClient.forName('testnet');
        client.setNetwork({
            "0.testnet.hedera.com:50211": new LynxAccountId(3),
            "1.testnet.hedera.com:50211": new LynxAccountId(4),
            "2.testnet.hedera.com:50211": new LynxAccountId(5),
            "3.testnet.hedera.com:50211": new LynxAccountId(6)
        });
        operatorId = LynxAccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!);
        operatorKey = LynxPrivateKey.fromString(process.env.OPERATOR_KEY!);
        inAppAccount = process.env.NEXT_PUBLIC_OPERATOR_ID!;
        client.setOperator(operatorId, operatorKey);

        // Convert token IDs to Solidity addresses
        lynxTokenId = LynxAccountId.fromString(process.env.LYNX_TOKEN_ID!).toSolidityAddress();
        sauceTokenId = LynxAccountId.fromString(process.env.SAUCE_TOKEN_ID!).toSolidityAddress();
        clxyTokenId = LynxAccountId.fromString(process.env.CLXY_TOKEN_ID!).toSolidityAddress();

        if (!process.env.LYNX_CONTRACT_ADDRESS) {
            throw new Error('Contract not deployed. Please run `npx ts-node scripts/deployMinter.ts` first');
        }

        // Use the deployed contract
        contractId = LynxContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
        console.log(`Using deployed contract with ID: ${contractId}`);
        console.log(`Contract EVM address: ${contractId?.toSolidityAddress()}`);

        // Check if tokens are already associated with contract
        const contractBalance = await new AccountBalanceQuery()
            .setAccountId(LynxAccountId.fromString(contractId.toString()))
            .execute(client);
        const contractTokens = contractBalance.tokens?.toJSON() || {};
        console.log("Contract token balances:", contractTokens);
        console.log("Contract HBAR balance:", contractBalance.hbars.toString());

        // Check if we're the owner
        const ownerQuery = new LynxCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("owner");
        const ownerResult = await ownerQuery.execute(client);
        const ownerAddress = ownerResult.getAddress(0);
        console.log("Contract owner:", ownerAddress);
        console.log("Operator address:", LynxAccountId.fromString(operatorId.toString()).toSolidityAddress());

        // Check operator account balance
        const balance = await new AccountBalanceQuery()
            .setAccountId(operatorId)
            .execute(client);
        console.log(`Operator account ${operatorId} balance: ${balance.hbars.toString()}`);

        // Get token addresses from contract
        const lynxTokenQuery = new LynxCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("lynxToken");
        const sauceTokenQuery = new LynxCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("sauceToken");
        const clxyTokenQuery = new LynxCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("clxyToken");

        const lynxTokenAddress = (await lynxTokenQuery.execute(client)).getAddress(0);
        const sauceTokenAddress = (await sauceTokenQuery.execute(client)).getAddress(0);
        const clxyTokenAddress = (await clxyTokenQuery.execute(client)).getAddress(0);

        console.log("Contract token addresses:", {
            lynx: lynxTokenAddress,
            sauce: sauceTokenAddress,
            clxy: clxyTokenAddress
        });
        console.log("Token IDs:", {
            lynx: lynxTokenId,
            sauce: sauceTokenId,
            clxy: clxyTokenId
        });
    });

    describe("Minting", function() {
        it("Should mint LYNX tokens when depositing equal amounts", async function() {
            // Execute mint first with a small amount
            const hbarAmount = new Hbar(0.05);
            const tinybars = hbarAmount.toTinybars();
            console.log("Minting amount (tinybars):", tinybars.toString());

            // Execute mint transaction
            const mintTx = new LynxExecuteTx()
                .setContractId(contractId)
                .setGas(1000000)
                .setPayableAmount(hbarAmount)
                .setFunction(
                    "mint",
                    new LynxFunctionParams()
                        .addUint256(tinybars)
                );

            console.log("Executing mint transaction...");
            const mintResponse = await mintTx.execute(client);
            console.log("Mint transaction ID:", mintResponse.transactionId.toString());
            const mintReceipt = await mintResponse.getReceipt(client);
            console.log("Mint receipt status:", mintReceipt.status.toString());

            // Get current nonce
            const nonceQuery = new LynxCallQuery()
                .setContractId(contractId)
                .setGas(100000)
                .setFunction("mintNonce");

            const currentNonce = (await nonceQuery.execute(client)).getUint256(0);
            console.log("Current nonce:", currentNonce.toString());

            // Call confirmMint
            const confirmMintTx = new LynxExecuteTx()
                .setContractId(contractId)
                .setGas(1000000)
                .setFunction(
                    "confirmMint",
                    new LynxFunctionParams()
                        .addUint256(currentNonce.toString() - 1) // Use current nonce - 1 since nonce was incremented in mint
                        .addUint256(tinybars)
                );

            console.log("Executing confirmMint transaction...");
            const confirmMintResponse = await confirmMintTx.execute(client);
            const confirmMintReceipt = await confirmMintResponse.getReceipt(client);
            console.log("ConfirmMint receipt status:", confirmMintReceipt.status.toString());

            // Check total minted
            const totalMintedQuery = new LynxCallQuery()
                .setContractId(contractId)
                .setGas(100000)
                .setFunction("totalLynxMinted");

            const totalMinted = (await totalMintedQuery.execute(client)).getUint256(0);
            lynxExpect(totalMinted.toString()).to.equal(tinybars.toString());
        });
    });
}); 