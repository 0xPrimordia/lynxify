import { ContractId, ContractExecuteTransaction, TransactionId, AccountId } from '@hashgraph/sdk';
import { ethers } from 'ethers';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
import { SWAP_ROUTER_ADDRESS, WHBAR_ID } from '../constants';
import { hexToUint8Array } from '../utils/format';
import { checkTokenAssociation, associateToken } from '../utils/tokens';
import SwapRouterAbi from '../abis/SwapRouter.json';
import { getQuoteExactInput } from '../quoter';
import { RouteInfo } from '../routing/types';

const swapRouterAbi = new ethers.Interface(SwapRouterAbi);

export const swapHbarToToken = async (
    amountIn: string,
    outputToken: string,
    fee: number,
    recipientAddress: string,
    deadline: number,
    slippageBasisPoints: number,
    outputTokenDecimals: number,
    route?: RouteInfo
) => {
    try {
        // Check token association
        const isAssociated = await checkTokenAssociation(recipientAddress, outputToken);
        if (!isAssociated) {
            return { type: 'associate' as const, tx: await associateToken(recipientAddress, outputToken) };
        }

        const amountInSmallestUnit = (Number(amountIn) * 1e8).toString(); // HBAR to tinybar

        // Get quote using route if available
        const quoteAmount = await getQuoteExactInput(
            WHBAR_ID,
            8, // HBAR decimals
            outputToken,
            amountIn,
            fee,
            outputTokenDecimals,
            route
        );

        // Calculate minimum output using slippage
        const slippagePercent = slippageBasisPoints / 10000;
        const outputMinInTokens = (BigInt(quoteAmount) * BigInt(Math.floor((1 - slippagePercent) * 10000)) / BigInt(10000)).toString();

        // Construct path based on route or fallback to direct path
        const pathData = route ? route.path.reduce((acc: Buffer[], token, index) => {
            if (index === route.path.length - 1) return acc;
            return [
                ...acc,
                Buffer.from(ContractId.fromString(token).toSolidityAddress().replace('0x', ''), 'hex'),
                Buffer.from(route.fees[index].toString(16).padStart(6, '0'), 'hex')
            ];
        }, []).concat([
            Buffer.from(ContractId.fromString(route.path[route.path.length - 1]).toSolidityAddress().replace('0x', ''), 'hex')
        ]) : [
            Buffer.from(ContractId.fromString(WHBAR_ID).toSolidityAddress().replace('0x', ''), 'hex'),
            Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
            Buffer.from(ContractId.fromString(outputToken).toSolidityAddress().replace('0x', ''), 'hex')
        ];

        const path = Buffer.concat(pathData);

        // Construct swap parameters
        const params = {
            path: path,
            recipient: AccountId.fromString(recipientAddress).toSolidityAddress(),
            deadline: Math.floor(Date.now() / 1000) + deadline,
            amountIn: amountInSmallestUnit,
            amountOutMinimum: outputMinInTokens
        };

        // Encode the swap function call
        const swapEncoded = swapRouterAbi.encodeFunctionData('exactInput', [params]);

        // Create and return the transaction
        const tx = await new ContractExecuteTransaction()
            .setContractId(ContractId.fromString(SWAP_ROUTER_ADDRESS))
            .setFunctionParameters(hexToUint8Array(swapEncoded.slice(2)))
            .setGas(1_000_000)
            .setTransactionId(TransactionId.generate(AccountId.fromString(recipientAddress)))
            .setPayableAmount(amountIn)
            .freeze();

        return {
            type: 'swap' as const,
            tx: transactionToBase64String(tx)
        };

    } catch (error) {
        console.error('Error in swapHbarToToken:', error);
        throw error;
    }
}; 