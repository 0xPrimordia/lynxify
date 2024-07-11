"use client";
import { useRef, useEffect } from 'react';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Title, BarController } from 'chart.js';
import { PriceHistory } from '../types';
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarShortcut, MenubarTrigger } from '@/components/ui/menubar';
import { Button, ButtonGroup } from '@nextui-org/react'

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

    return( 
        <>
            <Menubar style={{borderColor: '#333', marginBottom: '2rem'}}>
                <MenubarMenu>
                    <ButtonGroup>
                        <Button variant="light" size="sm">Month</Button>
                        <Button variant="light" size="sm">Week</Button>
                        <Button className='bg-gray-800' disabled={true} variant="light" size="sm">Day</Button>
                    </ButtonGroup>
                </MenubarMenu>
            </Menubar>
            <canvas ref={chartRef} />
        </>
    );
};

export default TokenPriceChart;
