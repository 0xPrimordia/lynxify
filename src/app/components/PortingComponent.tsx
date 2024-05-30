"use client"
import { useEffect, useState } from 'react';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@nextui-org/react';
import {Autocomplete, AutocompleteItem} from "@nextui-org/react";
import Web3, { ContractAbi } from 'web3';

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
    const [isValid, setIsValid] = useState(false);
    const [minAmount, setMinAmount] = useState();
    const [portingHeader, setPortingHeader] = useState<any>();
    const [approvalStep, setApprovalStep] = useState<ApproveToken>();
    const [lockStep, setLockStep] = useState<ApproveToken>();
    const [portPolling, setPortPolling] = useState<any>();


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
    }, [selectedNetworkId])

    useEffect(() => {
        console.log(supportedAssets)
    }, [supportedAssets])

    async function connectWallet() {
        console.log("connecting wallet")
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                console.log(accounts)
                return accounts[0]; // This is the connected MetaMask account
            } catch (error) {
                console.error("Error connecting to MetaMask", error);
            }
        } else {
            alert("Please install MetaMask!");
        }
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
        const web3 = new Web3(window.ethereum); // Use MetaMask's provider
        if(!approvalStep?.abi) return
        const contract = new web3.eth.Contract(JSON.parse(approvalStep.abi), approvalStep.target);
    
        try {
            let gasEstimate;
            try {
                gasEstimate = await contract.methods.approve(approvalStep.spender, approvalStep.amount).estimateGas({ from: fromAddress });
            } catch (error) {
                console.error('Gas estimate failed, using fallback gas limit:', error);
                gasEstimate = 5000000
                //return null;
            }    
            console.log(`Sending transaction with gas limit: ${gasEstimate}`);
            const receipt = await contract.methods.approve(approvalStep.spender, approvalStep.amount)
                .send({ from: fromAddress, gas: gasEstimate.toString() });
            console.log('Transaction receipt:', receipt);
            return receipt.transactionHash;
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
        const web3 = new Web3(window.ethereum); // Use MetaMask's provider
        if(!lockStep?.abi) return null;
        const contract = new web3.eth.Contract(JSON.parse(lockStep.abi), lockStep.target);
    
        const param1 = "0x128";
        const param2 = lockStep.target;
        const param3 = lockStep.amount;
        const param4 = web3.utils.asciiToHex("0.0.4372449");

        console.log("Method Data Parameters:", {
            param1,
            param2,
            param3,
            param4
        });

        try {
            let gasEstimate;
            try {
                gasEstimate = await contract.methods.lock(param1, param2, param3, param4).estimateGas({ from: fromAddress });
            } catch (error) {
                console.error('Gas estimate failed, using fallback gas limit:', error);
                gasEstimate = 5000000
                //return null;
            }
            console.log(`Sending transaction with gas limit: ${gasEstimate}`);
            const receipt = await contract.methods.lock("0x128", lockStep.target, lockStep.amount, web3.utils.asciiToHex("0.0.4372449"))
                .send({ from: fromAddress, gas: gasEstimate.toString() });
            console.log('Transaction receipt:', receipt);
            return receipt.transactionHash;
        } catch (error) {
            console.error('Error sending transaction:', error);
            return null;
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
            }
        } catch (error) {
            
        } 
    }

    const validateSteps = async () => {
        if(!selectedNetworkId || !selectedAssetId || !minAmount) return
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
    }, [selectedAssetId])

    return(
        <>
        <div style={{marginBottom: "2rem"}}>
            <Button onClick={connectWallet}>Connect Wallet</Button>
        </div>
        <div style={{marginBottom: "2rem"}}>
            <Button onClick={executeContractFunction}>Execute Contract Function</Button>
        </div>
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
                    style={{color:"black"}} 
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
                    {(asset) => <AutocompleteItem style={{color:"black"}} key={asset.id}>{asset.name}</AutocompleteItem>}
                </Autocomplete>
            )}
        </div>
        {selectedNetwork && selectedAssetId && (
            <>
            {isValid ? (
                <p>Pre-Flight Check Passed</p>
            ):(
                <Button onClick={validateSteps}>Pre-Flight Check</Button>
            )}
               
            </>
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
        </>
    )
}
