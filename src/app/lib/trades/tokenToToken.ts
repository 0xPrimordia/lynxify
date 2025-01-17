import { ContractId, ContractExecuteTransaction, TransactionId, Hbar, AccountId } from '@hashgraph/sdk';
import { ethers } from 'ethers';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
import { SWAP_ROUTER_ADDRESS, WHBAR_ID } from '../constants';
import { hexToUint8Array } from '../utils/format';
import { checkTokenAllowance, approveTokenForSwap, checkTokenAssociation, associateToken } from '../utils/tokens';
import SwapRouterAbi from '../abis/SwapRouter.json';
import { getQuoteExactInput } from '../quoter';

const swapRouterAbi = new ethers.Interface(SwapRouterAbi);

export const swapTokenToToken = async (
    amountIn: string,
    inputToken: string,
    outputToken: string,
    fee: number,
    recipientAddress: string,
    deadline: number,
    slippageBasisPoints: number,
    inputTokenDecimals: number,
    outputTokenDecimals: number,
    useWhbarPath: boolean = false
) => {
    try {
        // Check input token approval
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
                tx: await approveTokenForSwap(
                    inputToken,
                    amountIn,
                    recipientAddress,
                    inputTokenDecimals
                ) 
            };
        }

        // Check token associations
        const isInputAssociated = await checkTokenAssociation(recipientAddress, inputToken);
        if (!isInputAssociated) {
            return { type: 'associate' as const, tx: await associateToken(recipientAddress, inputToken) };
        }

        const isOutputAssociated = await checkTokenAssociation(recipientAddress, outputToken);
        if (!isOutputAssociated) {
            return { type: 'associate' as const, tx: await associateToken(recipientAddress, outputToken) };
        }

        const amountInSmallestUnit = (Number(amountIn) * Math.pow(10, inputTokenDecimals)).toString();

        // Get quote with WHBAR path
        const quoteAmount = await getQuoteExactInput(
            inputToken,
            inputTokenDecimals,
            outputToken,
            amountIn,
            fee,
            outputTokenDecimals,
            useWhbarPath
        );

        // Calculate minimum output using slippage
        const slippagePercent = slippageBasisPoints / 10000;
        const outputMinInTokens = (BigInt(quoteAmount) * BigInt(Math.floor((1 - slippagePercent) * 10000)) / BigInt(10000)).toString();

        console.log('Swap Parameters:', {
            amountIn,
            amountInSmallestUnit,
            quoteAmount: quoteAmount.toString(),
            slippageBasisPoints,
            slippagePercent,
            outputMinInTokens,
            useWhbarPath
        });

        // Construct path based on routing type
        const pathData = useWhbarPath ? [
            // Token -> WHBAR -> Token path
            Buffer.from(ContractId.fromString(inputToken).toSolidityAddress().replace('0x', ''), 'hex'),
            Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
            Buffer.from(ContractId.fromString(WHBAR_ID).toSolidityAddress().replace('0x', ''), 'hex'),
            Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
            Buffer.from(ContractId.fromString(outputToken).toSolidityAddress().replace('0x', ''), 'hex')
        ] : [
            // Direct token -> token path
            Buffer.from(ContractId.fromString(inputToken).toSolidityAddress().replace('0x', ''), 'hex'),
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

        let encodedData;
        if (useWhbarPath) {
            const multiCallParam = [swapEncoded];
            encodedData = swapRouterAbi.encodeFunctionData('multicall', [multiCallParam]);
        } else {
            encodedData = swapEncoded;
        }

        // Create and return the transaction
        const tx = await new ContractExecuteTransaction()
            .setContractId(ContractId.fromString(SWAP_ROUTER_ADDRESS))
            .setFunctionParameters(hexToUint8Array(encodedData.slice(2)))
            .setGas(useWhbarPath ? 3_000_000 : 1_000_000)  // Increase gas for WHBAR path
            .setTransactionId(TransactionId.generate(AccountId.fromString(recipientAddress)))
            .freeze();

        return {
            type: 'swap' as const,
            tx: transactionToBase64String(tx)
        };

    } catch (error) {
        console.error('Error in swapTokenToToken:', error);
        throw error;
    }
}; 