"use client"
import { useEffect, useState } from 'react';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@nextui-org/react';
import {Autocomplete, AutocompleteItem} from "@nextui-org/react";
import {Card, CardHeader, CardBody, CardFooter, Divider, Link, Image} from "@nextui-org/react";

type SupportedNetwork = {
    network: Network
    assets: Asset[]
}

type Network = {
    id: number,
    name: string,
    assets: Asset[]
}

type Asset = {
    id: string,
    name: string,
    symbol: string
}

type AssetDetails = {
    id: string,
    minAmount: string,
    name: string,
    symbol: string,
    reserveAmount: string,
    decimals: number
}

type ApproveToken = {
    abi: string,
    amount: string,
    networkId: number,
    spender: string,
    target: string,
    type: string
}

export default function PortingComponent() {
    const [supportedAssets, setSupportedAssets] = useState<SupportedNetwork[]>();
    const [selectedNetworkId, setSelectedNetworkId] = useState<number>();
    const [selectedNetwork, setSelectedNetwork] = useState<SupportedNetwork>();
    const [assets, setAssets] = useState<any>()
    const [selectedAssetId, setSelectedAssetId] = useState<string>();
    const [selectedAsset, setSelectedAsset] = useState<AssetDetails>();
    const [isValid, setIsValid] = useState(false);
    const [minAmount, setMinAmount] = useState();
    const [portingHeader, setPortingHeader] = useState<any>();
    const [approvalStep, setApprovalStep] = useState<ApproveToken>();
    const [lockStep, setLockStep] = useState<ApproveToken>();
    const [portPolling, setPortPolling] = useState<any>();
    const [connectedWallet, setConnectedWallet] = useState<string>();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch("/api/hashport/assets")
                if(response) {
                    const data = await response.json()
                    setSupportedAssets(data.data)
                }
            } catch (error) {
                console.error('Error fetching Supported Assets:', error);
            }
        }
        fetchData()
        connectWallet()
    }, [])

    useEffect(() => {
        if(!supportedAssets) return
        var filteredArray = supportedAssets.filter(item => {
            console.log(item.network.id)
            return item.network.id === selectedNetworkId
        });
        console.log("selected network "+selectedNetworkId)
        console.log(Object.values(filteredArray[0]))
        setSelectedNetwork(filteredArray[0])
        setAssets([filteredArray[0].assets])
    }, [selectedNetworkId, supportedAssets])

    useEffect(() => {
        console.log(supportedAssets)
    }, [supportedAssets])

    async function connectWallet() {
        console.log("connecting wallet")
        //if (window.ethereum) {
            try {
                //const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                //console.log(accounts)
                //setConnectedWallet(accounts[0])
                //return accounts[0]; // This is the connected MetaMask account
            } catch (error) {
                console.error("Error connecting to MetaMask", error);
            }
        //} else {
        //    alert("Please install MetaMask!");
        //}
    }

    async function executeContractFunction() {
        const approveTxId = await approve();
        if (!approveTxId) {
            console.error("Approval failed, stopping execution.");
            return;
        }

        const lockTxId = await lock();
        if (!lockTxId) {
            console.error("Lock failed, stopping execution.");
            return;
        }

            // Assuming you want to poll based on the lock transaction ID
            await poll(lockTxId);
    }

    async function approve() {
        const fromAddress = await connectWallet();
       //const web3 = new Web3(window.ethereum); // Use MetaMask's provider
        if(!approvalStep?.abi) return
        //const contract = new web3.eth.Contract(JSON.parse(approvalStep.abi), approvalStep.target); //approvalStep.target
    
        try {
            let gasEstimate;
            try {
                //gasEstimate = await contract.methods.approve(approvalStep.spender, approvalStep.amount).estimateGas({ from: fromAddress });
            } catch (error) {
                console.error('Gas estimate failed, using fallback gas limit:', error);
                gasEstimate = 5000000
                //return null;
            }    
            console.log(`Sending transaction with gas limit: ${gasEstimate}`);
            //const receipt = await contract.methods.approve(approvalStep.spender, approvalStep.amount)
            //    .send({ from: fromAddress, gas: gasEstimate.toString() });
            //console.log('Transaction receipt:', receipt);
            //return receipt.transactionHash;
        } catch (error) {
            console.error('Error sending transaction:', error);
            return null;
        }
    }

    async function poll(txId: string) {
        if (!portPolling.target) {
            console.error("Polling ABI or contract address is not set");
            return;
        }
        const pollUrl = portPolling.target.replace("{transactionId}", txId);
        try {
            const response = await fetch(pollUrl);
            const data = await response.json();
            console.log('Polling data:', data);
        } catch (error) {
            console.error('Polling error:', error);
        }
    }

    async function lock() {
        const fromAddress = await connectWallet();
        //const web3 = new Web3(window.ethereum); // Use MetaMask's provider
        if(!lockStep?.abi) return null;
        //const contract = new web3.eth.Contract(JSON.parse(lockStep.abi), lockStep.target);
    
        const param1 = "0x128";
        const param2 = lockStep.target;
        const param3 = lockStep.amount;
        //const param4 = web3.utils.asciiToHex("0.0.4372449");

        console.log("Method Data Parameters:", {
            param1,
            param2,
            param3,
            
        });

        try {
            let gasEstimate;
            try {
                //gasEstimate = await contract.methods.transfer("0x128", selectedAssetId, lockStep.amount, web3.utils.asciiToHex("0.0.4372449")).estimateGas({ from: fromAddress });
            } catch (error) {
                console.error('Gas estimate failed, using fallback gas limit:', error);
                gasEstimate = 5000000
                //return null;
            }
            console.log(`Sending transaction with gas limit: ${gasEstimate}`);
            //const receipt = await contract.methods.lock("0x128", selectedAssetId, lockStep.amount, web3.utils.asciiToHex("0.0.4372449"))
               // .send({ from: fromAddress, gas: gasEstimate.toString() });
            //console.log('Transaction receipt:', receipt);
            //return receipt.transactionHash;
        } catch (error) {
            console.error('Error sending transaction:', error);
            return null;
        }
    }

    async function checkMinAmount() {
        const account = await connectWallet();
       // const web3 = new Web3(window.ethereum); // Use MetaMask's provider
        if(!selectedAsset) return
        const tokenAddress = selectedAsset?.id; // The contract address of the token
        const tokenDecimals = selectedAsset?.decimals;
        //const networkId = await web3.eth.net.getId();
        //console.log("Connected to network ID:", networkId);
        console.log("Using account address:", account);
        // You need the ABI for the ERC-20 token, which is standard and can be reused
        //const standardErc20Abi = [{"inputs":[{"internalType":"string","name":"_name","type":"string"},{"internalType":"string","name":"_symbol","type":"string"},{"internalType":"uint8","name":"decimals_","type":"uint8"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[],"name":"DOMAIN_SEPARATOR","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_account","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_account","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"nonces","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"permit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"}]
        const fullErc20Abi = [
            // Full ERC-20 ABI from Etherscan
            {"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},
            // Add other necessary methods here
        ];

        //const tokenContract = new web3.eth.Contract(fullErc20Abi, tokenAddress);
        //console.log("Contract setup with ABI and address:", tokenContract);
        
        try {
            //const balance = await tokenContract.methods.balanceOf(account).call();
            //const balanceAdjusted = Number(balance) / (10 ** tokenDecimals); // Adjust balance based on token decimals

            const minAmountAdjusted = Number(selectedAsset.minAmount) / (10 ** tokenDecimals); // Adjust minAmount based on token decimals

            //console.log(`Fetched balance: ${balance} raw, ${balanceAdjusted} adjusted`);
            console.log(`Required minimum amount: ${selectedAsset.minAmount} raw, ${minAmountAdjusted} adjusted`);

            //if (balanceAdjusted >= minAmountAdjusted) {
           //     console.log("Sufficient funds:", balanceAdjusted);
            //    return true;
            //} else {
            //    console.log("Insufficient funds:", balanceAdjusted);
            //    return false;
            //}
        } catch (error) {
            console.error("Error checking token balance:", error);
            return false;
        }
    }

    const assetDetails = async () => {
        if(!selectedNetworkId || !selectedAssetId) return
        const url = new URL('http://localhost:3000/api/hashport/details/')
        url.searchParams.append('sourceNetworkId', selectedNetworkId.toString());
        url.searchParams.append('sourceAssetId', selectedAssetId);
        try {
            const response = await fetch(url)
            if(response) {
                const data = await response.json()
                console.log(data)
                setMinAmount(data.minAmount)
                setSelectedAsset(data)
            }
        } catch (error) {
            
        } 
    }

    const validateSteps = async () => {
        if(!selectedNetworkId || !selectedAssetId || !minAmount) return
        const isValid = await checkMinAmount()
        if(!isValid) console.log("insufficient funds")
        assetDetails()
        const url = new URL('http://localhost:3000/api/hashport/validate/');
        url.searchParams.append('sourceNetworkId', selectedNetworkId.toString());
        url.searchParams.append('sourceAssetId', selectedAssetId);

        // Hedera testnet
        url.searchParams.append('targetNetworkId', "0x128");
        url.searchParams.append('amount', minAmount); 
        
        // need the user's account ID in state possible from the contract
        url.searchParams.append('recipient', "0.0.4372449");
        try {
            const response = await fetch(url)
            console.log(response)
            setIsValid(response.ok)
        } catch (error) {
            console.error('Error validating Pre-Flight:', error);
        }
    }

    const bridgeAsset = async () => {
        if(!selectedNetworkId || !selectedAssetId || !minAmount) return
        const url = new URL('http://localhost:3000/api/hashport/bridge/');
        url.searchParams.append('sourceNetworkId', selectedNetworkId.toString());
        url.searchParams.append('sourceAssetId', selectedAssetId);

        // Hedera testnet
        url.searchParams.append('targetNetworkId', "0x128");

        // need a quantity input
        url.searchParams.append('amount', minAmount);

        // need the user's account ID in state possible from the contract
        url.searchParams.append('recipient', "0.0.4372449");
        try {
            const response = await fetch(url)
            if(response) {
                const data = await response.json()
                setPortingHeader(data[0])
                setApprovalStep(data[1])
                setLockStep(data[2])
                setPortPolling(data[3])
            }
        } catch (error) {
            console.error('Error validating Pre-Flight:', error);
        }
    }
    
    const onSelectionChange = (id:any) => {
        setSelectedAssetId(id);
    };

    useEffect(() => {
        assetDetails();
    }, [selectedAssetId, assetDetails]) 

    return(
        <>

        <Card className='pr-1'>
        <CardHeader className="flex gap-3">
        <Image
          alt="Port to Hedera"
          height={80}
          radius="sm"
          src="/images/eth-hedera.png"
          width={80}
        />
        <div className="flex flex-col">
          <p className="text-md">Port to Hedera</p>
          <p className="text-small text-default-500">Send your EVM assets to your Hedera<br />account.</p>
        </div>
      </CardHeader>
      <Divider/>
      <CardBody>
            <div style={{marginBottom: "2rem"}}>
                <Dropdown>
                    <DropdownTrigger>
                        <Button 
                        variant="bordered"
                        style={{color:"white"}}
                        aria-label="Select Network"
                        >
                            {selectedNetwork ? (
                                <>
                                    {selectedNetwork.network.name}
                                </>
                            ):(
                                <>
                                    Select Network
                                </>
                            )}
                        </Button>
                    </DropdownTrigger>
                    <DropdownMenu
                        aria-label="Select Network dropdown"
                        items={supportedAssets}
                        onAction={(key) => (
                            setSelectedNetworkId(Number(key))
                        )}
                    >
                        {(item) => (
                            <DropdownItem
                                key={item.network.id}
                        >
                            {item.network.name}
                        </DropdownItem>
                        )}
                    </DropdownMenu>
                </Dropdown>
            </div>
            <div>
                {selectedNetwork && (
                    <Autocomplete
                        defaultItems={Object.values(selectedNetwork.assets)}
                        label="Select Asset"
                        placeholder="Search Assets"
                        onSelectionChange={onSelectionChange}
                    >
                        {(asset) => <AutocompleteItem key={asset.id}>{asset.name}</AutocompleteItem>}
                    </Autocomplete>
                )}
                {selectedNetwork && selectedAssetId && (
                <div style={{marginTop: "2rem"}}>
                {isValid ? (
                    <p>Pre-Flight Check Passed</p>
                ):(
                    <Button onClick={validateSteps}>Pre-Flight Check</Button>
                )}
                
                </div>
            )}
            {isValid && (
                <>
                    {approvalStep ? (
                        <p>Approval Step</p>
                    ):(
                        <Button onClick={bridgeAsset}>Bridge Asset</Button>
                    )}
                    
                </>
            )}
            </div>
            {approvalStep && (
                <div style={{marginBottom: "2rem"}}>
                    <Button onClick={executeContractFunction}>Execute Contract Function</Button>
                </div>
            )}
            </CardBody>
        </Card>
        </>
    )
}
