// Mock valid accounts for testing
const VALID_ACCOUNTS = new Set(['0.0.5615014', '0.0.8353144']);

export class MockAccountBalanceQuery {
    private accountId: MockAccountId | null = null;

    setAccountId(accountId: MockAccountId) {
        this.accountId = accountId;
        return this;
    }

    async execute(_client: MockClient) {
        if (!this.accountId) {
            throw new Error('Account ID not set');
        }

        const accountStr = this.accountId.toString();
        if (!VALID_ACCOUNTS.has(accountStr)) {
            // Match the exact error format from the Hedera SDK
            const error = new Error(`transaction 0.0.0@${Date.now()} failed precheck with status INVALID_ACCOUNT_ID against node account id 0.0.4`);
            error.name = 'StatusError';
            throw error;
        }

        return {
            hbars: {
                toTinybars: () => '1000000000' // 10 HBAR in tinybars
            }
        };
    }
}

export class MockClient {
    constructor() {}
}

export class MockTransactionId {
    private accountId: MockAccountId;
    private validStart: number;

    constructor(accountId: MockAccountId) {
        this.accountId = accountId;
        this.validStart = Date.now();
    }

    toString() {
        return `${this.accountId.toString()}@${this.validStart}`;
    }

    static generate(accountId: MockAccountId) {
        return new MockTransactionId(accountId);
    }
}

export class MockTransferTransaction {
    private _hbarTransfers: Map<string, MockHbar>;
    private _transactionId: MockTransactionId | null;
    private _maxFee: MockHbar | null;
    private _nodeAccountIds: string[];

    constructor(data?: { hbarTransfers?: { [key: string]: string }, transactionId?: string }) {
        this._hbarTransfers = new Map();
        this._transactionId = null;
        this._maxFee = null;
        this._nodeAccountIds = Array(7).fill('0.0.3');

        if (data?.hbarTransfers) {
            Object.entries(data.hbarTransfers).forEach(([key, value]) => {
                this._hbarTransfers.set(key, new MockHbar(value));
            });
        }
        if (data?.transactionId) {
            const [accountId] = data.transactionId.split('@');
            this._transactionId = new MockTransactionId(new MockAccountId(accountId));
        }
    }

    addHbarTransfer(accountId: MockAccountId, amount: MockHbar) {
        this._hbarTransfers.set(accountId.toString(), amount);
        return this;
    }

    setTransactionId(id: MockTransactionId) {
        this._transactionId = id;
        return this;
    }

    setMaxTransactionFee(fee: MockHbar) {
        this._maxFee = fee;
        return this;
    }

    freezeWith(_client?: MockClient) {
        return this;
    }

    get hbarTransfers(): Map<string, MockHbar> {
        return this._hbarTransfers;
    }

    get transactionId() {
        return this._transactionId;
    }

    get maxTransactionFee() {
        return this._maxFee;
    }

    get nodeAccountIds() {
        return this._nodeAccountIds;
    }

    async sign() {
        return this;
    }

    async execute(client: MockClient) {
        // Validate all accounts in the transfer
        for (const [accountId] of this._hbarTransfers) {
            if (!VALID_ACCOUNTS.has(accountId)) {
                throw new Error('INVALID_ACCOUNT_ID');
            }
        }

        return {
            transactionId: this._transactionId,
            getReceipt: async () => ({
                status: { toString: () => 'SUCCESS' }
            })
        };
    }

    toJSON() {
        const hbarTransfers: { [key: string]: string } = {};
        this._hbarTransfers.forEach((value, key) => {
            hbarTransfers[key] = value.toString();
        });

        return {
            hbarTransfers,
            transactionId: this._transactionId?.toString(),
            maxTransactionFee: this._maxFee?.toString(),
            nodeAccountIds: this._nodeAccountIds
        };
    }
}

export class MockAccountId {
    private _id: string;

    constructor(id: string) {
        this._id = id;
    }

    toString() {
        return this._id;
    }

    static fromString(str: string) {
        return new MockAccountId(str);
    }
}

export class MockHbar {
    constructor(private _amount: string) {}

    toString() {
        return this._amount;
    }

    static from(amount: number | string, _unit?: any) {
        return new MockHbar(amount.toString());
    }

    negated() {
        return new MockHbar(`-${this._amount}`);
    }
}

export const mockTransactionToBase64String = (transaction: MockTransferTransaction) => {
    return Buffer.from(JSON.stringify(transaction.toJSON())).toString('base64');
};

export const mockBase64StringToTransaction = (base64: string) => {
    try {
        const data = JSON.parse(Buffer.from(base64, 'base64').toString());
        return new MockTransferTransaction({
            hbarTransfers: data.hbarTransfers,
            transactionId: data.transactionId
        });
    } catch (error) {
        console.error('Error decoding transaction:', error);
        return new MockTransferTransaction();
    }
}; 