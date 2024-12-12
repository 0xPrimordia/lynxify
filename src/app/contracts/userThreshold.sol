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
    function refundETH() external payable;
    function multicall(bytes[] calldata data) external payable returns (bytes[] memory results);
}

interface IHederaTokenService {
    function approveTokenAllowance(address token, address owner, address spender, uint256 amount) external returns (int64);
}

contract userThreshold {
    address public owner;
    uint256 public currentPrice;
    uint256 public constant FEE_BASIS_POINTS = 8; // 0.08% fee
    address public feeCollector;
    
    address constant SAUCERSWAP_ROUTER = address(0x0000000000000000000000000000000000159398);
    address constant HEDERA_TOKEN_SERVICE = address(0x0000000000000000000000000000000000000167);

    struct Threshold {
        uint256 stopLossThreshold;
        uint256 buyOrderThreshold; 
        string hederaAccountId;
        address tokenAddress;
        uint256 stopLossAmount;
        uint256 buyOrderAmount;
        bool isActive;
    }

    mapping(string => Threshold) public userThresholds;

    event ThresholdsSet(string hederaAccountId, uint256 stopLossThreshold, uint256 buyOrderThreshold, address tokenAddress, uint256 stopLossAmount, uint256 buyOrderAmount);
    event ThresholdDebug(string message, string hederaAccountId, bool exists, bool isActive, uint256 stopLossAmount, uint256 buyOrderAmount);
    event ThresholdsDeactivated(string hederaAccountId);
    event OrderExecuted(string hederaAccountId, string orderType, uint256 currentPrice, address tokenAddress, uint256 amountOut);
    event ExecuteTradeDebug(string message, string hederaAccountId, bool isActive, string orderType, uint256 amount, bytes path);
    event StringCompare(string message, string stored, string lookup, bytes32 storedHash, bytes32 lookupHash);
    event RouterApprovalResult(string message, address token, uint256 amount, int64 result);
    event PathDebug(string message, bytes path, address recipient);
    event AmountDebug(string message, uint256 hbarAmount, uint256 relevantAmount, uint256 minimumOut);
    event MultiCallDebug(string message, bytes[] calls);
    event SwapResult(string message, uint256 amountOut, address recipient);
    event RecipientDebug(string message, string hederaAccountId, address derivedAddress);
    event RouterCallDebug(string message, bytes encodedCall);
    event PreTradeCheck(
        string message,
        uint256 msgValue,
        uint256 thresholdAmount,
        bool thresholdActive,
        string orderType,
        bytes path
    );
    event RouterParams(
        string message,
        bytes path,
        address recipient,
        uint256 amountIn,
        uint256 amountOutMinimum,
        address router,
        uint256 deadline
    );
    event MultiCallSetup(
        string message,
        uint256 callCount,
        bytes firstCall,
        bytes secondCall
    );
    event RouterCallDetails(
        string message,
        uint256 msgValue,
        address router,
        address recipient,
        bytes path
    );
    event FeeCollected(address indexed collector, uint256 amount);
    event FeeCalculated(uint256 tradeAmount, uint256 feeAmount, uint256 finalTradeAmount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor(address _owner) {
        owner = _owner;
        feeCollector = _owner; // Initially set fee collector to owner
    }

    function setFeeCollector(address _newCollector) external onlyOwner {
        require(_newCollector != address(0), "Invalid fee collector address");
        feeCollector = _newCollector;
    }

    function calculateFee(uint256 amount) public pure returns (uint256) {
        return (amount * FEE_BASIS_POINTS) / 10000;
    }

    function approveRouter(address token, uint256 amount) public {
        int64 result = IHederaTokenService(HEDERA_TOKEN_SERVICE).approveTokenAllowance(
            token,
            address(this),  // owner (the contract)
            SAUCERSWAP_ROUTER,  // spender
            amount
        );
        emit RouterApprovalResult("Router approval attempt", token, amount, result);
        require(result == 0, "Router approval failed");
    }

    function getThreshold(string memory hederaAccountId) public view returns (
        uint256 stopLossThreshold,
        uint256 buyOrderThreshold,
        string memory storedHederaId,
        address tokenAddress,
        uint256 stopLossAmount,
        uint256 buyOrderAmount,
        bool isActive
    ) {
        Threshold memory threshold = userThresholds[hederaAccountId];
        return (
            threshold.stopLossThreshold,
            threshold.buyOrderThreshold,
            threshold.hederaAccountId,
            threshold.tokenAddress,
            threshold.stopLossAmount,
            threshold.buyOrderAmount,
            threshold.isActive
        );
    }

    function setThresholds(
        uint256 _stopLossThreshold,
        uint256 _buyOrderThreshold,
        string memory _hederaAccountId,
        address _tokenAddress,
        uint256 _stopLossAmount,
        uint256 _buyOrderAmount
    ) public {
        require(_stopLossThreshold > 0 && _stopLossThreshold <= 10000, "Stop loss threshold must be between 1 and 10000 basis points");
        require(_buyOrderThreshold > 0 && _buyOrderThreshold <= 10000, "Buy order threshold must be between 1 and 10000 basis points");
        require(_stopLossAmount > 0, "Stop loss amount must be greater than zero");
        require(_buyOrderAmount > 0, "Buy order amount must be greater than zero");
        require(_tokenAddress != address(0), "Token address must be valid");
        require(bytes(_hederaAccountId).length > 0, "Hedera account ID must not be empty");

        emit ThresholdDebug(
            "Before setting threshold",
            _hederaAccountId,
            false,
            false,
            _stopLossAmount,
            _buyOrderAmount
        );

        userThresholds[_hederaAccountId] = Threshold(
            _stopLossThreshold,
            _buyOrderThreshold,
            _hederaAccountId,
            _tokenAddress,
            _stopLossAmount,
            _buyOrderAmount,
            true
        );
        
        Threshold memory setThreshold = userThresholds[_hederaAccountId];
        emit ThresholdDebug(
            "After setting threshold",
            _hederaAccountId,
            true,
            setThreshold.isActive,
            setThreshold.stopLossAmount,
            setThreshold.buyOrderAmount
        );

        emit ThresholdsSet(_hederaAccountId, _stopLossThreshold, _buyOrderThreshold, _tokenAddress, _stopLossAmount, _buyOrderAmount);
    }

    function executeTradeForUser(string memory hederaAccountId, string memory orderType, bytes memory path) public payable {
        Threshold storage threshold = userThresholds[hederaAccountId];
        require(threshold.isActive, "User thresholds are not active");

        // Handle fee calculation and collection
        (uint256 tradeAmount) = _handleFees(msg.value);

        // Execute the trade
        uint256 amountOut = _executeSwap(hederaAccountId, tradeAmount, path);

        // Update threshold and emit event
        threshold.isActive = false;
        emit OrderExecuted(
            hederaAccountId,
            orderType,
            currentPrice,
            threshold.tokenAddress,
            amountOut
        );
    }

    function _handleFees(uint256 amount) internal returns (uint256) {
        uint256 feeAmount = calculateFee(amount);
        uint256 tradeAmount = amount - feeAmount;

        emit FeeCalculated(amount, feeAmount, tradeAmount);

        (bool feeSuccess,) = feeCollector.call{value: feeAmount}("");
        require(feeSuccess, "Fee transfer failed");
        emit FeeCollected(feeCollector, feeAmount);

        return tradeAmount;
    }

    function _executeSwap(string memory hederaAccountId, uint256 tradeAmount, bytes memory path) internal returns (uint256) {
        ISaucerSwapV2SwapRouter ROUTER = ISaucerSwapV2SwapRouter(SAUCERSWAP_ROUTER);
        address recipientAddress = _deriveRecipientAddress(hederaAccountId);

        ISaucerSwapV2SwapRouter.ExactInputParams memory params = 
            ISaucerSwapV2SwapRouter.ExactInputParams({
                path: path,
                recipient: recipientAddress,
                deadline: block.timestamp + 60,
                amountIn: tradeAmount,
                amountOutMinimum: 0
            });

        bytes[] memory encodedCalls = new bytes[](2);
        encodedCalls[0] = abi.encodeWithSelector(
            ROUTER.exactInput.selector,
            params
        );
        encodedCalls[1] = abi.encodeWithSelector(
            ROUTER.refundETH.selector
        );

        uint256 amountOut;
        try ROUTER.multicall{value: tradeAmount}(encodedCalls) returns (bytes[] memory results) {
            amountOut = abi.decode(results[0], (uint256));
            emit SwapResult("Swap success", amountOut, recipientAddress);
        } catch Error(string memory reason) {
            emit SwapResult("Swap failed with reason", 0, recipientAddress);
            revert(string(abi.encodePacked("Router call failed: ", reason)));
        } catch {
            emit SwapResult("Swap failed with unknown reason", 0, recipientAddress);
            revert("Router call failed: unknown reason");
        }

        return amountOut;
    }

    function _deriveRecipientAddress(string memory hederaAccountId) internal pure returns (address) {
        string[] memory parts = split(hederaAccountId, ".");
        require(parts.length == 3, "Invalid Hedera account ID format");
        
        uint256 shard = stringToUint(parts[0]);
        uint256 realm = stringToUint(parts[1]);
        uint256 accountNum = stringToUint(parts[2]);
        
        return address(
            uint160(
                (shard << 40) | (realm << 32) | accountNum
            )
        );
    }

    function split(string memory _base, string memory _delimiter) internal pure returns (string[] memory) {
        bytes memory baseBytes = bytes(_base);
        uint count = 1;
        for(uint i = 0; i < baseBytes.length; i++) {
            if(baseBytes[i] == bytes(_delimiter)[0]) count++;
        }
        
        string[] memory parts = new string[](count);
        uint start = 0;
        uint partIndex = 0;
        
        for(uint i = 0; i < baseBytes.length; i++) {
            if(baseBytes[i] == bytes(_delimiter)[0]) {
                parts[partIndex] = substring(_base, start, i);
                start = i + 1;
                partIndex++;
            }
        }
        parts[partIndex] = substring(_base, start, baseBytes.length);
        return parts;
    }

    function substring(string memory str, uint startIndex, uint endIndex) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        bytes memory result = new bytes(endIndex-startIndex);
        for(uint i = startIndex; i < endIndex; i++) {
            result[i-startIndex] = strBytes[i];
        }
        return string(result);
    }

    function stringToUint(string memory s) internal pure returns (uint) {
        bytes memory b = bytes(s);
        uint result = 0;
        for(uint i = 0; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            if (c >= 48 && c <= 57) {
                result = result * 10 + (c - 48);
            }
        }
        return result;
    }

    function calculateMinimumAmountOut(uint256 amountIn, uint256 slippageTolerance) internal pure returns (uint256) {
        return amountIn * slippageTolerance / 1000;
    }

    function deactivateThresholds(string memory hederaAccountId) public {
        require(userThresholds[hederaAccountId].isActive, "No active thresholds found");
        userThresholds[hederaAccountId].isActive = false;
        emit ThresholdsDeactivated(hederaAccountId);
    }
}