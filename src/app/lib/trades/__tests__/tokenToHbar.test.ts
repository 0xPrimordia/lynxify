import { ContractId, AccountId } from '@hashgraph/sdk';
import { ethers } from 'ethers';
import TestSwapRouterAbi from './TestSwapRouter.json';

// Mock constants
jest.mock('../../constants', () => ({
  WHBAR_ID: '0.0.15058',
  SWAP_ROUTER_ADDRESS: '0.0.1414040'
}));

const swapRouterAbi = new ethers.Interface(TestSwapRouterAbi);

describe('tokenToHbar', () => {
  it('should construct correct path and encoded data', () => {
    // Mock parameters
    const amountIn = "1";
    const inputToken = "0.0.1183558";
    const fee = 3000;
    const recipientAddress = "0.0.4340026";
    const deadline = Math.floor(Date.now() / 1000) + 60;
    const outputAmountMin = 0;
    const inputTokenDecimals = 8;

    // Construct path
    const path = Buffer.concat([
      Buffer.from(ContractId.fromString('0.0.15058').toSolidityAddress().replace('0x', ''), 'hex'),
      Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
      Buffer.from(ContractId.fromString(inputToken).toSolidityAddress().replace('0x', ''), 'hex')
    ]);

    // Construct params
    const params = {
      path: path,
      recipient: ContractId.fromString('0.0.1414040').toSolidityAddress(),
      deadline: deadline,
      amountIn: (Number(amountIn) * Math.pow(10, inputTokenDecimals)).toString(),
      amountOutMinimum: (Number(outputAmountMin) * 1e8).toString()
    };

    // Encode function calls
    const swapEncoded = swapRouterAbi.encodeFunctionData('exactInput', [params]);
    const unwrapEncoded = swapRouterAbi.encodeFunctionData('unwrapWHBAR', [
      0,
      AccountId.fromString(recipientAddress).toSolidityAddress()
    ]);

    console.log('Test Output:', {
      path: path.toString('hex'),
      params,
      swapEncoded,
      unwrapEncoded
    });

    expect(path).toBeDefined();
    expect(swapEncoded).toBeDefined();
    expect(unwrapEncoded).toBeDefined();
  });
});

describe('tokenToHbar path construction', () => {
  it('should create path with correct byte lengths', () => {
    const inputToken = "0.0.123456";
    const fee = 3000;

    // Get individual components
    const whbarAddress = ContractId.fromString('0.0.15058').toSolidityAddress().replace('0x', '');
    const feeHex = fee.toString(16).padStart(6, '0'); // Should be 3 bytes
    const inputTokenAddress = ContractId.fromString(inputToken).toSolidityAddress().replace('0x', '');

    console.log('Path Components:', {
      whbarAddress,
      whbarLength: whbarAddress.length / 2, // hex string to bytes
      feeHex,
      feeLength: feeHex.length / 2,
      inputTokenAddress,
      inputTokenLength: inputTokenAddress.length / 2
    });

    // Construct path
    const path = Buffer.concat([
      Buffer.from(whbarAddress, 'hex'),
      Buffer.from(feeHex, 'hex'),
      Buffer.from(inputTokenAddress, 'hex')
    ]);

    console.log('Full path:', path.toString('hex'));
    console.log('Full path length in bytes:', path.length);

    // Assertions
    expect(whbarAddress.length / 2).toBe(20); // 20 bytes
    expect(feeHex.length / 2).toBe(3); // 3 bytes
    expect(inputTokenAddress.length / 2).toBe(20); // 20 bytes
    expect(path.length).toBe(43); // Total: 20 + 3 + 20 bytes
  });
});

describe('tokenToHbar encoding', () => {
  it('should create valid encoded function calls', () => {
    // Setup test parameters
    const inputToken = "0.0.123456";
    const fee = 3000;
    const recipientAddress = "0.0.789012";
    const amountIn = "1";
    const inputTokenDecimals = 8;
    const deadline = Math.floor(Date.now() / 1000) + 60;

    // Construct path
    const path = Buffer.concat([
      Buffer.from(ContractId.fromString('0.0.15058').toSolidityAddress().replace('0x', ''), 'hex'),
      Buffer.from(fee.toString(16).padStart(6, '0'), 'hex'),
      Buffer.from(ContractId.fromString(inputToken).toSolidityAddress().replace('0x', ''), 'hex')
    ]);

    // Construct params exactly as in docs
    const params = {
      path: path,
      recipient: ContractId.fromString('0.0.1414040').toSolidityAddress(),
      deadline: deadline,
      amountIn: (Number(amountIn) * Math.pow(10, inputTokenDecimals)).toString(),
      amountOutMinimum: "0"
    };

    // Encode function calls
    const swapEncoded = swapRouterAbi.encodeFunctionData('exactInput', [params]);
    const unwrapEncoded = swapRouterAbi.encodeFunctionData('unwrapWHBAR', [
      0,
      AccountId.fromString(recipientAddress).toSolidityAddress()
    ]);
    const multiCallParam = [swapEncoded, unwrapEncoded];
    const encodedData = swapRouterAbi.encodeFunctionData('multicall', [multiCallParam]);

    console.log('Encoded Data:', {
      exactInputParams: params,
      swapEncoded,
      unwrapEncoded,
      multiCallEncoded: encodedData,
      functionSignatures: {
        exactInput: swapEncoded.slice(0, 10),
        unwrapWHBAR: unwrapEncoded.slice(0, 10),
        multicall: encodedData.slice(0, 10)
      }
    });

    // Verify function signatures with actual values
    expect(swapEncoded.startsWith('0xc04b8d59')).toBe(true); // exactInput signature
    expect(unwrapEncoded.startsWith('0x5fb043af')).toBe(true); // actual unwrapWHBAR signature
    expect(encodedData.startsWith('0xac9650d8')).toBe(true); // multicall signature
  });
}); 