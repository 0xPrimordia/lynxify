import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { getPoolWithTicks } from '@/app/api/pool';

interface DepthChartProps {
    data: any[];
    height: number;
    currentPrice: number;
    selectedPool: any;
}

export const DepthChart: React.FC<DepthChartProps> = ({ 
    data, 
    height,
    currentPrice,
    selectedPool 
}) => {
    const chartRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!selectedPool || !chartRef.current) return;

        // Clear previous chart
        d3.select(chartRef.current).selectAll("*").remove();

        try {
            // Process data
            const { bids, asks } = processPoolDataForDepth(selectedPool);
            
            if (bids.length === 0 && asks.length === 0) {
                console.warn('No valid bid/ask data to display');
                return;
            }

            // Set up dimensions
            const margin = { top: 20, right: 60, bottom: 30, left: 60 };
            const width = chartRef.current.clientWidth - margin.left - margin.right;
            const chartHeight = height - margin.top - margin.bottom;

            // Create SVG
            const svg = d3.select(chartRef.current)
                .attr('width', width + margin.left + margin.right)
                .attr('height', height)
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            // Add black background
            svg.append('rect')
                .attr('width', width)
                .attr('height', chartHeight)
                .attr('fill', '#000000');

            // Set up scales
            const xScale = d3.scaleLinear()
                .domain([d3.min(bids, d => d.price) || 0, d3.max(asks, d => d.price) || 0])
                .range([0, width]);

            const yScale = d3.scaleLinear()
                .domain([0, d3.max([...bids, ...asks], d => d.value) || 0])
                .range([chartHeight, 0]);

            // Add grid lines
            const gridlinesX = d3.axisBottom(xScale)
                .tickSize(-chartHeight)
                .tickFormat(() => '')
                .ticks(10);

            const gridlinesY = d3.axisLeft(yScale)
                .tickSize(-width)
                .tickFormat(() => '')
                .ticks(10);

            svg.append('g')
                .attr('class', 'grid x-grid')
                .attr('transform', `translate(0,${chartHeight})`)
                .call(gridlinesX)
                .attr('color', '#222222');

            svg.append('g')
                .attr('class', 'grid y-grid')
                .call(gridlinesY)
                .attr('color', '#222222');

            // Create areas
            const bidArea = d3.area<{price: number, value: number}>()
                .x(d => xScale(d.price))
                .y0(chartHeight)
                .y1(d => yScale(d.value));

            const askArea = d3.area<{price: number, value: number}>()
                .x(d => xScale(d.price))
                .y0(chartHeight)
                .y1(d => yScale(d.value));

            // Add areas to chart
            svg.append('path')
                .datum(bids)
                .attr('class', 'bids')
                .attr('fill', 'rgba(34, 197, 94, 0.4)')
                .attr('stroke', 'rgba(34, 197, 94, 1)')
                .attr('d', bidArea);

            svg.append('path')
                .datum(asks)
                .attr('class', 'asks')
                .attr('fill', 'rgba(239, 68, 68, 0.4)')
                .attr('stroke', 'rgba(239, 68, 68, 1)')
                .attr('d', askArea);

            // Add current price line
            svg.append('line')
                .attr('x1', xScale(currentPrice))
                .attr('x2', xScale(currentPrice))
                .attr('y1', 0)
                .attr('y2', chartHeight)
                .attr('stroke', '#ffffff')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '4');

            // Add axes with better formatting
            const xAxis = d3.axisBottom(xScale)
                .tickFormat(d => {
                    const value = d as number;
                    return value >= 1000 ? 
                        value.toLocaleString('en-US', { 
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2 
                        }) :
                        value.toFixed(4);
                });

            const yAxis = d3.axisRight(yScale)
                .tickFormat(d => {
                    const value = d as number;
                    if (value >= 1e12) return `${(value/1e12).toFixed(1)}T`;
                    if (value >= 1e9) return `${(value/1e9).toFixed(1)}B`;
                    if (value >= 1e6) return `${(value/1e6).toFixed(1)}M`;
                    if (value >= 1e3) return `${(value/1e3).toFixed(1)}K`;
                    return value.toFixed(1);
                });

            svg.append('g')
                .attr('transform', `translate(0,${chartHeight})`)
                .call(xAxis)
                .attr('color', '#666666');

            svg.append('g')
                .attr('transform', `translate(${width},0)`)
                .call(yAxis)
                .attr('color', '#666666');

            // Add crosshair and tooltip
            const crosshairGroup = svg.append('g')
                .attr('class', 'crosshair')
                .style('display', 'none');

            crosshairGroup.append('line')
                .attr('class', 'crosshair-x')
                .attr('stroke', '#666666')
                .attr('y1', 0)
                .attr('y2', chartHeight);

            crosshairGroup.append('line')
                .attr('class', 'crosshair-y')
                .attr('stroke', '#666666')
                .attr('x1', 0)
                .attr('x2', width);

            const tooltip = d3.select('body').append('div')
                .attr('class', 'depth-chart-tooltip')
                .style('position', 'absolute')
                .style('display', 'none')
                .style('background', 'rgba(0, 0, 0, 0.8)')
                .style('color', 'white')
                .style('padding', '8px')
                .style('border-radius', '4px')
                .style('font-size', '12px')
                .style('pointer-events', 'none');

            // Add overlay for mouse events
            svg.append('rect')
                .attr('class', 'overlay')
                .attr('width', width)
                .attr('height', chartHeight)
                .attr('fill', 'none')
                .attr('pointer-events', 'all')
                .on('mouseover', () => {
                    crosshairGroup.style('display', null);
                    tooltip.style('display', null);
                })
                .on('mouseout', () => {
                    crosshairGroup.style('display', 'none');
                    tooltip.style('display', 'none');
                })
                .on('mousemove', (event) => {
                    const [mouseX, mouseY] = d3.pointer(event);
                    
                    crosshairGroup.select('.crosshair-x')
                        .attr('x1', mouseX)
                        .attr('x2', mouseX);
                    
                    crosshairGroup.select('.crosshair-y')
                        .attr('y1', mouseY)
                        .attr('y2', mouseY);

                    const price = xScale.invert(mouseX);
                    const value = yScale.invert(mouseY);

                    tooltip.html(`
                        Price: ${price.toFixed(4)}<br/>
                        Value: ${formatValue(value)}
                    `)
                    .style('left', `${event.pageX + 15}px`)
                    .style('top', `${event.pageY - 28}px`);
                });

        } catch (error) {
            console.error('Error rendering depth chart:', error);
        }
    }, [selectedPool, height]);

    // Helper function to format values
    const formatValue = (value: number): string => {
        if (value >= 1e12) return `${(value/1e12).toFixed(1)}T`;
        if (value >= 1e9) return `${(value/1e9).toFixed(1)}B`;
        if (value >= 1e6) return `${(value/1e6).toFixed(1)}M`;
        if (value >= 1e3) return `${(value/1e3).toFixed(1)}K`;
        return value.toFixed(1);
    };

    return (
        <div className="w-full h-full bg-black">
            <svg ref={chartRef} className="w-full h-full" style={{ background: '#000000' }}>
                <rect width="100%" height="100%" fill="#000000" />
            </svg>
        </div>
    );
};

