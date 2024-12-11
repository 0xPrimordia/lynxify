import ApexCharts from 'apexcharts';
import { PriceHistory } from '../types';
import { useEffect, useRef, memo } from 'react';
import { Spinner } from "@nextui-org/react";

const ApexChart = memo(({ data }: { data: PriceHistory[] }) => {
    const chartRef = useRef<ApexCharts | null>(null);
    const chartElementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartElementRef.current || !data || data.length === 0) return;

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
                height: 350,
                background: 'transparent',
                foreColor: '#999'
            },
            tooltip: {
                theme: 'dark',
                style: {
                    fontSize: '12px',
                    fontFamily: undefined,
                }
            },
            grid: {
                borderColor: '#1a1a1a',
                xaxis: {
                    lines: {
                        show: true,
                        color: '#1a1a1a'
                    }
                },
                yaxis: {
                    lines: {
                        show: true,
                        color: '#1a1a1a'
                    }
                }
            },
            title: {
                text: "",
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

        // If chart exists, update instead of recreating
        if (chartRef.current) {
            chartRef.current.updateSeries([{
                data: formattedData
            }]);
        } else {
            chartRef.current = new ApexCharts(chartElementRef.current, options);
            chartRef.current.render();
        }

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <div className="flex justify-center items-center h-[350px]">
                <Spinner size="lg" />
            </div>
        );
    }

    return <div id="chart" ref={chartElementRef} />;
});

ApexChart.displayName = 'ApexChart';
export default ApexChart;