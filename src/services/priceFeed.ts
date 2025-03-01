interface TokenPriceData {
    price: number;
    timestamp: number;
    confidence: number;
    volatility?: number;
}

interface PriceHistory {
    prices: number[];
    timestamps: number[];
    volume?: number[];
}

interface HistoricalDataParams {
    basePrice: number;
    volatility: number;
    trendBias: number;  // -1 to 1, where -1 is bearish, 1 is bullish
    timeframe: '1h' | '24h' | '7d';
}

export class PriceFeedService {
    private kit: typeof HederaAgentKit;
    private priceCache: Map<string, TokenPriceData>;
    private historicalData: Map<string, PriceHistory>;
    private readonly baseParams: Record<string, HistoricalDataParams> = {
        HBAR: { basePrice: 0.07, volatility: 0.1, trendBias: 0.3, timeframe: '24h' },
        SAUCE: { basePrice: 0.015, volatility: 0.15, trendBias: 0.5, timeframe: '24h' },
        CLXY: { basePrice: 0.025, volatility: 0.2, trendBias: 0.2, timeframe: '24h' }
    };
    
    constructor(
        operatorId: string,
        operatorKey: string,
        network: 'testnet' | 'mainnet'
    ) {
        this.kit = new HederaAgentKit(
            operatorId,
            operatorKey,
            network
        );
        this.priceCache = new Map();
        this.historicalData = new Map();
        this.initializeHistoricalData();
    }

    private initializeHistoricalData() {
        Object.entries(this.baseParams).forEach(([token, params]) => {
            const history = this.generateHistoricalData(params);
            this.historicalData.set(token, history);
        });
    }

    private generateHistoricalData(params: HistoricalDataParams): PriceHistory {
        const points = params.timeframe === '1h' ? 60 : params.timeframe === '24h' ? 24 : 168;
        const interval = params.timeframe === '1h' ? 60000 : params.timeframe === '24h' ? 3600000 : 86400000;
        
        const prices: number[] = [];
        const timestamps: number[] = [];
        const volume: number[] = [];
        
        let currentPrice = params.basePrice;
        let currentTimestamp = Date.now() - (points * interval);

        for (let i = 0; i < points; i++) {
            // Generate realistic price movement
            const random = Math.random() - 0.5;
            const trend = params.trendBias * (i / points); // Increasing trend influence over time
            const volatilityFactor = params.volatility * Math.sqrt(interval / 86400000); // Scale volatility by time
            
            const priceChange = currentPrice * (
                (random * volatilityFactor) + // Random movement
                (trend * volatilityFactor) + // Trend influence
                (Math.sin(i / 10) * volatilityFactor * 0.5) // Cyclic pattern
            );

            currentPrice += priceChange;
            currentPrice = Math.max(currentPrice, params.basePrice * 0.1); // Prevent negative prices
            
            prices.push(currentPrice);
            timestamps.push(currentTimestamp);
            
            // Generate matching volume
            const baseVolume = params.basePrice * 1000000;
            const volumeVariation = (Math.random() + 0.5) * baseVolume;
            volume.push(volumeVariation);
            
            currentTimestamp += interval;
        }

        return { prices, timestamps, volume };
    }

    async getTokenPrice(token: string): Promise<TokenPriceData> {
        // Check cache first (1 minute validity)
        const cached = this.priceCache.get(token);
        if (cached && Date.now() - cached.timestamp < 60000) {
            return cached;
        }

        try {
            // Get historical data for analysis
            const history = this.historicalData.get(token);
            
            // Use HederaAgentKit to get price prediction
            const analysis = await this.kit.analyzePriceData({
                token,
                timeframe: '1h',
                context: {
                    recentTrades: await this.getRecentTrades(token),
                    marketTrends: await this.getMarketTrends(),
                    historicalData: history
                }
            });

            const priceData: TokenPriceData = {
                price: analysis.predictedPrice,
                timestamp: Date.now(),
                confidence: analysis.confidence,
                volatility: analysis.volatility
            };

            this.priceCache.set(token, priceData);
            return priceData;

        } catch (error) {
            console.warn(`Failed to get AI price analysis for ${token}, using fallback`, error);
            return this.getFallbackPrice(token);
        }
    }

