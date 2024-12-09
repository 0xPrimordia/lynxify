import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider("https://testnet./api", '', {
    batchMaxCount: 1, //workaround for V6
});

export default provider;
