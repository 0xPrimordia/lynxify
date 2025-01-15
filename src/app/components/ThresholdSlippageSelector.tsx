import React from 'react';
import { Button, Input } from "@nextui-org/react";

interface ThresholdSlippageSelectorProps {
    slippage: number;
    setSlippage: (slippage: number) => void;
    label?: string;
}

export const ThresholdSlippageSelector: React.FC<ThresholdSlippageSelectorProps> = ({ 
    slippage, 
    setSlippage,
    label = "Slippage Tolerance"
}) => {
    const [customSlippage, setCustomSlippage] = React.useState<string>("");
    const [showCustomSlippage, setShowCustomSlippage] = React.useState<boolean>(false);

    return (
        <div className="flex flex-col gap-2">
            <p>{label}</p>
            <div className="flex gap-2">
                <Button 
                    size="sm" 
                    variant={slippage === 0.5 ? "solid" : "flat"}
                    onPress={() => {
                        setSlippage(0.5);
                        setShowCustomSlippage(false);
                    }}
                >
                    0.5%
                </Button>
                <Button 
                    size="sm" 
                    variant={slippage === 1.0 ? "solid" : "flat"}
                    onPress={() => {
                        setSlippage(1.0);
                        setShowCustomSlippage(false);
                    }}
                >
                    1.0%
                </Button>
                <Button 
                    size="sm" 
                    variant={slippage === 2.0 ? "solid" : "flat"}
                    onPress={() => {
                        setSlippage(2.0);
                        setShowCustomSlippage(false);
                    }}
                >
                    2.0%
                </Button>
                <Button 
                    size="sm" 
                    variant={showCustomSlippage ? "solid" : "flat"}
                    onPress={() => setShowCustomSlippage(!showCustomSlippage)}
                >
                    Custom
                </Button>
            </div>
            {showCustomSlippage && (
                <Input
                    type="number"
                    value={customSlippage}
                    onChange={(e) => {
                        setCustomSlippage(e.target.value);
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                            setSlippage(value);
                        }
                    }}
                    placeholder="Enter custom slippage %"
                    size="sm"
                    endContent={<div className="pointer-events-none flex items-center"><span className="text-default-400 text-small">%</span></div>}
                />
            )}
        </div>
    );
};