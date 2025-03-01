const { ContractCreateTransaction, FileCreateTransaction, FileAppendTransaction, ContractFunctionParameters, Hbar } = require("@hashgraph/sdk");
const fs = require("fs");
dotenv.config({ path: '.env.local' });
async function deploymain() {
    const client = Client.forTestnet();
    client.setOperator(AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID), PrivateKey.fromString(process.env.OPERATOR_KEY));
    // Create file and upload contract bytecode
    const contractBytecode = fs.readFileSync("artifacts/src/app/contracts/LynxMinter.sol/LynxMinter.json");
    const bytecode = JSON.parse(contractBytecode.toString()).bytecode;
    const fileCreateTx = new FileCreateTransaction()
        .setKeys([PrivateKey.fromString(process.env.OPERATOR_KEY)])
        .setContents("")
        .setMaxTransactionFee(new Hbar(2));
    const fileSubmit = await fileCreateTx.execute(client);
    const fileCreateRx = await fileSubmit.getReceipt(client);
    const bytecodeFileId = fileCreateRx.fileId;
    // Append contents to the file
    const fileAppendTx = new FileAppendTransaction()
        .setFileId(bytecodeFileId)
        .setContents(bytecode)
        .setMaxTransactionFee(new Hbar(2));
    const fileAppendSubmit = await fileAppendTx.execute(client);
    await fileAppendSubmit.getReceipt(client);
    console.log("Creating contract...");
    const contractCreateTx = new ContractCreateTransaction()
        .setBytecodeFileId(bytecodeFileId)
        .setGas(300000)
        .setConstructorParameters(new ContractFunctionParameters()
        .addAddress(process.env.LYNX_TOKEN_ID)
        .addAddress(process.env.SAUCE_TOKEN_ID)
        .addAddress(process.env.CLXY_TOKEN_ID));
    const contractCreateSubmit = await contractCreateTx.execute(client);
    const contractCreateRx = await contractCreateSubmit.getReceipt(client);
    const contractId = contractCreateRx.contractId;
    console.log(`Contract created with ID: ${contractId}`);
    console.log(`Contract EVM address: ${contractId?.toSolidityAddress()}`);
    return contractId;
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
