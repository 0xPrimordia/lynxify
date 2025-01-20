require('dotenv').config({ path: '.env.local' })
const nodeFetch = require('node-fetch')
global.fetch = nodeFetch 

// Add ethers and other test utilities
const { ethers } = require('ethers')
global.ethers = ethers 