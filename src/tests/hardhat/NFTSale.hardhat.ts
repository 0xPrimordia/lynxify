import { 
    Client, 
    AccountId, 
    PrivateKey,
    AccountBalanceQuery,
    AccountCreateTransaction,
    ContractExecuteTransaction,
    ContractId,
    Hbar,
    TokenAssociateTransaction,
    TokenId,
    TransferTransaction,
    ContractCallQuery,
    ContractFunctionParameters,
    TransactionId
} from "@hashgraph/sdk";
import { expect } from "chai";
import axios from 'axios';
import { Context } from 'mocha';

interface NFTTransferResponse {
    success: boolean;
    serialNumber: string;
    buyer: string;
    transactionId: string;
}

let testAccounts: { accountId: AccountId; key: PrivateKey; }[] = [];

describe("NFTSale", function () {
    const NFT_TOKEN_ID = process.env.NEXT_PUBLIC_NFT_TOKEN_ID!;
    const NFT_SALE_CONTRACT = process.env.NEXT_PUBLIC_NFT_SALE_CONTRACT_ADDRESS!;
    const OPERATOR_ID = process.env.NEXT_PUBLIC_OPERATOR_ID!;
    const TREASURY_KEY = process.env.OPERATOR_KEY!;

    let client: Client;

    beforeEach(async function(this: Mocha.Context) {
        this.timeout(30000);

        const rpcUrl = process.env.HEDERA_RPC_URL;
        console.log("Using RPC URL:", rpcUrl);
        
        if (!rpcUrl || !rpcUrl.includes('localhost')) {
            throw new Error('Test must use local relay: HEDERA_RPC_URL should be http://localhost:7546');
        }

        client = Client.forTestnet();
        client.setOperator(
            AccountId.fromString(OPERATOR_ID),
            PrivateKey.fromString(TREASURY_KEY)
        );

        try {
            // Verify contract exists
            const codeQuery = new ContractCallQuery()
                .setContractId(ContractId.fromString(NFT_SALE_CONTRACT))
                .setGas(100000)
                .setFunction("owner");
            
            const owner = (await codeQuery.execute(client)).getAddress(0);
            const operatorAddress = AccountId.fromString(OPERATOR_ID)
                .toSolidityAddress()
                .toLowerCase();
            
            console.log("Address comparison:", {
                owner: owner.toLowerCase(),
                operator: operatorAddress,
                isEqual: owner.toLowerCase() === operatorAddress
            });

            // Reset contract state before each test
            console.log("Resetting contract state...");
            const resetTx = new ContractExecuteTransaction()
                .setContractId(ContractId.fromString(NFT_SALE_CONTRACT))
                .setGas(3000000)
                .setFunction("resetContract");

            const txResponse = await resetTx.execute(client);
            const receipt = await txResponse.getReceipt(client);
            
            if (receipt.status.toString() !== 'SUCCESS') {
                throw new Error('Failed to reset contract state');
            }

            // Verify reset was successful
            const soldSupplyQuery = new ContractCallQuery()
                .setContractId(ContractId.fromString(NFT_SALE_CONTRACT))
                .setGas(100000)
                .setFunction("soldSupply");
            
            const currentTokenIdQuery = new ContractCallQuery()
                .setContractId(ContractId.fromString(NFT_SALE_CONTRACT))
                .setGas(100000)
                .setFunction("currentTokenId");

            const soldSupply = (await soldSupplyQuery.execute(client)).getUint256(0);
            const currentTokenId = (await currentTokenIdQuery.execute(client)).getUint256(0);
            
            console.log("Contract state after reset:", {
                soldSupply: soldSupply.toString(),
                currentTokenId: currentTokenId.toString()
            });

        } catch (error: any) {
            console.error("Setup error details:", error);
            throw error;
        }
    });

    afterEach(async function() {
        // Clean up any test accounts by sending remaining HBAR back to operator
        for (const account of testAccounts) {
            try {
                const balance = await new AccountBalanceQuery()
                    .setAccountId(account.accountId)
                    .execute(client);

                if (balance.hbars.toTinybars().toNumber() > 0) {
                    const transferTx = await new TransferTransaction()
                        .addHbarTransfer(account.accountId, balance.hbars.negated())
                        .addHbarTransfer(AccountId.fromString(OPERATOR_ID), balance.hbars)
                        .freezeWith(client)
                        .sign(account.key);
                    
                    await transferTx.execute(client);
                    console.log(`Recovered ${balance.hbars.toString()} from ${account.accountId.toString()}`);
                }
            } catch (error) {
                console.error(`Failed to cleanup account ${account.accountId.toString()}:`, error);
            }
        }
        testAccounts = [];
    });

    it("should verify contract configuration", async function() {
        const tokenAddressQuery = new ContractCallQuery()
            .setContractId(ContractId.fromString(NFT_SALE_CONTRACT))
            .setGas(100000)
            .setFunction("tokenAddress");

        const treasuryQuery = new ContractCallQuery()
            .setContractId(ContractId.fromString(NFT_SALE_CONTRACT))
            .setGas(100000)
            .setFunction("treasury");

        const priceQuery = new ContractCallQuery()
            .setContractId(ContractId.fromString(NFT_SALE_CONTRACT))
            .setGas(100000)
            .setFunction("price");

        const tokenAddress = (await tokenAddressQuery.execute(client)).getAddress(0);
        const treasury = (await treasuryQuery.execute(client)).getAddress(0);
        const price = (await priceQuery.execute(client)).getUint256(0);

        console.log("Contract configuration:", {
            tokenAddress,
            treasury,
            price: price.toString(),
            expectedPrice: "5000000000"
        });

        const expectedTokenAddress = AccountId.fromString(NFT_TOKEN_ID).toSolidityAddress().toLowerCase();
        const expectedTreasury = AccountId.fromString(OPERATOR_ID).toSolidityAddress().toLowerCase();

        expect(tokenAddress.toLowerCase()).to.equal(expectedTokenAddress);
        expect(treasury.toLowerCase()).to.equal(expectedTreasury);
        expect(price.toString()).to.equal("5000000000"); // 50 HBAR (50 * 10^8)
    });

    it("should successfully purchase and record NFT sale", async function() {
        // Create new buyer account with more balance
        const buyerKey = PrivateKey.generateED25519();
        const buyerPublicKey = buyerKey.publicKey;
        const initialBalance = new Hbar(65); // 50 for NFT + 15 for fees
        
        const createResponse = await new AccountCreateTransaction()
            .setKey(buyerPublicKey)
            .setInitialBalance(initialBalance)
            .execute(client);
        
        const receipt = await createResponse.getReceipt(client);
        const buyerAccountId = receipt.accountId;
        if (!buyerAccountId) throw new Error("Failed to create buyer account");
        
        console.log("Created buyer account:", {
            accountId: buyerAccountId.toString(),
            initialBalance: initialBalance.toString()
        });
        
        testAccounts.push({ accountId: buyerAccountId, key: buyerKey });

        // Get initial state
        const initialSoldSupplyQuery = new ContractCallQuery()
            .setContractId(ContractId.fromString(NFT_SALE_CONTRACT))
            .setGas(100000)
            .setFunction("soldSupply");

        const initialTokenIdQuery = new ContractCallQuery()
            .setContractId(ContractId.fromString(NFT_SALE_CONTRACT))
            .setGas(100000)
            .setFunction("currentTokenId");

        const initialSoldSupply = (await initialSoldSupplyQuery.execute(client)).getUint256(0);
        const initialTokenId = (await initialTokenIdQuery.execute(client)).getUint256(0);
        
        const buyerBalance = await new AccountBalanceQuery()
            .setAccountId(buyerAccountId)
            .execute(client);

        console.log("Initial state:", {
            soldSupply: initialSoldSupply,
            currentTokenId: initialTokenId,
            buyerBalance: buyerBalance.hbars.toString()
        });

        // Before purchase, check all conditions
        const priceQuery = new ContractCallQuery()
            .setContractId(ContractId.fromString(NFT_SALE_CONTRACT))
            .setGas(100000)
            .setFunction("price");

        const contractPrice = (await priceQuery.execute(client)).getUint256(0);
        console.log("Contract price:", contractPrice.toString());

        const buyerBalanceCheck = await new AccountBalanceQuery()
            .setAccountId(buyerAccountId)
            .execute(client);

        console.log("Purchase prerequisites:", {
            contractPrice: contractPrice.toString(),
            buyerBalance: buyerBalanceCheck.hbars.toString()
        });

        // Associate token first
        console.log('Associating token with buyer account...');
        const associateTx = await new TokenAssociateTransaction()
            .setAccountId(buyerAccountId)
            .setTokenIds([TokenId.fromString(NFT_TOKEN_ID)])
            .freezeWith(client)
            .sign(buyerKey);

        const associateResponse = await associateTx.execute(client);
        await associateResponse.getReceipt(client);

        // Execute purchase transaction
        console.log('Executing purchase transaction...');
        let txResponse;
        try {
            const purchaseTx = new ContractExecuteTransaction()
                .setContractId(ContractId.fromString(NFT_SALE_CONTRACT))
                .setGas(3000000)
                .setPayableAmount(new Hbar(50))
                .setFunction("purchaseNFT")
                .setTransactionId(TransactionId.generate(buyerAccountId))
                .setMaxTransactionFee(new Hbar(15))
                .freezeWith(client);

            const signedTx = await purchaseTx.sign(buyerKey);
            txResponse = await signedTx.execute(client);
            const record = await txResponse.getRecord(client);

            console.log("Transaction details:", {
                status: record.receipt.status.toString(),
                contractResults: record.contractFunctionResult,
                logs: record.contractFunctionResult?.logs
            });

            // Verify contract state updates
            const finalSoldSupplyQuery = new ContractCallQuery()
                .setContractId(ContractId.fromString(NFT_SALE_CONTRACT))
                .setGas(100000)
                .setFunction("soldSupply");

            const finalTokenIdQuery = new ContractCallQuery()
                .setContractId(ContractId.fromString(NFT_SALE_CONTRACT))
                .setGas(100000)
                .setFunction("currentTokenId");

            const hasPurchasedQuery = new ContractCallQuery()
                .setContractId(ContractId.fromString(NFT_SALE_CONTRACT))
                .setGas(100000)
                .setFunction("hasPurchased", 
                    new ContractFunctionParameters()
                        .addAddress(buyerAccountId.toSolidityAddress())
                );

            const finalSoldSupply = (await finalSoldSupplyQuery.execute(client)).getUint256(0);
            const finalTokenId = (await finalTokenIdQuery.execute(client)).getUint256(0);
            const hasPurchased = (await hasPurchasedQuery.execute(client)).getBool(0);

            console.log("Contract state after purchase:", {
                soldSupply: finalSoldSupply.toString(),
                currentTokenId: finalTokenId.toString(),
                hasPurchased
            });

            console.log("Purchase verification:", {
                buyerAccountId: buyerAccountId.toString(),
                buyerSolidityAddress: buyerAccountId.toSolidityAddress(),
                msgSenderFromContract: record.contractFunctionResult?.senderAccountId?.toString(),
                hasPurchased
            });

            expect(hasPurchased).to.be.true;
            expect(finalSoldSupply.toString()).to.equal((BigInt(initialSoldSupply.toString()) + 1n).toString());
            expect(finalTokenId.toString()).to.equal((BigInt(initialTokenId.toString()) + 1n).toString());

        } catch (error: any) {
            console.error("Purchase failed with details:", {
                message: error.message,
                status: error.status?.toString(),
                receipt: error.transactionReceipt,
                logs: error.logs
            });
            throw error;
        }
    });

    it("should successfully purchase NFT and execute transfer via API", async function() {
        // Create new buyer account with more balance
        const buyerKey = PrivateKey.generateED25519();
        const buyerPublicKey = buyerKey.publicKey;
        const initialBalance = new Hbar(65); // 50 for NFT + 15 for fees
        
        const createResponse = await new AccountCreateTransaction()
            .setKey(buyerPublicKey)
            .setInitialBalance(initialBalance)
            .execute(client);
        
        const receipt = await createResponse.getReceipt(client);
        const buyerAccountId = receipt.accountId;
        if (!buyerAccountId) throw new Error("Failed to create buyer account");
        
        testAccounts.push({ accountId: buyerAccountId, key: buyerKey });

        // Check if buyer has already purchased
        const hasPurchasedQuery = new ContractCallQuery()
            .setContractId(ContractId.fromString(NFT_SALE_CONTRACT))
            .setGas(100000)
            .setFunction("hasPurchased", 
                new ContractFunctionParameters()
                    .addAddress(buyerAccountId.toSolidityAddress())
            );

        const hasPurchasedBefore = (await hasPurchasedQuery.execute(client)).getBool(0);
        console.log('Initial purchase check:', {
            buyer: buyerAccountId.toString(),
            hasPurchasedBefore
        });

        // Associate token first
        console.log('Associating token with buyer account...');
        const associateTx = await new TokenAssociateTransaction()
            .setAccountId(buyerAccountId)
            .setTokenIds([TokenId.fromString(NFT_TOKEN_ID)])
            .freezeWith(client)
            .sign(buyerKey);

        const associateResponse = await associateTx.execute(client);
        await associateResponse.getReceipt(client);

        // Get contract state before purchase
        const initialSoldSupplyQuery = new ContractCallQuery()
            .setContractId(ContractId.fromString(NFT_SALE_CONTRACT))
            .setGas(100000)
            .setFunction("soldSupply");

        const initialTokenIdQuery = new ContractCallQuery()
            .setContractId(ContractId.fromString(NFT_SALE_CONTRACT))
            .setGas(100000)
            .setFunction("currentTokenId");

        const initialSoldSupply = (await initialSoldSupplyQuery.execute(client)).getUint256(0);
        const initialTokenId = (await initialTokenIdQuery.execute(client)).getUint256(0);
        
        console.log('Contract state before purchase:', {
            soldSupply: initialSoldSupply.toString(),
            currentTokenId: initialTokenId.toString(),
            maxSupply: '100'
        });

        // Execute purchase transaction
        console.log('Executing purchase transaction...');
        let txResponse;
        try {
            const purchaseTx = new ContractExecuteTransaction()
                .setContractId(ContractId.fromString(NFT_SALE_CONTRACT))
                .setGas(3000000)
                .setPayableAmount(new Hbar(50))
                .setFunction("purchaseNFT")
                .setTransactionId(TransactionId.generate(buyerAccountId))
                .setMaxTransactionFee(new Hbar(15))
                .freezeWith(client);

            const signedTx = await purchaseTx.sign(buyerKey);
            txResponse = await signedTx.execute(client);
            const record = await txResponse.getRecord(client);

            console.log("Transaction details:", {
                status: record.receipt.status.toString(),
                contractResults: record.contractFunctionResult,
                logs: record.contractFunctionResult?.logs
            });

        } catch (error: any) {
            console.error("Purchase failed with details:", {
                message: error.message,
                status: error.status?.toString(),
                receipt: error.transactionReceipt,
                logs: error.logs
            });
            throw error;
        }

        // Get final token ID for API call
        const finalTokenIdQuery = new ContractCallQuery()
            .setContractId(ContractId.fromString(NFT_SALE_CONTRACT))
            .setGas(100000)
            .setFunction("currentTokenId");

        const finalTokenId = (await finalTokenIdQuery.execute(client)).getUint256(0);
        const serialNumber = finalTokenId.toString();

        console.log('Calling NFT transfer API...');
        const apiResponse = await axios.post('http://localhost:3000/api/nft', {
            tokenId: NFT_TOKEN_ID,
            serialNumber: serialNumber,
            buyer: buyerAccountId.toString(),
            transactionId: txResponse.transactionId.toString()
        });

        expect(apiResponse.status).to.equal(200);
        
        const apiResult = apiResponse.data as NFTTransferResponse;
        expect(apiResult.success).to.be.true;
        expect(apiResult.serialNumber).to.equal(serialNumber);
        expect(apiResult.buyer).to.equal(buyerAccountId.toString());

        // Verify NFT ownership
        const balance = await new AccountBalanceQuery()
            .setAccountId(buyerAccountId)
            .execute(client);

        const nftBalance = balance.tokens?.get(TokenId.fromString(NFT_TOKEN_ID));
        expect(nftBalance?.toNumber()).to.equal(1);
    });
}); 