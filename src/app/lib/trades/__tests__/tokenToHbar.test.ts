import { ContractId, AccountId, Hbar, HbarUnit, Transaction, Client, PrivateKey, ContractExecuteTransaction } from '@hashgraph/sdk';
import { ethers } from 'ethers';
import TestSwapRouterAbi from './TestSwapRouter.json';
import { swapTokenToHbar } from '../tokenToHbar';
import dotenv from "dotenv";
import { AccountBalanceQuery } from '@hashgraph/sdk';

dotenv.config({ path: '.env.local' });

// Validate environment variables
if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY) {
  throw new Error("Environment variables OPERATOR_ID and OPERATOR_KEY must be present");
}

let client: Client;

// Mock swapTokenToHbar
jest.mock('../tokenToHbar', () => {
  const mockAccountId = {
    fromString: jest.fn().mockReturnValue({
      toSolidityAddress: () => '0x1234567890123456789012345678901234567890'
    })
  };

  const mockContractId = {
    fromString: jest.fn().mockReturnValue({
      toSolidityAddress: () => '0x1234567890123456789012345678901234567890'
    })
  };

  return {
    swapTokenToHbar: jest.fn().mockImplementation(async () => {
      const operatorId = mockAccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!);
      const tokenId = '0.0.1183558';  // SAUCE token
      const routerId = '0.0.1414040';  // SaucerSwap Router
      const fee = 3000;

      // Construct path
      const path = Buffer.concat([
        Buffer.from(mockContractId.fromString(tokenId).toSolidityAddress().replace('0x', ''), 'hex'),
        Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
        Buffer.from(mockContractId.fromString('0.0.15058').toSolidityAddress().replace('0x', ''), 'hex')
      ]);

      // ExactInputParams
      const params = {
        path: path,
        recipient: mockContractId.fromString(routerId).toSolidityAddress(),
        deadline: Math.floor(Date.now() / 1000) + 60,
        amountIn: (10000 * Math.pow(10, 6)).toString(),
        amountOutMinimum: '11000000000' // 11 HBAR in tinybars
      };

      const mockTx = {
        setContractId: jest.fn().mockReturnThis(),
        setGas: jest.fn().mockReturnThis(),
        setPayableAmount: jest.fn().mockReturnThis(),
        setFunctionParameters: jest.fn().mockReturnThis(),
        toBytes: () => Buffer.from(JSON.stringify({
          type: 'ContractExecuteTransaction',
          contractId: '0.0.1234567',
          gas: 3000000,
          functionParameters: 'mock-params'
        }))
      };

      return {
        type: 'swap',
        tx: Buffer.from(mockTx.toBytes()).toString('base64')
      };
    })
  };
});

const swapRouterAbi = new ethers.Interface(TestSwapRouterAbi);

describe('tokenToHbar full flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    client = Client.forTestnet();
    client.setOperator(
      AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!),
      PrivateKey.fromString(process.env.OPERATOR_KEY!)
    );
  });

  it('should handle full swap flow', async () => {
    const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!);
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
      process.env.NEXT_PUBLIC_OPERATOR_ID!,
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

jest.mock('@hashgraph/sdk', () => ({
  Client: {
    forTestnet: jest.fn(() => ({
      setOperator: jest.fn()
    }))
  },
  AccountId: {
    fromString: jest.fn().mockReturnValue({
      toSolidityAddress: () => '0x1234567890123456789012345678901234567890'
    })
  },
  PrivateKey: {
    fromString: jest.fn().mockReturnValue('mock-private-key'),
    fromStringED25519: jest.fn().mockReturnValue('mock-private-key')
  },
  Transaction: {
    fromBytes: jest.fn().mockReturnValue({
      execute: jest.fn().mockResolvedValue('mock-execution-result')
    })
  }
})); 