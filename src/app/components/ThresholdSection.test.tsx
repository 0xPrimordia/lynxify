import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThresholdSection, ThresholdSectionProps } from './ThresholdSection';
import { verifyThresholdTokens } from '@/app/lib/tokens/thresholdAssociation';
import { associateToken } from '@/app/lib/utils/tokens';

// Mock Next.js Image component
jest.mock('next/image', () => ({
    __esModule: true,
    default: (props: any) => {
        return <img {...props} src={props.src || ''} />
    },
}));

// Mock hedera-wallet-connect
jest.mock('@hashgraph/hedera-wallet-connect', () => ({
    transactionToBase64String: jest.fn()
}));

// Mock dependencies
jest.mock('@/app/lib/threshold');
jest.mock('@/app/lib/tokens/thresholdAssociation');
jest.mock('@/app/lib/utils/tokens');

// Mock NextUI components
jest.mock('@nextui-org/react', () => ({
    Button: ({ children, onPress, isLoading, isDisabled, ...props }: any) => (
        <button 
            onClick={onPress} 
            disabled={isDisabled}
            {...props}
        >
            {isLoading ? 'Loading...' : children}
        </button>
    ),
    Input: ({ value, onChange, startContent, classNames, ...props }: any) => (
        <div className={classNames?.mainWrapper}>
            {startContent}
            <input 
                value={value} 
                onChange={e => onChange?.(e)} 
                className={classNames?.input}
                {...props} 
            />
        </div>
    ),
    Select: ({ children, ...props }: any) => <select {...props}>{children}</select>,
    SelectItem: ({ children, ...props }: any) => <option {...props}>{children}</option>,
    Chip: ({ children, onClick, ...props }: any) => (
        <span onClick={onClick} {...props}>{children}</span>
    ),
    Tooltip: ({ children }: any) => children,
}));

