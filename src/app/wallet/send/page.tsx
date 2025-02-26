'use client';

import { useState, useEffect } from 'react';
import { useInAppWallet } from '@/app/contexts/InAppWalletContext';
import { TransferTransaction, AccountId, Hbar, TokenId, HbarUnit, Client, TransactionId } from '@hashgraph/sdk';
import { transactionToBase64String, SignAndExecuteTransactionParams } from '@hashgraph/hedera-wallet-connect';
import { handleInAppTransaction } from '@/app/lib/transactions/inAppWallet';
import { handleExtensionTransaction } from '@/app/lib/transactions/extensionWallet';
import { useSupabase } from '@/app/hooks/useSupabase';
import { AccountBalanceQuery } from '@hashgraph/sdk';

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
  const { inAppAccount, signTransaction, setPasswordModalContext, walletType } = useInAppWallet();
  const { supabase } = useSupabase();

  useEffect(() => {
    const fetchBalances = async () => {
      if (!inAppAccount) return;

      try {
        // Query account balance
        const accountId = AccountId.fromString(inAppAccount);
        const query = new AccountBalanceQuery().setAccountId(accountId);
        const balance = await query.execute(client);

        // Start with HBAR - remove ℏ symbol and convert to string
        const hbarBalance = balance.hbars.toTinybars().toString();
        const hbarBalanceInHbar = (Number(hbarBalance) / 100_000_000).toString(); // Convert from tinybars to HBAR
        
        const tokenBalances: TokenBalance[] = [{
          id: 'HBAR',
          symbol: 'HBAR',
          balance: hbarBalanceInHbar,
          decimals: 8,
          isHbar: true
        }];

        // Add token balances
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
        // Set initial selected token with correct balance
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
    console.log('Submit handler called');
    e.preventDefault();
    e.stopPropagation();
    
    if (!inAppAccount) {
      setError('Wallet not connected');
      return;
    }

    console.log('Past initial checks');  // Debug log
    setError(null);
    setIsLoading(true);

    try {
      // Validate recipient format
      try {
        AccountId.fromString(recipient);
      } catch {
        throw new Error('Invalid Hedera account ID format');
      }

      // Validate amount
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Invalid amount');
      }
      if (numAmount > parseFloat(selectedToken.balance)) {
        throw new Error('Insufficient balance');
      }

      // Create appropriate transaction based on token type
      let transaction;
      if (selectedToken.isHbar) {
        transaction = new TransferTransaction()
          .addHbarTransfer(inAppAccount, new Hbar(-numAmount))
          .addHbarTransfer(recipient, new Hbar(numAmount))
          .setTransactionId(TransactionId.generate(inAppAccount))
          .freezeWith(client);
      } else {
        const tokenAmount = Math.floor(numAmount * Math.pow(10, selectedToken.decimals));
        transaction = new TransferTransaction()
          .addTokenTransfer(TokenId.fromString(selectedToken.id), inAppAccount, -tokenAmount)
          .addTokenTransfer(TokenId.fromString(selectedToken.id), recipient, tokenAmount)
          .setTransactionId(TransactionId.generate(inAppAccount))
          .freezeWith(client);
      }

      const encodedTx = transactionToBase64String(transaction);

      if (walletType === 'inApp') {
        await new Promise((resolve, reject) => {
          handleInAppTransaction(
            encodedTx,
            signTransaction,
            (context) => setPasswordModalContext({
              isOpen: true,
              transaction: encodedTx,
              description: context.description,
              transactionPromise: new Promise((res, rej) => {
                resolve(res);
                reject(rej);
              })
            })
          );
        });
      } else {
        await handleExtensionTransaction(
          encodedTx,
          inAppAccount,
          (params: SignAndExecuteTransactionParams) => signTransaction(params.transactionList, '')
        );
      }

      setAmount('');
      setRecipient('');
      // Refresh balances after successful transfer
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingBalances) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="text-white">Loading balances...</div>
      </div>
    );
  }

  return (
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
          <div className="p-4 bg-red-900/50 border border-red-800 text-red-200 rounded-lg">
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
  );
} 