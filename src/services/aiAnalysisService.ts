import { HederaAgentKit } from 'hedera-agent-kit';
import { TopicId } from "@hashgraph/sdk";

interface AnalysisRequest {
    type: 'mint_request';
    timestamp: number;
    data: {
        requestId: string;
        amount: string;
        marketConditions: {
            prices: { hbar: number; sauce: number; clxy: number; };
            volatility: { hbar: number; sauce: number; clxy: number; };
            liquidity: { hbar: number; sauce: number; clxy: number; };
        };
    };
}

interface MarketPattern {
    volatilityTrend: 'increasing' | 'decreasing' | 'stable';
    liquidityTrend: 'improving' | 'worsening' | 'stable';
    priceCorrelation: {
        hbarSauce: number;
        hbarClxy: number;
        sauceClxy: number;
    };
    successfulRatios: {
        hbar: number[];
        sauce: number[];
        clxy: number[];
    };
}

export class AIAnalysisService {
    private kit: HederaAgentKit;
    private topicId: TopicId;
    private lastProcessedTimestamp: number = 0;

    constructor(
        operatorId: string,
        operatorKey: string,
        network: 'testnet' | 'mainnet',
        topicId: string
    ) {
        this.kit = new HederaAgentKit(operatorId, operatorKey, network);
        this.topicId = TopicId.fromString(topicId);
    }

    async startMonitoring() {
        console.log('Starting AI analysis service...');
        
        while (true) {
            try {
                const messages = await this.kit.getTopicMessages(this.topicId, 'testnet');
                
                // Process only new messages
                const newMessages = messages.filter(msg => {
                    const parsed = JSON.parse(msg.message) as AnalysisRequest;
                    return parsed.timestamp > this.lastProcessedTimestamp;
                });

                for (const msg of newMessages) {
                    const request = JSON.parse(msg.message) as AnalysisRequest;
                    await this.processRequest(request);
                    this.lastProcessedTimestamp = request.timestamp;
                }

                // Wait before next check
                await new Promise(resolve => setTimeout(resolve, 5000));
            } catch (error) {
                console.error('Error in AI analysis service:', error);
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }
    }

    private async analyzePatterns(messages: any[]): Promise<MarketPattern> {
        const mintRequests = messages.filter(msg => msg.type === 'mint_request');
        const performanceData = messages.filter(msg => msg.type === 'performance_metrics');

        // Analyze volatility trends
        const volatilityTrend = this.analyzeVolatilityTrend(mintRequests);

        // Analyze liquidity patterns
        const liquidityTrend = this.analyzeLiquidityTrend(mintRequests);

        // Calculate price correlations
        const priceCorrelation = this.calculatePriceCorrelations(mintRequests);

        // Find successful ratio patterns
        const successfulRatios = this.findSuccessfulRatios(performanceData);

        return {
            volatilityTrend,
            liquidityTrend,
            priceCorrelation,
            successfulRatios
        };
    }

    private analyzeVolatilityTrend(requests: any[]): 'increasing' | 'decreasing' | 'stable' {
        const recentVolatility = requests.slice(-5).map(req => ({
            hbar: req.data.marketConditions.volatility.hbar,
            sauce: req.data.marketConditions.volatility.sauce,
            clxy: req.data.marketConditions.volatility.clxy
        }));

        const avgChange = recentVolatility.reduce((acc, curr, idx, arr) => {
            if (idx === 0) return acc;
            const prev = arr[idx - 1];
            return acc + (
                (curr.hbar - prev.hbar) +
                (curr.sauce - prev.sauce) +
                (curr.clxy - prev.clxy)
            ) / 3;
        }, 0) / (recentVolatility.length - 1);

        if (Math.abs(avgChange) < 0.01) return 'stable';
        return avgChange > 0 ? 'increasing' : 'decreasing';
    }

    private analyzeLiquidityTrend(requests: any[]): 'improving' | 'worsening' | 'stable' {
        const recentLiquidity = requests.slice(-5).map(req => ({
            hbar: req.data.marketConditions.liquidity.hbar,
            sauce: req.data.marketConditions.liquidity.sauce,
            clxy: req.data.marketConditions.liquidity.clxy
        }));

        const avgChange = recentLiquidity.reduce((acc, curr, idx, arr) => {
            if (idx === 0) return acc;
            const prev = arr[idx - 1];
            return acc + (
                (curr.hbar - prev.hbar) +
                (curr.sauce - prev.sauce) +
                (curr.clxy - prev.clxy)
            ) / 3;
        }, 0) / (recentLiquidity.length - 1);

        if (Math.abs(avgChange) < 100) return 'stable';
        return avgChange > 0 ? 'improving' : 'worsening';
    }

    private calculatePriceCorrelations(requests: any[]) {
        const prices = requests.map(req => ({
            hbar: req.data.marketConditions.prices.hbar,
            sauce: req.data.marketConditions.prices.sauce,
            clxy: req.data.marketConditions.prices.clxy
        }));

        return {
            hbarSauce: this.correlation(
                prices.map(p => p.hbar),
                prices.map(p => p.sauce)
            ),
            hbarClxy: this.correlation(
                prices.map(p => p.hbar),
                prices.map(p => p.clxy)
            ),
            sauceClxy: this.correlation(
                prices.map(p => p.sauce),
                prices.map(p => p.clxy)
            )
        };
    }

    private findSuccessfulRatios(performanceData: any[]) {
        // Filter for successful mints (low slippage, good market impact)
        const successfulMints = performanceData.filter(p => 
            p.data.performance.slippage < 0.01 && // Less than 1% slippage
            p.data.performance.marketImpact < 0.005 // Less than 0.5% market impact
        );

        return {
            hbar: successfulMints.map(m => m.data.ratios.hbar),
            sauce: successfulMints.map(m => m.data.ratios.sauce),
            clxy: successfulMints.map(m => m.data.ratios.clxy)
        };
    }

    private correlation(x: number[], y: number[]): number {
        const mean = (arr: number[]) => arr.reduce((a, b) => a + b) / arr.length;
        const xMean = mean(x);
        const yMean = mean(y);
        
        const numerator = x.reduce((acc, xi, i) => 
            acc + (xi - xMean) * (y[i] - yMean), 0
        );
        
        const denominator = Math.sqrt(
            x.reduce((acc, xi) => acc + Math.pow(xi - xMean, 2), 0) *
            y.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0)
        );
        
        return numerator / denominator;
    }

