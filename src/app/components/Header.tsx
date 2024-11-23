"use client";
import { VT323 } from "next/font/google";
import { Button, Navbar, NavbarContent, NavbarItem, NavbarBrand, Link, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@nextui-org/react";
import { useWalletContext } from "../hooks/useWallet";
import { useNFTGate } from "../hooks/useNFTGate";
import PlaidLinkComponent from "./PlaidLinkComponent";
import PurchaseNFT from "./purchaseNFT";
import { useState, useEffect } from "react";

const vt323 = VT323({ weight: "400", subsets: ["latin"] })

const Header = () => {
    const { handleConnect, handleDisconnectSessions, account } = useWalletContext();
    const { hasAccess, isLoading } = useNFTGate(account);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (account !== "") {
            setIsConnected(true);
        } else {
            setIsConnected(false);
        }
    }, [account]);

    const handleAccessDenied = () => {
        setShowPurchaseModal(true);
    };

    return ( 
        <>
            <Navbar maxWidth="full">
                <NavbarBrand>
                    <span className="box">
                        <h1 style={{fontSize: "2.5rem", color: "#4E94FE"}} className={vt323.className+" font-bold"}>
                            Lynxify
                        </h1>
                    </span>
                </NavbarBrand>
                
                <NavbarContent justify="end">
                    <NavbarItem>
                        <PlaidLinkComponent />
                    </NavbarItem>
                    <NavbarItem className="hidden lg:flex">
                        {!isConnected ? (
                            <p><Button className="mt-4" onClick={() => handleConnect()}>Connect Wallet</Button></p>
                        ) : (
                            <>
                                {!hasAccess && !isLoading && (
                                    <Button className="mr-4" color="primary" onClick={handleAccessDenied}>
                                        Get Access
                                    </Button>
                                )}
                                <Dropdown>
                                    <DropdownTrigger>
                                        <Button variant="light" className="text-sm">
                                            {account}
                                            <img 
                                                style={{width:"30px", display:"inline-block", marginLeft: "8px"}} 
                                                src="/images/hedera-hbar-logo.png" 
                                                alt="Hedera Logo"
                                            />
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownMenu aria-label="Account Actions">
                                        <DropdownItem key="logout" className="text-danger" color="danger" onClick={() => handleDisconnectSessions()}>
                                            Sign Out
                                        </DropdownItem>
                                    </DropdownMenu>
                                </Dropdown>
                            </>
                        )}
                    </NavbarItem>
                </NavbarContent>
            </Navbar>

            <Modal isOpen={showPurchaseModal} onClose={() => setShowPurchaseModal(false)}>
                <ModalContent>
                    <ModalHeader>Purchase Access NFT</ModalHeader>
                    <ModalBody>
                        <PurchaseNFT 
                            apiUrl="/api/nft"
                            tokenId={process.env.NEXT_PUBLIC_ACCESS_NFT_TOKEN_ID || ""}
                        />
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    );
};

export default Header;