function generateDefaultDepthData(currentPrice: number) {
    const bids = [];
    const asks = [];
    const points = 50;
    const spread = currentPrice * 0.1; // 10% spread

    for (let i = 0; i < points; i++) {
        // Generate bid prices below current price
        const bidPrice = currentPrice - (spread * (i / points));
        bids.push({
            price: bidPrice,
            value: bidPrice,
            time: i,
            liquidity: Math.random() * 1000000 * (1 - i/points)
        });

        // Generate ask prices above current price
        const askPrice = currentPrice + (spread * (i / points));
        asks.push({
            price: askPrice,
            value: askPrice,
            time: i,
            liquidity: Math.random() * 1000000 * (1 - i/points)
        });
    }

    return { 
        bids: bids.sort((a, b) => a.price - b.price),
        asks: asks.sort((a, b) => a.price - b.price)
    };
}

function generateSyntheticTicks(pool: any) {
    if (!pool || !pool.amountA || !pool.amountB) {
        console.warn('Invalid pool data for synthetic ticks');
        return [];
    }

    const tickCount = 100;
    const priceRange = 0.2; // 20% range around current price
    const ticks = [];
    
    // Get token decimals and prices
    const tokenADecimals = pool.tokenA?.decimals || 8;
    const tokenBDecimals = pool.tokenB?.decimals || 6;
    const tokenAPrice = Number(pool.tokenA?.price || 0) / 1e8; // Convert to USD
    const tokenBPrice = Number(pool.tokenB?.price || 0) / 1e8; // Convert to USD
    
    // Calculate amounts in their native units
    const amountA = Number(pool.amountA) / Math.pow(10, tokenADecimals);
    const amountB = Number(pool.amountB) / Math.pow(10, tokenBDecimals);
    
    // Calculate current price in USD
    const currentPrice = tokenAPrice; // Price of token A in USD

    console.log('Price calculation:', {
        amountA,
        amountB,
        tokenAPrice,
        tokenBPrice,
        currentPrice,
        tokenADecimals,
        tokenBDecimals,
        rawAmountA: pool.amountA,
        rawAmountB: pool.amountB
    });

    // Calculate total liquidity in USD
    const liquidityA = amountA * tokenAPrice;
    const liquidityB = amountB * tokenBPrice;
    const totalLiquidityUSD = liquidityA + liquidityB;

    // Generate ticks around the current price
    for (let i = 0; i < tickCount; i++) {
        const ratio = i / (tickCount - 1);
        const price = currentPrice * (1 - priceRange/2 + priceRange * ratio);
        
        // Create bell curve distribution for liquidity
        const liquidityRatio = 1 - Math.abs(0.5 - ratio) * 0.8; // Less steep curve
        const value = totalLiquidityUSD * liquidityRatio;
        
        ticks.push({
            price, // Price in USD
            value  // Using 'value' instead of 'liquidity' to match the chart's expectations
        });
    }

    return ticks;
}

function processPoolDataForDepth(pool: any) {
    if (!pool) {
        console.warn('No pool data provided');
        return { bids: [], asks: [] };
    }

    // Generate synthetic ticks since we don't have real tick data
    const ticks = generateSyntheticTicks(pool);
    
    if (!ticks || ticks.length === 0) {
        console.warn('No valid ticks data available');
        return { bids: [], asks: [] };
    }

    // Calculate current price in USD
    const tokenADecimals = pool.tokenA?.decimals || 8;
    const tokenBDecimals = pool.tokenB?.decimals || 8;
    const tokenAPrice = Number(pool.tokenA?.price || 0) / 1e8;
    
    // Sort ticks by price
    const sortedTicks = [...ticks].sort((a, b) => a.price - b.price);
    
    // Find the index of current price
    const currentPriceIndex = sortedTicks.findIndex(tick => tick.price >= tokenAPrice);
    
    // Process bids (prices below current price)
    const bids = sortedTicks.slice(0, currentPriceIndex).map(tick => ({
        price: tick.price,
        value: tick.value
    }));

    // Process asks (prices above current price)
    const asks = sortedTicks.slice(currentPriceIndex).map(tick => ({
        price: tick.price,
        value: tick.value
    }));

    return { bids: bids.reverse(), asks };
} 