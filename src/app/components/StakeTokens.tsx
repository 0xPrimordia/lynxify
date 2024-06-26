import { FunctionComponent, useState, useEffect } from "react";
import { Card, Button, CardHeader, Divider, CardBody, Image, CardFooter, Autocomplete, AutocompleteItem } from "@nextui-org/react";

type Token = {
    deimals: number;
    dueDiligenceComplete: boolean;
    icon: string;
    id: string;
    name: string;
    price: string;
    priceUsd: number;
    symbol: string;
}
interface StakeTokensProps {
    stakeTokens: Function;
}
 
const StakeTokens: FunctionComponent<StakeTokensProps> = ({stakeTokens}) => {
    const [amount, setAmount] = useState('')
    const [tokens, setTokens] = useState<Token[]>()

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch("/api/saucerswap/tokens")
                if(response) {
                    const data = await response.json()
                    setTokens(data)
                    console.log(data)
                    //return data;
                }
            } catch (error) {
                console.error('Error fetching Supported Tokens:', error);
            }
        }
        fetchData()
    }, [])

    return (
        <>
            {tokens && (
                 <Card className='pr-1'>
                 <CardHeader className="flex gap-3">
                     <Image
                     alt="Port to Hedera"
                     height={40}
                     radius="sm"
                     src="/images/lxy.png"
                     width={40}
                     />
                     <div className="flex flex-col">
                     <p className="text-md">Stake Tokens</p>
                     <p className="text-small text-default-500">Select token to stake for LXY earnings and<br/>passively earn from <span className="underline">automated LP Pairing</span>.</p>
                     </div>
                 </CardHeader>
                 <Divider/>
                 <CardBody className="text-center p-10">
                     <Autocomplete
                             defaultItems={Object.values(tokens)}
                             label="Select Asset"
                             placeholder="Search Assets"
                             onSelectionChange={() => {}}
                             className="mb-6"
                         >
                         {(asset) => <AutocompleteItem key={asset.id}>{asset.name}</AutocompleteItem>}
                     </Autocomplete>
                     <input
                         type="number"
                         placeholder="Amount to Stake"
                         className="border p-2 rounded w-full mb-2"
                         value={amount}
                         onChange={(e) => setAmount(e.target.value)}
                     />
                 </CardBody>
                 <Divider/>
                 <CardFooter>
                     <Button
                         onClick={() => stakeTokens(amount)}
                         className="p-2 rounded w-full"
                     >
                         Stake
                     </Button>
                 </CardFooter>
             </Card>
            )}
        </>
    );
}
 
export default StakeTokens;