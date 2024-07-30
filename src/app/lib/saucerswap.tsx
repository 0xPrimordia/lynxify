import { ethers } from 'ethers';
import { ContractId, ContractExecuteTransaction, Hbar, HbarUnit, TokenAssociateTransaction, Client, AccountId, PrivateKey } from '@hashgraph/sdk';
import QuoterV2Abi from './QuoterV2.json';
import SwapRouterAbi from './SwapRouter.json';
import axios from 'axios';

//load ABI data 
const abiInterfaces = new ethers.Interface(QuoterV2Abi);
const QUOTER_V2_ADDRESS = "0.0.1390002";
const swapRouterAbi = new ethers.Interface(SwapRouterAbi);
const SWAP_ROUTER_ADDRESS = "0.0.1197038";

//helper functions
function hexToUint8Array(hex: string): Uint8Array {
  if (hex.startsWith('0x')) {
    hex = hex.slice(2);
  }
  if (hex.length % 2 !== 0) {
    throw new Error('Hex string must have an even length');
  }
  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    array[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return array;
}

function decimalToPaddedHex(decimal: number, length: number): string {
  let hexString = decimal.toString(16);
  while (hexString.length < length) {
      hexString = '0' + hexString;
  }
  return hexString;
}

export const swapExactTokenForToken = async (amountIn: string, inputToken: string, outputToken: string, fee: number, recipientAddress: string, deadline: number, outputAmountMin: number) => {
  const client = new Client();
  client.setOperator(AccountId.fromString(process.env.NEXT_PUBLIC_MY_ACCOUNT_ID!), PrivateKey.fromStringECDSA(process.env.NEXT_PUBLIC_MY_PRIVATE_KEY!));
  const pathData:string[] = [];
  pathData.push(`0x${ContractId.fromString(inputToken).toSolidityAddress()}`); 
  pathData.push(decimalToPaddedHex(fee, 6));
  pathData.push(`${ContractId.fromString(outputToken).toSolidityAddress()}`);
  debugger
  const params = {
    path: pathData.join(''), //'0x...'
    recipient: `0x${AccountId.fromString(recipientAddress).toSolidityAddress()}`, //'0x...' - user's recipient address
    deadline: deadline, //Unix seconds
    amountIn: amountIn, //need to convert to Tinybar
    amountOutMinimum: outputAmountMin//in token's smallest unit
  };

  const swapEncoded = swapRouterAbi.encodeFunctionData('exactInput', [params]);
  const refundHBAREncoded = swapRouterAbi.encodeFunctionData('refundETH');
  const multiCallParam = [swapEncoded, refundHBAREncoded];
  const encodedData = swapRouterAbi.encodeFunctionData('multicall', [multiCallParam]);
  const encodedDataAsUint8Array = hexToUint8Array(encodedData);
  const transaction = new ContractExecuteTransaction()
    .setPayableAmount(Hbar.from(amountIn, HbarUnit.Tinybar))
    .setContractId(SWAP_ROUTER_ADDRESS)
    .setGas(100000)
    .setFunctionParameters(encodedDataAsUint8Array);
  debugger
  // Freeze the transaction
  const frozenTransaction = await transaction.freezeWith(client);

  // Execute the frozen transaction
  const response = await frozenTransaction.execute(client);
 
  const record = await response.getRecord(client);
  const result = record.contractFunctionResult!;
  const values = result.getResult(['uint256']);
  const amountOut = values[0]; //uint256 amountOut
  
}

export const getQuoteExactInput = async (inputToken: string, inputTokenDecimals: number, outputToken: string, amountIn: string, fee: number) => {
  const pathData:string[] = [];
  pathData.push(`0x${ContractId.fromString(inputToken).toSolidityAddress()}`); 
  pathData.push(decimalToPaddedHex(fee, 6));
  pathData.push(`${ContractId.fromString(outputToken).toSolidityAddress()}`);
  console.log(pathData.join(''));
  const encodedPathData = hexToUint8Array(pathData.join(''));
  const inputAmountInSmallestUnit = ethers.parseUnits(amountIn, inputTokenDecimals);
  let mirrorNodeBaseUrl = 'https://testnet.mirrornode.hedera.com';
  const url = `${mirrorNodeBaseUrl}/api/v1/contracts/call`;
  const params = [encodedPathData, inputAmountInSmallestUnit];
  const encodedData = abiInterfaces.encodeFunctionData(abiInterfaces.getFunction('quoteExactInput')!, params);

  const data = {
    'block': 'latest',
    'data': encodedData,
    'to': `0x${ContractId.fromString(QUOTER_V2_ADDRESS).toSolidityAddress()}`,
  };

  try {
    const response = await axios.post(url, data, { headers: {'content-type': 'application/json'} });
    const result = abiInterfaces.decodeFunctionResult('quoteExactInput', response.data.result); 
    const finalAmountOut = result.amountOut; //in token's smallest unit
    return finalAmountOut;
  } catch (error) {
    console.error("Error sending transaction:", error);
    throw error;
  }
}