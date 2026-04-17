import { useState, useEffect } from 'react';
import axios from 'axios';
import { Radio, CalendarDays, AlertTriangle, Info, Clock } from 'lucide-react';
import WaveformChart from '../components/WaveformChart';


const API_URL = 'http://localhost:3001';

export default function Dashboard() {
    const [data, setData] = useState({ inputSignal: 0, remainingDays: 0, logs: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/status`);
                setData(res.data);
                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch status", error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000); // refresh every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const getLogIcon = (type) => {
        switch (type) {
            case 'warning': return <AlertTriangle size={20} color="var(--warning)" />;
            case 'error': return <AlertTriangle size={20} color="var(--danger)" />;
            default: return <Info size={20} color="var(--accent-color)" />;
        }
    };

    if (loading) {
        return <div className="page-header"><h1>Loading Dashboard Data...</h1></div>;
    }

    return (
        <div>
            <div className="page-header">
                <h1>Dashboard Overview</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Real-time system data from MQTT</p>
            </div>

            <div className="grid-container">
                {/* Input Signal Card */}
                <div className="glass-panel stat-card">
                    <div className="stat-icon">
                        <Radio color="var(--accent-color)" size={32} />
                    </div>
                    <div className="stat-info">
                        <h3>Input Signal (Tín hiệu đầu vào)</h3>
                        <div>
                            <span className="stat-value">{data.inputSignal}</span>
                        </div>
                    </div>
                </div>

                {/* Remaining Days Card */}
                <div className="glass-panel stat-card">
                    <div className="stat-icon">
                        <CalendarDays color="var(--success)" size={32} />
                    </div>
                    <div className="stat-info">
                        <h3>Remaining Days (Số ngày còn lại)</h3>
                        <div>
                            <span className="stat-value">{data.remainingDays}</span>
                            <span className="stat-unit">days</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-panel">
                <h2 style={{ fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ActivityLogIcon /> Alert Log (Ổ log cảnh báo)
                </h2>
                {data.logs.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>No logs recorded yet.</p>
                ) : (
                    <ul className="log-list">
                        {data.logs.map(log => (
                            <li key={log.id} className="log-item">
                                <div className="log-icon">{getLogIcon(log.type)}</div>
                                <div>
                                    <div className="log-time">{new Date(log.timestamp).toLocaleString()}</div>
                                    <div className="log-message">{log.message}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <WaveformChart />
        </div>
    );
}

const ActivityLogIcon = () => <Clock size={20} color="var(--text-secondary)" />;
