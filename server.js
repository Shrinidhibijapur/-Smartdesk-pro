const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'alarms.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files from current directory

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// Ensure data file exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

// Helper to read alarms
const readAlarms = () => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

// Helper to write alarms
const writeAlarms = (alarms) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(alarms, null, 2));
};

// Routes

// GET all alarms
app.get('/api/alarms', (req, res) => {
    const alarms = readAlarms();
    res.json(alarms);
});

// POST new alarm
app.post('/api/alarms', (req, res) => {
    const { time, label, active } = req.body;
    if (!time) {
        return res.status(400).json({ error: 'Time is required' });
    }

    const alarms = readAlarms();
    const newAlarm = {
        id: Date.now().toString(),
        time,
        label: label || 'Alarm',
        active: active !== undefined ? active : true
    };

    alarms.push(newAlarm);
    writeAlarms(alarms);
    res.status(201).json(newAlarm);
});

// DELETE alarm
app.delete('/api/alarms/:id', (req, res) => {
    const { id } = req.params;
    let alarms = readAlarms();
    const initialLength = alarms.length;
    alarms = alarms.filter(alarm => alarm.id !== id);

    if (alarms.length === initialLength) {
        return res.status(404).json({ error: 'Alarm not found' });
    }

    writeAlarms(alarms);
    res.json({ message: 'Alarm deleted successfully' });
});

// TOGGLE alarm status
app.patch('/api/alarms/:id', (req, res) => {
    const { id } = req.params;
    const { active } = req.body;

    let alarms = readAlarms();
    const alarmIndex = alarms.findIndex(a => a.id === id);

    if (alarmIndex === -1) {
        return res.status(404).json({ error: 'Alarm not found' });
    }

    alarms[alarmIndex].active = active;
    writeAlarms(alarms);
    res.json(alarms[alarmIndex]);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
