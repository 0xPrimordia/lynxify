/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumberish,
  BytesLike,
  FunctionFragment,
  Result,
  Interface,
  EventFragment,
  AddressLike,
  ContractRunner,
  ContractMethod,
  Listener,
} from "ethers";
import type {
  TypedContractEvent,
  TypedDeferredTopicFilter,
  TypedEventLog,
  TypedLogDescription,
  TypedListener,
  TypedContractMethod,
} from "../../../../common";

export interface UserThresholdInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "FEE_BASIS_POINTS"
      | "approveRouter"
      | "calculateFee"
      | "currentPrice"
      | "deactivateThresholds"
      | "executeTradeForUser"
      | "feeCollector"
      | "getThreshold"
      | "owner"
      | "setFeeCollector"
      | "setThreshold"
      | "userThresholds"
  ): FunctionFragment;

  getEvent(
    nameOrSignatureOrTopic:
      | "FeeCalculated"
      | "FeeCollected"
      | "OrderExecuted"
      | "RouterApprovalResult"
      | "ThresholdSet"
  ): EventFragment;

  encodeFunctionData(
    functionFragment: "FEE_BASIS_POINTS",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "approveRouter",
    values: [AddressLike, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "calculateFee",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "currentPrice",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "deactivateThresholds",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "executeTradeForUser",
    values: [string, string, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "feeCollector",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getThreshold",
    values: [string]
  ): string;
  encodeFunctionData(functionFragment: "owner", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "setFeeCollector",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "setThreshold",
    values: [BigNumberish, string, AddressLike, AddressLike, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "userThresholds",
    values: [string]
  ): string;

  decodeFunctionResult(
    functionFragment: "FEE_BASIS_POINTS",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "approveRouter",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "calculateFee",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "currentPrice",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "deactivateThresholds",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "executeTradeForUser",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "feeCollector",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getThreshold",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "owner", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "setFeeCollector",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setThreshold",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "userThresholds",
    data: BytesLike
  ): Result;
}

export namespace FeeCalculatedEvent {
  export type InputTuple = [
    tradeAmount: BigNumberish,
    feeAmount: BigNumberish,
    finalTradeAmount: BigNumberish
  ];
  export type OutputTuple = [
    tradeAmount: bigint,
    feeAmount: bigint,
    finalTradeAmount: bigint
  ];
  export interface OutputObject {
    tradeAmount: bigint;
    feeAmount: bigint;
    finalTradeAmount: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace FeeCollectedEvent {
  export type InputTuple = [collector: AddressLike, amount: BigNumberish];
  export type OutputTuple = [collector: string, amount: bigint];
  export interface OutputObject {
    collector: string;
    amount: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace OrderExecutedEvent {
  export type InputTuple = [
    hederaAccountId: string,
    orderType: string,
    currentPrice: BigNumberish,
    tokenA: AddressLike,
    tokenB: AddressLike,
    amountOut: BigNumberish
  ];
  export type OutputTuple = [
    hederaAccountId: string,
    orderType: string,
    currentPrice: bigint,
    tokenA: string,
    tokenB: string,
    amountOut: bigint
  ];
  export interface OutputObject {
    hederaAccountId: string;
    orderType: string;
    currentPrice: bigint;
    tokenA: string;
    tokenB: string;
    amountOut: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace RouterApprovalResultEvent {
  export type InputTuple = [
    message: string,
    token: AddressLike,
    amount: BigNumberish,
    result: BigNumberish
  ];
  export type OutputTuple = [
    message: string,
    token: string,
    amount: bigint,
    result: bigint
  ];
  export interface OutputObject {
    message: string;
    token: string;
    amount: bigint;
    result: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace ThresholdSetEvent {
  export type InputTuple = [
    hederaAccountId: string,
    price: BigNumberish,
    tokenA: AddressLike,
    tokenB: AddressLike,
    cap: BigNumberish
  ];
  export type OutputTuple = [
    hederaAccountId: string,
    price: bigint,
    tokenA: string,
    tokenB: string,
    cap: bigint
  ];
  export interface OutputObject {
    hederaAccountId: string;
    price: bigint;
    tokenA: string;
    tokenB: string;
    cap: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export interface UserThreshold extends BaseContract {
  connect(runner?: ContractRunner | null): UserThreshold;
  waitForDeployment(): Promise<this>;

  interface: UserThresholdInterface;

  queryFilter<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;
  queryFilter<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;

  on<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  on<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  once<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  once<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  listeners<TCEvent extends TypedContractEvent>(
    event: TCEvent
  ): Promise<Array<TypedListener<TCEvent>>>;
  listeners(eventName?: string): Promise<Array<Listener>>;
  removeAllListeners<TCEvent extends TypedContractEvent>(
    event?: TCEvent
  ): Promise<this>;

  FEE_BASIS_POINTS: TypedContractMethod<[], [bigint], "view">;

  approveRouter: TypedContractMethod<
    [token: AddressLike, amount: BigNumberish],
    [void],
    "nonpayable"
  >;

  calculateFee: TypedContractMethod<[amount: BigNumberish], [bigint], "view">;

  currentPrice: TypedContractMethod<[], [bigint], "view">;

  deactivateThresholds: TypedContractMethod<
    [hederaAccountId: string],
    [void],
    "nonpayable"
  >;

  executeTradeForUser: TypedContractMethod<
    [hederaAccountId: string, orderType: string, path: BytesLike],
    [void],
    "payable"
  >;

  feeCollector: TypedContractMethod<[], [string], "view">;

  getThreshold: TypedContractMethod<
    [hederaAccountId: string],
    [
      [bigint, string, string, string, bigint, boolean] & {
        price: bigint;
        storedHederaId: string;
        tokenA: string;
        tokenB: string;
        cap: bigint;
        isActive: boolean;
      }
    ],
    "view"
  >;

  owner: TypedContractMethod<[], [string], "view">;

  setFeeCollector: TypedContractMethod<
    [_newCollector: AddressLike],
    [void],
    "nonpayable"
  >;

  setThreshold: TypedContractMethod<
    [
      _price: BigNumberish,
      _hederaAccountId: string,
      _tokenA: AddressLike,
      _tokenB: AddressLike,
      _cap: BigNumberish
    ],
    [void],
    "nonpayable"
  >;

  userThresholds: TypedContractMethod<
    [arg0: string],
    [
      [bigint, string, string, string, bigint, boolean] & {
        price: bigint;
        hederaAccountId: string;
        tokenA: string;
        tokenB: string;
        cap: bigint;
        isActive: boolean;
      }
    ],
    "view"
  >;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "FEE_BASIS_POINTS"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "approveRouter"
  ): TypedContractMethod<
    [token: AddressLike, amount: BigNumberish],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "calculateFee"
  ): TypedContractMethod<[amount: BigNumberish], [bigint], "view">;
  getFunction(
    nameOrSignature: "currentPrice"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "deactivateThresholds"
  ): TypedContractMethod<[hederaAccountId: string], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "executeTradeForUser"
  ): TypedContractMethod<
    [hederaAccountId: string, orderType: string, path: BytesLike],
    [void],
    "payable"
  >;
  getFunction(
    nameOrSignature: "feeCollector"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "getThreshold"
  ): TypedContractMethod<
    [hederaAccountId: string],
    [
      [bigint, string, string, string, bigint, boolean] & {
        price: bigint;
        storedHederaId: string;
        tokenA: string;
        tokenB: string;
        cap: bigint;
        isActive: boolean;
      }
    ],
    "view"
  >;
  getFunction(
    nameOrSignature: "owner"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "setFeeCollector"
  ): TypedContractMethod<[_newCollector: AddressLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "setThreshold"
  ): TypedContractMethod<
    [
      _price: BigNumberish,
      _hederaAccountId: string,
      _tokenA: AddressLike,
      _tokenB: AddressLike,
      _cap: BigNumberish
    ],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "userThresholds"
  ): TypedContractMethod<
    [arg0: string],
    [
      [bigint, string, string, string, bigint, boolean] & {
        price: bigint;
        hederaAccountId: string;
        tokenA: string;
        tokenB: string;
        cap: bigint;
        isActive: boolean;
      }
    ],
    "view"
  >;

  getEvent(
    key: "FeeCalculated"
  ): TypedContractEvent<
    FeeCalculatedEvent.InputTuple,
    FeeCalculatedEvent.OutputTuple,
    FeeCalculatedEvent.OutputObject
  >;
  getEvent(
    key: "FeeCollected"
  ): TypedContractEvent<
    FeeCollectedEvent.InputTuple,
    FeeCollectedEvent.OutputTuple,
    FeeCollectedEvent.OutputObject
  >;
  getEvent(
    key: "OrderExecuted"
  ): TypedContractEvent<
    OrderExecutedEvent.InputTuple,
    OrderExecutedEvent.OutputTuple,
    OrderExecutedEvent.OutputObject
  >;
  getEvent(
    key: "RouterApprovalResult"
  ): TypedContractEvent<
    RouterApprovalResultEvent.InputTuple,
    RouterApprovalResultEvent.OutputTuple,
    RouterApprovalResultEvent.OutputObject
  >;
  getEvent(
    key: "ThresholdSet"
  ): TypedContractEvent<
    ThresholdSetEvent.InputTuple,
    ThresholdSetEvent.OutputTuple,
    ThresholdSetEvent.OutputObject
  >;

  filters: {
    "FeeCalculated(uint256,uint256,uint256)": TypedContractEvent<
      FeeCalculatedEvent.InputTuple,
      FeeCalculatedEvent.OutputTuple,
      FeeCalculatedEvent.OutputObject
    >;
    FeeCalculated: TypedContractEvent<
      FeeCalculatedEvent.InputTuple,
      FeeCalculatedEvent.OutputTuple,
      FeeCalculatedEvent.OutputObject
    >;

    "FeeCollected(address,uint256)": TypedContractEvent<
      FeeCollectedEvent.InputTuple,
      FeeCollectedEvent.OutputTuple,
      FeeCollectedEvent.OutputObject
    >;
    FeeCollected: TypedContractEvent<
      FeeCollectedEvent.InputTuple,
      FeeCollectedEvent.OutputTuple,
      FeeCollectedEvent.OutputObject
    >;

    "OrderExecuted(string,string,uint256,address,address,uint256)": TypedContractEvent<
      OrderExecutedEvent.InputTuple,
      OrderExecutedEvent.OutputTuple,
      OrderExecutedEvent.OutputObject
    >;
    OrderExecuted: TypedContractEvent<
      OrderExecutedEvent.InputTuple,
      OrderExecutedEvent.OutputTuple,
      OrderExecutedEvent.OutputObject
    >;

    "RouterApprovalResult(string,address,uint256,int64)": TypedContractEvent<
      RouterApprovalResultEvent.InputTuple,
      RouterApprovalResultEvent.OutputTuple,
      RouterApprovalResultEvent.OutputObject
    >;
    RouterApprovalResult: TypedContractEvent<
      RouterApprovalResultEvent.InputTuple,
      RouterApprovalResultEvent.OutputTuple,
      RouterApprovalResultEvent.OutputObject
    >;

    "ThresholdSet(string,uint256,address,address,uint256)": TypedContractEvent<
      ThresholdSetEvent.InputTuple,
      ThresholdSetEvent.OutputTuple,
      ThresholdSetEvent.OutputObject
    >;
    ThresholdSet: TypedContractEvent<
      ThresholdSetEvent.InputTuple,
      ThresholdSetEvent.OutputTuple,
      ThresholdSetEvent.OutputObject
    >;
  };
}
