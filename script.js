const hourHand = document.getElementById('hour-hand');
const minuteHand = document.getElementById('minute-hand');
const secondHand = document.getElementById('second-hand');
const digitalTime = document.getElementById('digital-time');
const dateDisplay = document.getElementById('date-display');
const alarmsList = document.getElementById('alarms-list');
const addAlarmBtn = document.getElementById('add-alarm-btn');
const alarmTimeInput = document.getElementById('alarm-time-input');
const alarmLabelInput = document.getElementById('alarm-label-input');

const API_URL = 'http://localhost:3000/api/alarms';

let alarms = [];

// Initialize
function init() {
    updateClock();
    setInterval(updateClock, 1000);
    fetchAlarms();

    // Set default date
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    dateDisplay.textContent = now.toLocaleDateString('en-US', options);
}

// Update Clock
function updateClock() {
    const now = new Date();
    const seconds = now.getSeconds();
    const minutes = now.getMinutes();
    const hours = now.getHours();

    const secondDegrees = ((seconds / 60) * 360);
    const minuteDegrees = ((minutes / 60) * 360) + ((seconds / 60) * 6);
    const hourDegrees = ((hours / 12) * 360) + ((minutes / 60) * 30);

    secondHand.style.transform = `translateX(-50%) rotate(${secondDegrees}deg)`;
    minuteHand.style.transform = `translateX(-50%) rotate(${minuteDegrees}deg)`;
    hourHand.style.transform = `translateX(-50%) rotate(${hourDegrees}deg)`;

    // Digital Time
    const h = hours.toString().padStart(2, '0');
    const m = minutes.toString().padStart(2, '0');
    const s = seconds.toString().padStart(2, '0');
    digitalTime.textContent = `${h}:${m}:${s}`;

    checkAlarms(h, m, s);
}

// Check Alarms
function checkAlarms(h, m, s) {
    if (s !== '00') return; // Only check at the start of the minute

    const currentTime = `${h}:${m}`;
    alarms.forEach(alarm => {
        if (alarm.active && alarm.time === currentTime) {
            triggerAlarm(alarm);
        }
    });
}

function triggerAlarm(alarm) {
    // Play sound
    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
    audio.play();

    // Visual alert
    alert(`ALARM: ${alarm.label}`);
}

// API Functions
async function fetchAlarms() {
    try {
        const response = await fetch(API_URL);
        alarms = await response.json();
        renderAlarms();
    } catch (error) {
        console.error('Error fetching alarms:', error);
    }
}

async function addAlarm() {
    const time = alarmTimeInput.value;
    const label = alarmLabelInput.value;

    if (!time) return alert('Please select a time');

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ time, label })
        });
        const newAlarm = await response.json();
        alarms.push(newAlarm);
        renderAlarms();
        alarmTimeInput.value = '';
        alarmLabelInput.value = '';
    } catch (error) {
        console.error('Error adding alarm:', error);
    }
}

async function deleteAlarm(id) {
    try {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        alarms = alarms.filter(a => a.id !== id);
        renderAlarms();
    } catch (error) {
        console.error('Error deleting alarm:', error);
    }
}

async function toggleAlarm(id, currentStatus) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: !currentStatus })
        });
        const updatedAlarm = await response.json();
        const index = alarms.findIndex(a => a.id === id);
        alarms[index] = updatedAlarm;
        renderAlarms();
    } catch (error) {
        console.error('Error toggling alarm:', error);
    }
}

// Render Alarms
function renderAlarms() {
    alarmsList.innerHTML = '';

    // Sort alarms by time
    alarms.sort((a, b) => a.time.localeCompare(b.time));

    alarms.forEach(alarm => {
        const item = document.createElement('div');
        item.className = `alarm-item ${alarm.active ? '' : 'inactive'}`;

        item.innerHTML = `
            <div class="alarm-info">
                <span class="alarm-time">${alarm.time}</span>
                <span class="alarm-label">${alarm.label}</span>
            </div>
            <div class="alarm-controls">
                <div class="toggle-switch ${alarm.active ? 'active' : ''}" onclick="toggleAlarm('${alarm.id}', ${alarm.active})"></div>
                <button class="delete-btn" onclick="deleteAlarm('${alarm.id}')"><i class="fas fa-trash"></i></button>
            </div>
        `;
        alarmsList.appendChild(item);
    });
}

// Event Listeners
addAlarmBtn.addEventListener('click', addAlarm);

// Start
init();
