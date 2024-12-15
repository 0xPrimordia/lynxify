import { ContractId, AccountId, Hbar, HbarUnit, Transaction, Client, PrivateKey, ContractExecuteTransaction, ContractFunctionParameters } from '@hashgraph/sdk';
import { ethers } from 'ethers';
import TestSwapRouterAbi from './TestSwapRouter.json';
import { swapTokenToHbar } from '../tokenToHbar';
import dotenv from "dotenv";
import { AccountBalanceQuery } from '@hashgraph/sdk';
import { AccountInfoQuery, TokenId } from '@hashgraph/sdk';

dotenv.config({ path: '.env.local' });

// Validate environment variables
if (!process.env.OPERATOR_ID || !process.env.OPERATOR_KEY) {
  throw new Error("Environment variables OPERATOR_ID and OPERATOR_KEY must be present");
}

// At the top of the file, outside the mock
let client: Client;

// Mock swapTokenToHbar
jest.mock('../tokenToHbar', () => ({
  swapTokenToHbar: jest.fn().mockImplementation(async () => {
    // First check token association and allowance
    const operatorId = AccountId.fromString(process.env.OPERATOR_ID!);
    const tokenId = TokenId.fromString('0.0.1183558');
    const routerId = ContractId.fromString('0.0.1414040');
    const fee = 3000;  // Add fee definition

    // Check token association
    const accountInfo = await new AccountInfoQuery()
      .setAccountId(operatorId)
      .execute(client);
    
    const tokenRelationship = accountInfo.tokenRelationships.get(tokenId);
    if (!tokenRelationship) {
      throw new Error('Token not associated');
    }

    // Check and set allowance
    console.log('Checking token allowance...');
    const allowanceAmount = (10000 * Math.pow(10, 6)).toString(); // Same as swap amount

    const approvalTx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString('0.0.1183558'))  // Convert TokenId to ContractId
      .setGas(1000000)
      .setFunction(
        "approve",
        new ContractFunctionParameters()
          .addAddress(routerId.toSolidityAddress())
          .addUint256(allowanceAmount)
      );

    const approvalResponse = await approvalTx.execute(client);
    const approvalReceipt = await approvalResponse.getReceipt(client);
    console.log('Allowance set:', approvalReceipt.status.toString());
    
    // Construct path with proper fee padding
    const path = Buffer.concat([
      Buffer.from(ContractId.fromString('0.0.1183558').toSolidityAddress().replace('0x', ''), 'hex'),
      Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
      Buffer.from(ContractId.fromString('0.0.15058').toSolidityAddress().replace('0x', ''), 'hex')
    ]);

    // Log path details
    console.log('Path Construction:', {
      inputToken: ContractId.fromString('0.0.1183558').toSolidityAddress(),
      fee: fee.toString(16).padStart(6, '0'),
      whbar: ContractId.fromString('0.0.15058').toSolidityAddress(),
      fullPath: path.toString('hex')
    });

    // Use SwapRouter as recipient per docs
    const params = {
      path: path,
      recipient: routerId.toSolidityAddress(),
      deadline: Math.floor(Date.now() / 1000) + 60,
      amountIn: allowanceAmount,
      amountOutMinimum: Hbar.from(11, HbarUnit.Hbar).toTinybars().toString()
    };

    console.log('Swap Parameters:', {
      recipient: params.recipient,
      deadline: params.deadline,
      amountIn: params.amountIn,
      amountOutMinimum: params.amountOutMinimum,
      pathLength: path.length
    });

    // Create swap calls per docs
    const swapEncoded = '0x' + swapRouterAbi.encodeFunctionData('exactInput', [params]).slice(2);
    const unwrapEncoded = '0x' + swapRouterAbi.encodeFunctionData('unwrapWHBAR', [
      0, // amount (0 means all)
      AccountId.fromString(process.env.OPERATOR_ID!).toSolidityAddress() // Final recipient is operator
    ]).slice(2);

    console.log('Function Signatures:', {
      exactInput: swapEncoded.slice(0, 10),
      unwrapWHBAR: unwrapEncoded.slice(0, 10),
      params: params
    });

    const multiCallParam = [swapEncoded, unwrapEncoded];
    const encodedData = swapRouterAbi.encodeFunctionData('multicall', [multiCallParam]);

    console.log('Encoded Calls:', {
      swapEncoded: swapEncoded,
      unwrapEncoded: unwrapEncoded,
      multiCall: encodedData
    });

    const mockTx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString('0.0.1414040'))
      .setGas(3_000_000) // Increased gas limit
      .setPayableAmount(new Hbar(0))
      .setFunctionParameters(Buffer.from(encodedData.slice(2), 'hex'));

    return {
      type: 'swap',
      tx: Buffer.from(mockTx.toBytes()).toString('base64')
    };
  })
}));

