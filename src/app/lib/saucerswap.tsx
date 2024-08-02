import { ethers } from 'ethers';
import { ContractId, ContractExecuteTransaction, TransactionId, Hbar, HbarUnit, TokenAssociateTransaction, Client, AccountId, PrivateKey } from '@hashgraph/sdk';
import QuoterV2Abi from './QuoterV2.json';
import SwapRouterAbi from './SwapRouter.json';
import UniswapV3FactoryAbi from './UniswapV3Factory.json';
import axios from 'axios';
import {
  transactionToBase64String
} from '@hashgraph/hedera-wallet-connect'

//load ABI data 
const abiInterfaces = new ethers.Interface(QuoterV2Abi);
const QUOTER_V2_ADDRESS = "0.0.1390002";
const swapRouterAbi = new ethers.Interface(SwapRouterAbi);
const SWAP_ROUTER_ADDRESS = "0.0.3949434";

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

export const checkIfPoolExists = async (tokenA: string, tokenB: string, fee: number) => {
  const unniswapABI = new ethers.Interface(UniswapV3FactoryAbi);
  const V2_factory = "0.0.3946833"

  const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api", '', {
    batchMaxCount: 1, //workaround for V6
  });
  const factoryContract = new ethers.Contract(V2_factory, unniswapABI.fragments, provider);
  const tokenAAddress = `${ContractId.fromString(tokenA).toSolidityAddress()}`;
  const tokenBAddress = `${ContractId.fromString(tokenB).toSolidityAddress()}`;

  const result = await factoryContract.getPool(tokenAAddress, tokenBAddress, fee); //(token1, token0) will give same result
  debugger
  const poolEvmAddress = result.startsWith('0x') ? result : `0x${result}`;
  const poolContractId = ContractId.fromEvmAddress(0, 0, poolEvmAddress);
  return poolContractId.toString();
}

export const swapExactTokenForToken = async (amountIn: string, inputToken: string, outputToken: string, fee: number, recipientAddress: string, deadline: number, outputAmountMin: number) => {
  try {
    // Convert amountIn to tinybar (smallest unit of HBAR)
    const amountInTinybar = ethers.parseUnits(amountIn, 8).toString(); // HBAR has 8 decimal places

    const pathData:string[] = [];
    pathData.push(`0x${ContractId.fromString(inputToken).toSolidityAddress()}`); 
    pathData.push(decimalToPaddedHex(fee, 6));
    pathData.push(`${ContractId.fromString(outputToken).toSolidityAddress()}`);
    const params = {
      path: pathData.join(''),
      recipient: `0x${AccountId.fromString(recipientAddress).toSolidityAddress()}`,
      deadline: deadline,
      amountIn: amountInTinybar, // Use the converted amount
      amountOutMinimum: outputAmountMin
    };
    console.log("Swap params:", params);

    const swapEncoded = swapRouterAbi.encodeFunctionData('exactInput', [params]);
    const refundHBAREncoded = swapRouterAbi.encodeFunctionData('refundETH');
    const multiCallParam = [swapEncoded, refundHBAREncoded];
    const encodedData = swapRouterAbi.encodeFunctionData('multicall', [multiCallParam]);
    const encodedDataAsUint8Array = hexToUint8Array(encodedData);

    const transaction = new ContractExecuteTransaction()
      .setPayableAmount(Hbar.fromTinybars(amountInTinybar)) // Use fromTinybars instead of from
      .setContractId(SWAP_ROUTER_ADDRESS)
      .setGas(300000) // Increased gas limit
      .setFunctionParameters(encodedDataAsUint8Array)
      .setTransactionId(TransactionId.generate(recipientAddress));

    console.log("Transaction details:", transaction);

    const trans = transactionToBase64String(transaction);
    return trans;
  } catch (error) {
    console.error("Error in swapExactTokenForToken:", error);
    throw error;
  }
}

export const getQuoteExactInput = async (inputToken: string, inputTokenDecimals: number, outputToken: string, amountIn: string, fee: number) => {
  const pathData:string[] = [];
  pathData.push(`0x${ContractId.fromString(inputToken).toSolidityAddress()}`); 
  pathData.push(decimalToPaddedHex(fee, 6));
  pathData.push(`${ContractId.fromString(outputToken).toSolidityAddress()}`);
  console.log(pathData.join(''));
  const encodedPathData = hexToUint8Array(pathData.join(''));
  const inputAmountInSmallestUnit = ethers.parseUnits(amountIn, inputTokenDecimals);
  let mirrorNodeBaseUrl = 'https://mainnet.mirrornode.hedera.com';
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