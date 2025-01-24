"use client";
import { useEffect, useRef } from 'react';
import { 
    createChart, 
    ColorType, 
    IChartApi, 
    UTCTimestamp,
    CandlestickData 
} from 'lightweight-charts';

interface PriceHistory {
    id: number;
    tokenId: string;
    open: number;
    openUsd: number;
    high: number;
    highUsd: number;
    low: number;
    lowUsd: number;
    close: number;
    closeUsd: number;
    avg: number;
    avgUsd: number;
    volume: string;
    liquidity: string;
    volumeUsd: number;
    liquidityUsd: number;
    timestampSeconds: number;
    startTimestampSeconds: number;
}

export interface ChartData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

interface PriceChartProps {
    data: ChartData[];
    height?: number;
}

const PriceChart = ({ data, height = 400 }: PriceChartProps) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { color: '#000000' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#1a1a1a' },
                horzLines: { color: '#1a1a1a' },
            },
            width: chartContainerRef.current.clientWidth,
            height: height,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                rightOffset: 5,
                barSpacing: 12,
                fixLeftEdge: true,
                fixRightEdge: true,
                rightBarStaysOnScroll: true,
            },
        });

        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350'
        });

        const formattedData = data.map(item => ({
            time: item.time as UTCTimestamp,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close
        }));

        candlestickSeries.setData(formattedData);

        // Fit the chart to the data
        chart.timeScale().fitContent();

        // Handle resize
        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth
                });
                chart.timeScale().fitContent();
            }
        };

        window.addEventListener('resize', handleResize);
        chartRef.current = chart;

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, height]);

    return (
        <div 
            ref={chartContainerRef} 
            className="w-full"
            style={{
                backgroundColor: '#000000',
                borderRadius: '0.75rem'
            }}
        />
    );
};

export default PriceChart; 