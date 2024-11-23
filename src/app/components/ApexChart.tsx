import ApexCharts from 'apexcharts';
import { PriceHistory } from '../types';
import { useEffect } from 'react';


const ApexChart = ({ data }:{data:PriceHistory[]}) => {
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
    }
    const chart = new ApexCharts(document.querySelector("#chart"), options);

    useEffect(() => {
        chart.render();
    }, [data]);

    return(
        <div id="chart" />
    )
}

export default ApexChart;