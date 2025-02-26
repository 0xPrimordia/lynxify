'use client';

import { useState, useEffect } from 'react';
import { useInAppWallet } from '@/app/contexts/InAppWalletContext';
import { TransferTransaction, AccountId, Hbar, TokenId, HbarUnit, Client, TransactionId } from '@hashgraph/sdk';
import { transactionToBase64String, SignAndExecuteTransactionParams, base64StringToTransaction } from '@hashgraph/hedera-wallet-connect';
import { handleInAppTransaction, handleInAppPasswordSubmit } from '@/app/lib/transactions/inAppWallet';
import { handleExtensionTransaction } from '@/app/lib/transactions/extensionWallet';
import { useSupabase } from '@/app/hooks/useSupabase';
import { AccountBalanceQuery } from '@hashgraph/sdk';
import { usePasswordModal } from '@/app/hooks/usePasswordModal';
import { PasswordModal } from '@/app/components/PasswordModal';

const client = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' 
  ? Client.forMainnet() 
  : Client.forTestnet();

interface TokenBalance {
  id: string;
  symbol: string;
  balance: string;
  decimals: number;
  isHbar?: boolean;
}

export default function SendPage() {
  const [selectedToken, setSelectedToken] = useState<TokenBalance>({
    id: 'HBAR',
    symbol: 'HBAR',
    balance: '0',
    decimals: 8,
    isHbar: true
  });
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState(true);
  const { inAppAccount, signTransaction, walletType, isInAppWallet } = useInAppWallet();
  const { supabase } = useSupabase();
  const { 
    password, 
    setPassword, 
    passwordModalContext, 
    setPasswordModalContext,
    resetPasswordModal 
  } = usePasswordModal();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchBalances = async () => {
      if (!inAppAccount) return;

      try {
        const accountId = AccountId.fromString(inAppAccount);
        const query = new AccountBalanceQuery().setAccountId(accountId);
        const balance = await query.execute(client);

        const hbarBalance = balance.hbars.toTinybars().toString();
        const hbarBalanceInHbar = (Number(hbarBalance) / 100_000_000).toString();
        
        const tokenBalances: TokenBalance[] = [{
          id: 'HBAR',
          symbol: 'HBAR',
          balance: hbarBalanceInHbar,
          decimals: 8,
          isHbar: true
        }];

        if (balance.tokens) {
          for (const [tokenId, amount] of balance.tokens) {
            try {
              const response = await fetch(
                `https://${process.env.NEXT_PUBLIC_HEDERA_NETWORK}.mirrornode.hedera.com/api/v1/tokens/${tokenId}`
              );
              const tokenData = await response.json();
              
              if (tokenData.type !== 'FUNGIBLE') continue;

              tokenBalances.push({
                id: tokenId.toString(),
                symbol: tokenData.symbol,
                balance: (Number(amount) / Math.pow(10, tokenData.decimals)).toString(),
                decimals: tokenData.decimals
              });
            } catch (err) {
              console.error(`Error fetching token ${tokenId} data:`, err);
            }
          }
        }

        setTokens(tokenBalances);
        setSelectedToken(tokenBalances[0]);
      } catch (err) {
        console.error('Error fetching balances:', err);
        setError('Failed to load balances');
      } finally {
        setIsLoadingBalances(false);
      }
    };

    fetchBalances();
  }, [inAppAccount]);

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[SendPage] Starting submit handler with values:', { recipient, amount, selectedToken });
    
    if (!inAppAccount) {
        console.error('[SendPage] No wallet connected');
        setError('Wallet not connected');
        return;
    }

    setError(null);
    setIsLoading(true);

    try {
        console.log('[SendPage] Validating inputs');
        try {
            AccountId.fromString(recipient);
        } catch (err) {
            console.error('[SendPage] Invalid account ID:', err);
            setIsLoading(false);
            setError('Invalid Hedera account ID format');
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            console.error('[SendPage] Invalid amount:', amount);
            setIsLoading(false);
            setError('Invalid amount');
            return;
        }
        if (numAmount > parseFloat(selectedToken.balance)) {
            console.error('[SendPage] Insufficient balance:', { amount: numAmount, balance: selectedToken.balance });
            setIsLoading(false);
            setError('Insufficient balance');
            return;
        }

        console.log('[SendPage] Creating transaction');
        let transaction;
        if (selectedToken.isHbar) {
            // Create transfer with explicit AccountId objects and proper validation
            const senderAccountId = AccountId.fromString(inAppAccount);
            const recipientAccountId = AccountId.fromString(recipient);
            
            console.log('[SendPage] Account details:', {
                sender: senderAccountId.toString(),
                recipient: recipientAccountId.toString(),
                amount: numAmount
            });
            
            // Create the transaction with more explicit steps
            const transferTx = new TransferTransaction();
            
            // Convert amount to tinybars
            const hbarAmount = new Hbar(numAmount);
            
            // Add transfers with proper Hbar conversion
            console.log('[SendPage] Adding sender transfer');
            transferTx.addHbarTransfer(senderAccountId, hbarAmount.negated());
            
            console.log('[SendPage] Adding recipient transfer');
            transferTx.addHbarTransfer(recipientAccountId, hbarAmount);
            
            console.log('[SendPage] Setting transaction parameters');
            transferTx
                .setTransactionId(TransactionId.generate(senderAccountId))
                .setMaxTransactionFee(new Hbar(2));
            
            console.log('[SendPage] Freezing transaction');
            transaction = await transferTx.freezeWith(client);
                
            console.log('[SendPage] Transaction details:', {
                transactionId: transaction.transactionId?.toString(),
                nodeAccountIds: transaction.nodeAccountIds?.map(id => id.toString()),
                transfers: JSON.stringify(transaction.hbarTransfers),
                maxFee: transaction.maxTransactionFee?.toString()
            });
        } else {
            // Token transfer case
            const tokenAmount = Math.floor(numAmount * Math.pow(10, selectedToken.decimals));
            const transferTx = new TransferTransaction()
                .addTokenTransfer(TokenId.fromString(selectedToken.id), AccountId.fromString(inAppAccount), -tokenAmount)
                .addTokenTransfer(TokenId.fromString(selectedToken.id), AccountId.fromString(recipient), tokenAmount)
                .setTransactionId(TransactionId.generate(AccountId.fromString(inAppAccount)))
                .setMaxTransactionFee(new Hbar(2));

            console.log('[SendPage] Created token transaction');
            transaction = await transferTx.freezeWith(client);
        }

        console.log('[SendPage] Encoding transaction');
        const encodedTx = transactionToBase64String(transaction);

        console.log('[SendPage] Executing transaction');
        const result = await executeTransaction(encodedTx, `Send ${amount} ${selectedToken.symbol} to ${recipient}`);
        console.log('[SendPage] Transaction execution result:', result);

        // Only clear form if we get a successful result
        if (result?.status === 'SUCCESS') {
            setAmount('');
            setRecipient('');
            console.log('[SendPage] Transaction successful, form cleared');
        } else {
            console.error('[SendPage] Transaction failed:', result);
            setError('Transaction failed. Please try again.');
        }
        
    } catch (err: any) {
        console.error('[SendPage] Error in submit handler:', err);
        setError(err.message || 'Transaction failed. Please try again.');
    } finally {
        setIsLoading(false);
    }
  };

  const executeTransaction = async (tx: string, description: string) => {
    console.log('[SendPage] Starting executeTransaction');
    if (!inAppAccount) throw new Error("No active account");
    
    console.log('[SendPage] Wallet type check:', { walletType, isInAppWallet });
    
    if (isInAppWallet) {
        console.log('[SendPage] Handling inApp transaction');
        return handleInAppTransaction(
            tx,
            signTransaction,
            setPasswordModalContext
        );
    } else {
        console.log('[SendPage] Handling extension transaction');
        return handleExtensionTransaction(
            tx, 
            inAppAccount,
            (params: SignAndExecuteTransactionParams) => signTransaction(params.transactionList, '')
        );
    }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordModalContext.transaction || !passwordModalContext.transactionPromise) return;
    
    setIsSubmitting(true);
    try {
      const result = await handleInAppPasswordSubmit(
        passwordModalContext.transaction,
        password,
        signTransaction,
        setPasswordModalContext
      );
      
      if (result.status === 'SUCCESS') {
        passwordModalContext.transactionPromise.resolve(result);
        setAmount('');
        setRecipient('');
        resetPasswordModal();
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
    } catch (error: any) {
      setError(error.message === 'OperationError' ? 'Invalid password. Please try again.' : error.message);
      if (error.message === 'OperationError') {
        setIsSubmitting(false);
        setIsLoading(false);
        return;
      }
      resetPasswordModal();
    }
    
    setIsSubmitting(false);
    setIsLoading(false);
  };

  if (isLoadingBalances) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="text-white">Loading balances...</div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Send Tokens</h1>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Token
            </label>
            <div className="grid grid-cols-2 gap-4">
              {tokens.map((token) => (
                <button
                  key={token.id}
                  type="button"
                  onClick={() => setSelectedToken(token)}
                  className={`p-4 rounded-lg border ${
                    selectedToken.id === token.id
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-700 hover:border-gray-600'
                  } text-left transition-colors`}
                >
                  <div className="font-medium text-white">{token.symbol}</div>
                  <div className="text-sm text-gray-400">
                    Balance: {parseFloat(token.balance).toFixed(4)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Recipient Account ID
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0.0.123456"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Amount ({selectedToken.symbol})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="any"
              min="0"
              max={selectedToken.balance}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="mt-1 text-sm text-gray-400">
              Available: {parseFloat(selectedToken.balance).toFixed(4)} {selectedToken.symbol}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-900/50 border border-red-800 text-red-200 rounded-lg" role="alert">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
      <PasswordModal
        context={passwordModalContext}
        password={password}
        setPassword={setPassword}
        onSubmit={handlePasswordSubmit}
        setContext={setPasswordModalContext}
        isSubmitting={isSubmitting}
      />
    </>
  );
} 