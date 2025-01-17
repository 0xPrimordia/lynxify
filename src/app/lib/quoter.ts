import { ethers } from 'ethers';
import { ContractId } from '@hashgraph/sdk';
import axios from 'axios';
import QuoterV2Abi from './abis/QuoterV2.json';
import { QUOTER_V2_ADDRESS, WHBAR_ID } from './constants';
import { hexToUint8Array, decimalToPaddedHex } from './utils/format';

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
    useWhbarPath: boolean = false
) => {
    try {
        const isHbarToToken = inputToken === WHBAR_ID;
        const isTokenToHbar = outputToken === WHBAR_ID;
        
        const amountInSmallestUnit = isHbarToToken
            ? (Number(amountIn) * 1e8).toString()
            : (Number(amountIn) * Math.pow(10, inputTokenDecimals)).toString();

        // Log the raw values before path construction
        console.log('Raw values:', {
            inputToken,
            outputToken,
            WHBAR_ID,
            fee,
            amountInSmallestUnit
        });

        const pathData = useWhbarPath || isHbarToToken || isTokenToHbar ? [
            Buffer.from(ContractId.fromString(inputToken).toSolidityAddress().replace('0x', ''), 'hex'),
            Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
            Buffer.from(ContractId.fromString(WHBAR_ID).toSolidityAddress().replace('0x', ''), 'hex'),
            Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
            Buffer.from(ContractId.fromString(outputToken).toSolidityAddress().replace('0x', ''), 'hex')
        ] : [
            Buffer.from(ContractId.fromString(inputToken).toSolidityAddress().replace('0x', ''), 'hex'),
            Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
            Buffer.from(ContractId.fromString(outputToken).toSolidityAddress().replace('0x', ''), 'hex')
        ];

        const path = Buffer.concat(pathData);
        
        // Log the encoded function data
        const encodedFunction = quoterInterface.encodeFunctionData('quoteExactInput', [
            path,
            amountInSmallestUnit
        ]);
        console.log('Encoded function data:', encodedFunction);

        // Debug the path
        debugPath(path);

        // Log the actual hex values being used
        console.log('Path details:', {
            inputToken: ContractId.fromString(inputToken).toSolidityAddress(),
            whbar: ContractId.fromString(WHBAR_ID).toSolidityAddress(),
            outputToken: ContractId.fromString(outputToken).toSolidityAddress(),
            fee: fee.toString(16).padStart(6, '0'),
            useWhbarPath
        });

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