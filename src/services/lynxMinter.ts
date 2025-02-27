const {
    Client: HederaClient,
    AccountId: HederaAccountId,
    PrivateKey: HederaPrivateKey,
    ContractId: HederaContractId,
    TokenId: HederaTokenId,
    TokenMintTransaction: HederaMintTx,
    ContractExecuteTransaction: HederaExecuteTx,
    ContractFunctionParameters: HederaFunctionParams,
    Hbar: HederaHbar
} = require("@hashgraph/sdk");

class MinterService {
    client: any;
    isListening: boolean;
    operatorId: string;
    operatorKey: string;
    
    constructor(config: { operatorId: string; operatorKey: string; network: string }) {
        this.client = config.network === 'mainnet' ? HederaClient.forMainnet() : HederaClient.forTestnet();
        this.operatorId = config.operatorId;
        this.operatorKey = config.operatorKey;
        this.client.setOperator(
            HederaAccountId.fromString(config.operatorId),
            HederaPrivateKey.fromString(config.operatorKey)
        );
        this.isListening = false;
    }

    async mintLynx(amount: string, recipientId: string) {
        if (!process.env.LYNX_TOKEN_ID || !process.env.LYNX_CONTRACT_ADDRESS) {
            throw new Error('Missing required environment variables');
        }

        console.log('Minting LYNX tokens:', {
            recipient: recipientId,
            amount: amount
        });

        try {
            // First mint the tokens
            const mintTx = new HederaMintTx()
                .setTokenId(HederaTokenId.fromString(process.env.LYNX_TOKEN_ID))
                .setAmount(Number(amount))
                .setMaxTransactionFee(new HederaHbar(2));

            const mintResponse = await mintTx.execute(this.client);
            const mintReceipt = await mintResponse.getReceipt(this.client);
            console.log('Mint status:', mintReceipt.status.toString());

            // Then confirm the mint in the contract
            const confirmTx = new HederaExecuteTx()
                .setContractId(HederaContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS))
                .setGas(1000000)
                .setFunction(
                    "confirmMint",
                    new HederaFunctionParams()
                        .addUint256(0) // First nonce
                        .addUint256(Number(amount))
                );

            const confirmResponse = await confirmTx.execute(this.client);
            const confirmReceipt = await confirmResponse.getReceipt(this.client);
            console.log('Confirm status:', confirmReceipt.status.toString());

            return {
                status: 'success',
                mintReceipt,
                confirmReceipt
            };
        } catch (error: any) {
            console.error('Error minting LYNX tokens:', error);
            throw error;
        }
    }

    async startMintListener(contractId: string) {
        if (this.isListening) {
            console.log('Mint listener already running');
            return;
        }

        console.log('Starting mint listener for contract:', contractId);
        this.isListening = true;

        // Start the mint listener script in a separate process
        const { spawn } = require('child_process');
        const listenerProcess = spawn('npx', ['ts-node', 'scripts/startMintListener.ts'], {
            stdio: 'inherit',
            env: {
                ...process.env,
                LYNX_CONTRACT_ADDRESS: contractId
            }
        });

        listenerProcess.on('error', (error: Error) => {
            console.error('Mint listener error:', error);
            this.isListening = false;
        });

        listenerProcess.on('exit', (code: number) => {
            console.log('Mint listener exited with code:', code);
            this.isListening = false;
        });

        return listenerProcess;
    }

    async stopMintListener() {
        if (!this.isListening) return;
        this.isListening = false;
        console.log('Mint listener stopped');
    }
}

module.exports = MinterService;