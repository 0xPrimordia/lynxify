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
            // Fetch balance when account is connected
            const fetchBalance = async () => {
                try {
                    const accountBalance = await new AccountBalanceQuery()
                        .setAccountId(account)
                        .execute(client);
                    
                    const hbarBalance = accountBalance.hbars.toString();
                    setBalance(parseFloat(hbarBalance).toFixed(2));
                } catch (error) {
                    console.error("Error fetching balance:", error);
                    setBalance("0");
                }
            };
            fetchBalance();
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