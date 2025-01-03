/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  Contract,
  ContractFactory,
  ContractTransactionResponse,
  Interface,
} from "ethers";
import type {
  Signer,
  AddressLike,
  ContractDeployTransaction,
  ContractRunner,
} from "ethers";
import type { NonPayableOverrides } from "../../../../common";
import type {
  NFTSale,
  NFTSaleInterface,
} from "../../../../src/app/contracts/NFTSale";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_tokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_treasury",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
    ],
    name: "ContractReset",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "message",
        type: "string",
      },
      {
        indexed: false,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Debug",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "buyer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "serialNumber",
        type: "uint256",
      },
    ],
    name: "NFTSold",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "message",
        type: "string",
      },
      {
        indexed: false,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "PaymentDebug",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "PaymentForwarded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "PaymentReceived",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "buyer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "PurchaseInitiated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "operation",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "newSoldSupply",
        type: "uint256",
      },
    ],
    name: "StateChange",
    type: "event",
  },
  {
    inputs: [],
    name: "currentTokenId",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "buyer",
        type: "address",
      },
    ],
    name: "getPurchaseState",
    outputs: [
      {
        internalType: "bool",
        name: "purchased",
        type: "bool",
      },
      {
        internalType: "uint256",
        name: "nextToken",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "remaining",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "hasPurchased",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "maxSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "price",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "purchaseNFT",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "resetContract",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "soldSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "tokenAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "treasury",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const _bytecode =
  "0x608060405264012a05f20060035560646004556000600555600260065534801561002857600080fd5b50604051610c7b380380610c7b8339810160408190526100479161016f565b60008054336001600160a01b0319918216811783556002805483166001600160a01b038781169190911790915560018054909316908516179091556040805160608082526014908201527f436f6e747261637420696e697469616c697a6564000000000000000000000000608082015260208101929092528101919091527fe5589756feb14fa54053633b30d9de8c8c4a3347afc5bd6efc411f7823ae87f29060a00160405180910390a1600654600554604080516060808252600490820152631a5b9a5d60e21b608082015260208101939093528201527f50a77805ba3ef39f866e504a52cf8ad9303ed7ca3ec9a69774de6fc642a3b8919060a00160405180910390a150506101a2565b80516001600160a01b038116811461016a57600080fd5b919050565b6000806040838503121561018257600080fd5b61018b83610153565b915061019960208401610153565b90509250929050565b610aca806101b16000396000f3fe60806040526004361061009b5760003560e01c806390118fb41161006457806390118fb4146101685780639d76ea58146101a8578063a035b1fe146101c8578063b181a8fc146101de578063d5abeb01146101f3578063fa2299ee1461020957600080fd5b80629a9b7b146100a0578063613b4d32146100c957806361d027b3146100d35780636b9581251461010b5780638da5cb5b14610148575b600080fd5b3480156100ac57600080fd5b506100b660065481565b6040519081526020015b60405180910390f35b6100d161021f565b005b3480156100df57600080fd5b506001546100f3906001600160a01b031681565b6040516001600160a01b0390911681526020016100c0565b34801561011757600080fd5b5061012b6101263660046109fc565b610876565b6040805193151584526020840192909252908201526060016100c0565b34801561015457600080fd5b506000546100f3906001600160a01b031681565b34801561017457600080fd5b506101986101833660046109fc565b60076020526000908152604090205460ff1681565b60405190151581526020016100c0565b3480156101b457600080fd5b506002546100f3906001600160a01b031681565b3480156101d457600080fd5b506100b660035481565b3480156101ea57600080fd5b506100d16108bb565b3480156101ff57600080fd5b506100b660045481565b34801561021557600080fd5b506100b660055481565b6040805160608082526010908201526f141d5c98da185cd9481cdd185c9d195960821b608082015233602082015234818301529051600080516020610a758339815191529181900360a00190a16040805160608082526010908201526f10da1958dada5b99c81c185e5b595b9d60821b608082015233602082015234818301529051600080516020610a758339815191529181900360a00190a1600354341461030f5760405162461bcd60e51b815260206004820152601860248201527f496e636f7272656374207061796d656e7420616d6f756e74000000000000000060448201526064015b60405180910390fd5b604080516080808252601290820152712830bcb6b2b73a103b30b634b230ba34b7b760711b60a0820152336020820152308183015234606082015290517f2986c1195038ba7d017c216e93091e762818523405dcc924664d323eab49ae879181900360c00190a1600554604080516060808252600f908201526e436865636b696e6720737570706c7960881b60808201523360208201528082019290925251600080516020610a758339815191529181900360a00190a16004546005541061040d5760405162461bcd60e51b8152602060048201526011602482015270105b1b081391951cc81cdbdb19081bdd5d607a1b6044820152606401610306565b33600081815260076020526040902054600080516020610a75833981519152919060ff1661043c57600061043f565b60015b604080516060808252601a908201527f436865636b696e672070726576696f757320707572636861736500000000000060808201526001600160a01b03909316602084015260ff9091169082015260a00160405180910390a13360009081526007602052604090205460ff16156104ec5760405162461bcd60e51b8152602060048201526011602482015270105b1c9958591e481c1d5c98da185cd959607a1b6044820152606401610306565b6006546040805160608082526011908201527010da1958dada5b99c81d1bdad95b881251607a1b60808201523360208201528082019290925251600080516020610a758339815191529181900360a00190a1600454600654111561058b5760405162461bcd60e51b81526020600482015260166024820152754e6f206d6f7265204e46547320617661696c61626c6560501b6044820152606401610306565b600654604080516060808252601290820152715265636f7264696e6720707572636861736560701b6080820152336020820152908101829052600080516020610a758339815191529060a00160405180910390a1600680549060006105ef83610a42565b90915550506005805490600061060483610a42565b90915550503360009081526007602052604090819020805460ff1916600117905560065460055491517f50a77805ba3ef39f866e504a52cf8ad9303ed7ca3ec9a69774de6fc642a3b891926106839291606080825260089082015267707572636861736560c01b60808201526020810192909252604082015260a00190565b60405180910390a1604080513381523460208201527f5a3f196e6fd5c75314ebca5df0bb64433a4da454c48dbcb96161583a3152aa65910160405180910390a1604080513381523460208201527f6ef95f06320e7a25a04a175ca677b7052bdd97131872c2192525a629f51be770910160405180910390a160015460408051608080825260129082015271119bdc9dd85c991a5b99c81c185e5b595b9d60721b60a08201523060208201526001600160a01b0390921682820152346060830152517f2986c1195038ba7d017c216e93091e762818523405dcc924664d323eab49ae879181900360c00190a16001546040516001600160a01b03909116903480156108fc02916000818181858888f193505050501580156107a7573d6000803e3d6000fd5b50600154604080516001600160a01b0390921682523460208301527f7e99594d80a854f08e1995929bca50d03000411d5987bfea7071cc8d125762c4910160405180910390a160405181815233907ff025e0c58bf784c030caa814abce9ca7cf237831d4dff71c2ade33bed4d8dd229060200160405180910390a260408051606080825260129082015271141d5c98da185cd94818dbdb5c1b195d195960721b6080820152336020820152908101829052600080516020610a758339815191529060a00160405180910390a150565b6001600160a01b0381166000908152600760205260408120546006546005546004548493849360ff9091169290916108ae9190610a5b565b9250925092509193909250565b6000546001600160a01b0316331461090c5760405162461bcd60e51b815260206004820152601460248201527313db9b1e481bdddb995c8818d85b881c995cd95d60621b6044820152606401610306565b60006005556002600655604080516060808252600e908201526d10dbdb9d1c9858dd081c995cd95d60921b608082015233602082015242818301529051600080516020610a758339815191529181900360a00190a17f50a77805ba3ef39f866e504a52cf8ad9303ed7ca3ec9a69774de6fc642a3b8916006546005546040516109bd9291906060808252600590820152641c995cd95d60da1b60808201526020810192909252604082015260a00190565b60405180910390a160405142815233907f52792a7f5b0a52571949f1e7fb3a5a1672bd8a877707942a21cb3300fa02d1019060200160405180910390a2565b600060208284031215610a0e57600080fd5b81356001600160a01b0381168114610a2557600080fd5b9392505050565b634e487b7160e01b600052601160045260246000fd5b600060018201610a5457610a54610a2c565b5060010190565b81810381811115610a6e57610a6e610a2c565b9291505056fee5589756feb14fa54053633b30d9de8c8c4a3347afc5bd6efc411f7823ae87f2a2646970667358221220292162aa95f906175da064764734b83b0282dc8b41996b44212b54622d1130b664736f6c63430008140033";

type NFTSaleConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: NFTSaleConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class NFTSale__factory extends ContractFactory {
  constructor(...args: NFTSaleConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override getDeployTransaction(
    _tokenAddress: AddressLike,
    _treasury: AddressLike,
    overrides?: NonPayableOverrides & { from?: string }
  ): Promise<ContractDeployTransaction> {
    return super.getDeployTransaction(
      _tokenAddress,
      _treasury,
      overrides || {}
    );
  }
  override deploy(
    _tokenAddress: AddressLike,
    _treasury: AddressLike,
    overrides?: NonPayableOverrides & { from?: string }
  ) {
    return super.deploy(_tokenAddress, _treasury, overrides || {}) as Promise<
      NFTSale & {
        deploymentTransaction(): ContractTransactionResponse;
      }
    >;
  }
  override connect(runner: ContractRunner | null): NFTSale__factory {
    return super.connect(runner) as NFTSale__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): NFTSaleInterface {
    return new Interface(_abi) as NFTSaleInterface;
  }
  static connect(address: string, runner?: ContractRunner | null): NFTSale {
    return new Contract(address, _abi, runner) as unknown as NFTSale;
  }
}
