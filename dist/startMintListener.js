const { LynxMinterService } = require('../src/services/lynxMinter');
dotenv.config({ path: '.env.local' });
async function main() {
    const minter = new LynxMinterService({
        operatorId: process.env.NEXT_PUBLIC_OPERATOR_ID,
        operatorKey: process.env.OPERATOR_KEY,
        network: 'testnet'
    });
    console.log('Starting mint event listener...');
    await minter.listenForMintEvents(process.env.MINTER_CONTRACT_ID);
    console.log('Listener started. Waiting for mint events...');
}
main().catch(console.error);
