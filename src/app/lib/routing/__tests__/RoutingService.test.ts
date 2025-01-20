import { ContractId } from '@hashgraph/sdk';
import { ethers } from 'ethers';
import QuoterV2Abi from '../../abis/QuoterV2.json';
import { RoutingService } from '../RoutingService';
import { SAUCERSWAP_FACTORY_ADDRESS, SAUCERSWAP_QUOTER_ADDRESS } from '../../constants';

const quoterInterface = new ethers.Interface(QuoterV2Abi);

describe('RoutingService', () => {
    describe('findRoutes', () => {
        it('should properly encode and request multi-hop route', async () => {
            const inputToken = {
                address: '0.0.5449', // USDC
                decimals: 6,
                symbol: 'USDC'
            };
            const outputToken = {
                address: '0.0.1183558', // SAUCE
                decimals: 6,
                symbol: 'SAUCE'
            };
            const intermediateToken = {
                address: '0.0.15058', // WHBAR
                decimals: 8,
                symbol: 'WHBAR'
            };
            const amountIn = '1000000'; // 1 USDC

            let requestData: any;
            global.fetch = jest.fn().mockImplementation(async (url, init) => {
                requestData = JSON.parse(init?.body as string);
                
                // Fail the request for now to see what we're sending
                throw new Error('Mirror node request failed');
            });

            const routingService = new RoutingService(
                SAUCERSWAP_FACTORY_ADDRESS,
                SAUCERSWAP_QUOTER_ADDRESS
            );

            await expect(routingService.findRoutes({
                inputToken,
                outputToken,
                amountIn
            })).rejects.toThrow('Mirror node request failed');

            // Verify the request format
            expect(requestData).toBeDefined();
            expect(requestData.to).toBe(ContractId.fromString(SAUCERSWAP_QUOTER_ADDRESS).toSolidityAddress());
            
            // Verify the encoded path includes all three tokens
            const encodedPath = requestData.data;
            expect(encodedPath).toContain(ContractId.fromString(inputToken.address).toSolidityAddress().toLowerCase());
            expect(encodedPath).toContain(ContractId.fromString(intermediateToken.address).toSolidityAddress().toLowerCase());
            expect(encodedPath).toContain(ContractId.fromString(outputToken.address).toSolidityAddress().toLowerCase());
            
            // Verify the fee is included (3000 = 0bb8 in hex)
            expect(encodedPath).toContain('000bb8');
        });
    });
}); 