    private async processRequest(request: AnalysisRequest) {
        const { amount, marketConditions } = request.data;
        
        // Get historical patterns
        const messages = await this.kit.getTopicMessages(this.topicId, 'testnet');
        const patterns = await this.analyzePatterns(messages.map(msg => JSON.parse(msg.message)));
        
        // Calculate optimal ratios based on patterns
        const ratios = this.calculateOptimalRatios(marketConditions, patterns);
        
        // Submit recommendation
        await this.kit.submitTopicMessage(
            this.topicId,
            JSON.stringify({
                type: 'ai_recommendation',
                timestamp: Date.now(),
                data: {
                    requestId: request.data.requestId,
                    recommendedRatios: ratios,
                    confidence: this.calculateConfidence(patterns),
                    reasoning: this.generateReasoning(patterns, marketConditions)
                }
            })
        );
    }

    private calculateConfidence(patterns: MarketPattern): number {
        // Higher confidence if we have more successful historical ratios
        const historicalDataPoints = 
            patterns.successfulRatios.hbar.length +
            patterns.successfulRatios.sauce.length +
            patterns.successfulRatios.clxy.length;
        
        // Higher confidence if price correlations are strong
        const correlationStrength = Math.abs(
            patterns.priceCorrelation.hbarSauce +
            patterns.priceCorrelation.hbarClxy +
            patterns.priceCorrelation.sauceClxy
        ) / 3;

        return Math.min(
            0.95, // Cap at 95% confidence
            0.5 + // Base confidence
            (historicalDataPoints * 0.01) + // Historical data bonus
            (correlationStrength * 0.2) // Correlation strength bonus
        );
    }

    private generateReasoning(
        patterns: MarketPattern,
        conditions: AnalysisRequest['data']['marketConditions']
    ): string[] {
        const reasons: string[] = [];

        if (patterns.volatilityTrend !== 'stable') {
            reasons.push(`Volatility is ${patterns.volatilityTrend}, adjusting ratios for stability`);
        }

        if (patterns.liquidityTrend !== 'stable') {
            reasons.push(`Liquidity is ${patterns.liquidityTrend}, optimizing for depth`);
        }

        if (Math.abs(patterns.priceCorrelation.hbarSauce) > 0.7) {
            reasons.push(`Strong HBAR-SAUCE correlation detected: ${patterns.priceCorrelation.hbarSauce.toFixed(2)}`);
        }

        return reasons;
    }

    private calculateOptimalRatios(marketConditions: AnalysisRequest['data']['marketConditions'], patterns: MarketPattern) {
        // Initial implementation - adjust ratios based on volatility
        const totalVolatility = 
            marketConditions.volatility.hbar + 
            marketConditions.volatility.sauce + 
            marketConditions.volatility.clxy;

        const hbarWeight = 1 - (marketConditions.volatility.hbar / totalVolatility);
        const sauceWeight = 1 - (marketConditions.volatility.sauce / totalVolatility);
        const clxyWeight = 1 - (marketConditions.volatility.clxy / totalVolatility);

        const total = hbarWeight + sauceWeight + clxyWeight;

        return {
            hbar: hbarWeight / total,
            sauce: sauceWeight / total,
            clxy: clxyWeight / total
        };
    }
} 