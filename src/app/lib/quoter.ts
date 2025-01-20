import { ethers } from 'ethers';
import { ContractId } from '@hashgraph/sdk';
import axios from 'axios';
import QuoterV2Abi from './abis/QuoterV2.json';
import { QUOTER_V2_ADDRESS, WHBAR_ID } from './constants';
import { hexToUint8Array, decimalToPaddedHex } from './utils/format';
import { RouteInfo } from './routing/types';

const quoterInterface = new ethers.Interface(QuoterV2Abi);

function debugPath(path: Buffer) {
    const pathHex = path.toString('hex');
    if (pathHex.length > 86) {
        // Multi-hop path
        console.log('Multi-hop Path breakdown:', {
            token1: pathHex.slice(0, 40),
            fee1: pathHex.slice(40, 46),
            whbar: pathHex.slice(46, 86),
            fee2: pathHex.slice(86, 92),
            token2: pathHex.slice(92)
        });
    } else {
        // Direct path
        console.log('Direct Path breakdown:', {
            token1: pathHex.slice(0, 40),
            fee: pathHex.slice(40, 46),
            token2: pathHex.slice(46)
        });
    }
}

export const getQuoteExactInput = async (
    inputToken: string,
    inputTokenDecimals: number,
    outputToken: string,
    amountIn: string,
    fee: number,
    outputTokenDecimals: number,
    route?: RouteInfo
) => {
    try {
        const amountInSmallestUnit = (Number(amountIn) * Math.pow(10, inputTokenDecimals)).toString();

        // Construct path based on route or fallback to direct path
        const pathData = route ? route.path.map((token, index) => {
            const buffers: Buffer[] = [];
            // Add token address
            buffers.push(Buffer.from(ContractId.fromString(token).toSolidityAddress().replace('0x', ''), 'hex'));
            // Add fee if not the last token
            if (index < route.path.length - 1) {
                buffers.push(Buffer.from(route.fees[index].toString(16).padStart(6, '0'), 'hex'));
            }
            return buffers;
        }).flat() : [
            Buffer.from(ContractId.fromString(inputToken).toSolidityAddress().replace('0x', ''), 'hex'),
            Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
            Buffer.from(ContractId.fromString(outputToken).toSolidityAddress().replace('0x', ''), 'hex')
        ];

        const path = Buffer.concat(pathData);
        debugPath(path);

        const encodedFunction = quoterInterface.encodeFunctionData('quoteExactInput', [
            path,
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

        const response = await axios.post(url, data, { headers: {'content-type': 'application/json'} });
        const decodedResult = quoterInterface.decodeFunctionResult('quoteExactInput', response.data.result);
        return decodedResult[0].toString();

    } catch (error) {
        console.error('Error in getQuoteExactInput:', error);
        throw error;
    }
}; 