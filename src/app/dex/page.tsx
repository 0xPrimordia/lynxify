"use client"
import React, { useState, useEffect } from "react";
import { formatUnits } from 'ethers';
import { Image, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Input, Chip, Switch } from "@nextui-org/react";
import { useSaucerSwapContext, Token } from "../hooks/useTokens";
import useTokenPriceHistory from "../hooks/useTokenPriceHistory";
import TokenPriceChart from '../components/TokenPriceChart';
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import { ArrowsRightLeftIcon } from "@heroicons/react/16/solid";
import { Menubar, MenubarMenu } from '@/components/ui/menubar';
import { Button, ButtonGroup } from '@nextui-org/react';
import InputTokenSelect from "../components/InputTokenSelect";
import { swapExactTokenForToken } from "../lib/saucerswap";
import { useWalletContext } from "../hooks/useWallet";
import { usePoolContext } from "../hooks/usePools";
import {
    HederaSessionEvent,
    HederaJsonRpcMethod,
    DAppConnector,
    HederaChainId,
    ExtensionData,
    DAppSigner,
    SignAndExecuteTransactionParams,
    transactionToBase64String
  } from '@hashgraph/hedera-wallet-connect';
  import { SessionTypes, SignClientTypes } from '@walletconnect/types';
  
export default function DexPage() {
    const { account, appMetadata, dAppConnector } = useWalletContext();
    const currentDate = new Date();
    const pastDate = new Date();
    pastDate.setDate(currentDate.getDate() - 7);
    const { tokens } = useSaucerSwapContext();
    const { pools } = usePoolContext();
    const [session, setSession] = useState<SessionTypes.Struct>()
    const [signers, setSigners] = useState<DAppSigner[]>([])
    const [from, setFrom] = useState(Math.floor(pastDate.getTime() / 1000));
    const [to, setTo] = useState(Math.floor(currentDate.getTime() / 1000));
    const [interval, setInterval] = useState('HOUR');
    const [tradeToken, setTradeToken] = useState<Token>();
    const [tradeAmount, setTradeAmount] = useState(0);
    const [tradePrice, setTradePrice] = useState(0);
    const [stopLoss, setStopLoss] = useState(false);
    const [buyOrder, setBuyOrder] = useState(false);
    const [quote, setQuote] = useState<string | null>(null);
    const [currentTradeTokens, setCurrentTradeTokens] = useState<Token[]>([]);
    const [currentPool, setCurrentPool] = useState<any>(null);
    const [currentToken, setCurrentToken] = useState<Token>(
        {
            decimals: 6,
            dueDiligenceComplete: true,
            icon: "/images/tokens/SD.png",
            id: "0.0.1463375",
            isFeeOnTransferToken: false,
            name: "Stader",
            price: "656407783",
            priceUsd: 0.43708297,
            symbol: "SD[hts]"
        }
    )
    const { data, loading, error } = useTokenPriceHistory(currentToken.id, from, to, interval);

    useEffect(() => {
        if(!pools || !currentToken || !tradeToken) return;
        const pool = pools.filter((pool:any) => pool.tokenA.id === currentToken.id && pool.tokenB.id === tradeToken.id || pool.tokenA.id === tradeToken.id && pool.tokenB.id === currentToken.id);

        if(pool) {
            setCurrentPool(pool[0]);
        } else {
            console.log("No pool found");
        }
    }, [pools, currentToken, tradeToken]);

    const handleQuote = async () => {
        try {
            console.log('Initiating trade')
            // if(!tradeToken || !currentPool) {
            //     console.log("Not trade token or current pool")
            //     return 
            // };
            if (dAppConnector != null && dAppConnector != undefined) {
                const result = await swapExactTokenForToken(tradeAmount.toString(), currentToken?.id, "0.0.1183558", 3000, account, 0, 0);
                console.log(result)
                console.log(account)
                if(typeof result !== 'string') return;
                const params: SignAndExecuteTransactionParams = {
                    transactionList: result,
                    signerAccountId: 'hedera:testnet:' + account,
                }
      
                console.log(params)
      
                const results = await dAppConnector.signAndExecuteTransaction(params)
                console.log(results)
            }
            //const result = await getQuoteExactInput(tradeToken?.id, tradeToken?.decimals, currentToken?.id, tradeAmount.toString(), currentPool?.fee); // Example fee
            //setQuote(formatUnits(result.amountOut.toString(), 18));
        } catch (error) {
          console.error('Error swapping tokens', error);
        }
    };

    useEffect(() => {
        if (session) {
          const sessionAccount = session.namespaces?.hedera?.accounts?.[0]
          if (sessionAccount) {
            const accountId = sessionAccount.split(':').pop()
            console.log(accountId)
          }
        }
    }, [session])

    const setDateInterval = (interval: string) => {
        if (interval === "WEEK") {
            pastDate.setDate(currentDate.getDate() - 7);
            setInterval('WEEK');
        }
        if (interval === "DAY") {
            pastDate.setDate(currentDate.getDate() - 1);
            setInterval('DAY');
        }
        if (interval === "HOUR") {
            pastDate.setDate(currentDate.getDate() - 1);
            setInterval('HOUR');
        }
    }

    const getCurrentTokenPairs = () => {
        if(!pools || !currentToken) return;
        const pairs = pools.filter((pool:any) => pool.tokenA.id === currentToken.id || pool.tokenB.id === currentToken.id);
        let tradeTokens = pairs.map((pair:any) => pair.tokenA.id === currentToken.id ? pair.tokenB : pair.tokenA);
        setCurrentTradeTokens(tradeTokens);
    }

    const selectCurrentToken = (tokenId:string) => {
        const token = tokens.find((token:Token) => token.id === tokenId);
        if (token) {
            setCurrentToken(token);
            getCurrentTokenPairs();
        }
    }

    const selectTradeToken = (tokenId: string) => {
        const token = tokens.find((token:Token) => token.id === tokenId);
        if (token) {
            setTradeToken(token);
            setTradePrice(token.price);
        }
    }

    return (    
        <div className="z-10 w-full items-center justify-between font-mono text-sm lg:flex pt-4">
            <div className="flex w-full">
                <div className="grow pr-12">
                    <Menubar style={{borderColor: '#333', marginBottom: '2rem'}}>
                        <MenubarMenu>
                            <ButtonGroup>
                                <Button onClick={() => setDateInterval('WEEK')} className={interval === "WEEK" ? 'bg-gray-800' : ''} disabled={interval === "WEEK" ? true : false} variant="light" size="sm">Week</Button>
                                <Button onClick={() => setDateInterval('DAY')} className={interval === "DAY" ? 'bg-gray-800' : ''} disabled={interval === "DAY" ? true : false} variant="light" size="sm">Day</Button>
                                <Button onClick={() => setDateInterval('HOUR')} className={interval === "HOUR" ? 'bg-gray-800' : ''} disabled={interval === "HOUR" ? true : false} variant="light" size="sm">Hour</Button>
                            </ButtonGroup>
                        </MenubarMenu>
                    </Menubar>
                    {data && <TokenPriceChart data={data} />}
                </div>
                <div className="relative h-14 pr-6">
                    <div className="w-full flex">
                        {currentToken && currentToken.icon && (
                            <Image className="mt-1" width={40} alt="icon" src={`https://www.saucerswap.finance/${currentToken.icon}`} />
                        )}
                        <div className="px-3">
                            <h1 className="font-bold text-lg">{currentToken.symbol}</h1>
                            <p>{currentToken.name}</p>
                        </div>
                        <div className="pl-1">
                            <span className="text-xl text-green-500">${currentToken.priceUsd.toFixed(12)}</span>
                        </div>
                        <Dropdown placement="bottom-start">
                            <DropdownTrigger>
                                <div className="w-5 pt-1 pl-1 cursor-pointer">
                                    <ChevronDownIcon />
                                </div>
                            </DropdownTrigger>
                            <DropdownMenu onAction={(key) => (selectCurrentToken(key as string) )} className="max-h-72 overflow-scroll w-full" aria-label="Token Selection" items={tokens} variant="flat">
                                {(token:Token) => (
                                    <DropdownItem textValue={token.name} key={token.id} className="h-14 gap-2">
                                            <p>{token.name}</p>
                                    </DropdownItem>
                                )}
                            </DropdownMenu>
                        </Dropdown>
                    </div>
                    <div className="w-full pt-8 pb-8">
                        <Input
                            type="number"
                            value="0"
                            label="Trade Amount"
                            onChange={(e) => setTradeAmount(Number(e.target.value))}
                            labelPlacement="outside"
                            isDisabled={tradeToken ? false : true}
                            endContent={
                                <Chip className="cursor-pointer" radius="sm" size="sm">MAX</Chip>
                            }
                        />

                        <Input
                            type="number"
                            value={String(tradeAmount)}
                            label="Buy Amount"
                            labelPlacement="outside"
                            className="pt-4"
                            disabled={tradeToken ? false : true}
                            endContent={
                                <InputTokenSelect tokens={currentTradeTokens} onSelect={selectTradeToken} />
                            }
                        />
                    </div>
                    <div className="w-full flex flex-col gap-4">
                        <Switch size="sm" color="default" onValueChange={setStopLoss}>Stop Loss</Switch>
                        <Switch size="sm" color="default" onValueChange={setBuyOrder}>Buy Order</Switch>
                    </div>
                    {stopLoss && <div className="w-full my-4 flex flex-col gap-4">
                        <Input type="number" value="0" label="Stop Loss" labelPlacement="outside" />
                    </div>}
                    {buyOrder && <div className="w-full my-4 flex flex-col gap-4">
                        <Input type="number" value="0" label="Buy Amount" labelPlacement="outside" />
                    </div>}
                    <Button onClick={handleQuote} className="w-full mt-12" endContent={<ArrowsRightLeftIcon className="w-4 h-4" />}>Trade</Button>
                </div>
            </div>
        </div>
    );
}
