const { 
    Client: MinterClient, 
    ContractCreateTransaction: MinterContractCreate, 
    FileCreateTransaction: MinterFileCreate,
    FileAppendTransaction: MinterFileAppend,
    AccountId: MinterAccountId,
    PrivateKey: MinterPrivateKey,
    ContractFunctionParameters: MinterFunctionParams,
    ContractExecuteTransaction: MinterExecuteTx,
    Hbar: MinterHbar,
    ContractId: MinterContractId
} = require("@hashgraph/sdk");
const minterFs = require("fs");
const minterHre = require("hardhat");
const fs = require('fs').promises;
const path = require('path');

async function deployMinterMain() {
    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY ||
        !process.env.LYNX_TOKEN_ID || !process.env.SAUCE_TOKEN_ID || !process.env.CLXY_TOKEN_ID ||
        !process.env.NEXT_PUBLIC_OPERATOR_EVM_ID) {
        throw new Error('Missing environment variables. Required: NEXT_PUBLIC_OPERATOR_ID, OPERATOR_KEY, LYNX_TOKEN_ID, SAUCE_TOKEN_ID, CLXY_TOKEN_ID, NEXT_PUBLIC_OPERATOR_EVM_ID');
    }

    // Compile first using Hardhat
    await minterHre.run('compile');

    const client = MinterClient.forTestnet();
    const operatorId = MinterAccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!);
    const operatorKey = MinterPrivateKey.fromString(process.env.OPERATOR_KEY!);
    client.setOperator(operatorId, operatorKey);

    // Get compiled contract bytecode
    const artifactPath = "artifacts/src/app/contracts/LynxMinter.sol/LynxMinter.json";
    const contractBytecode = JSON.parse(minterFs.readFileSync(artifactPath).toString()).bytecode;

    console.log("Deploying with bytecode length:", contractBytecode.length);

    // Create file and upload contract bytecode
    const fileCreateTx = new MinterFileCreate()
        .setKeys([operatorKey])
        .setContents("")
        .setMaxTransactionFee(new MinterHbar(2));
    const fileSubmit = await fileCreateTx.execute(client);
    const fileCreateRx = await fileSubmit.getReceipt(client);
    const bytecodeFileId = fileCreateRx.fileId;

    // Append contents to the file
    const fileAppendTx = new MinterFileAppend()
        .setFileId(bytecodeFileId!)
        .setContents(contractBytecode)
        .setMaxTransactionFee(new MinterHbar(2));
    const fileAppendSubmit = await fileAppendTx.execute(client);
    await fileAppendSubmit.getReceipt(client);

    // Get the operator's EVM address
    const operatorEvmAddress = process.env.NEXT_PUBLIC_OPERATOR_EVM_ID!;
    console.log("Operator EVM address:", operatorEvmAddress);

    // Convert token IDs to EVM addresses
    const lynxTokenId = MinterAccountId.fromString(process.env.LYNX_TOKEN_ID!);
    const sauceTokenId = MinterAccountId.fromString(process.env.SAUCE_TOKEN_ID!);
    const clxyTokenId = MinterAccountId.fromString(process.env.CLXY_TOKEN_ID!);

    console.log("Token addresses:");
    console.log("LYNX:", lynxTokenId.toSolidityAddress());
    console.log("SAUCE:", sauceTokenId.toSolidityAddress());
    console.log("CLXY:", clxyTokenId.toSolidityAddress());

    console.log("Creating contract...");
    const contractCreateTx = new MinterContractCreate()
        .setBytecodeFileId(bytecodeFileId!)
        .setGas(8000000) // Increased gas limit
        .setConstructorParameters(
            new MinterFunctionParams()
                .addAddress(lynxTokenId.toSolidityAddress())
                .addAddress(sauceTokenId.toSolidityAddress())
                .addAddress(clxyTokenId.toSolidityAddress())
        )
        .setAdminKey(operatorKey);

    const contractCreateSubmit = await contractCreateTx.execute(client);
    const contractCreateRx = await contractCreateSubmit.getReceipt(client);
    const contractId = contractCreateRx.contractId;

    console.log(`Contract created with ID: ${contractId}`);
    console.log(`Contract EVM address: ${contractId?.toSolidityAddress()}`);

    // Update .env.local file
    const envPath = path.join(process.cwd(), '.env.local');
    try {
        let envContent = await fs.readFile(envPath, 'utf8');
        
        // Replace or add the contract addresses
        envContent = envContent.replace(
            /LYNX_CONTRACT_ADDRESS=.*/,
            `LYNX_CONTRACT_ADDRESS=${contractId}`
        );
        envContent = envContent.replace(
            /LYNX_CONTRACT_EVM_ADDRESS=.*/,
            `LYNX_CONTRACT_EVM_ADDRESS=${contractId?.toSolidityAddress()}`
        );

        // If the variables don't exist, add them
        if (!envContent.includes('LYNX_CONTRACT_ADDRESS=')) {
            envContent += `\nLYNX_CONTRACT_ADDRESS=${contractId}`;
        }
        if (!envContent.includes('LYNX_CONTRACT_EVM_ADDRESS=')) {
            envContent += `\nLYNX_CONTRACT_EVM_ADDRESS=${contractId?.toSolidityAddress()}`;
        }

        await fs.writeFile(envPath, envContent);
        console.log('Updated .env.local with new contract addresses');
    } catch (error) {
        console.error('Failed to update .env.local:', error);
    }

    return contractId;
}

deployMinterMain()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 