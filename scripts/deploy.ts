import {
    Client,
    ContractCreateFlow,
    AccountId,
    PrivateKey,
    ContractFunctionParameters,
    FileCreateTransaction,
    FileAppendTransaction,
    ContractCreateTransaction,
    Hbar
} from "@hashgraph/sdk";
import * as fs from "fs";

type NFTSaleParams = (operatorId: string, tokenId: string) => ContractFunctionParameters;
type UserThresholdsParams = (operatorId: string) => ContractFunctionParameters;

// Contract configurations
const CONTRACTS = {
    NFTSale: {
        path: "./artifacts/src/app/contracts/NFTSale.sol/NFTSale.json",
        constructorParams: ((operatorId: string, tokenId: string) => 
            new ContractFunctionParameters()
                .addAddress(AccountId.fromString(tokenId).toSolidityAddress())
                .addAddress(AccountId.fromString(operatorId).toSolidityAddress())
        ) as NFTSaleParams
    },
    UserThresholds: {
        path: "./artifacts/src/app/contracts/userThreshold.sol/userThreshold.json",
        constructorParams: ((operatorId: string) => 
            new ContractFunctionParameters()
                .addAddress(AccountId.fromString(operatorId).toSolidityAddress())
        ) as UserThresholdsParams
    }
};

type ContractType = keyof typeof CONTRACTS;
type ContractConfig = {
    path: string;
    constructorParams: NFTSaleParams | UserThresholdsParams;
};

async function deployContract(
    client: Client, 
    operatorKey: string, 
    contractConfig: ContractConfig,
    params: string[]
) {
    // Read contract bytecode
    console.log("Reading contract from path:", contractConfig.path);
    const bytecode = fs.readFileSync(contractConfig.path);
    const contract = JSON.parse(bytecode.toString());
    
    // Get the bytecode from the correct location in the JSON structure
    const contractBytecode = contract.bytecode;
    if (!contractBytecode) {
        throw new Error(`No bytecode found in contract JSON at ${contractConfig.path}`);
    }

    console.log("Creating contract file...");
    const fileCreateTx = new FileCreateTransaction()
        .setKeys([PrivateKey.fromString(operatorKey)])
        .freezeWith(client);
    const fileCreateSign = await fileCreateTx.sign(PrivateKey.fromString(operatorKey));
    const fileCreateSubmit = await fileCreateSign.execute(client);
    const fileCreateRx = await fileCreateSubmit.getReceipt(client);
    const bytecodeFileId = fileCreateRx.fileId;
    console.log(`- Contract file created: ${bytecodeFileId?.toString()}`);

    // Append contract bytecode
    const fileAppendTx = new FileAppendTransaction()
        .setFileId(bytecodeFileId!)
        .setContents(contractBytecode)
        .setMaxChunks(10)
        .freezeWith(client);
    const fileAppendSign = await fileAppendTx.sign(PrivateKey.fromString(operatorKey));
    const fileAppendSubmit = await fileAppendSign.execute(client);
    await fileAppendSubmit.getReceipt(client);
    console.log("- Contract bytecode appended");

    // Deploy contract
    console.log("Creating contract...");
    const constructorParams = params.length === 2 
        ? (contractConfig.constructorParams as NFTSaleParams)(params[0], params[1])
        : (contractConfig.constructorParams as UserThresholdsParams)(params[0]);

    const contractTx = new ContractCreateTransaction()
        .setBytecodeFileId(bytecodeFileId!)
        .setGas(3000000)
        .setConstructorParameters(constructorParams);

    const contractResponse = await contractTx.execute(client);
    const contractReceipt = await contractResponse.getReceipt(client);
    return contractReceipt.contractId;
}

async function main() {
    // Get command line arguments
    const contractType = process.argv[2] as ContractType;
    const network = process.argv[3] || 'testnet';
    const operatorId = process.argv[4];
    const operatorKey = process.argv[5];
    const tokenId = process.argv[6]; // Only needed for NFTSale

    if (!contractType || !operatorId || !operatorKey || (contractType === 'NFTSale' && !tokenId)) {
        console.log(`
Usage: 
  NFTSale: npm run deploy NFTSale <network> <operatorId> <operatorKey> <tokenId>
  UserThresholds: npm run deploy UserThresholds <network> <operatorId> <operatorKey>
        `);
        process.exit(1);
    }

    if (!CONTRACTS[contractType]) {
        throw new Error(`Invalid contract type. Must be one of: ${Object.keys(CONTRACTS).join(', ')}`);
    }

    // Create client
    const client = network === 'mainnet' ? Client.forMainnet() : Client.forTestnet();
    client.setOperator(
        AccountId.fromString(operatorId),
        PrivateKey.fromString(operatorKey)
    );

    console.log(`Deploying ${contractType} to ${network} with parameters:`, {
        operatorId,
        ...(contractType === 'NFTSale' && { tokenId })
    });

    const contractConfig = CONTRACTS[contractType];
    const params = contractType === 'NFTSale' ? [operatorId, tokenId!] : [operatorId];
    
    const contractId = await deployContract(client, operatorKey, contractConfig, params);
    const evmAddress = contractId?.toSolidityAddress();

    console.log(`${contractType} contract addresses:`, {
        hedera: contractId?.toString(),
        evm: evmAddress
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 