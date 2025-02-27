import {
  Client,
  ContractExecuteTransaction,
  ContractCallQuery,
  ContractFunctionParameters,
  ContractId,
  Long,
} from "@hashgraph/sdk";
import { ThresholdContractParams } from './types';

export const setThresholds = async (
  client: Client,
  contractId: string,
  params: ThresholdContractParams
) => {
  const transaction = new ContractExecuteTransaction()
    .setContractId(ContractId.fromString(contractId))
    .setGas(1000000)
    .setFunction(
      "setThresholds",
      new ContractFunctionParameters()
        .addUint256(params.basisPoints)
        .addString(params.accountId)
        .addAddress(ContractId.fromString(params.tokenAddress).toSolidityAddress())
        .addUint256(Long.fromString(params.amount.toString()))
    );

  return transaction;
};

export const verifyThresholds = async (
  client: Client,
  contractId: string,
  accountId: string
) => {
  const query = new ContractCallQuery()
    .setContractId(ContractId.fromString(contractId))
    .setGas(100000)
    .setFunction(
      "getThreshold",
      new ContractFunctionParameters().addString(accountId)
    );

  return query.execute(client);
};
