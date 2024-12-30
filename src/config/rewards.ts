export const TESTNET_REWARDS = {
  TASKS: {
    CONNECT_WALLET: {
      id: 'connect_wallet',
      xp: 50,
      description: 'Connect your wallet to the platform'
    },
    PURCHASE_NFT: {
      id: 'purchase_nft',
      xp: 200,
      description: 'Purchase access NFT'
    },
    FIRST_TRADE: {
      id: 'first_trade',
      xp: 150,
      description: 'Complete your first trade'
    },
    SET_THRESHOLD: {
      id: 'set_threshold',
      xp: 100,
      description: 'Set up your first trading threshold'
    },
    EXECUTE_THRESHOLD: {
      id: 'execute_threshold',
      xp: 300,
      description: 'Have a threshold successfully execute'
    },
    REPORT_BUG: {
      id: 'report_bug',
      xp: 50,
      description: 'Report a verified bug'
    }
  },
  NFT_COST: 1600,
  NETWORK_MAX_XP: 800, // Maximum XP earnable per network (testnet/mainnet)
  // Remove levels since we're using direct XP tracking
}; 