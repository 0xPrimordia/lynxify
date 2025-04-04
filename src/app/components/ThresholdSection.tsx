import React, { useState, useEffect } from 'react';
import { Input, Button, Select, SelectItem, Chip, Tooltip } from "@nextui-org/react";
import { ArrowRightIcon, QuestionMarkCircleIcon } from "@heroicons/react/16/solid";
import Image from 'next/image';
import { Token } from "@/app/types";
import { ThresholdSlippageSelector } from './ThresholdSlippageSelector';
import { getTokenImageUrl } from '@/app/lib/utils/tokens';
import { verifyThresholdTokens } from '@/app/lib/tokens/thresholdAssociation';
import { associateToken } from '@/app/lib/utils/tokens';

export interface ThresholdSectionProps {
    mode: 'buy' | 'sell';
    selectedThresholdType: 'stopLoss' | 'buyOrder' | 'sellOrder' | null;
    setSelectedThresholdType: (type: 'stopLoss' | 'buyOrder' | 'sellOrder' | null) => void;
    currentPool: any;
    currentToken: Token;
    tradeToken: Token | null;
    stopLossPrice: string;
    stopLossCap: string;
    buyOrderPrice: string;
    buyOrderCap: string;
    sellOrderPrice: string;
    sellOrderCap: string;
    stopLossSlippage: number;
    buyOrderSlippage: number;
    sellOrderSlippage: number;
    isSubmitting: boolean;
    setStopLossPrice: (price: string) => void;
    setStopLossCap: (cap: string) => void;
    setBuyOrderPrice: (price: string) => void;
    setBuyOrderCap: (cap: string) => void;
    setSellOrderPrice: (price: string) => void;
    setSellOrderCap: (cap: string) => void;
    setStopLossSlippage: (slippage: number) => void;
    setBuyOrderSlippage: (slippage: number) => void;
    setSellOrderSlippage: (slippage: number) => void;
    handleInputFocus: (event: React.FocusEvent) => void;
    adjustStopLossPrice: (percent: number) => void;
    adjustSellOrderPrice: (percent: number) => void;
    adjustBuyOrderPrice: (percent: number) => void;
    hanndleMaxClickStopLoss: () => void;
    handleMaxClickSellOrder: () => void;
    saveThresholds: (data: {
        type: 'stopLoss' | 'buyOrder' | 'sellOrder';
        price: number;
        cap: number;
        hederaAccountId: string;
        tokenA: string;
        tokenB: string;
        fee: number;
        slippageBasisPoints: number;
    }) => void;
    resetThresholdForm: () => void;
    setIsSubmitting: (isSubmitting: boolean) => void;
    setError: (error: string) => void;
    executeTransaction: (tx: string, description: string) => Promise<any>;
    activeAccount: string;
}