    async getHistoricalData(token: string, timeframe: '1h' | '24h' | '7d'): Promise<PriceHistory> {
        const params = this.baseParams[token];
        if (!params) {
            throw new Error(`No historical data parameters for token: ${token}`);
        }

        params.timeframe = timeframe;
        return this.generateHistoricalData(params);
    }

    private async getRecentTrades(token: string): Promise<any> {
        const history = this.historicalData.get(token);
        if (!history) {
            return this.generateDefaultTrades(token);
        }

        // Use last 3 points from historical data
        const recent = {
            prices: history.prices.slice(-3),
            timestamps: history.timestamps.slice(-3),
            volumes: history.volume?.slice(-3)
        };

        return {
            trades: recent.prices.map((price, i) => ({
                price,
                volume: recent.volumes?.[i] || 1000,
                timestamp: recent.timestamps[i]
            })),
            volume24h: recent.volumes?.reduce((a, b) => a + b, 0) || 100000,
            priceChange24h: (recent.prices[2] - recent.prices[0]) / recent.prices[0]
        };
    }

    private generateDefaultTrades(token: string): any {
        const basePrice = this.baseParams[token]?.basePrice || 1.0;
        return {
            trades: [
                { price: basePrice, volume: 1000, timestamp: Date.now() - 3600000 },
                { price: basePrice * 1.02, volume: 1500, timestamp: Date.now() - 1800000 },
                { price: basePrice * 0.98, volume: 2000, timestamp: Date.now() }
            ],
            volume24h: 100000,
            priceChange24h: -0.02
        };
    }

    private async getMarketTrends(): Promise<any> {
        // Calculate correlations from historical data
        const correlations: Record<string, Record<string, number>> = {};
        const tokens = Object.keys(this.baseParams);

        tokens.forEach(token1 => {
            correlations[token1] = {};
            tokens.forEach(token2 => {
                if (token1 !== token2) {
                    correlations[token1][token2] = this.calculateCorrelation(token1, token2);
                }
            });
        });

        return {
            trend: this.calculateOverallTrend(),
            confidence: 0.8,
            correlations
        };
    }

    private calculateCorrelation(token1: string, token2: string): number {
        const data1 = this.historicalData.get(token1);
        const data2 = this.historicalData.get(token2);
        
        if (!data1 || !data2) return 0;

        // Simple correlation calculation
        const returns1 = this.calculateReturns(data1.prices);
        const returns2 = this.calculateReturns(data2.prices);
        
        return this.pearsonCorrelation(returns1, returns2);
    }

    private calculateReturns(prices: number[]): number[] {
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i-1]) / prices[i-1]);
        }
        return returns;
    }

    private pearsonCorrelation(x: number[], y: number[]): number {
        const n = Math.min(x.length, y.length);
        let sum_x = 0, sum_y = 0, sum_xy = 0, sum_x2 = 0, sum_y2 = 0;

        for (let i = 0; i < n; i++) {
            sum_x += x[i];
            sum_y += y[i];
            sum_xy += x[i] * y[i];
            sum_x2 += x[i] * x[i];
            sum_y2 += y[i] * y[i];
        }

        const correlation = (n * sum_xy - sum_x * sum_y) / 
            (Math.sqrt((n * sum_x2 - sum_x * sum_x) * (n * sum_y2 - sum_y * sum_y)));

        return isNaN(correlation) ? 0 : correlation;
    }

    private calculateOverallTrend(): 'bullish' | 'bearish' | 'neutral' {
        const trends = Object.keys(this.baseParams).map(token => {
            const history = this.historicalData.get(token);
            if (!history || history.prices.length < 2) return 0;
            
            const firstPrice = history.prices[0];
            const lastPrice = history.prices[history.prices.length - 1];
            return (lastPrice - firstPrice) / firstPrice;
        });

        const avgTrend = trends.reduce((a, b) => a + b, 0) / trends.length;
        if (avgTrend > 0.02) return 'bullish';
        if (avgTrend < -0.02) return 'bearish';
        return 'neutral';
    }

    private getFallbackPrice(token: string): TokenPriceData {
        const params = this.baseParams[token];
        if (!params) {
            return {
                price: 1.0,
                timestamp: Date.now(),
                confidence: 0.5,
                volatility: 0.1
            };
        }

        return {
            price: params.basePrice,
            timestamp: Date.now(),
            confidence: 0.5,
            volatility: params.volatility
        };
    }
} 