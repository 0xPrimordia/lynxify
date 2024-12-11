# TODO List

## Trading/Backend
- [✓] Implement and test auto-trading with thresholds
  - [✓] Configure wallet holding NFTs for gas fees
  - [✓] Set up trading parameters
  - [✓] Test threshold triggers
- [ ] Implement Token to Token trading (manual and thresholds)
- [ ] Implement Token to HBAR trading (manual and thresholds)

## Frontend Tasks
- [✓] Set up user feedback UI
- [✓] Add token balance display
- [ ] Clean up price chart styling
- [✓] Setting default coin on dex to HBAR
- [✓] require pool selection to set fee for new thresholds
- [✓] use token icons to make clear input/output for trades and thresholds
- [✓] add "max" button to input fields from wallet balance
- [ ] add logic to calc trade amount / recieve amount when either is changed
- [✓] Fix IPFS integration for Hashpack image loading

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






## Future Roadmap
- [ ] Token rollout for tokenized index and governance
- [ ] Research and evaluate custom bridge solution
- [ ] Alternative: get hashport working
- [ ] LP staking for single token with auto pair matching