export const ThresholdSection: React.FC<ThresholdSectionProps> = ({
    mode,
    selectedThresholdType,
    setSelectedThresholdType,
    currentPool,
    currentToken,
    tradeToken,
    stopLossPrice,
    stopLossCap,
    buyOrderPrice,
    buyOrderCap,
    sellOrderPrice,
    sellOrderCap,
    stopLossSlippage,
    buyOrderSlippage,
    sellOrderSlippage,
    isSubmitting,
    setStopLossPrice,
    setStopLossCap,
    setBuyOrderPrice,
    setBuyOrderCap,
    setSellOrderPrice,
    setSellOrderCap,
    setStopLossSlippage,
    setBuyOrderSlippage,
    setSellOrderSlippage,
    handleInputFocus,
    adjustStopLossPrice,
    adjustSellOrderPrice,
    adjustBuyOrderPrice,
    hanndleMaxClickStopLoss,
    handleMaxClickSellOrder,
    saveThresholds,
    resetThresholdForm,
    setIsSubmitting,
    setError,
    executeTransaction,
    activeAccount,
}) => {
    const [isLimitExpanded, setIsLimitExpanded] = useState(false);
    const [isLimitUsdInput, setIsLimitUsdInput] = useState(false);
    const [limitUsdAmount, setLimitUsdAmount] = useState("0.0");
    const [isStopLimitExpanded, setIsStopLimitExpanded] = useState(false);

    // Initialize buy order price with trade token's price (the token being bought)
    useEffect(() => {
        if (mode === 'buy' && tradeToken) {
            setBuyOrderPrice(tradeToken.priceUsd.toString());
        }
    }, [mode, tradeToken, setBuyOrderPrice]);

    const handleSaveThreshold = async () => {
        try {
            setIsSubmitting(true);
            
            if (!tradeToken) {
                throw new Error('Trade token not selected');
            }

            // Verify token associations first
            const verificationResult = await verifyThresholdTokens(
                activeAccount,
                currentToken.id,
                tradeToken.id,
                process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'testnet'
            );

            if (verificationResult.needsAssociation) {
                if (!verificationResult.token) {
                    throw new Error('Token ID not found');
                }
                try {
                    const tx = await associateToken(activeAccount, verificationResult.token);
                    const result = await executeTransaction(tx, `Associate ${verificationResult.token} token`);
                    
                    if (result.status !== 'SUCCESS') {
                        throw new Error(result.error || 'Association failed');
                    }
                } catch (error) {
                    console.error('Token association error:', error);
                    setError(error instanceof Error ? error.message : 'Failed to associate token');
                    return;
                }
            }

            if (!selectedThresholdType) {
                throw new Error('Threshold type not selected');
            }

            // Save thresholds with complete data
            await saveThresholds({
                type: selectedThresholdType,
                price: parseFloat(selectedThresholdType === 'stopLoss' ? stopLossPrice : 
                    selectedThresholdType === 'buyOrder' ? buyOrderPrice : sellOrderPrice),
                cap: parseFloat(selectedThresholdType === 'stopLoss' ? stopLossCap :
                    selectedThresholdType === 'buyOrder' ? buyOrderCap : sellOrderCap),
                hederaAccountId: activeAccount,
                tokenA: currentToken.id,
                tokenB: tradeToken.id,
                fee: currentPool.fee,
                slippageBasisPoints: Math.floor((selectedThresholdType === 'stopLoss' ? stopLossSlippage :
                    selectedThresholdType === 'buyOrder' ? buyOrderSlippage : sellOrderSlippage) * 100)
            });
            resetThresholdForm();
        } catch (error) {
            console.error('Threshold operation failed:', error);
            setError(error instanceof Error ? error.message : 'Failed to complete threshold operation');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Only show relevant UI based on mode
    if (mode === 'buy') {
        return (
            <div className="w-full flex flex-col gap-4 pb-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span>Limit</span>
                        <Tooltip 
                            content="This is a Buy Order for when the price ≤ threshold"
                            placement="top"
                            showArrow
                        >
                            <QuestionMarkCircleIcon className="w-5 h-5 text-default-400" />
                        </Tooltip>
                    </div>
                    <Button
                        size="sm"
                        variant="light"
                        className="min-w-unit-8 text-xl border border-gray-800"
                        onPress={() => {
                            setIsLimitExpanded(!isLimitExpanded);
                            if (!isLimitExpanded) {
                                setSelectedThresholdType('buyOrder');
                            }
                        }}
                        aria-expanded={isLimitExpanded}
                        aria-controls="limit-section"
                        aria-label={isLimitExpanded ? "Collapse limit section" : "Expand limit section"}
                    >
                        {isLimitExpanded ? "−" : "+"}
                    </Button>
                </div>

                {isLimitExpanded && (
                    <div id="limit-section" className="w-full flex flex-col gap-4">
                        <p>Buy Price (usd)</p>
                        <Input 
                            type="number"
                            value={buyOrderPrice}
                            onChange={(e) => setBuyOrderPrice(e.target.value)}
                            onFocus={handleInputFocus}
                            className="text-lg"
                            classNames={{
                                input: "text-xl pl-4",
                                inputWrapper: "items-center h-16",
                                mainWrapper: "h-16",
                            }}
                            maxLength={12} 
                            step="0.000001" 
                            startContent={
                                <div className="flex items-center mr-2">
                                    {tradeToken && 
                                        <Image 
                                            className="mt-1" 
                                            width={30} 
                                            height={30} 
                                            alt="icon" 
                                            src={getTokenImageUrl(tradeToken.icon)} 
                                        />
                                    }
                                    <ArrowRightIcon className="w-12 h-4 mt-1 mr-2 ml-2" />
                                    <Image 
                                        className="mt-1" 
                                        width={30} 
                                        height={30} 
                                        alt="icon" 
                                        src={getTokenImageUrl(currentToken.icon)} 
                                    /> 
                                </div>
                            }
                        />
                        <div className="flex gap-2 mt-2">
                            <Button 
                                size="sm" 
                                variant="flat" 
                                onPress={() => adjustBuyOrderPrice(0.01)}
                            >
                                -1%
                            </Button>
                            <Button 
                                size="sm" 
                                variant="flat" 
                                onPress={() => adjustBuyOrderPrice(0.05)}
                            >
                                -5%
                            </Button>
                            <Button 
                                size="sm" 
                                variant="flat" 
                                onPress={() => adjustBuyOrderPrice(0.10)}
                            >
                                -10%
                            </Button>
                        </div>

                        <div className="flex justify-between items-center">
                            <p>Buy Cap (qty of tokens to buy)</p>
                            <Button
                                size="sm"
                                variant="light"
                                onPress={() => setIsLimitUsdInput(!isLimitUsdInput)}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={isLimitUsdInput ? "text-white" : "text-default-500"}>USD</span>
                                    <span className="text-default-500">/</span>
                                    <span className={!isLimitUsdInput ? "text-white" : "text-default-500"}>{tradeToken?.symbol}</span>
                                </div>
                            </Button>
                        </div>
                        <Input 
                            type="number"
                            value={isLimitUsdInput ? limitUsdAmount : buyOrderCap}
                            onChange={(e) => {
                                const newValue = e.target.value;
                                if (isLimitUsdInput) {
                                    const roundedUsd = Number(newValue).toFixed(2);
                                    setLimitUsdAmount(roundedUsd);
                                    const tokenAmount = (Number(roundedUsd) / (tradeToken?.priceUsd || 1)).toString();
                                    setBuyOrderCap(tokenAmount);
                                } else {
                                    setBuyOrderCap(newValue);
                                    const usdValue = (Number(newValue) * (tradeToken?.priceUsd || 0)).toFixed(2);
                                    setLimitUsdAmount(usdValue);
                                }
                            }}
                            onFocus={handleInputFocus}
                            className="text-lg"
                            classNames={{
                                input: "text-xl pl-4",
                                inputWrapper: "items-center h-16",
                                mainWrapper: "h-16",
                            }}
                            maxLength={12} 
                            step="0.000001" 
                        />
                        <p className="text-sm text-gray-400 mt-1 text-right">
                            {isLimitUsdInput 
                                ? `≈ ${buyOrderCap} ${tradeToken?.symbol}`
                                : `≈ $${limitUsdAmount} USD`
                            }
                        </p>

                        <ThresholdSlippageSelector 
                            slippage={buyOrderSlippage} 
                            setSlippage={setBuyOrderSlippage}
                        />
                        <Button 
                            className="mb-2" 
                            onPress={() => handleSaveThreshold().catch(console.error)}
                            isLoading={isSubmitting}
                            isDisabled={isSubmitting}
                        >
                            {isSubmitting ? 'Setting Limit Order...' : 'Set Limit Order'}
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    // Return original threshold UI for sell mode
    return (
        <div className="w-full flex flex-col gap-4 pb-8">
            {/* Stop-Limit Section */}
            <div className="w-full flex flex-col gap-4">
                <div className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                        <span>Stop-Limit</span>
                        <Tooltip 
                            content="This is a Sell Order for when the price ≤ threshold"
                            placement="top"
                            showArrow
                        >
                            <QuestionMarkCircleIcon className="w-5 h-5 text-default-400" />
                        </Tooltip>
                    </div>
                    <Button
                        size="sm"
                        variant="light"
                        className="min-w-unit-8 text-xl border border-gray-800"
                        onPress={() => setIsStopLimitExpanded(!isStopLimitExpanded)}
                    >
                        {isStopLimitExpanded ? "−" : "+"}
                    </Button>
                </div>

                {isStopLimitExpanded && (
                    <div className="w-full flex flex-col gap-4">
                        <p>Sell Price (usd)</p>
                        <Input
                            type="number"
                            value={stopLossPrice}
                            onChange={(e) => setStopLossPrice(e.target.value)}
                            onFocus={handleInputFocus}
                            className="text-lg"
                            classNames={{
                                input: "text-xl pl-4",
                                inputWrapper: "items-center h-16",
                                mainWrapper: "h-16",
                            }}
                            startContent={
                                <div className="flex items-center mr-2">
                                    <Image 
                                        className="mt-1" 
                                        width={30} 
                                        height={30}
                                        alt="icon" 
                                        src={getTokenImageUrl(currentToken.icon)} 
                                    /> 
                                    <ArrowRightIcon className="w-12 h-4 mt-1 mr-2 ml-2" />
                                    {tradeToken && 
                                        <Image 
                                            className="mt-1" 
                                            width={30} 
                                            height={30} 
                                            alt="icon" 
                                            src={getTokenImageUrl(tradeToken.icon)} 
                                        />
                                    }
                                </div>
                            }
                            maxLength={12} 
                            step="0.000001" 
                        />
                        <div className="flex gap-2 mt-2">
                            <Button 
                                size="sm" 
                                variant="flat" 
                                onPress={() => adjustStopLossPrice(0.01)}
                            >
                                -1%
                            </Button>
                            <Button 
                                size="sm" 
                                variant="flat" 
                                onPress={() => adjustStopLossPrice(0.05)}
                            >
                                -5%
                            </Button>
                            <Button 
                                size="sm" 
                                variant="flat" 
                                onPress={() => adjustStopLossPrice(0.10)}
                            >
                                -10%
                            </Button>
                        </div>
                        <p>Sell Cap (qty of tokens to sell)</p>
                        <Input
                            type="number"
                            value={stopLossCap}
                            onChange={(e) => setStopLossCap(e.target.value)}
                            onFocus={handleInputFocus}
                            className="text-lg"
                            classNames={{
                                input: "text-xl pl-4",
                                inputWrapper: "items-center h-16",
                                mainWrapper: "h-16",
                            }}
                            maxLength={12} 
                            step="0.000001" 
                            endContent={
                                <Chip onClick={hanndleMaxClickStopLoss} className="cursor-pointer" radius="sm" size="sm">MAX</Chip>
                            }
                        />
                        <ThresholdSlippageSelector 
                            slippage={stopLossSlippage} 
                            setSlippage={setStopLossSlippage}
                        />
                        <Button 
                            className="mb-2" 
                            onPress={() => handleSaveThreshold().catch(console.error)}
                            isLoading={isSubmitting}
                            isDisabled={isSubmitting}
                        >
                            {isSubmitting ? 'Setting Stop-Limit...' : 'Set Stop-Limit'}
                        </Button>
                    </div>
                )}
            </div>

            {/* Limit Section */}
            <div className="w-full flex flex-col gap-4">
                <div className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                        <span>Limit</span>
                        <Tooltip 
                            content="This is a Sell Order for when the price ≥ threshold"
                            placement="top"
                            showArrow
                        >
                            <QuestionMarkCircleIcon className="w-5 h-5 text-default-400" />
                        </Tooltip>
                    </div>
                    <Button
                        size="sm"
                        variant="light"
                        className="min-w-unit-8 text-xl border border-gray-800"
                        onPress={() => {
                            setIsLimitExpanded(!isLimitExpanded);
                            if (!isLimitExpanded) {
                                setSelectedThresholdType(mode === 'sell' ? 'sellOrder' : 'buyOrder');
                            }
                        }}
                        aria-expanded={isLimitExpanded}
                        aria-controls="limit-section"
                        aria-label={isLimitExpanded ? "Collapse limit section" : "Expand limit section"}
                    >
                        {isLimitExpanded ? "−" : "+"}
                    </Button>
                </div>

                {isLimitExpanded && (
                    <div className="w-full flex flex-col gap-4">
                        <p>Sell Price (usd)</p>
                        <Input
                            type="number"
                            value={sellOrderPrice}
                            onChange={(e) => setSellOrderPrice(e.target.value)}
                            onFocus={handleInputFocus}
                            className="text-lg"
                            classNames={{
                                input: "text-xl pl-4",
                                inputWrapper: "items-center h-16",
                                mainWrapper: "h-16",
                            }}
                            startContent={
                                <div className="flex items-center mr-2">
                                    <Image 
                                        className="mt-1" 
                                        width={30} 
                                        height={30} 
                                        alt="icon" 
                                        src={getTokenImageUrl(currentToken.icon)} 
                                    /> 
                                    <ArrowRightIcon className="w-12 h-4 mt-1 mr-2 ml-2" />
                                    {tradeToken && 
                                        <Image 
                                            className="mt-1" 
                                            width={30} 
                                            height={30} 
                                            alt="icon" 
                                            src={getTokenImageUrl(tradeToken.icon)} 
                                        />
                                    }
                                </div>
                            }
                            maxLength={12} 
                            step="0.000001" 
                        />
                        <div className="flex gap-2 mt-2">
                            <Button 
                                size="sm" 
                                variant="flat" 
                                onPress={() => adjustSellOrderPrice(0.01)}
                            >
                                +1%
                            </Button>
                            <Button 
                                size="sm" 
                                variant="flat" 
                                onPress={() => adjustSellOrderPrice(0.05)}
                            >
                                +5%
                            </Button>
                            <Button 
                                size="sm" 
                                variant="flat" 
                                onPress={() => adjustSellOrderPrice(0.10)}
                            >
                                +10%
                            </Button>
                        </div>
                        <p>Sell Cap (qty of tokens to sell)</p>
                        <Input
                            type="number"
                            value={sellOrderCap}
                            onChange={(e) => setSellOrderCap(e.target.value)}
                            onFocus={handleInputFocus}
                            className="text-lg"
                            classNames={{
                                input: "text-xl pl-4",
                                inputWrapper: "items-center h-16",
                                mainWrapper: "h-16",
                            }}
                            maxLength={12} 
                            step="0.000001" 
                            endContent={
                                <Chip onClick={handleMaxClickSellOrder} className="cursor-pointer" radius="sm" size="sm">MAX</Chip>
                            }
                        />
                        <ThresholdSlippageSelector 
                            slippage={sellOrderSlippage} 
                            setSlippage={setSellOrderSlippage}
                        />
                        <Button 
                            className="mb-2" 
                            onPress={() => handleSaveThreshold().catch(console.error)}
                            isLoading={isSubmitting}
                            isDisabled={isSubmitting}
                        >
                            {isSubmitting ? 'Setting Limit Order...' : 'Set Limit Order'}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}; 