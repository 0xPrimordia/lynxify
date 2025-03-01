"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_1 = require("@hashgraph/sdk");
const fs = __importStar(require("fs"));
// Contract configurations
const CONTRACTS = {
    NFTSale: {
        path: "./artifacts/src/app/contracts/NFTSale.sol/NFTSale.json",
        constructorParams: ((operatorId, tokenId) => new sdk_1.ContractFunctionParameters()
            .addAddress(sdk_1.AccountId.fromString(tokenId).toSolidityAddress())
            .addAddress(sdk_1.AccountId.fromString(operatorId).toSolidityAddress()))
    },
    UserThresholds: {
        path: "./artifacts/src/app/contracts/userThreshold.sol/userThreshold.json",
        constructorParams: ((operatorId) => new sdk_1.ContractFunctionParameters()
            .addAddress(sdk_1.AccountId.fromString(operatorId).toSolidityAddress()))
    }
};
async function deployContract(client, operatorKey, contractConfig, params) {
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
    const fileCreateTx = new sdk_1.FileCreateTransaction()
        .setKeys([sdk_1.PrivateKey.fromString(operatorKey)])
        .freezeWith(client);
    const fileCreateSign = await fileCreateTx.sign(sdk_1.PrivateKey.fromString(operatorKey));
    const fileCreateSubmit = await fileCreateSign.execute(client);
    const fileCreateRx = await fileCreateSubmit.getReceipt(client);
    const bytecodeFileId = fileCreateRx.fileId;
    console.log(`- Contract file created: ${bytecodeFileId?.toString()}`);
    // Append contract bytecode
    const fileAppendTx = new sdk_1.FileAppendTransaction()
        .setFileId(bytecodeFileId)
        .setContents(contractBytecode)
        .setMaxChunks(10)
        .freezeWith(client);
    const fileAppendSign = await fileAppendTx.sign(sdk_1.PrivateKey.fromString(operatorKey));
    const fileAppendSubmit = await fileAppendSign.execute(client);
    await fileAppendSubmit.getReceipt(client);
    console.log("- Contract bytecode appended");
    // Deploy contract
    console.log("Creating contract...");
    const constructorParams = params.length === 2
        ? contractConfig.constructorParams(params[0], params[1])
        : contractConfig.constructorParams(params[0]);
    const contractTx = new sdk_1.ContractCreateTransaction()
        .setBytecodeFileId(bytecodeFileId)
        .setGas(3000000)
        .setConstructorParameters(constructorParams);
    const contractResponse = await contractTx.execute(client);
    const contractReceipt = await contractResponse.getReceipt(client);
    return contractReceipt.contractId;
}
async function main() {
    // Get command line arguments
    const contractType = process.argv[2];
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
    const client = network === 'mainnet' ? sdk_1.Client.forMainnet() : sdk_1.Client.forTestnet();
    client.setOperator(sdk_1.AccountId.fromString(operatorId), sdk_1.PrivateKey.fromString(operatorKey));
    console.log(`Deploying ${contractType} to ${network} with parameters:`, {
        operatorId,
        ...(contractType === 'NFTSale' && { tokenId })
    });
    const contractConfig = CONTRACTS[contractType];
    const params = contractType === 'NFTSale' ? [operatorId, tokenId] : [operatorId];
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
