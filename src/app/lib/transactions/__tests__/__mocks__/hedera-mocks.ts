export class MockTransferTransaction {
    private _hbarTransfers: Map<string, MockHbar>;
    private _transactionId: string | null;
    private _maxFee: string | null;

    constructor(data?: { hbarTransfers?: { [key: string]: string }, transactionId?: string }) {
        this._hbarTransfers = new Map();
        this._transactionId = null;
        this._maxFee = null;

        if (data?.hbarTransfers) {
            Object.entries(data.hbarTransfers).forEach(([key, value]) => {
                this._hbarTransfers.set(key, new MockHbar(value));
            });
        }
        if (data?.transactionId) {
            this._transactionId = data.transactionId;
        }
    }

    addHbarTransfer(accountId: any, amount: MockHbar) {
        this._hbarTransfers.set(accountId.toString(), amount);
        return this;
    }

    setTransactionId(id: any) {
        this._transactionId = id.toString();
        return this;
    }

    setMaxTransactionFee(fee: any) {
        this._maxFee = fee.toString();
        return this;
    }

    freezeWith(_client?: any) {
        return this;
    }

    get hbarTransfers(): Map<string, MockHbar> {
        return this._hbarTransfers;
    }

    get transactionId() {
        return { toString: () => this._transactionId };
    }

    async sign() {
        return this;
    }

    async execute() {
        return {
            transactionId: { toString: () => this._transactionId },
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
            transactionId: this._transactionId
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

    static from(amount: number, _unit?: any) {
        return new MockHbar(amount.toString());
    }

    negated() {
        return new MockHbar(`-${this._amount}`);
    }
}

export class MockTransactionId {
    static generate(accountId: any) {
        return {
            toString: () => `${accountId.toString()}@${Date.now()}`
        };
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