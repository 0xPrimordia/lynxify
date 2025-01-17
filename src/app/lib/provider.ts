import { ethers } from 'ethers';
import { Network } from 'ethers';

const RPC_URL = process.env.NEXT_PUBLIC_SAUCERSWAP_API?.replace('test-api', 'testnet')
    .replace('api', 'mainnet') + '/json-rpc/v1';

// Create provider with correct network configuration
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Configure provider for read-only operations with proper Network type
provider.getNetwork = async (): Promise<Network> => {
    return ethers.Network.from(295);
};

export default provider;
