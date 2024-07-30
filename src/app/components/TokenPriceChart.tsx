"use client";
import { useRef, useEffect, useState } from 'react';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Title, BarController } from 'chart.js';
import { PriceHistory } from '../types';


Chart.register(BarElement, BarController, CategoryScale, LinearScale, Tooltip, Title);

const TokenPriceChart = ({ data }:{data:PriceHistory[]}) => {
    const chartRef = useRef<HTMLCanvasElement | null>(null);
    

  useEffect(() => {
    if (!data) return;

    const labels = data.map((item: any) => new Date(item.timestampSeconds * 1000).toLocaleTimeString());
    const datasets = [{
        label: 'Token Price (USD)',
        data: data.map((item: PriceHistory) => ({
          x: new Date(item.timestampSeconds * 1000).toLocaleTimeString(),
          y: [item.lowUsd, item.openUsd, item.closeUsd, item.highUsd]
        })),
        backgroundColor: 'rgb(78, 148, 254)',
        borderColor: 'rgb(78, 148, 254)',
        borderWidth: 1,
    }];

    const chart = new Chart(chartRef.current!, {
      type: 'bar',
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        scales: {
          x: {
            type: 'category',
            labels: labels
          },
          y: {
            beginAtZero: false,
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const { low, open, close, high } = context.raw;
                return `Low: ${low}, Open: ${open}, Close: ${close}, High: ${high}`;
              }
            }
          },
        }
        }
    });

    return () => {
      chart.destroy();
    };
  }, [data]);

    return <canvas ref={chartRef} />;
};

export default TokenPriceChart;
