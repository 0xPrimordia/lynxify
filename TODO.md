# TODO List

## Critical Path
- [ ] Migrate to mainnet
  - [ ] Deploy contracts to mainnet
  - [ ] Update environment variables
  - [ ] Configure mainnet endpoints
- [ ] Fix IPFS integration for Hashpack image loading
- [ ] Fix signature request for existing users in DB

## NFT Related
- [ ] Test NFT purchase flow
- [ ] Enhance NFT visual styling
- [ ] Fix/remove NFT purchase button on LP page
- [ ] Mint remaining NFTs
- [ ] Update LP counter to reflect NFTs in operator wallet

## Trading/Backend
- [✓] Implement and test auto-trading with thresholds
  - [✓] Configure wallet holding NFTs for gas fees
  - [✓] Set up trading parameters
  - [✓] Test threshold triggers
  - [ ] Add automatic token association when setting thresholds
    - [ ] Check token associations before setting thresholds
    - [ ] Associate tokens if needed
    - [ ] Handle association fees
- [ ] Implement Token to Token trading (manual and thresholds)

## Frontend Tasks
- [ ] Set up user feedback UI
- [ ] Add token balance display
- [ ] Clean up price chart styling
- [ ] Setting default coin on dex to HBAR
- [ ] require pool selection to set fee for new thresholds
- [ ] use token icons to make clear input/output for trades and thresholds
- [ ] add "max" button to input fields from wallet balance
- [ ] either activate the reverse (buy) field or remove it (depending on the pool functionality)

## Testing
- [✓] Perform security audit of wallet functions
- [ ] Test NFT purchase flow
- [✓] Test auto-trading functionality

## Documentation
- [ ] Document wallet setup process
- [ ] Add technical documentation for developers
- [ ] Update README with new features

## Future Roadmap (Cross-chain Integration)
- [ ] Research and evaluate custom bridge solution
- [ ] Design token bridge architecture
- [ ] Implement Base L2 connection
- [ ] Create token bridge UI components
- [ ] Add network switching functionality (Hedera ↔ Base)
- [ ] Configure Hashport integration
- [ ] Implement token approval flow
- [ ] Set up Base testnet environment
- [ ] Test cross-chain transactions
- [ ] Create user guide for bridging tokens