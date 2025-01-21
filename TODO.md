# TODO List

## Trading/Backend

- [✓] Implement Token to Token trading (manual and thresholds)
- [✓] Implement Token to HBAR trading (manual and thresholds)
- [ ] Apply slippage tolerance to threshold execution
  - [ ] Pass slippageBasisPoints to contract executeTradeForUser
  - [ ] Update contract to handle slippage protection
  - [ ] Add slippage validation in threshold execution
- [✓] Implement and test auto-trading with thresholds
  - [✓] Configure wallet holding NFTs for gas fees
  - [✓] Set up trading parameters
  - [✓] Test threshold triggers

## Frontend Tasks

- [✓] Add configurable slippage tolerance to DEX
  - [✓] Add slippage settings UI (typical range 0.1% - 5%)
  - [✓] Implement slippage calculations in trade execution
  - [ ] Add user warnings for high slippage settings
- [✓] setup feedback form for supabase or vercel form if they have that
- [✓] Update threshold UI for 0.08% fee
  - [ ] Add fee display in threshold setup
  - [ ] Update amount calculations to account for fee
  - [ ] Add fee explanation tooltip/documentation
  - [ ] Add total cost breakdown (SaucerSwap fee + threshold fee)
- [✓] add logic to calc trade amount / recieve amount when either is changed
- [✓] Clean up price chart styling
- [✓] Set up user feedback UI
- [✓] Add token balance display
- [✓] Setting default coin on dex to HBAR
- [✓] require pool selection to set fee for new thresholds
- [✓] use token icons to make clear input/output for trades and thresholds
- [✓] add "max" button to input fields from wallet balance
- [✓] Fix IPFS integration for Hashpack image loading
- [✓] fix bug on threshold tab: Error: Cell count must match column count. Found 1 cells and 8 columns.

## Documentation

- [✓] Document wallet setup process
- [✓] Add technical documentation for developers
- [ ] Update README with new features

## =========> Pre-Launch Tasks (Closed Alpha)

## Critical Path

- [ ] Migrate to mainnet
  - [ ] Deploy threshold contract to mainnet
  - [ ] Deploy NFT contract to mainnet
  - [ ] Update environment variables
  - [ ] Mint NFTs on mainnet
- [ ] Activate worker service on heroku
- [ ] deploy json rpc to heroku (if/where needed)

## Admin Tasks

- [ ] move hosting to Jason as owner for client and worker service
- [ ] Get SAFE (or other) agreement in place and signed for Kevin

## NFT Related

- [ ] Enhance NFT visual styling
- [ ] Fix/remove NFT purchase button on LP page
- [ ] Update LP counter to reflect NFTs in operator wallet

## User Testing

- [✓] test auth/register
- [✓] Test NFT purchase flow
- [✓] Test manual trading flow
- [ ] Test auto-trading flow 

## Possible bugs (need testing from new users)

- [ ] Possible bug: signature request should not trigger for existing users in DB
- [ ] possible QOL improvement: Add automatic token association when setting thresholds
    - [ ] Check token associations before setting thresholds
    - [ ] Associate tokens if needed
    - [ ] Handle association fees
    - [ ] Add error handling for failed associations
    - [ ] Add user feedback during association process
    - [ ] Consider gas fees for multiple associations

## NFT tier based reward system

- [ ] Define tiers that would unlock features / free membership length
- [ ] Define rewards for testing / social / referral tasks
- [ ] updated image designs to match the tiered system
- [ ] updated NFT contract logic to support the tiered system

## =========> Etc.

## Future Roadmap

- [ ] Token rollout for tokenized index and governance
- [ ] Research and evaluate custom bridge solution
- [ ] Alternative: get hashport working
- [ ] LP staking for single token with auto pair matching

## Production Readiness Tasks

- [✓] Make fee calculations fully dynamic
  - [✓] Update getQuoteExactInput to use dynamic decimals
  - [ ] Add fee validation checks
  - [ ] Add fee bounds checking
  - [ ] Add fee documentation

- [ ] Improve network configuration
  - [ ] Create network configuration file
  - [ ] Make client network dynamic based on env
  - [ ] Add network validation checks
  - [ ] Add network switching support

- [ ] Optimize gas handling
  - [ ] Implement dynamic gas estimation
  - [ ] Add gas price monitoring
  - [ ] Add gas limit safety bounds
  - [ ] Add gas price alerts for admin

- [ ] Contract configuration improvements
  - [ ] Move contract addresses to config file
  - [ ] Add address validation
  - [ ] Add network-specific address mapping
  - [ ] Add contract version checking

- [ ] Add production safety checks
  - [ ] Implement input validation throughout
  - [ ] Add transaction amount limits
  - [ ] Add rate limiting
  - [ ] Add error monitoring integration
  - [ ] Add automated testing for edge cases
  - [ ] Add transaction simulation before execution
  - [ ] Add emergency pause functionality

- [ ] Performance optimization
  - [ ] Implement request caching
  - [ ] Add request batching
  - [ ] Optimize API calls
  - [ ] Add performance monitoring

- [ ] Security enhancements
  - [ ] Add comprehensive input sanitization
  - [ ] Implement rate limiting
  - [ ] Add transaction signing validation
  - [ ] Add admin access controls
  - [ ] Add security monitoring integration

## Swap Improvements

- [ ] add trade direction switch option

### Add Quote Support for Token->HBAR Swaps

- [ ] Add Quoter contract address to environment variables
- [ ] Implement quote functionality similar to SaucerSwap UI
- [ ] Use quote to calculate minimum output with slippage
- [ ] Add proper error handling for "too little amount" errors
- [ ] Test with various input amounts to verify minimum thresholds
- [ ] Add debug logging for quote results

Reference: Test implementation in `tokenToHbar.test.ts` (lines 152-159) shows minimum output of 11 HBAR for 10,000 SAUCE

