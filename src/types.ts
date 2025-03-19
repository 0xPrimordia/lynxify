export type SwapResult = {
  type: 'swap' | 'approve' | 'associate';
  tx: string;
  transactionId?: string;
}; 