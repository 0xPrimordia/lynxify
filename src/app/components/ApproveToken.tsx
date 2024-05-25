import { useEffect } from "react";
import { Web3, ContractAbi } from "web3";
const web3 = new Web3(`https://goerli.infura.io/v3/${process.env.NEXT_PUBLIC_INFURIA}`);

type ApproveToken = {
    abi: string,
    amount: string,
    networkId: number,
    spender: string,
    target: string,
    type: string
}

export default function approveToken(params:ApproveToken) {
    const abi = JSON.parse(params.abi)
    const contract = new web3.eth.Contract(abi, params.target)

    const approveTokens = async () => {
        const accounts = await web3.eth.getAccounts();
        const receipt = await contract.methods.approve(params.spender, params.amount)
            .send({ from: accounts[0] });
        console.log('Approval receipt:', receipt);
    };

    approveTokens()

}