"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Token } from "@/app/types";
import { Chip, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@nextui-org/react";
import { ChevronDownIcon } from "@heroicons/react/16/solid";

interface InputTokenSelectProps {
    tokens: Token[];
    onSelect: (tokenId: string) => void;
}
 
const InputTokenSelect = ({tokens, onSelect}:InputTokenSelectProps) => {
    const [selectedToken, setSelectedToken] = useState<Token | null>(null);

    const handleSelect = (tokenId: string) => {
        const token = tokens.find((token) => token.id === tokenId);
        if (token) {
            setSelectedToken(token);
            onSelect(tokenId);
        }
    }
    
    return ( 
        <>
            <Dropdown placement="bottom-start">
                {selectedToken && (
                    <DropdownTrigger>
                        <Image className="cursor-pointer" width={26} height={26} alt="icon" src={`https://www.saucerswap.finance/${selectedToken.icon}`} />
                    </DropdownTrigger>
                )}
                {!selectedToken && (
                    <DropdownTrigger>
                        <Chip className="cursor-pointer" radius="sm" size="sm" endContent={<ChevronDownIcon className="w-4 h-4" />}>Select Token</Chip>
                    </DropdownTrigger>
                )}
                <DropdownMenu onAction={(key) => (handleSelect(key as string) )} className="max-h-72 overflow-scroll" aria-label="Token Selection" items={tokens} variant="flat">
                    {(token:Token) => (
                        <DropdownItem textValue={token.name} key={token.id} className="h-14 gap-2">
                            <Image className="mt-1" width={40} height={40} alt="icon" src={`https://www.saucerswap.finance/${token.icon}`} />
                        </DropdownItem>
                    )}
                </DropdownMenu>
            </Dropdown>
        </>
    );
}
 
export default InputTokenSelect;