"use client";
import { VT323 } from "next/font/google";
import { Button, Navbar, NavbarContent, NavbarItem, NavbarBrand, Link, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@nextui-org/react";
import { useWalletContext } from "../hooks/useWallet";
import { useNFTGate } from "../hooks/useNFTGate";
import PlaidLinkComponent from "./PlaidLinkComponent";
import PurchaseNFT from "./purchaseNFT";
import { useState } from "react";

const vt323 = VT323({ weight: "400", subsets: ["latin"] })

const Header = () => {
    const { handleConnect, handleDisconnectSessions, account } = useWalletContext();
    const { hasAccess, isLoading } = useNFTGate(account);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);

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
                <NavbarContent className="hidden sm:flex gap-4 pt-3" justify="center">
                    {hasAccess && (
                        <>
                            <NavbarItem>
                                <Link color="foreground" href="/">Stake</Link>
                            </NavbarItem>
                            <NavbarItem>
                                <Link color="foreground" href="/dex">Swap</Link>
                            </NavbarItem>
                        </>
                    )}
                </NavbarContent>
                <NavbarContent justify="end">
                    <NavbarItem>
                        <PlaidLinkComponent />
                    </NavbarItem>
                    <NavbarItem className="hidden lg:flex">
                        {account === "" ? (
                            <p><Button className="mt-4" onClick={() => handleConnect()}>Connect Wallet</Button></p>
                        ) : (
                            <>
                                {!hasAccess && !isLoading && (
                                    <Button className="mr-4" color="primary" onClick={handleAccessDenied}>
                                        Get Access
                                    </Button>
                                )}
                                <p className="text-sm mt-4">
                                    <span onClick={() => handleDisconnectSessions()}>
                                        Sign Out {account}
                                    </span>
                                    <img 
                                        style={{width:"30px", display:"inline-block", marginTop: "-3px"}} 
                                        src="/images/hedera-hbar-logo.png" 
                                        alt="Hedera Logo"
                                    />
                                </p>
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