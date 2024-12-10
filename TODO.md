# TODO List

## Critical Path
- [ ] Migrate to mainnet
  - [ ] Deploy threshold contract to mainnet
  - [ ] Deploy NFT contract to mainnet
  - [ ] Update environment variables
  - [ ] Mint NFTs on mainnet
- [✓] Fix IPFS integration for Hashpack image loading

## NFT Related
- [ ] Enhance NFT visual styling
- [ ] Fix/remove NFT purchase button on LP page
- [ ] Update LP counter to reflect NFTs in operator wallet

## Trading/Backend
- [✓] Implement and test auto-trading with thresholds
  - [✓] Configure wallet holding NFTs for gas fees
  - [✓] Set up trading parameters
  - [✓] Test threshold triggers
- [ ] Implement Token to Token trading (manual and thresholds)
- [ ] Implement Token to HBAR trading (manual and thresholds)

## Frontend Tasks
- [✓] Set up user feedback UI
- [ ] Add token balance display
- [ ] Clean up price chart styling
- [ ] Setting default coin on dex to HBAR
- [ ] require pool selection to set fee for new thresholds
- [ ] use token icons to make clear input/output for trades and thresholds
- [ ] add "max" button to input fields from wallet balance
- [ ] either activate the reverse (buy) field or remove it (depending on the pool functionality)

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

## Documentation
- [ ] Document wallet setup process
- [ ] Add technical documentation for developers
- [ ] Update README with new features

## NFT tier based reward system
- [ ] Define tiers that would unlock features / free membership length
- [ ] Define rewards for testing / social / referral tasks
- [ ] updated image designs to match the tiered system
- [ ] updated NFT contract logic to support the tiered system

## Future Roadmap (Cross-chain Integration)
- [ ] Research and evaluate custom bridge solution
- [ ] Alternative: get hashport working
- [ ] Integrate LP staking for single token
- [ ] Token rollout with unique functionality: ie for staking, governance, voting, etc.
- [ ] Index of tokens staking ot for token rollout (tokenized index)