"use client";
import { VT323 } from "next/font/google";
import { Button, Navbar, NavbarContent, NavbarItem, NavbarBrand, Link, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, NavbarMenuToggle, NavbarMenu, NavbarMenuItem } from "@nextui-org/react";
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
    const { fetchAchievements, totalXP } = useRewards();
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [balance, setBalance] = useState<string>("0");
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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

    useEffect(() => {
        if (userId && account) {
            fetchAchievements(userId, account);
        }
    }, [userId, account, fetchAchievements]);

    const handleAccessDenied = () => {
        setShowPurchaseModal(true);
    };

    return ( 
        <>
            <Navbar 
                maxWidth="full" 
                className={`${process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? 'mb-8' : 'mb-4'}`}
                isMenuOpen={isMenuOpen}
                onMenuOpenChange={setIsMenuOpen}
            >
                <NavbarContent className="sm:hidden" justify="start">
                    <NavbarMenuToggle />
                </NavbarContent>

                <NavbarBrand>
                    <Link href="/" className="cursor-pointer">
                        <span className="box">
                            <h1 style={{fontSize: "2.5rem", color: "#0159E0", fontWeight:"bold"}} className={vt323.className}>
                                Lynxify
                            </h1>
                        </span>
                    </Link>
                </NavbarBrand>
                
                {/* Desktop Menu */}
                <NavbarContent className="hidden sm:flex" justify="end">
                    <NavbarItem>
                        <Link 
                            href="/token" 
                            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <img src="/images/lxy.png" alt="LXY Token" className="w-6 h-6" />
                            <span className="text-sm font-medium">LXY</span>
                        </Link>
                    </NavbarItem>

                    {isConnected && (
                        <NavbarItem className="flex items-center">
                            <div className="px-3 py-1 bg-[#1a1a1a] rounded-lg border border-[#333] flex items-center">
                                <span className="text-[#0159E0] font-bold text-sm">
                                    {totalXP} XP
                                </span>
                            </div>
                        </NavbarItem>
                    )}

                    <NavbarItem>
                        {!isConnected ? (
                            <Button 
                                className="mt-0" 
                                variant="bordered"
                                size="sm"
                                style={{
                                    backgroundColor: "#0159E0",
                                    color: "white",
                                    borderColor: "#0159E0"
                                }}
                                onPress={() => handleConnect()}
                            >
                                Connect Wallet
                            </Button>
                        ) : (
                            <Dropdown>
                                <DropdownTrigger>
                                    <Button variant="light" size="sm" className="text-sm">
                                        {balance} ℏ
                                    </Button>
                                </DropdownTrigger>
                                <DropdownMenu aria-label="Account Actions">
                                    <DropdownItem key="account" className="text-sm">
                                        {account}
                                    </DropdownItem>
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
                        )}
                    </NavbarItem>
                </NavbarContent>

                {/* Mobile Menu Button - Always visible on mobile */}
                <NavbarContent className="sm:hidden" justify="end">
                    {!isConnected ? (
                        <Button 
                            size="sm"
                            variant="bordered"
                            style={{
                                backgroundColor: "#0159E0",
                                color: "white",
                                borderColor: "#0159E0"
                            }}
                            onPress={() => handleConnect()}
                        >
                            Connect
                        </Button>
                    ) : (
                        <Button 
                            variant="light" 
                            size="sm"
                            className="text-sm"
                        >
                            {balance} ℏ
                        </Button>
                    )}
                </NavbarContent>

                {/* Mobile Menu */}
                <NavbarMenu>
                    {isConnected && (
                        <NavbarMenuItem className="mb-4">
                            <div className="px-3 py-2 bg-[#1a1a1a] rounded-lg border border-[#333] flex items-center justify-between w-full">
                                <span className="text-[#0159E0] font-bold">
                                    {totalXP} XP
                                </span>
                            </div>
                        </NavbarMenuItem>
                    )}
                    
                    <NavbarMenuItem>
                        <Link 
                            href="/token" 
                            className="flex items-center gap-2 py-2 w-full"
                        >
                            <img src="/images/lxy.png" alt="LXY Token" className="w-6 h-6" />
                            <span>LXY Token</span>
                        </Link>
                    </NavbarMenuItem>

                    {isConnected && (
                        <>
                            <NavbarMenuItem className="py-2">
                                <div className="text-sm text-foreground-500">
                                    Account: {account}
                                </div>
                            </NavbarMenuItem>
                            <NavbarMenuItem>
                                <Button 
                                    color="danger" 
                                    variant="flat" 
                                    onPress={handleDisconnect}
                                    className="w-full"
                                >
                                    Sign Out
                                </Button>
                            </NavbarMenuItem>
                        </>
                    )}
                </NavbarMenu>
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