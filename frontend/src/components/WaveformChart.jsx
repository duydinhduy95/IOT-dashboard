import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Activity } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const COLORS = [
  '#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#4bc0c0', 
  '#9966ff', '#ff9f40', '#e83e8c', '#20c997', '#fd7e14',
  '#0d6efd', '#6f42c1', '#198754', '#dc3545', '#0dcaf0'
];

export default function WaveformChart() {
    const [allColumns, setAllColumns] = useState([]);
    const [selectedColumn, setSelectedColumn] = useState(0);
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [pushing, setPushing] = useState(false);
    const [isLive, setIsLive] = useState(false);
    const [error, setError] = useState('');

    // Effect to update chart when allColumns or selectedColumn changes
    useEffect(() => {
        if (allColumns[selectedColumn]) {
            updateChartDisplay(allColumns, selectedColumn);
        }
    }, [allColumns, selectedColumn]);

    // SSE Connection for Live Data
    useEffect(() => {
        const eventSource = new EventSource('http://localhost:3001/api/waveform-stream');

        eventSource.onopen = () => {
            console.log("SSE Connection opened");
            setIsLive(true);
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.waveform && Array.isArray(data.waveform)) {
                    const sensorIdx = (data.sensorId || 1) - 1;
                    setAllColumns(prev => {
                        const newCols = [...prev];
                        newCols[sensorIdx] = data.waveform;
                        return newCols;
                    });
                }
            } catch (err) {
                console.error("Error parsing SSE data:", err);
            }
        };

        eventSource.onerror = (e) => {
            console.error("SSE Connection error:", e);
            setIsLive(false);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [selectedColumn]); // Re-bind if selection logic needs it, though setAllColumns handles internal logic

    const updateChartDisplay = (columnsData, colIdx) => {
        if (!columnsData || !columnsData[colIdx]) return;

        const data = columnsData[colIdx];
        const rowCount = data.length;
        const labels = Array.from({ length: rowCount }, (_, i) => i);
        
        const datasets = [{
            label: `Sensor ${colIdx + 1}`,
            data: data,
            borderColor: COLORS[colIdx % COLORS.length],
            backgroundColor: COLORS[colIdx % COLORS.length] + '80',
            borderWidth: 1.5,
            tension: 0.1,
            pointRadius: 0,
            pointHitRadius: 10,
        }];

        setChartData({
            labels: labels,
            datasets: datasets
        });
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        setError('');

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target.result;
                const lines = text.trim().split('\n');
                
                if (lines.length === 0) {
                    throw new Error("File is empty.");
                }

                // Parse columns
                const columnsMap = [];
                let rowCount = 0;

                for (let i = 0; i < lines.length; i++) {
                    const parts = lines[i].trim().split(/\s+/);
                    if (parts.length === 0 || parts[0] === "") continue;

                    parts.forEach((valStr, colIndex) => {
                        const val = parseFloat(valStr);
                        if (!columnsMap[colIndex]) {
                            columnsMap[colIndex] = [];
                        }
                        columnsMap[colIndex].push(isNaN(val) ? 0 : val);
                    });
                    rowCount++;
                }

                if (columnsMap.length === 0) {
                     throw new Error("No data parsed.");
                }

                setAllColumns(columnsMap);
                setSelectedColumn(0);
                updateChartDisplay(columnsMap, 0);
            } catch (err) {
                console.error("Error parsing file", err);
                setError('Failed to parse file: ' + err.message);
                setChartData(null);
            } finally {
                setLoading(false);
            }
        };

        reader.onerror = () => {
             setError("Failed to read file.");
             setLoading(false);
             setChartData(null);
        };

        reader.readAsText(file);
    };

    const handleColumnChange = (e) => {
        const idx = parseInt(e.target.value);
        setSelectedColumn(idx);
        updateChartDisplay(allColumns, idx);
    };

    const handlePushToServer = async () => {
        if (!allColumns || allColumns.length === 0) return;
        
        setPushing(true);
        setError('');
        
        try {
            const dataToPush = {
                sensorId: selectedColumn + 1,
                waveform: allColumns[selectedColumn]
            };
            
            const response = await fetch('http://localhost:3001/api/simulate-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToPush),
            });
            
            const result = await response.json();
            if (result.success) {
                alert(`Successfully pushed ${allColumns[selectedColumn].length} points to server! Check backend terminal.`);
            } else {
                throw new Error(result.message || 'Server error');
            }
        } catch (err) {
            console.error("Error pushing to server:", err);
            setError('Failed to push data: ' + err.message);
        } finally {
            setPushing(false);
        }
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false, // necessary for performance with large waveform data
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: 'rgba(255, 255, 255, 0.8)',
                    boxWidth: 12,
                    padding: 15
                }
            },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(4)}`
                }
            }
        },
        scales: {
            x: {
                display: false, // hide x-axis text/lines for smooth waveform
                grid: {
                    display: false
                }
            },
            y: {
                display: true,
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)'
                }
            }
        }
    };

    return (
        <div className="glass-panel" style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                <h2 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={20} color="var(--accent-color)" /> Sensor Waveform (Live MQTT)
                    {isLive && (
                        <span style={{ 
                            fontSize: '10px', 
                            background: '#28a745', 
                            color: 'white', 
                            padding: '2px 8px', 
                            borderRadius: '10px', 
                            marginLeft: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                           <span style={{ width: '6px', height: '6px', backgroundColor: 'white', borderRadius: '50%', display: 'inline-block' }}></span>
                           LIVE
                        </span>
                    )}
                </h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {allColumns.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Select Column:</span>
                            <select 
                                value={selectedColumn} 
                                onChange={handleColumnChange}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'var(--text-primary)',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                {allColumns.map((_, idx) => (
                                    <option key={idx} value={idx}>Sensor {idx + 1}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div style={{ color: 'var(--danger)', padding: '10px 0' }}>{error}</div>
            )}

            {loading && (
                <div style={{ color: 'var(--text-secondary)', padding: '10px 0' }}>Processing data...</div>
            )}

            <div style={{ width: '100%', height: '400px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '16px' }}>
                {!chartData && !loading && !error && (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        Waiting for live waveform data from MQTT...
                    </div>
                )}
                {chartData && (
                    <Line data={chartData} options={options} />
                )}
            </div>
        </div>
    );
}
