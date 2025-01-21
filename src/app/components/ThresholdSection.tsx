import React from 'react';
import { Input, Button, Select, SelectItem, Chip } from "@nextui-org/react";
import { ArrowRightIcon } from "@heroicons/react/16/solid";
import Image from 'next/image';
import { Token } from "../hooks/useTokens";
import { ThresholdSlippageSelector } from './ThresholdSlippageSelector';
import { getTokenImageUrl } from '@/app/lib/utils/tokens';

const thresholdOptions = [
    { key: 'stopLoss', label: 'Stop Loss', description: 'Sells tokens when the price < threshold' },
    { key: 'buyOrder', label: 'Buy Order', description: 'Buys tokens when the price < threshold' },
    { key: 'sellOrder', label: 'Sell Order', description: 'Sells tokens when the price > threshold' }
];

interface ThresholdSectionProps {
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
    saveThresholds: (type: 'stopLoss' | 'buyOrder' | 'sellOrder') => void;
    resetThresholdForm: () => void;
}

export const ThresholdSection: React.FC<ThresholdSectionProps> = ({
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
    resetThresholdForm
}) => {
    const handleSaveThreshold = async (type: 'stopLoss' | 'buyOrder' | 'sellOrder') => {
        try {
            await saveThresholds(type);
            resetThresholdForm();
            setSelectedThresholdType(null);
        } catch (error) {
            console.error('Failed to save threshold:', error);
        }
    };

    return (
        <div className="w-full flex flex-col gap-4 pb-8">
            <Select
                label="Select Threshold Type"
                placeholder="Select a threshold type"
                className="max-w-xs"
                onChange={(e) => setSelectedThresholdType(e.target.value as 'stopLoss' | 'buyOrder' | 'sellOrder' | null)}
                selectedKeys={selectedThresholdType ? [selectedThresholdType] : []}
                isDisabled={!currentPool || isSubmitting}
            >
                {thresholdOptions.map((option) => (
                    <SelectItem 
                        key={option.key} 
                        value={option.key}
                        description={option.description}
                        textValue={option.label}
                    >
                        {option.label}
                    </SelectItem>
                ))}
            </Select>

            {selectedThresholdType === 'stopLoss' && (
                <div className="w-full my-4 flex flex-col gap-4">
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
                        onPress={() => handleSaveThreshold('stopLoss').catch(console.error)}
                        isLoading={isSubmitting}
                        isDisabled={isSubmitting}
                    >
                        {isSubmitting ? 'Setting Stop-Loss...' : 'Set Stop-Loss'}
                    </Button>
                </div>
            )}

            {selectedThresholdType === 'buyOrder' && (
                <div className="w-full my-4 flex flex-col gap-4">
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
                    <p>Buy Cap (qty of tokens to buy)</p>
                    <Input 
                        type="number"
                        value={buyOrderCap}
                        onChange={(e) => setBuyOrderCap(e.target.value)}
                        onFocus={handleInputFocus}
                        maxLength={12} 
                        step="0.000001" 
                        className="text-lg"
                        classNames={{
                            input: "text-xl pl-4",
                            inputWrapper: "items-center h-16",
                            mainWrapper: "h-16",
                        }}
                    />
                    <ThresholdSlippageSelector 
                        slippage={buyOrderSlippage} 
                        setSlippage={setBuyOrderSlippage}
                    />
                    <Button 
                        className="mb-2" 
                        onPress={() => handleSaveThreshold('buyOrder').catch(console.error)}
                        isLoading={isSubmitting}
                        isDisabled={isSubmitting}
                    >
                        {isSubmitting ? 'Setting Buy Order...' : 'Set Buy Order'}
                    </Button>
                </div>
            )}

            {selectedThresholdType === 'sellOrder' && (
                <div className="w-full my-4 flex flex-col gap-4">
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
                        onPress={() => handleSaveThreshold('sellOrder').catch(console.error)}
                        isLoading={isSubmitting}
                        isDisabled={isSubmitting}
                    >
                        {isSubmitting ? 'Setting Sell Order...' : 'Set Sell Order'}
                    </Button>
                </div>
            )}
        </div>
    );
}; 