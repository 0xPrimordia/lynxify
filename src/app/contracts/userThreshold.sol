// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ISaucerSwapV2SwapRouter {
    struct ExactInputSingleParams {
        uint256 tokenIn;
        address tokenOut;
        uint32 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

contract userThreshold {
    address public owner;
    uint256 public currentPrice;
    address public authorizedExecutor;

    struct Threshold {
        uint256 stopLossThreshold;
        uint256 buyOrderThreshold; 
        string hederaAccountId;
        uint256 tokenId;
        uint256 stopLossAmount;
        uint256 buyOrderAmount;
        bool isActive;
    }

    mapping(address => Threshold) public userThresholds;

    event ThresholdsSet(address user, uint256 stopLossThreshold, uint256 buyOrderThreshold, string hederaAccountId, uint256 tokenId, uint256 stopLossAmount, uint256 buyOrderAmount);
    event PriceUpdated(uint256 newPrice);
    event OrderExecuted(address user, string orderType, uint256 price, string hederaAccountId, uint256 tokenId, uint256 amount);
    event ThresholdsDeactivated(address user);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the contract owner can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    modifier onlyAuthorizedExecutor() {
        require(msg.sender == authorizedExecutor, "Only the authorized executor can call this function");
        _;
    }

    function setAuthorizedExecutor(address _executor) public onlyOwner {
        authorizedExecutor = _executor;
    }

    function setThresholds(uint256 _stopLossThreshold, uint256 _buyOrderThreshold, string memory _hederaAccountId, uint256 _tokenId, uint256 _stopLossAmount, uint256 _buyOrderAmount) public {
        userThresholds[msg.sender] = Threshold(_stopLossThreshold, _buyOrderThreshold, _hederaAccountId, _tokenId, _stopLossAmount, _buyOrderAmount, true);
        emit ThresholdsSet(msg.sender, _stopLossThreshold, _buyOrderThreshold, _hederaAccountId, _tokenId, _stopLossAmount, _buyOrderAmount);
    }

    function calculateMinimumAmountOut(uint256 amountIn, uint256 slippageTolerance) internal pure returns (uint256) {
        return amountIn * slippageTolerance / 1000;
    }

    function executeTradeForUser(address user, string memory orderType) public onlyAuthorizedExecutor {
        Threshold memory threshold = userThresholds[user];
        require(threshold.isActive, "User thresholds are not active");

        uint256 amount;
        if (keccak256(abi.encodePacked(orderType)) == keccak256(abi.encodePacked("stopLoss"))) {
            amount = threshold.stopLossAmount;
        } else if (keccak256(abi.encodePacked(orderType)) == keccak256(abi.encodePacked("buyOrder"))) {
            amount = threshold.buyOrderAmount;
        } else {
            revert("Invalid order type");
        }
        // Define the router
        ISaucerSwapV2SwapRouter ROUTER = ISaucerSwapV2SwapRouter(0x00000000000000000000000000000000003c437A); // Replace with 0.0.3949434

        // Define swap parameters
        ISaucerSwapV2SwapRouter.ExactInputSingleParams memory params = 
            ISaucerSwapV2SwapRouter.ExactInputSingleParams({
                tokenIn: threshold.tokenId,
                tokenOut: address(0), // HBAR address (always use this for HBAR)
                fee: 3000, // Assuming 0.3% fee, adjust if different
                recipient: user,
                deadline: block.timestamp + 15 minutes,
                amountIn: amount,
                amountOutMinimum: calculateMinimumAmountOut(amount, 995), // 0.5% slippage tolerance
                sqrtPriceLimitX96: 0
            });

        // Execute the swap
        uint256 amountOut = ROUTER.exactInputSingle(params);
        

        // Update user's threshold status
        userThresholds[user].isActive = false;

        emit OrderExecuted(user, orderType, currentPrice, threshold.hederaAccountId, threshold.tokenId, amountOut);
    }

    function deactivateThresholds() public {
        require(userThresholds[msg.sender].isActive, "No active thresholds found");
        userThresholds[msg.sender].isActive = false;
        emit ThresholdsDeactivated(msg.sender);
    }
}