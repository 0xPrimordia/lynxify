const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

// Mock the environment variables
process.env.NEXT_PUBLIC_OPERATOR_ID = '0.0.1234';
process.env.OPERATOR_KEY = 'mock-private-key';
process.env.LYNX_CONTRACT_ADDRESS = '0.0.5678';
process.env.SAUCE_TOKEN_ID = '0.0.9012';
process.env.CLXY_TOKEN_ID = '0.0.3456';

// Create mocks for Hedera SDK
const mockClientSetOperator = sinon.stub().returns({});
const mockGetReceipt = sinon.stub();
const mockGetRecord = sinon.stub();
const mockExecute = sinon.stub();
const mockSetTransactionId = sinon.stub().returns({ execute: mockGetRecord });

// Mock classes
class MockAccountId {
  static fromString() { return { toString: () => '0.0.1234' }; }
}

class MockPrivateKey {
  static fromStringED25519() { return {}; }
}

class MockContractId {
  static fromString() { 
    return { 
      toString: () => '0.0.5678',
      toSolidityAddress: () => '0x0000000000000000000000000000000000005678'
    }; 
  }
}

class MockContractCallQuery {
  setContractId() { return this; }
  setGas() { return this; }
  setFunction() { return this; }
  execute() { return Promise.resolve({ getAddress: (idx) => `0x000000000000000000000000000000000000${idx}${idx}${idx}${idx}` }); }
}

class MockContractExecuteTransaction {
  setContractId() { return this; }
  setGas() { return this; }
  setFunction() { return this; }
  setMaxTransactionFee() { return this; }
  execute() { 
    return Promise.resolve({ 
      transactionId: { toString: () => 'mock-transaction-id' },
      getReceipt: mockGetReceipt
    }); 
  }
}

class MockTransactionRecordQuery {
  setTransactionId() { return this; }
  execute() { return mockGetRecord(); }
}

class MockClient {
  static forTestnet() { 
    return { 
      setOperator: mockClientSetOperator
    }; 
  }
}

class MockStatus {
  static get Success() { return 'SUCCESS'; }
  static get ContractRevertExecuted() { return 'CONTRACT_REVERT_EXECUTED'; }
}

class MockHbar {
  constructor() {}
}

describe('associateTokens.js', () => {
  let associateTokensModule;

  beforeEach(() => {
    // Reset all mocks
    mockGetReceipt.reset();
    mockGetRecord.reset();
    mockExecute.reset();
    mockClientSetOperator.reset();
    mockSetTransactionId.reset();

    // Default mock implementations
    mockGetReceipt.resolves({ status: { toString: () => 'SUCCESS' } });
    mockGetRecord.resolves({ receipt: { status: MockStatus.Success } });

    // Set up the proxyquire to use our mocks
    associateTokensModule = proxyquire('./associateTokens', {
      '@hashgraph/sdk': {
        Client: MockClient,
        AccountId: MockAccountId,
        PrivateKey: MockPrivateKey,
        ContractId: MockContractId,
        ContractExecuteTransaction: MockContractExecuteTransaction,
        ContractCallQuery: MockContractCallQuery,
        Hbar: MockHbar,
        TransactionRecordQuery: MockTransactionRecordQuery,
        Status: MockStatus
      }
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should successfully associate tokens', async () => {
    // Replace the exported function with one we can control
    const originalFn = associateTokensModule.associateTokens;
    associateTokensModule.associateTokens = async () => {
      const result = await originalFn();
      expect(result).to.equal('SUCCESS');
      return result;
    };

    await associateTokensModule.associateTokens();
  });

  it('should handle missing environment variables', async () => {
    // Save original env vars
    const originalEnv = { ...process.env };
    
    // Delete required vars
    delete process.env.NEXT_PUBLIC_OPERATOR_ID;
    
    try {
      await associateTokensModule.associateTokens();
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).to.include('Missing environment variables');
    } finally {
      // Restore env vars
      process.env = originalEnv;
    }
  });

  it('should handle transaction failure', async () => {
    // Mock the execute method to throw an error
    const mockExecuteTx = sinon.stub(MockContractExecuteTransaction.prototype, 'execute');
    mockExecuteTx.rejects(new Error('Transaction failed'));

    try {
      await associateTokensModule.associateTokens();
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).to.equal('Transaction failed');
    }
  });

  it('should handle receipt failure', async () => {
    // Mock the getReceipt method to throw an error
    mockGetReceipt.rejects(new Error('Receipt failed'));
    
    try {
      await associateTokensModule.associateTokens();
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).to.equal('Receipt failed');
    }
  });

  it('should handle contract revert executed status', async () => {
    // Mock the getReceipt method to return CONTRACT_REVERT_EXECUTED
    mockGetReceipt.rejects(new Error('CONTRACT_REVERT_EXECUTED'));
    
    // Mock the record query to return CONTRACT_REVERT_EXECUTED status
    mockGetRecord.resolves({ 
      receipt: { 
        status: MockStatus.ContractRevertExecuted 
      } 
    });
    
    try {
      await associateTokensModule.associateTokens();
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).to.equal('CONTRACT_REVERT_EXECUTED');
    }
  });
}); 