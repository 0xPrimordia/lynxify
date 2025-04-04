import { ethers } from 'ethers';
import { ContractId } from '@hashgraph/sdk';
import axios from 'axios';
import QuoterV2Abi from './abis/QuoterV2.json';
import { QUOTER_V2_ADDRESS, WHBAR_ID } from './constants';
import { decimalToPaddedHex } from './utils/format';

const quoterInterface = new ethers.Interface(QuoterV2Abi);

export const getQuoteExactInput = async (
    inputToken: string,
    inputTokenDecimals: number,
    outputToken: string,
    amountIn: string,
    fee: number,
    outputTokenDecimals: number
) => {
    try {
        const isHbarToToken = inputToken === WHBAR_ID;
        
        // Convert amount to smallest unit based on token type
        const amountInSmallestUnit = isHbarToToken
            ? (Number(amountIn) * 1e8).toString()  // HBAR uses 8 decimals
            : (Number(amountIn) * Math.pow(10, inputTokenDecimals)).toString();

        // Construct the path: Token -> fee -> Token
        const pathData: string[] = [];
        pathData.push(ContractId.fromString(inputToken).toSolidityAddress().padStart(40, '0'));
        pathData.push(decimalToPaddedHex(fee, 6));
        pathData.push(ContractId.fromString(outputToken).toSolidityAddress().padStart(40, '0'));

        // Add debug logging for the request
        console.log('Quote request:', {
            path: pathData.join(''),
            amountIn: amountInSmallestUnit,
            inputToken,
            outputToken,
            fee
        });

        const encodedPath = `0x${pathData.join('')}`;
        const encodedFunction = quoterInterface.encodeFunctionData('quoteExactInput', [
            encodedPath,
            amountInSmallestUnit
        ]);

        const url = `https://${process.env.NEXT_PUBLIC_HEDERA_NETWORK}.mirrornode.hedera.com/api/v1/contracts/call`;
        const data = {
            block: "latest",
            data: encodedFunction,
            estimate: false,
            from: "0x0000000000000000000000000000000000000000",
            gas: 400000,
            to: ContractId.fromString(QUOTER_V2_ADDRESS).toSolidityAddress(),
        };

        console.log('Mirror node request:', data);

        try {
            const response = await axios.post(url, data, { headers: {'content-type': 'application/json'} });
            console.log('Mirror node response:', response.data);
            const result = quoterInterface.decodeFunctionResult('quoteExactInput', response.data.result);
            return result.amountOut;
        } catch (error: any) {
            console.error('Mirror node error details:', {
                response: error.response?.data,
                status: error.response?.status
            });
            throw error;
        }
    } catch (error) {
        console.error("Error in getQuoteExactInput:", error);
        throw error;
    }
}; 