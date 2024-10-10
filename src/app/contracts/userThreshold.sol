// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ISaucerSwapV2SwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
    function unwrapWHBAR(uint256 amountMinimum, address recipient) external payable;
    function multicall(bytes[] calldata data) external payable returns (bytes[] memory results);
}

contract userThreshold {
    address public owner;
    uint256 public currentPrice;
    address public authorizedExecutor;
    address public constant WHBAR = 0x0000000000000000000000000000000000000000; // Replace with actual WHBAR address

    struct Threshold {
        uint256 stopLossThreshold;
        uint256 buyOrderThreshold; 
        string hederaAccountId;
        address tokenAddress;
        uint256 stopLossAmount;
        uint256 buyOrderAmount;
        bool isActive;
    }

    mapping(address => Threshold) public userThresholds;

    event ThresholdsSet(address user, uint256 stopLossThreshold, uint256 buyOrderThreshold, string hederaAccountId, address tokenAddress, uint256 stopLossAmount, uint256 buyOrderAmount);
    event PriceUpdated(uint256 newPrice);
    event OrderExecuted(address user, string orderType, uint256 price, string hederaAccountId, address tokenAddress, uint256 amountOut);
    event ThresholdsDeactivated(address user);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the contract owner can call this function");
        _;
    }

    modifier onlyAuthorizedExecutor() {
        require(msg.sender == authorizedExecutor, "Only the authorized executor can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setAuthorizedExecutor(address _executor) public onlyOwner {
        authorizedExecutor = _executor;
    }

    function setThresholds(uint256 _stopLossThreshold, uint256 _buyOrderThreshold, string memory _hederaAccountId, address _tokenAddress, uint256 _stopLossAmount, uint256 _buyOrderAmount) public {
        userThresholds[msg.sender] = Threshold(_stopLossThreshold, _buyOrderThreshold, _hederaAccountId, _tokenAddress, _stopLossAmount, _buyOrderAmount, true);
        emit ThresholdsSet(msg.sender, _stopLossThreshold, _buyOrderThreshold, _hederaAccountId, _tokenAddress, _stopLossAmount, _buyOrderAmount);
    }

    function executeTradeForUser(address user, string memory orderType, bytes memory path) public onlyAuthorizedExecutor {
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

        ISaucerSwapV2SwapRouter ROUTER = ISaucerSwapV2SwapRouter(0x00000000000000000000000000000000003c437A); // Replace with actual router address

        ISaucerSwapV2SwapRouter.ExactInputParams memory params = 
            ISaucerSwapV2SwapRouter.ExactInputParams({
                path: path,
                recipient: user,
                deadline: block.timestamp + 15 minutes,
                amountIn: amount,
                amountOutMinimum: calculateMinimumAmountOut(amount, 995) // 0.5% slippage tolerance
            });

        uint256 amountOut = ROUTER.exactInput(params);

        userThresholds[user].isActive = false;

        emit OrderExecuted(user, orderType, currentPrice, threshold.hederaAccountId, threshold.tokenAddress, amountOut);
    }

    function calculateMinimumAmountOut(uint256 amountIn, uint256 slippageTolerance) internal pure returns (uint256) {
        return amountIn * slippageTolerance / 1000;
    }

    function deactivateThresholds() public {
        require(userThresholds[msg.sender].isActive, "No active thresholds found");
        userThresholds[msg.sender].isActive = false;
        emit ThresholdsDeactivated(msg.sender);
    }
}