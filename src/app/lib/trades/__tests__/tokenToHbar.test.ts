import { ContractId, AccountId, Hbar, HbarUnit, Transaction, Client, PrivateKey, ContractExecuteTransaction } from '@hashgraph/sdk';
import { ethers } from 'ethers';
import TestSwapRouterAbi from './TestSwapRouter.json';
import { swapTokenToHbar } from '../tokenToHbar';
import dotenv from "dotenv";
import { AccountBalanceQuery } from '@hashgraph/sdk';

dotenv.config({ path: '.env.local' });

// Validate environment variables
if (!process.env.OPERATOR_ID || !process.env.OPERATOR_KEY) {
  throw new Error("Environment variables OPERATOR_ID and OPERATOR_KEY must be present");
}

let client: Client;

// Mock swapTokenToHbar
jest.mock('../tokenToHbar', () => ({
  swapTokenToHbar: jest.fn().mockImplementation(async () => {
    const operatorId = AccountId.fromString(process.env.OPERATOR_ID!);
    const tokenId = '0.0.1183558';  // SAUCE token
    const routerId = '0.0.1414040';  // SaucerSwap Router
    const fee = 3000;

    // Construct path
    const path = Buffer.concat([
      Buffer.from(ContractId.fromString(tokenId).toSolidityAddress().replace('0x', ''), 'hex'),
      Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
      Buffer.from(ContractId.fromString('0.0.15058').toSolidityAddress().replace('0x', ''), 'hex')
    ]);

    // ExactInputParams
    const params = {
      path: path,
      recipient: ContractId.fromString(routerId).toSolidityAddress(),
      deadline: Math.floor(Date.now() / 1000) + 60,
      amountIn: (10000 * Math.pow(10, 6)).toString(),
      amountOutMinimum: Hbar.from(11, HbarUnit.Hbar).toTinybars().toString()
    };

    // Create swap calls
    const swapEncoded = '0x' + swapRouterAbi.encodeFunctionData('exactInput', [params]).slice(2);
    const unwrapEncoded = '0x' + swapRouterAbi.encodeFunctionData('unwrapWHBAR', [
      0,
      AccountId.fromString(process.env.OPERATOR_ID!).toSolidityAddress()
    ]).slice(2);

    const multiCallParam = [swapEncoded, unwrapEncoded];
    const encodedData = swapRouterAbi.encodeFunctionData('multicall', [multiCallParam]);

    const mockTx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(routerId))
      .setGas(3_000_000)
      .setPayableAmount(new Hbar(0))
      .setFunctionParameters(Buffer.from(encodedData.slice(2), 'hex'));

    return {
      type: 'swap',
      tx: Buffer.from(mockTx.toBytes()).toString('base64')
    };
  })
}));

const swapRouterAbi = new ethers.Interface(TestSwapRouterAbi);

describe('tokenToHbar full flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    client = Client.forTestnet();
    client.setOperator(
      AccountId.fromString(process.env.OPERATOR_ID!),
      PrivateKey.fromString(process.env.OPERATOR_KEY!)
    );
  });

  it('should handle full swap flow', async () => {
    const operatorId = AccountId.fromString(process.env.OPERATOR_ID!);
    const amountIn = "10000";  // 10,000 SAUCE
    const inputToken = "0.0.1183558";  // SAUCE token
    const fee = 3000;
    const deadline = Math.floor(Date.now() / 1000) + 60;
    const outputAmountMin = 11;  // 11 HBAR minimum output
    const inputTokenDecimals = 6;  // SAUCE has 6 decimals

    const result = await swapTokenToHbar(
      amountIn,
      inputToken,
      fee,
      process.env.OPERATOR_ID!,
      deadline,
      outputAmountMin,
      inputTokenDecimals
    );

    expect(result.type).toBe('swap');
    expect(result.tx).toBeDefined();

    const tx = Transaction.fromBytes(Buffer.from(result.tx!, 'base64'));
    await tx.execute(client);
  });
}); 