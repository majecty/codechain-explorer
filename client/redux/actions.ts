export interface RootState {
    isNodeAlive?: boolean;
    bestBlockNumber?: number;
    blocksByNumber: {
        [n: number]: any;
    };
    blocksByHash: {
        [hash: string]: any;
    };
    blockHashesByNumber: {
        [n: number]: string;
    };
    parcelByHash: {
        [hash: string]: any;
    };
    transactionInvoicesByHash: {
        [hash: string]: any;
    };
    accountsByAddress: {
        [address: string]: {
            nonce: any;
            balance: any;
        }
    };
    assetSchemeByTxhash: {
        [txhash: string]: any
    };
    pendingParcels: {
        [hash: string]: any;
    };
}

const initialState = {
    isNodeAlive: undefined,
    bestBlockNumber: undefined,
    blocksByNumber: {},
    blocksByHash: {},
    blockHashesByNumber: {},
    parcelByHash: {},
    transactionInvoicesByHash: {},
    accountsByAddress: {},
    assetSchemeByTxhash: {},
    pendingParcels: {},
} as RootState;

export const rootReducer = (state = initialState, action: any) => {
    const update = action.getUpdate ? action.getUpdate(state) : {};
    return {
        ...state,
        ...update
    };
};
