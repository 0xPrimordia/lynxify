import { ethers } from 'ethers';
import { ContractId } from '@hashgraph/sdk';
import axios from 'axios';
import QuoterV2Abi from '../abis/QuoterV2.json';
import { QUOTER_V2_ADDRESS, WHBAR_ID } from '../constants';
import { decimalToPaddedHex } from '../utils/format';
import { TokenInfo, RouteInfo, IRoutingService } from './types';

const quoterInterface = new ethers.Interface(QuoterV2Abi);

export class RoutingService implements IRoutingService {
    constructor(
        private factoryAddress: string,
        private quoterAddress: string,
        private defaultFee: number = 3000
    ) {}

    async findRoutes({ 
        inputToken, 
        outputToken, 
        amountIn 
    }: {
        inputToken: TokenInfo;
        outputToken: TokenInfo;
        amountIn: string;
    }): Promise<RouteInfo[]> {
        try {
            // For multi-hop through WHBAR
            const path = [inputToken.address, WHBAR_ID, outputToken.address];
            const quote = await this.getQuoteForPath(
                path,
                inputToken.decimals,
                outputToken.decimals,
                amountIn
            );

            if (quote) {
                return [{
                    path: path,
                    fees: [this.defaultFee, this.defaultFee],
                    pools: [],
                    expectedOutput: BigInt(quote)
                }];
            }

            return [];
        } catch (error) {
            console.error('Error finding routes:', error);
            return [];
        }
    }

    async getQuote(route: RouteInfo, amountIn: string): Promise<{
        quote: string;
        priceImpact: number;
    }> {
        const quote = await this.getQuoteForPath(
            route.path,
            parseInt(route.path[0]),
            parseInt(route.path[route.path.length - 1]),
            amountIn
        );
        return {
            quote: quote || '0',
            priceImpact: 0 // We'll need to implement price impact calculation
        };
    }

    async validateRoute(route: RouteInfo): Promise<boolean> {
        return route.path.length > 0 && route.fees.length === route.path.length - 1;
    }

    private async getQuoteForPath(
        path: string[],
        inputDecimals: number,
        outputDecimals: number,
        amountIn: string
    ): Promise<string | null> {
        try {
            // Convert amount to proper decimal representation
            const amountInBigInt = ethers.parseUnits(amountIn, inputDecimals);

            // Build path exactly like SaucerSwap UI does
            const pathData = path.reduce((acc: string[], token, index) => {
                if (index === path.length - 1) {
                    // Last token just gets added without a fee
                    return [...acc, ContractId.fromString(token).toSolidityAddress()];
                }
                // Add token + fee
                return [
                    ...acc,
                    ContractId.fromString(token).toSolidityAddress(),
                    this.defaultFee.toString(16).padStart(6, '0')
                ];
            }, []);

            // Join path components without '0x' prefixes
            const encodedPath = '0x' + pathData.map(p => p.replace('0x', '')).join('');

            // Encode function call exactly like the contract expects
            const encodedFunction = quoterInterface.encodeFunctionData('quoteExactInput', [
                encodedPath,
                amountInBigInt
            ]);

            const response = await axios.post(
                `https://${process.env.NEXT_PUBLIC_HEDERA_NETWORK}.mirrornode.hedera.com/api/v1/contracts/call`,
                {
                    block: "latest",
                    data: encodedFunction,
                    estimate: false,
                    from: "0x0000000000000000000000000000000000000000",
                    gas: 400000,
                    to: ContractId.fromString(this.quoterAddress).toSolidityAddress()
                }
            );

            if (!response.data?.result) {
                throw new Error('No quote result returned');
            }

            const decodedResult = quoterInterface.decodeFunctionResult(
                'quoteExactInput',
                response.data.result
            );

            // Convert result back to proper decimal string
            return ethers.formatUnits(decodedResult[0], outputDecimals);
        } catch (error) {
            console.error('Error getting quote for path:', error);
            return null;
        }
    }
} 