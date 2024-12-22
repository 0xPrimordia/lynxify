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
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: '.env.local' });

async function updateEnvFile(contractId: string, evmAddress: string) {
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = fs.readFileSync(envPath, 'utf-8');

    // Update or add the contract addresses
    const updates = {
        'NEXT_PUBLIC_NFT_SALE_CONTRACT_ADDRESS': contractId,
        'NEXT_PUBLIC_NFT_SALE_CONTRACT_EVM_ADDRESS': evmAddress
    };

    for (const [key, value] of Object.entries(updates)) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (envContent.match(regex)) {
            // Update existing value
            envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
            // Add new value
            envContent += `\n${key}=${value}`;
        }
    }

    fs.writeFileSync(envPath, envContent);
    console.log('Updated .env.local with new contract addresses');
}

async function main() {
    // Get environment variables
    const operatorId = process.env.OPERATOR_ID;
    const operatorKey = process.env.OPERATOR_KEY;
    const tokenId = process.env.NEXT_PUBLIC_NFT_TOKEN_ID;

    if (!operatorId || !operatorKey || !tokenId) {
        throw new Error("Environment variables must be present");
    }

    // Create client
    const client = Client.forTestnet();
    client.setOperator(
        AccountId.fromString(operatorId),
        PrivateKey.fromString(operatorKey)
    );

    console.log("Deploying with parameters:", {
        tokenId,
        treasury: operatorId
    });

    // Read contract bytecode
    const bytecode = fs.readFileSync("artifacts/src/app/contracts/NFTSale.sol/NFTSale.json");
    const contract = JSON.parse(bytecode.toString());

    // Create contract file
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
        .setContents(contract.bytecode)
        .setMaxChunks(10)
        .freezeWith(client);
    const fileAppendSign = await fileAppendTx.sign(PrivateKey.fromString(operatorKey));
    const fileAppendSubmit = await fileAppendSign.execute(client);
    await fileAppendSubmit.getReceipt(client);
    console.log("- Contract bytecode appended");

    // Deploy contract
    console.log("Creating contract...");
    const contractTx = new ContractCreateTransaction()
        .setBytecodeFileId(bytecodeFileId!)
        .setGas(3000000)
        .setConstructorParameters(
            new ContractFunctionParameters()
                .addAddress(AccountId.fromString(tokenId).toSolidityAddress())
                .addAddress(AccountId.fromString(operatorId).toSolidityAddress())
        );

    const contractResponse = await contractTx.execute(client);
    const contractReceipt = await contractResponse.getReceipt(client);
    const contractId = contractReceipt.contractId;
    console.log("- Contract created:", contractId?.toString());

    // Get EVM address
    const evmAddress = contractId?.toSolidityAddress();

    // After successful deployment, update .env.local
    if (contractId && evmAddress) {
        await updateEnvFile(contractId.toString(), evmAddress);
    }

    console.log("Contract addresses:", {
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