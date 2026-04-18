require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mqtt = require('mqtt');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// For Real-time Waveform Streaming (SSE)
let sseClients = [];

// Persistent state
const DATA_FILE = path.join(__dirname, 'data.json');
let appData = {
    inputSignal: 0,
    remainingDays: 0,
    logs: [],
    settings: {
        alertDaysThreshold: 5,
        frequencyHours: 24,
    },
    lastExecution: 0
};

// In-memory storage for latest waveforms (not saved to data.json to keep it small)
let lastWaveforms = {};

// Load initial data if exists
if (fs.existsSync(DATA_FILE)) {
    try {
        const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
        appData = { ...appData, ...JSON.parse(rawData) };
    } catch (err) {
        console.error("Error loading data file:", err);
    }
}

const saveData = () => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(appData, null, 2), 'utf-8');
};

const addLog = (message, type = 'warning') => {
    const logEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        message,
        type,
    };
    appData.logs.unshift(logEntry);
    if (appData.logs.length > 100) appData.logs.pop(); // Keep only last 100 logs
    saveData();
    console.log(`[LogAdded] ${type.toUpperCase()}: ${message}`);
};

// Telegram Setup
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

let bot = null;
if (botToken) {
    bot = new TelegramBot(botToken, { polling: false });
}

const sendTelegramMessage = async (message) => {
    if (!bot || !chatId) {
        console.warn("Telegram bot token or chat ID not configured. Message not sent:", message);
        return false;
    }
    try {
        await bot.sendMessage(chatId, message);
        console.log("Telegram message sent successfully");
        addLog("Alert sent to Telegram: " + message, "info");
        return true;
    } catch (err) {
        console.error("Error sending Telegram message:", err);
        addLog("Failed to send Telegram message", "error");
        return false;
    }
};

// MQTT Setup
const mqttBrokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://broker.emqx.io';
const mqttTopic = process.env.MQTT_TOPIC || 'iot/dashboard/data';

console.log(`Connecting to MQTT broker at ${mqttBrokerUrl}`);
const mqttClient = mqtt.connect(mqttBrokerUrl);

mqttClient.on('connect', () => {
    console.log('Connected to MQTT Broker.');
    mqttClient.subscribe(mqttTopic, (err) => {
        if (!err) {
            console.log(`Subscribed to topic: ${mqttTopic}`);
        } else {
            console.error('MQTT Subscription Error', err);
        }
    });
});

mqttClient.on('message', (topic, message) => {
    if (topic === mqttTopic) {
        try {
            const payload = JSON.parse(message.toString());
            console.log('Received MQTT Message:', payload);

            let changed = false;
            if (typeof payload.inputSignal !== 'undefined') {
                appData.inputSignal = payload.inputSignal;
                changed = true;
            }
            if (typeof payload.remainingDays !== 'undefined') {
                appData.remainingDays = payload.remainingDays;
                changed = true;
            }
            if (changed) {
                saveData();
                // Broadcast status update to all SSE clients
                const statusData = JSON.stringify({
                    type: 'status',
                    inputSignal: appData.inputSignal,
                    remainingDays: appData.remainingDays
                });
                sseClients.forEach(client => {
                    client.write(`data: ${statusData}\n\n`);
                });
            }

            // New: Handle Waveform data from MQTT
            if (payload.waveform && Array.isArray(payload.waveform)) {
                console.log(`[MQTT] Received Waveform for Sensor ${payload.sensorId || 'Unknown'}: ${payload.waveform.length} points.`);
                
                const sensorId = payload.sensorId || 1;
                // ONLY store if waveform actually exists in this message
                lastWaveforms[sensorId] = payload.waveform;

                // Broadcast to all connected SSE clients
                const sseData = JSON.stringify({
                    sensorId: sensorId,
                    waveform: payload.waveform
                });
                
                sseClients.forEach(client => {
                    client.write(`data: ${sseData}\n\n`);
                });

                if (payload.waveform.length > 0) {
                    console.log(`Sample data sent to ${sseClients.length} clients.`);
                }
            } else if (payload.inputSignal !== undefined || payload.remainingDays !== undefined) {
                // If it's just a status update, broadcast the latest status and logs
                const statusData = JSON.stringify({
                    type: 'status',
                    inputSignal: appData.inputSignal,
                    remainingDays: appData.remainingDays,
                    logs: appData.logs // Include logs so UI updates them too
                });
                sseClients.forEach(client => {
                    client.write(`data: ${statusData}\n\n`);
                });
            }
        } catch (err) {
            console.error("Failed to parse MQTT message", err);
        }
    }
});

