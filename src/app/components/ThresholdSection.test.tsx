import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThresholdSection, ThresholdSectionProps } from './ThresholdSection';
import { verifyThresholdTokens } from '@/app/lib/tokens/thresholdAssociation';
import { associateToken } from '@/app/lib/utils/tokens';
import { Token } from '@/app/types';
import Image from 'next/image';

// Mock Next.js Image component
jest.mock('next/image', () => ({
    __esModule: true,
    default: (props: any) => {
        return <img {...props} src={props.src || ''} alt={props.alt || 'Mock image'} />
    },
}));

// Mock hedera-wallet-connect
jest.mock('@hashgraph/hedera-wallet-connect', () => ({
    transactionToBase64String: jest.fn()
}));

// Mock dependencies
jest.mock('@/app/lib/threshold');
jest.mock('@/app/lib/tokens/thresholdAssociation', () => ({
    verifyThresholdTokens: jest.fn()
}));
jest.mock('@/app/lib/utils/tokens', () => ({
    associateToken: jest.fn(),
    getTokenImageUrl: jest.fn()
}));

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

        render(<ThresholdSection {...defaultProps} />);
        
        // Click expand button first
        const expandButton = screen.getByRole('button', { 
            name: /Expand limit section/i
        });
        fireEvent.click(expandButton);
        
        // Click the Set Limit Order button
        const limitButton = screen.getByRole('button', { 
            name: /Set Limit Order/i 
        });
        fireEvent.click(limitButton);

        await waitFor(() => {
            expect(verifyThresholdTokens).toHaveBeenCalledWith(
                '0.0.123456',
                'token1',
                'token2',
                expect.any(Boolean)
            );
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
            name: /Expand limit section/i
        });
        fireEvent.click(expandButton);

        // Click the Set Limit Order button
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
            name: /Expand limit section/i
        });
        fireEvent.click(expandButton);

        // Click the Set Limit Order button
        const limitButton = screen.getByRole('button', { 
            name: /Set Limit Order/i 
        });
        fireEvent.click(limitButton);

        await waitFor(() => {
            expect(associateToken).not.toHaveBeenCalled();
            expect(mockExecuteTransaction).not.toHaveBeenCalled();
            expect(mockSaveThresholds).toHaveBeenCalled();
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
            name: /Expand limit section/i
        });
        fireEvent.click(expandButton);

        // Click the Set Limit Order button
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

    it('should handle API errors when setting threshold', async () => {
        (verifyThresholdTokens as jest.Mock).mockResolvedValueOnce({
            needsAssociation: false
        });
        mockSaveThresholds.mockRejectedValueOnce(
            new Error('API Error: Unauthorized')
        );

        render(<ThresholdSection {...defaultProps} />);

        // Click expand button first
        const expandButton = screen.getByRole('button', { 
            name: /Expand limit section/i
        });
        fireEvent.click(expandButton);

        // Click the Set Limit Order button
        const limitButton = screen.getByRole('button', { 
            name: /Set Limit Order/i 
        });
        fireEvent.click(limitButton);

        await waitFor(() => {
            expect(mockSetError).toHaveBeenCalledWith('API Error: Unauthorized');
        });
    });

    it('should successfully set threshold after token association', async () => {
        const mockVerifyThresholdTokens = require('@/app/lib/tokens/thresholdAssociation').verifyThresholdTokens;
        mockVerifyThresholdTokens.mockResolvedValue({
            needsAssociation: false
        });

        const mockSaveThresholds = jest.fn().mockResolvedValue(undefined);
        const setBuyOrderPrice = jest.fn();
        const setBuyOrderCap = jest.fn();

        const { getByText, getAllByRole } = render(
            <ThresholdSection 
                {...defaultProps}
                selectedThresholdType="buyOrder"
                saveThresholds={mockSaveThresholds}
                setBuyOrderPrice={setBuyOrderPrice}
                setBuyOrderCap={setBuyOrderCap}
                buyOrderPrice="1.5"  // Set initial values
                buyOrderCap="100"
            />
        );

        // Expand section
        fireEvent.click(getByText('+'));

        // Get inputs and set values
        const inputs = getAllByRole('spinbutton');
        const [priceInput, capInput] = inputs;

        // Set values directly
        await waitFor(async () => {
            fireEvent.change(priceInput, { target: { value: '1.5' } });
            fireEvent.blur(priceInput);
        });

        await waitFor(async () => {
            fireEvent.change(capInput, { target: { value: '100' } });
            fireEvent.blur(capInput);
        });

        // Submit form
        await waitFor(async () => {
            fireEvent.click(getByText('Set Limit Order'));
        });

        expect(mockSaveThresholds).toHaveBeenCalledWith({
            type: 'buyOrder',
            price: 1.5,
            cap: 100,
            hederaAccountId: '0.0.123456',
            tokenA: 'token1',
            tokenB: 'token2',
            fee: 3000,
            slippageBasisPoints: 50
        });
    });

    it('should validate input values before submission', async () => {
        const mockSaveThresholds = jest.fn();
        const mockSetError = jest.fn();

        const { getByText, getAllByRole } = render(
            <ThresholdSection 
                {...defaultProps}
                selectedThresholdType="buyOrder"
                saveThresholds={mockSaveThresholds}
                setError={mockSetError}
            />
        );

        // Expand section
        fireEvent.click(getByText('+'));

        // Get inputs and set invalid values
        const inputs = getAllByRole('spinbutton');
        const [priceInput, capInput] = inputs;

        // Need to wait for state updates
        await waitFor(async () => {
            fireEvent.change(priceInput, { target: { value: '-1' } });
        });
        await waitFor(async () => {
            fireEvent.change(capInput, { target: { value: '0' } });
        });

        // Mock verifyThresholdTokens to throw error
        const mockVerifyThresholdTokens = require('@/app/lib/tokens/thresholdAssociation').verifyThresholdTokens;
        mockVerifyThresholdTokens.mockRejectedValue(new Error('Invalid input values'));

        // Submit form
        await waitFor(async () => {
            fireEvent.click(getByText('Set Limit Order'));
        });

        expect(mockSetError).toHaveBeenCalledWith('Invalid input values');
        expect(mockSaveThresholds).not.toHaveBeenCalled();
    });

    it('should set correct threshold type when expanding section', async () => {
        const mockSetSelectedThresholdType = jest.fn();
        
        const { getByRole } = render(
            <ThresholdSection 
                {...defaultProps}
                mode="sell"
                selectedThresholdType={null}
                setSelectedThresholdType={mockSetSelectedThresholdType}
            />
        );

        // Click expand button
        const expandButton = getByRole('button', { 
            name: 'Expand limit section'
        });
        fireEvent.click(expandButton);

        // Verify threshold type was set correctly
        expect(mockSetSelectedThresholdType).toHaveBeenCalledWith('sellOrder');

        // Test buy mode
        const { getByRole: getBuyRole } = render(
            <ThresholdSection 
                {...defaultProps}
                mode="buy"
                selectedThresholdType={null}
                setSelectedThresholdType={mockSetSelectedThresholdType}
            />
        );

        fireEvent.click(getBuyRole('button', { name: 'Expand limit section' }));
        expect(mockSetSelectedThresholdType).toHaveBeenCalledWith('buyOrder');
    });
}); 