import { ContractId, ContractExecuteTransaction, TransactionId, AccountId } from '@hashgraph/sdk';
import { ethers } from 'ethers';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
import { SWAP_ROUTER_ADDRESS, WHBAR_ID } from '../constants';
import { hexToUint8Array } from '../utils/format';
import { checkTokenAllowance, approveTokenForSwap } from '../utils/tokens';
import SwapRouterAbi from '../abis/SwapRouter.json';
import { getQuoteExactInput } from '../quoter';
import { RouteInfo } from '../routing/types';

const swapRouterAbi = new ethers.Interface(SwapRouterAbi);

export const swapTokenToHbar = async (
    amountIn: string,
    inputToken: string,
    fee: number,
    recipientAddress: string,
    deadline: number,
    slippageBasisPoints: number,
    inputTokenDecimals: number,
    route?: RouteInfo
) => {
    try {
        // Check token approval
        const allowanceResult = await checkTokenAllowance(
            inputToken,
            recipientAddress,
            SWAP_ROUTER_ADDRESS,
            amountIn,
            inputTokenDecimals
        );

        if (!allowanceResult) {
            return {
                type: 'approve' as const,
                tx: await approveTokenForSwap(inputToken, amountIn, recipientAddress, inputTokenDecimals)
            };
        }

        const amountInSmallestUnit = (Number(amountIn) * Math.pow(10, inputTokenDecimals)).toString();

        // Get quote using route if available
        const quoteAmount = await getQuoteExactInput(
            inputToken,
            inputTokenDecimals,
            WHBAR_ID,
            amountIn,
            fee,
            8, // HBAR decimals
            route
        );

        // Calculate minimum output using slippage
        const slippagePercent = slippageBasisPoints / 10000;
        const outputMinInTinybars = (BigInt(quoteAmount) * BigInt(Math.floor((1 - slippagePercent) * 10000)) / BigInt(10000)).toString();

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
            Buffer.from(ContractId.fromString(inputToken).toSolidityAddress().replace('0x', ''), 'hex'),
            Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
            Buffer.from(ContractId.fromString(WHBAR_ID).toSolidityAddress().replace('0x', ''), 'hex')
        ];

        const path = Buffer.concat(pathData);

        // ExactInputParams matching the test script exactly
        const swapParams = {
            path: path,
            recipient: ContractId.fromString(SWAP_ROUTER_ADDRESS).toSolidityAddress(),
            deadline: Math.floor(Date.now() / 1000) + deadline,
            amountIn: amountInSmallestUnit,
            amountOutMinimum: outputMinInTinybars
        };

        // Unwrap params for converting WHBAR to HBAR
        const unwrapParams = {
            amountMinimum: outputMinInTinybars,
            recipient: AccountId.fromString(recipientAddress).toSolidityAddress()
        };

        // Create swap and unwrap calls
        const swapEncoded = swapRouterAbi.encodeFunctionData('exactInput', [swapParams]);
        const unwrapEncoded = swapRouterAbi.encodeFunctionData('unwrapWHBAR', [
            unwrapParams.amountMinimum,
            unwrapParams.recipient
        ]);

        // Encode multicall
        const multicallEncoded = swapRouterAbi.encodeFunctionData('multicall', [[swapEncoded, unwrapEncoded]]);

        // Create and return the transaction
        const tx = await new ContractExecuteTransaction()
            .setContractId(ContractId.fromString(SWAP_ROUTER_ADDRESS))
            .setFunctionParameters(hexToUint8Array(multicallEncoded.slice(2)))
            .setGas(1_000_000)
            .setTransactionId(TransactionId.generate(AccountId.fromString(recipientAddress)))
            .freeze();

        return {
            type: 'swap' as const,
            tx: transactionToBase64String(tx)
        };

    } catch (error) {
        console.error('Error in swapTokenToHbar:', error);
        throw error;
    }
}; 