app.get('/api/status', (req, res) => {
    res.json({
        inputSignal: appData.inputSignal,
        remainingDays: appData.remainingDays,
        logs: appData.logs.slice(0, 10), // return last 10 logs
    });
});

app.get('/api/settings', (req, res) => {
    res.json(appData.settings);
});

// SSE Endpoint for Waveform Stream
app.get('/api/waveform-stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clientId = Date.now();
    const newClient = {
        id: clientId,
        write: (data) => res.write(data)
    };
    sseClients.push(newClient);
    console.log(`[SSE] Client connected: ${clientId}. Total clients: ${sseClients.length}`);

    // Immediately send the current status to the new client
    const initialStatus = JSON.stringify({
        type: 'status',
        inputSignal: appData.inputSignal,
        remainingDays: appData.remainingDays
    });
    newClient.write(`data: ${initialStatus}\n\n`);

    // Immediately send the latest data for all sensors to the new client
    Object.keys(lastWaveforms).forEach(sensorId => {
        const sseData = JSON.stringify({
            sensorId: parseInt(sensorId),
            waveform: lastWaveforms[sensorId]
        });
        newClient.write(`data: ${sseData}\n\n`);
    });

    req.on('close', () => {
        sseClients = sseClients.filter(c => c.id !== clientId);
        console.log(`[SSE] Client disconnected: ${clientId}. Total clients: ${sseClients.length}`);
    });
});

app.post('/api/settings', (req, res) => {
    const { alertDaysThreshold, frequencyHours } = req.body;
    if (typeof alertDaysThreshold === 'number') {
        appData.settings.alertDaysThreshold = alertDaysThreshold;
    }
    if (typeof frequencyHours === 'number') {
        appData.settings.frequencyHours = frequencyHours;
    }
    saveData();
    addLog(`Settings updated: threshold=${appData.settings.alertDaysThreshold} days, frequency=${appData.settings.frequencyHours}h`);
    res.json({ success: true, settings: appData.settings });
});

app.delete('/api/logs', (req, res) => {
    appData.logs = [];
    saveData();
    res.json({ success: true });
});

// New: API to simulate data coming from a sensor (Frontend -> Backend)
app.post('/api/simulate-data', (req, res) => {
    const { sensorId, waveform, inputSignal, remainingDays } = req.body;
    
    console.log('--- SIMULATED DATA RECEIVED FROM FRONTEND ---');
    if (sensorId) console.log(`Sensor ID: ${sensorId}`);
    
    const mqttPayload = {};
    if (sensorId) mqttPayload.sensorId = sensorId;
    if (waveform) mqttPayload.waveform = waveform;
    if (inputSignal !== undefined) mqttPayload.inputSignal = inputSignal;
    if (remainingDays !== undefined) mqttPayload.remainingDays = remainingDays;

    if (Object.keys(mqttPayload).length === 0) {
        return res.status(400).json({ success: false, message: 'No valid data provided' });
    }

    // Publish to the MQTT broker
    mqttClient.publish(mqttTopic, JSON.stringify(mqttPayload));
    
    if (waveform) {
        console.log(`Waveform: ${waveform.length} data points.`);
    }
    if (inputSignal !== undefined) console.log(`Input Signal: ${inputSignal}`);
    if (remainingDays !== undefined) console.log(`Remaining Days: ${remainingDays}`);
    
    res.json({ 
        success: true, 
        message: 'Data published to MQTT',
        dataSent: mqttPayload
    });
    console.log('---------------------------------------------');
});

// Periodic logic for alerting
setInterval(() => {
    const now = Date.now();
    const freqMs = appData.settings.frequencyHours * 60 * 60 * 1000;

    // Check if remaining days are below or equal to threshold
    if (appData.remainingDays <= appData.settings.alertDaysThreshold) {
        // Only send if enough time has passed based on frequency
        if (now - appData.lastExecution > freqMs) {
            const msg = `⚠️ ALERT: Remaining days (${appData.remainingDays}) is below or equal to the threshold (${appData.settings.alertDaysThreshold}). Input Signal: ${appData.inputSignal}`;
            addLog(`Triggering alert: Remaining days critically low (${appData.remainingDays})`);

            // Try to send telegram
            sendTelegramMessage(msg).then(() => {
                appData.lastExecution = now;
                saveData();
            });
        }
    }
}, 60000); // Check every minute

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});
