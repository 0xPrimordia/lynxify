# TODO List

## Trading/Backend
- [ ] Implement Token to Token trading (manual and thresholds)
- [ ] Implement Token to HBAR trading (manual and thresholds)
- [✓] Implement and test auto-trading with thresholds
  - [✓] Configure wallet holding NFTs for gas fees
  - [✓] Set up trading parameters
  - [✓] Test threshold triggers

## Frontend Tasks
- [ ] setup feedback form for supabase or vercel form if they have that
- [ ] Update threshold UI for 0.08% fee
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
- [ ] Document wallet setup process
- [ ] Add technical documentation for developers
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
- [ ] test auth/register
- [ ] Test NFT purchase flow
- [ ] Test manual trading flow
- [ ] Test auto-trading flow 

## Possible bugs (need testing from new users)
- [ ] Possible bug: signature request should not trigger for existing users in DB
- [ ] possible QOL improvement: Add automatic token association when setting thresholds
    - [ ] Check token associations before setting thresholds
    - [ ] Associate tokens if needed
    - [ ] Handle association fees

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