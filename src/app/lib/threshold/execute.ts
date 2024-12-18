import { Client, ContractExecuteTransaction, ContractFunctionParameters, Hbar, HbarUnit } from "@hashgraph/sdk";
import { ExecuteOrderParams } from './types';

export const executeOrder = async (
  client: Client,
  contractId: string,
  params: ExecuteOrderParams
) => {
  const contractExecuteTx = new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(3000000)
    .setFunction(
      "executeTradeForUser",
      new ContractFunctionParameters()
        .addString(params.hederaAccountId)
        .addString(params.orderType)
        .addBytes(Buffer.from(params.path, 'hex'))
    );

  return contractExecuteTx;
}; 