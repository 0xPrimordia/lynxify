const { 
    Client: ListenerClient,
    AccountId: ListenerAccountId,
    PrivateKey: ListenerPrivateKey,
    ContractId: ListenerContractId,
    TokenId: ListenerTokenId,
    TokenMintTransaction: ListenerMintTx,
    ContractFunctionParameters: ListenerFunctionParams,
    ContractCallQuery: ListenerCallQuery,
    Hbar: ListenerHbar,
    ContractFunctionResult: ListenerFunctionResult,
    ContractExecuteTransaction: ListenerExecuteTx
} = require("@hashgraph/sdk");
const listenerDotenv = require("dotenv");

listenerDotenv.config({ path: '.env.local' });

interface MintEvent {
    name: string;
    user: string;
    hbarAmount: string;
    sauceAmount: string;
    clxyAmount: string;
    lynxMinted: string;
    nonce: string;
}

interface ProcessedMint {
    nonce: number;
    amount: number;
    recipient: string;
}

const processedMints = new Set<number>();

async function startMintListener() {
    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY ||
        !process.env.LYNX_CONTRACT_ADDRESS || !process.env.LYNX_TOKEN_ID) {
        throw new Error('Missing environment variables');
    }

    const client = ListenerClient.forTestnet();
    const operatorId = ListenerAccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!);
    const operatorKey = ListenerPrivateKey.fromString(process.env.OPERATOR_KEY!);
    client.setOperator(operatorId, operatorKey);

    const contractId = ListenerContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS!);
    const lynxTokenId = ListenerTokenId.fromString(process.env.LYNX_TOKEN_ID!);

    console.log('Starting mint listener for:', {
        contract: contractId.toString(),
        lynxToken: lynxTokenId.toString()
    });

    // Poll for events
    while (true) {
        try {
            // Query contract for events
            const query = new ListenerCallQuery()
                .setContractId(contractId)
                .setGas(100000)
                .setFunction("verifySupply");

            const result = await query.execute(client);
            const events = result.logs;

            if (events && events.length > 0) {
                for (const event of events) {
                    try {
                        const decodedEvent = decodeEvent(event);
                        if (decodedEvent && !processedMints.has(Number(decodedEvent.nonce))) {
                            await handleMintEvent(client, contractId, lynxTokenId, decodedEvent);
                            processedMints.add(Number(decodedEvent.nonce));
                        }
                    } catch (error) {
                        console.error('Error processing event:', error);
                    }
                }
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error('Error polling for events:', error);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

function decodeEvent(event: any): MintEvent | null {
    try {
        const eventData = event.data.toString();
        const parsedEvent = JSON.parse(eventData);
        if (parsedEvent.name === 'LynxMinted') {
            return parsedEvent;
        }
        return null;
    } catch (error) {
        console.error('Error decoding event:', error);
        return null;
    }
}

async function handleMintEvent(client: any, contractId: any, lynxTokenId: any, event: MintEvent) {
    const { user, lynxMinted, nonce } = event;
    console.log('Processing mint event:', {
        recipient: user,
        amount: lynxMinted,
        nonce
    });

    try {
        // First mint the tokens
        const mintTx = new ListenerMintTx()
            .setTokenId(lynxTokenId)
            .setAmount(Number(lynxMinted))
            .setMaxTransactionFee(new ListenerHbar(2));

        const mintResponse = await mintTx.execute(client);
        const mintReceipt = await mintResponse.getReceipt(client);
        console.log('Mint status:', mintReceipt.status.toString());

        // Then confirm the mint in the contract
        const confirmTx = new ListenerExecuteTx()
            .setContractId(contractId)
            .setGas(1000000)
            .setFunction(
                "confirmMint",
                new ListenerFunctionParams()
                    .addUint256(Number(nonce))
                    .addUint256(Number(lynxMinted))
            );

        const confirmResponse = await confirmTx.execute(client);
        const confirmReceipt = await confirmResponse.getReceipt(client);
        console.log('Confirm status:', confirmReceipt.status.toString());
    } catch (error) {
        console.error('Error minting tokens:', error);
        throw error;
    }
}

startMintListener()
    .then(() => {
        console.log('Mint listener started successfully');
    })
    .catch((error) => {
        console.error('Error starting mint listener:', error);
        process.exit(1);
    }); 