describe('ThresholdSection', () => {
    const mockExecuteTransaction = jest.fn();
    const mockSetError = jest.fn();
    const mockSetIsSubmitting = jest.fn();
    const mockResetThresholdForm = jest.fn();
    const mockSaveThresholds = jest.fn();
    
    const defaultProps: ThresholdSectionProps = {
        executeTransaction: mockExecuteTransaction,
        activeAccount: '0.0.123456',
        setError: mockSetError,
        setIsSubmitting: mockSetIsSubmitting,
        resetThresholdForm: mockResetThresholdForm,
        currentToken: { 
            id: 'token1',
            decimals: 8,
            dueDiligenceComplete: true,
            icon: '',
            name: 'Token1',
            symbol: 'TK1',
            priceUsd: 1,
            price: '1',
            isFeeOnTransferToken: false
        },
        tradeToken: { 
            id: 'token2',
            decimals: 8,
            dueDiligenceComplete: true,
            icon: '',
            name: 'Token2',
            symbol: 'TK2',
            priceUsd: 1,
            price: '1',
            isFeeOnTransferToken: false
        },
        mode: 'buy',
        selectedThresholdType: 'stopLoss' as 'stopLoss' | 'buyOrder' | 'sellOrder' | null,
        setSelectedThresholdType: jest.fn(),
        currentPool: { tokenA: { id: 'token1' }, tokenB: { id: 'token2' }, fee: 3000 },
        stopLossPrice: '0',
        setStopLossPrice: jest.fn(),
        stopLossCap: '0',
        setStopLossCap: jest.fn(),
        stopLossSlippage: 0.5,
        setStopLossSlippage: jest.fn(),
        buyOrderPrice: '0',
        setBuyOrderPrice: jest.fn(),
        buyOrderCap: '0',
        setBuyOrderCap: jest.fn(),
        buyOrderSlippage: 0.5,
        setBuyOrderSlippage: jest.fn(),
        sellOrderPrice: '0',
        setSellOrderPrice: jest.fn(),
        sellOrderCap: '0',
        setSellOrderCap: jest.fn(),
        sellOrderSlippage: 0.5,
        setSellOrderSlippage: jest.fn(),
        isSubmitting: false,
        handleInputFocus: jest.fn(),
        adjustStopLossPrice: jest.fn(),
        adjustSellOrderPrice: jest.fn(),
        adjustBuyOrderPrice: jest.fn(),
        hanndleMaxClickStopLoss: jest.fn(),
        handleMaxClickSellOrder: jest.fn(),
        saveThresholds: mockSaveThresholds,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('handles successful token association and threshold creation', async () => {
        (verifyThresholdTokens as jest.Mock).mockResolvedValueOnce({
            needsAssociation: true,
            token: 'token1'
        });
        (associateToken as jest.Mock).mockResolvedValueOnce('mockAssociateTx');
        mockExecuteTransaction.mockResolvedValueOnce({ status: 'SUCCESS' });
        mockSaveThresholds.mockResolvedValueOnce(undefined);

        const { container, debug } = render(<ThresholdSection {...defaultProps} />);
        
        // Click expand button first
        const expandButton = screen.getByRole('button', { 
            name: 'Expand limit section'
        });
        console.log('Before click - Expanded state:', expandButton.getAttribute('aria-expanded'));
        fireEvent.click(expandButton);
        console.log('After click - Expanded state:', expandButton.getAttribute('aria-expanded'));
        
        // Debug the entire rendered output
        console.log('\nFull component structure:');
        debug();

        // Try to find the button with more lenient query
        const allButtons = screen.getAllByRole('button');
        console.log('\nAll available buttons:', 
            allButtons.map(button => ({
                text: button.textContent,
                ariaLabel: button.getAttribute('aria-label')
            }))
        );

        // Original test continues...
        const limitButton = screen.getByRole('button', { 
            name: /Set Limit Order/i 
        });
        fireEvent.click(limitButton);

        await waitFor(() => {
            expect(verifyThresholdTokens).toHaveBeenCalled();
            expect(associateToken).toHaveBeenCalledWith('0.0.123456', 'token1');
            expect(mockExecuteTransaction).toHaveBeenCalledWith(
                'mockAssociateTx',
                'Associate token1 token'
            );
            expect(mockSaveThresholds).toHaveBeenCalled();
            expect(mockResetThresholdForm).toHaveBeenCalled();
        });
    });

    it('handles failed token association', async () => {
        (verifyThresholdTokens as jest.Mock).mockResolvedValueOnce({
            needsAssociation: true,
            token: 'token1'
        });
        (associateToken as jest.Mock).mockResolvedValueOnce('mockAssociateTx');
        mockExecuteTransaction.mockResolvedValueOnce({ 
            status: 'ERROR',
            error: 'Association failed'
        });

        render(<ThresholdSection {...defaultProps} />);

        // Click expand button first
        const expandButton = screen.getByRole('button', { 
            name: 'Expand limit section'
        });
        fireEvent.click(expandButton);

        // Now click the Set Limit Order button
        const limitButton = screen.getByRole('button', { 
            name: /Set Limit Order/i 
        });
        fireEvent.click(limitButton);

        await waitFor(() => {
            expect(mockSetError).toHaveBeenCalledWith('Association failed');
            expect(mockSetIsSubmitting).toHaveBeenCalledWith(false);
            expect(mockResetThresholdForm).not.toHaveBeenCalled();
        });
    });

    it('skips association when tokens are already associated', async () => {
        (verifyThresholdTokens as jest.Mock).mockResolvedValueOnce({
            needsAssociation: false
        });

        render(<ThresholdSection {...defaultProps} />);

        // Click expand button first
        const expandButton = screen.getByRole('button', { 
            name: 'Expand limit section'
        });
        fireEvent.click(expandButton);

        // Now click the Set Limit Order button
        const limitButton = screen.getByRole('button', { 
            name: /Set Limit Order/i 
        });
        fireEvent.click(limitButton);

        await waitFor(() => {
            expect(associateToken).not.toHaveBeenCalled();
            expect(mockExecuteTransaction).not.toHaveBeenCalled();
            expect(mockResetThresholdForm).toHaveBeenCalled();
        });
    });

    it('handles network errors during verification', async () => {
        (verifyThresholdTokens as jest.Mock).mockRejectedValueOnce(
            new Error('Network error')
        );

        render(<ThresholdSection {...defaultProps} />);

        // Click expand button first
        const expandButton = screen.getByRole('button', { 
            name: 'Expand limit section'
        });
        fireEvent.click(expandButton);

        // Now click the Set Limit Order button
        const limitButton = screen.getByRole('button', { 
            name: /Set Limit Order/i 
        });
        fireEvent.click(limitButton);

        await waitFor(() => {
            expect(mockSetError).toHaveBeenCalledWith('Network error');
            expect(mockSetIsSubmitting).toHaveBeenCalledWith(false);
            expect(mockResetThresholdForm).not.toHaveBeenCalled();
        });
    });
}); 