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
    Hbar: LynxHbar,
    TokenAssociateTransaction,
    TransferTransaction,
    TokenId: LynxTokenId,
    ContractCreateTransaction: LynxContractCreate,
    FileCreateTransaction: LynxFileCreate,
    FileAppendTransaction: LynxFileAppend,
    AccountBalanceQuery
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

        lynxTokenId = process.env.LYNX_TOKEN_ID!;
        sauceTokenId = process.env.SAUCE_TOKEN_ID!;
        clxyTokenId = process.env.CLXY_TOKEN_ID!;

        if (!process.env.LYNX_CONTRACT_ADDRESS) {
            throw new Error('Contract not deployed. Please run `npx ts-node scripts/deployMinter.ts` first');
        }

        // Use the deployed contract
        contractId = LynxContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
        console.log(`Using deployed contract with ID: ${contractId}`);
        console.log(`Contract EVM address: ${contractId?.toSolidityAddress()}`);

        // Check contract owner
        const ownerQuery = new LynxCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("owner");
        const ownerResult = await ownerQuery.execute(client);
        const ownerAddress = ownerResult.getAddress(0);
        console.log("Contract owner:", ownerAddress);
        console.log("Operator address:", LynxAccountId.fromString(inAppAccount).toSolidityAddress());

        // Check operator account balance
        const balance = await new AccountBalanceQuery()
            .setAccountId(operatorId)
            .execute(client);
        console.log(`Operator account ${operatorId} balance: ${balance.hbars.toString()}`);
    });

    describe("Minting", function() {
        it("Should mint LYNX tokens when depositing equal amounts", async function() {
            const amount = new LynxHbar(0.05).toTinybars();
            console.log("Minting amount:", amount.toString());

            // Approve token transfers to contract
            const approveSauceTx = new LynxExecuteTx()
                .setContractId(LynxContractId.fromString(sauceTokenId))
                .setGas(1000000)
                .setFunction(
                    "approve",
                    new LynxFunctionParams()
                        .addAddress(contractId.toSolidityAddress())
                        .addUint256(amount)
                );

            const approveClxyTx = new LynxExecuteTx()
                .setContractId(LynxContractId.fromString(clxyTokenId))
                .setGas(1000000)
                .setFunction(
                    "approve",
                    new LynxFunctionParams()
                        .addAddress(contractId.toSolidityAddress())
                        .addUint256(amount)
                );

            await (await approveSauceTx.execute(client)).getReceipt(client);
            await (await approveClxyTx.execute(client)).getReceipt(client);
            console.log("Token approvals completed");

            // Check allowances
            const sauceAllowanceQuery = new LynxCallQuery()
                .setContractId(LynxContractId.fromString(sauceTokenId))
                .setGas(100000)
                .setFunction(
                    "allowance",
                    new LynxFunctionParams()
                        .addAddress(LynxAccountId.fromString(inAppAccount).toSolidityAddress())
                        .addAddress(contractId.toSolidityAddress())
                );
            const clxyAllowanceQuery = new LynxCallQuery()
                .setContractId(LynxContractId.fromString(clxyTokenId))
                .setGas(100000)
                .setFunction(
                    "allowance",
                    new LynxFunctionParams()
                        .addAddress(LynxAccountId.fromString(inAppAccount).toSolidityAddress())
                        .addAddress(contractId.toSolidityAddress())
                );

            // Check sender balances
            const sauceSenderQuery = new LynxCallQuery()
                .setContractId(LynxContractId.fromString(sauceTokenId))
                .setGas(100000)
                .setFunction(
                    "balanceOf",
                    new LynxFunctionParams().addAddress(LynxAccountId.fromString(inAppAccount).toSolidityAddress())
                );
            const clxySenderQuery = new LynxCallQuery()
                .setContractId(LynxContractId.fromString(clxyTokenId))
                .setGas(100000)
                .setFunction(
                    "balanceOf",
                    new LynxFunctionParams().addAddress(LynxAccountId.fromString(inAppAccount).toSolidityAddress())
                );

            const sauceAllowance = (await sauceAllowanceQuery.execute(client)).getUint256(0);
            const clxyAllowance = (await clxyAllowanceQuery.execute(client)).getUint256(0);
            const sauceSenderBalance = (await sauceSenderQuery.execute(client)).getUint256(0);
            const clxySenderBalance = (await clxySenderQuery.execute(client)).getUint256(0);

            console.log("Pre-mint checks:", {
                amount: amount.toString(),
                allowances: {
                    sauce: sauceAllowance.toString(),
                    clxy: clxyAllowance.toString()
                },
                senderBalances: {
                    sauce: sauceSenderBalance.toString(),
                    clxy: clxySenderBalance.toString(),
                    hbar: (await new AccountBalanceQuery()
                        .setAccountId(LynxAccountId.fromString(inAppAccount))
                        .execute(client)).hbars.toTinybars().toString()
                }
            });

            // Check contract balances before mint
            const sauceBalanceQuery = new LynxCallQuery()
                .setContractId(LynxContractId.fromString(sauceTokenId))
                .setGas(100000)
                .setFunction(
                    "balanceOf",
                    new LynxFunctionParams().addAddress(contractId.toSolidityAddress())
                );
            const clxyBalanceQuery = new LynxCallQuery()
                .setContractId(LynxContractId.fromString(clxyTokenId))
                .setGas(100000)
                .setFunction(
                    "balanceOf",
                    new LynxFunctionParams().addAddress(contractId.toSolidityAddress())
                );
            
            const sauceBalanceBefore = (await sauceBalanceQuery.execute(client)).getUint256(0);
            const clxyBalanceBefore = (await clxyBalanceQuery.execute(client)).getUint256(0);
            console.log("Contract balances before mint:", {
                sauce: sauceBalanceBefore.toString(),
                clxy: clxyBalanceBefore.toString()
            });

            // Check supply before mint
            const verifySupplyTx = new LynxExecuteTx()
                .setContractId(contractId)
                .setGas(1000000)
                .setFunction("verifySupply");
            const verifySupplyResponse = await verifySupplyTx.execute(client);
            const verifySupplyRecord = await verifySupplyResponse.getRecord(client);
            console.log("Supply verification before mint:", verifySupplyRecord.contractFunctionResult?.logs || []);

            // Execute mint
            const mintTx = new LynxExecuteTx()
                .setContractId(contractId)
                .setGas(1000000)
                .setPayableAmount(new LynxHbar(0.05))
                .setFunction(
                    "mint",
                    new LynxFunctionParams()
                        .addUint256(amount)
                );

            console.log("Executing mint transaction...");
            const mintResponse = await mintTx.execute(client);
            console.log("Getting mint receipt...");
            const mintReceipt = await mintResponse.getReceipt(client);
            console.log("Mint transaction status:", mintReceipt.status.toString());
            
            // Get transaction record to see events
            console.log("Getting transaction record...");
            const mintRecord = await mintResponse.getRecord(client);
            console.log("Contract events:", mintRecord.contractFunctionResult?.logs || []);

            // Check contract balances after mint
            const sauceBalanceAfter = (await sauceBalanceQuery.execute(client)).getUint256(0);
            const clxyBalanceAfter = (await clxyBalanceQuery.execute(client)).getUint256(0);
            console.log("Contract balances after mint:", {
                sauce: sauceBalanceAfter.toString(),
                clxy: clxyBalanceAfter.toString()
            });

            // Check supply after mint
            const verifySupplyAfterTx = new LynxExecuteTx()
                .setContractId(contractId)
                .setGas(1000000)
                .setFunction("verifySupply");
            const verifySupplyAfterResponse = await verifySupplyAfterTx.execute(client);
            const verifySupplyAfterRecord = await verifySupplyAfterResponse.getRecord(client);
            console.log("Supply verification after mint:", verifySupplyAfterRecord.contractFunctionResult?.logs || []);

            // Get the current nonce
            const nonceQuery = new LynxCallQuery()
                .setContractId(contractId)
                .setGas(100000)
                .setFunction("mintNonce");
            const currentNonce = (await nonceQuery.execute(client)).getUint256(0);
            console.log("Current nonce:", currentNonce.toString());
            console.log("Using nonce 0 for confirmMint since that was the nonce used in the mint transaction");

            // Confirm the mint with nonce 0
            const confirmMintTx = new LynxExecuteTx()
                .setContractId(contractId)
                .setGas(1000000)
                .setFunction(
                    "confirmMint",
                    new LynxFunctionParams()
                        .addUint256(0) // Use nonce 0 since that was the nonce used in the mint transaction
                        .addUint256(amount)
                )
                .freezeWith(client);

            console.log("Confirming mint...");
            const confirmMintSigned = await confirmMintTx.sign(operatorKey);
            const confirmMintResponse = await confirmMintSigned.execute(client);
            const confirmMintReceipt = await confirmMintResponse.getReceipt(client);
            console.log("Confirm mint status:", confirmMintReceipt.status.toString());

            // Verify contract balances
            const checkSupplyQuery = new LynxCallQuery()
                .setContractId(contractId)
                .setGas(100000)
                .setFunction("checkSupply");

            const isSupplyValid = (await checkSupplyQuery.execute(client)).getBool(0);
            lynxExpect(isSupplyValid).to.be.true;

            // Check total minted
            const totalMintedQuery = new LynxCallQuery()
                .setContractId(contractId)
                .setGas(100000)
                .setFunction("totalLynxMinted");

            const totalMinted = (await totalMintedQuery.execute(client)).getUint256(0);
            lynxExpect(totalMinted.toString()).to.equal(amount.toString());
        });
    });
}); 