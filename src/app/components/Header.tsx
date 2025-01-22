"use client";
import { VT323 } from "next/font/google";
import { Button, Navbar, NavbarContent, NavbarItem, NavbarBrand, Link, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@nextui-org/react";
import { useWalletContext } from "../hooks/useWallet";
import { useNFTGate } from "../hooks/useNFTGate";
import { useRewards } from "../hooks/useRewards";
import PurchaseNFT from "./purchaseNFT";
import { useState, useEffect } from "react";
import { AccountBalanceQuery } from "@hashgraph/sdk";
import { handleDisconnectSessions } from '@/utils/supabase/session';

const vt323 = VT323({ weight: "400", subsets: ["latin"] })

const Header = () => {
    const { handleConnect, dAppConnector, sessions, account, client, userId, handleDisconnect } = useWalletContext();
    const { hasAccess, isLoading: nftLoading } = useNFTGate(account);
    const { achievements, isLoading: rewardsLoading, isInitializing } = useRewards(userId || undefined, account || undefined);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [balance, setBalance] = useState<string>("0");

    const totalXP = achievements?.reduce((sum, achievement) => sum + achievement.xp_awarded, 0) ?? 0;

    useEffect(() => {
        if (account !== "") {
            setIsConnected(true);
            
            const fetchBalance = async () => {
                try {
                    const query = new AccountBalanceQuery()
                        .setAccountId(account)
                        .setMaxAttempts(3)
                        .setMaxBackoff(5000);
                    
                    const accountBalance = await query.execute(client);
                    const hbarBalance = accountBalance.hbars.toString();
                    setBalance(parseFloat(hbarBalance).toFixed(2));
                } catch (error) {
                    if (balance === "0") {
                        setBalance("0");
                    }
                }
            };

            fetchBalance();
            const refreshInterval = setInterval(fetchBalance, 30000);
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
                    <Link href="/" className="cursor-pointer">
                        <span className="box">
                            <h1 style={{fontSize: "2.5rem", color: "#0159E0", fontWeight:"bold"}} className={vt323.className}>
                                Lynxify
                            </h1>
                        </span>
                    </Link>
                </NavbarBrand>
                
                <NavbarContent justify="end">
                    <NavbarItem>
                        <Link 
                            href="/token" 
                            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <img 
                                src="/images/lxy.png" 
                                alt="LXY Token" 
                                className="w-6 h-6"
                            />
                            <span className="text-sm font-medium">LXY</span>
                        </Link>
                    </NavbarItem>
                    <NavbarItem className="hidden lg:flex items-center">
                        {!isConnected ? (
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
                        ) : (
                            <>
                                <div className="mr-4 px-4 py-2 bg-[#1a1a1a] rounded-lg border border-[#333] flex items-center">
                                    <span className="text-[#0159E0] font-bold">
                                        {!isConnected ? (
                                            "Connect Wallet"
                                        ) : rewardsLoading ? (
                                            "Loading XP..."
                                        ) : (
                                            `${totalXP} XP`
                                        )}
                                    </span>
                                </div>
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
                                        <DropdownItem 
                                            key="logout" 
                                            className="text-danger" 
                                            color="danger" 
                                            onPress={handleDisconnect}
                                        >
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