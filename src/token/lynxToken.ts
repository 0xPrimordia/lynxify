import { HederaAgentKit } from 'hedera-agent-kit';

interface LynxTokenConfig {
    name: string;
    symbol: string;
    decimals: number;
    maxSupply: bigint;
}

export class LynxTokenCreator {
    private readonly kit: HederaAgentKit;
    private readonly config: LynxTokenConfig = {
        name: "LYNX Index Token",
        symbol: "LYNX",
        decimals: 8,
        maxSupply: BigInt("100000000000") 
    };

    constructor(
        network: "testnet" | "mainnet" | "previewnet",
        accountId: string,
        privateKey: string
    ) {
        this.kit = new HederaAgentKit(
            accountId,
            privateKey,
            network
        );
    }

    async createToken(): Promise<string> {
        try {
            const options = {
                name: this.config.name,
                symbol: this.config.symbol,
                decimals: this.config.decimals,
                initialSupply: 0,
                maxSupply: Number(this.config.maxSupply),
                isSupplyKey: true,
                isAdminKey: false,
                memo: "LYNX Index Token Creation"
            };

            const response = await this.kit.createFT(options);
            return response.tokenId.toString();
        } catch (error) {
            throw new Error(`Failed to create LYNX token: ${error}`);
        }
    }
} 