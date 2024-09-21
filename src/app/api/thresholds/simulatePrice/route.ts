import { ethers } from "ethers";
import abi from "../../../contracts/StopLossBuyOrder.json";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { price, userAddress } = req.body;
    
    const provider = new ethers.JsonRpcProvider("https://testnet.hedera.com");
    const signer = await provider.getSigner(userAddress);
    const contract = new ethers.Contract("0xYourContractAddress", abi, signer);
    
    try {
      await contract.simulatePriceUpdate(price);
      res.status(200).json({ message: `Price updated to ${price}` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
