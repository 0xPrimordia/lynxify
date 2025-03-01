var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a = require("@hashgraph/sdk"), ContractCreateTransaction = _a.ContractCreateTransaction, FileCreateTransaction = _a.FileCreateTransaction, FileAppendTransaction = _a.FileAppendTransaction, ContractFunctionParameters = _a.ContractFunctionParameters, Hbar = _a.Hbar;
var fs = require("fs");
dotenv.config({ path: '.env.local' });
function deploymain() {
    return __awaiter(this, void 0, void 0, function () {
        var client, contractBytecode, bytecode, fileCreateTx, fileSubmit, fileCreateRx, bytecodeFileId, fileAppendTx, fileAppendSubmit, contractCreateTx, contractCreateSubmit, contractCreateRx, contractId;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    client = Client.forTestnet();
                    client.setOperator(AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID), PrivateKey.fromString(process.env.OPERATOR_KEY));
                    contractBytecode = fs.readFileSync("artifacts/src/app/contracts/LynxMinter.sol/LynxMinter.json");
                    bytecode = JSON.parse(contractBytecode.toString()).bytecode;
                    fileCreateTx = new FileCreateTransaction()
                        .setKeys([PrivateKey.fromString(process.env.OPERATOR_KEY)])
                        .setContents("")
                        .setMaxTransactionFee(new Hbar(2));
                    return [4 /*yield*/, fileCreateTx.execute(client)];
                case 1:
                    fileSubmit = _a.sent();
                    return [4 /*yield*/, fileSubmit.getReceipt(client)];
                case 2:
                    fileCreateRx = _a.sent();
                    bytecodeFileId = fileCreateRx.fileId;
                    fileAppendTx = new FileAppendTransaction()
                        .setFileId(bytecodeFileId)
                        .setContents(bytecode)
                        .setMaxTransactionFee(new Hbar(2));
                    return [4 /*yield*/, fileAppendTx.execute(client)];
                case 3:
                    fileAppendSubmit = _a.sent();
                    return [4 /*yield*/, fileAppendSubmit.getReceipt(client)];
                case 4:
                    _a.sent();
                    console.log("Creating contract...");
                    contractCreateTx = new ContractCreateTransaction()
                        .setBytecodeFileId(bytecodeFileId)
                        .setGas(300000)
                        .setConstructorParameters(new ContractFunctionParameters()
                        .addAddress(process.env.LYNX_TOKEN_ID)
                        .addAddress(process.env.SAUCE_TOKEN_ID)
                        .addAddress(process.env.CLXY_TOKEN_ID));
                    return [4 /*yield*/, contractCreateTx.execute(client)];
                case 5:
                    contractCreateSubmit = _a.sent();
                    return [4 /*yield*/, contractCreateSubmit.getReceipt(client)];
                case 6:
                    contractCreateRx = _a.sent();
                    contractId = contractCreateRx.contractId;
                    console.log("Contract created with ID: ".concat(contractId));
                    console.log("Contract EVM address: ".concat(contractId === null || contractId === void 0 ? void 0 : contractId.toSolidityAddress()));
                    return [2 /*return*/, contractId];
            }
        });
    });
}
main()
    .then(function () { return process.exit(0); })
    .catch(function (error) {
    console.error(error);
    process.exit(1);
});
