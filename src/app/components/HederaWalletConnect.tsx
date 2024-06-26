import { ethers } from "ethers";
const network = "testnet";

async function walletConnectFcn() {

	// ETHERS PROVIDER - !!updated for new version but didn't double check docs!!
	//const provider = new ethers.BrowserProvider(window.ethereum);

	// SWITCH TO HEDERA TEST NETWORK
	console.log(`- Switching network to the Hedera ${network}...🟠`);
	let chainId;
	if (network === "testnet") {
		chainId = "0x128";
	} else if (network === "previewnet") {
		chainId = "0x129";
	} else {
		chainId = "0x127";
	}

	/*await window.ethereum.request({
		method: "wallet_addEthereumChain",
		params: [
			{
				chainName: `Hedera ${network}`,
				chainId: chainId,
				nativeCurrency: { name: "Hedera", symbol: "HBAR", decimals: 8 },
				rpcUrls: [`https://${network}.hashio.io/api`],
				blockExplorerUrls: [`https://hashscan.io/${network}/`],
			},
		],
	});
	console.log("- Switched ✅"); */

	// CONNECT TO ACCOUNT
	console.log("- Connecting wallet...🟠");
	let selectedAccount;
	/*await provider
		.send("eth_requestAccounts", [])
		.then((accounts) => {
			selectedAccount = accounts[0];
			console.log(`- Selected account: ${selectedAccount} ✅`);
		})
		.catch((connectError) => {
			console.log(`- ${connectError.message.toString()}`);
			return;
		});

	return [selectedAccount, provider, network]; */
}

export default walletConnectFcn;