"use client";
import { VT323 } from "next/font/google";
import { Button, Navbar, NavbarContent, NavbarItem, NavbarBrand, Link, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@nextui-org/react";
import { useWalletContext } from "../hooks/useWallet";
import { useNFTGate } from "../hooks/useNFTGate";
import PurchaseNFT from "./purchaseNFT";
import { useState, useEffect } from "react";
import { AccountBalanceQuery } from "@hashgraph/sdk";

const vt323 = VT323({ weight: "400", subsets: ["latin"] })

const Header = () => {
    const { handleConnect, handleDisconnectSessions, account, client } = useWalletContext();
    const { hasAccess, isLoading } = useNFTGate(account);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [balance, setBalance] = useState<string>("0");

    useEffect(() => {
        if (account !== "") {
            setIsConnected(true);
            
            const fetchBalance = async () => {
                try {
                    // Create a new query with retry logic
                    const query = new AccountBalanceQuery()
                        .setAccountId(account)
                        .setMaxAttempts(3)  // Retry up to 3 times
                        .setMaxBackoff(5000); // Max 5 seconds between retries
                    
                    // Execute with fallback nodes if needed
                    const accountBalance = await query.execute(client);
                    const hbarBalance = accountBalance.hbars.toString();
                    setBalance(parseFloat(hbarBalance).toFixed(2));
                } catch (error) {
                    console.warn("Balance fetch failed, using cached value:", error);
                    // Don't reset balance to 0 on temporary errors
                    // Only reset if we don't have a previous value
                    if (balance === "0") {
                        setBalance("0");
                    }
                }
            };

            // Initial fetch
            fetchBalance();

            // Set up periodic refresh
            const refreshInterval = setInterval(fetchBalance, 30000); // Refresh every 30 seconds

            return () => clearInterval(refreshInterval);
        } else {
            setIsConnected(false);
            setBalance("0");
        }
    }, [account, client]);

    const handleAccessDenied = () => {
        setShowPurchaseModal(true);
    };

    return ( 
        <>
            <Navbar maxWidth="full">
                <NavbarBrand>
                    <span className="box">
                        <h1 style={{fontSize: "2.5rem", color: "#0159E0", fontWeight:"bold"}} className={vt323.className}>
                            Lynxify
                        </h1>
                    </span>
                </NavbarBrand>
                
                <NavbarContent justify="end">
                    <NavbarItem className="hidden lg:flex items-center">
                        {!isConnected ? (
                            <>
                                <Button 
                                    className="mt-0" 
                                    variant="bordered"
                                    style={{
                                        backgroundColor: "white",
                                        color: "black",
                                        borderColor: "black"
                                    }}
                                    onPress={() => handleConnect()}
                                >
                                    Connect Wallet
                                </Button>
                            </>
                        ) : (
                            <>
                                {(!hasAccess && !isLoading) && (
                                    <Button 
                                        className="mr-4"
                                        variant="bordered"
                                        style={{
                                            borderColor: "#0159E0",
                                            color: "#0159E0"
                                        }}
                                        onPress={handleAccessDenied}
                                    >
                                        Get Access
                                    </Button>
                                )}
                                <Dropdown>
                                    <DropdownTrigger>
                                        <Button variant="light" className="text-sm">
                                            {balance}
                                            <img 
                                                style={{width:"30px", display:"inline-block", marginRight: "8px", marginLeft: "-4px"}} 
                                                src="/images/hedera-hbar-logo.png" 
                                                alt="Hedera Logo"
                                            />
                                            {account}
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownMenu aria-label="Account Actions">
                                        <DropdownItem key="logout" className="text-danger" color="danger" onPress={() => handleDisconnectSessions()}>
                                            Sign Out
                                        </DropdownItem>
                                    </DropdownMenu>
                                </Dropdown>
                            </>
                        )}
                    </NavbarItem>
                </NavbarContent>
            </Navbar>

            <Modal 
                isOpen={showPurchaseModal} 
                onClose={() => setShowPurchaseModal(false)}
                classNames={{
                    base: "max-w-md mx-auto",
                    header: vt323.className
                }}
                placement="center"
            >
                <ModalContent>
                    <ModalHeader className="text-2xl">Purchase Access NFT</ModalHeader>
                    <ModalBody>
                        <PurchaseNFT 
                            apiUrl="/api/nft"
                            tokenId={process.env.NEXT_PUBLIC_ACCESS_NFT_TOKEN_ID || ""}
                            client={client}
                        />
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    );
};

export default Header;