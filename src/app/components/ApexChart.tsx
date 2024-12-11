import ApexCharts from 'apexcharts';
import { PriceHistory } from '../types';
import { useEffect, useRef } from 'react';

const ApexChart = ({ data }:{data:PriceHistory[]}) => {
    const chartRef = useRef<ApexCharts | null>(null);
    const chartElementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartElementRef.current) return;

        const formattedData = data.map(item => ({
            x: new Date(item.startTimestampSeconds * 1000),
            y: [item.openUsd, item.highUsd, item.lowUsd, item.closeUsd]
        }));

        const options = {
            series: [{
                data: formattedData
            }],
            chart: {
                type: 'candlestick',
                height: 350
            },
            title: {
                text: 'CandleStick Chart',
                align: 'left'
            },
            xaxis: {
                type: 'datetime'
            },
            yaxis: {
                tooltip: {
                    enabled: true
                }
            }
        };

        // If chart already exists, update it
        if (chartRef.current) {
            chartRef.current.updateOptions(options);
        } else {
            // Create new chart
            chartRef.current = new ApexCharts(chartElementRef.current, options);
            chartRef.current.render();
        }

        // Cleanup on unmount
        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, [data]);

    return (
        <div id="chart" ref={chartElementRef} />
    );
};

export default ApexChart;