// Mock constants
jest.mock('../../constants', () => ({
  WHBAR_ID: '0.0.15058',
  SWAP_ROUTER_ADDRESS: '0.0.1414040'
}));

const swapRouterAbi = new ethers.Interface(TestSwapRouterAbi);

describe('tokenToHbar full flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Initialize client
    client = Client.forTestnet();
    client.setOperator(
      AccountId.fromString(process.env.OPERATOR_ID!),
      PrivateKey.fromString(process.env.OPERATOR_KEY!)
    );
  });

  it('should handle full swap flow', async () => {
    try {
      // Get initial balance
      const operatorId = AccountId.fromString(process.env.OPERATOR_ID!);
      const initialBalance = await new AccountBalanceQuery()
        .setAccountId(operatorId)
        .execute(client);

      console.log('Initial balance:', initialBalance.hbars.toString());

      // Test parameters
      const amountIn = "10000";  // 10,000 SAUCE
      const inputToken = "0.0.1183558";  // SAUCE token
      const fee = 3000;
      const recipientAddress = process.env.OPERATOR_ID!;  // Use operator as recipient
      const deadline = Math.floor(Date.now() / 1000) + 60;
      const outputAmountMin = 11;  // 11 HBAR minimum output
      const inputTokenDecimals = 6;  // SAUCE has 6 decimals

      const result = await swapTokenToHbar(
        amountIn,
        inputToken,
        fee,
        recipientAddress,
        deadline,
        outputAmountMin,
        inputTokenDecimals
      );

      console.log('Swap Result:', result);
      expect(result.type).toBe('swap');

      // Execute the transaction
      const tx = Transaction.fromBytes(Buffer.from(result.tx!, 'base64'));
      const executed = await tx.execute(client);
      console.log('Execution Result:', executed);
      
      const record = await executed.getRecord(client);
      console.log('Transaction Record:', {
        receipt: record.receipt,
        contractFunctionResult: record.contractFunctionResult && {
          gasUsed: record.contractFunctionResult.gasUsed,
          errorMessage: record.contractFunctionResult.errorMessage,
          bytes: record.contractFunctionResult.bytes,
          logs: record.contractFunctionResult.logs?.map(log => ({
            data: log.data,
            topics: log.topics
          }))
        },
        transfers: record.transfers.map(t => ({
          account: t.accountId?.toString(),
          amount: t.amount.toString()
        }))
      });

      // Get final balance
      const finalBalance = await new AccountBalanceQuery()
        .setAccountId(operatorId)
        .execute(client);

      console.log('Final balance:', finalBalance.hbars.toString());
      console.log('Balance change:', 
        finalBalance.hbars.toTinybars().subtract(initialBalance.hbars.toTinybars()).toString()
      );

    } catch (error: any) {
      console.error('Detailed error:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        // Add any other error properties that might be helpful
        details: error.details,
        status: error.status,
        transactionId: error.transactionId
      });
      throw error;
    }
  });
}); 