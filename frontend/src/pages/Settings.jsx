import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, CheckCircle } from 'lucide-react';

const API_URL = 'http://localhost:3001';

export default function Settings() {
    const [settings, setSettings] = useState({ alertDaysThreshold: 5, frequencyHours: 24 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/settings`);
                setSettings(res.data);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch settings", err);
            }
        };
        fetchSettings();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setSuccess(false);
        try {
            await axios.post(`${API_URL}/api/settings`, {
                alertDaysThreshold: Number(settings.alertDaysThreshold),
                frequencyHours: Number(settings.frequencyHours)
            });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error("Failed to save settings", err);
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    if (loading) {
        return <div className="page-header"><h1>Loading Settings...</h1></div>;
    }

    return (
        <div>
            <div className="page-header">
                <h1>Alert Settings</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Configure Telegram alerting thresholds and frequency</p>
            </div>

            <div className="glass-panel" style={{ maxWidth: '600px' }}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Alert Threshold (Days) / Số ngày sẽ gửi cảnh báo</label>
                        <input
                            type="number"
                            className="form-control"
                            name="alertDaysThreshold"
                            value={settings.alertDaysThreshold}
                            onChange={handleChange}
                            min="0"
                            required
                        />
                        <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '6px' }}>
                            Alerts will be triggered if remaining days fall below or equal to this threshold.
                        </small>
                    </div>

                    <div className="form-group">
                        <label>Sending Frequency (Hours) / Tần suất gửi</label>
                        <input
                            type="number"
                            className="form-control"
                            name="frequencyHours"
                            value={settings.frequencyHours}
                            onChange={handleChange}
                            min="1"
                            required
                        />
                        <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '6px' }}>
                            How often to resend the alert while in the critical zone.
                        </small>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '32px' }}>
                        <button type="submit" className="btn" disabled={saving}>
                            <Save size={20} />
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>

                        {success && (
                            <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                                <CheckCircle size={20} />
                                Settings saved successfully!
                            </span>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
