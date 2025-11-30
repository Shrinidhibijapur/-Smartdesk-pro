// --- GLOBAL STATE & CONSTANTS ---
const API_URL = "https://api.open-meteo.com/v1/forecast?latitude=12.97&longitude=77.59&current_weather=true&timezone=auto";
const ALARM_SOUND = document.getElementById('alarm-sound');
const POPUP = document.getElementById('alarm-popup');
const ALARM_SNOOZE_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
let isAlarmRinging = false;

// Quotes Array
const motivationalQuotes = [
    "The future belongs to those who believe in the beauty of their dreams.",
    "The only way to do great work is to love what you do.",
    "Strive not to be a success, but rather to be of value.",
    "The best way to predict the future is to create it.",
    "The journey of a thousand miles begins with a single step.",
    "Do not wait to strike till the iron is hot; but make the iron hot by striking.",
    "The mind is everything. What you think you become.",
    "You miss 100% of the shots you don't take.",
    "Success is the sum of small efforts repeated day in and day out.",
    "Action is the foundational key to all success."
];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Load: Theme, Navigation, Time
    applyTheme(localStorage.getItem('theme') || 'dark');
    document.querySelector('.nav-item').click();
    updateTimeWidgets();
    setInterval(updateTimeWidgets, 1000);

    // 2. Load LocalStorage Data
    loadQuotes();
    loadWeatherData();
    loadAlarms();
    loadStopwatch();
    loadTodos();
    loadTimerValues();

    // 3. Setup Event Listeners
    setupNavigation();
    setupAlarmListeners();
    setupTimerListeners();
    setupStopwatchListeners();
    setupTodoListeners();
    setupThemeListeners();

    // 4. Start Check for Alarms
    checkAlarmsPeriodically();
});

// --- LOCAL STORAGE HELPERS ---
function saveToLocalStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}
function loadFromLocalStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
}


// --- 1. DASHBOARD / CLOCK & WEATHER ---
function updateTimeWidgets() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const dateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    document.getElementById('digital-clock').textContent = timeString;
    document.getElementById('standalone-clock').textContent = timeString;
    document.getElementById('current-date').textContent = dateString;
    document.getElementById('standalone-date').textContent = dateString;
}

async function loadWeatherData() {
    try {
        // Use a static location (Bangalore, India: 12.97, 77.59) as requested
        const response = await fetch(API_URL);
        const data = await response.json();

        if (data.current_weather) {
            const temp = Math.round(data.current_weather.temperature);
            const weathercode = data.current_weather.weathercode;
            const condition = getWeatherCondition(weathercode);
            const icon = getWeatherIcon(weathercode);
            
            const card = document.getElementById('weather-card');
            
            document.getElementById('weather-temp').textContent = `${temp}°C`;
            document.getElementById('weather-condition').textContent = condition;
            document.getElementById('weather-icon').className = `fas ${icon}`;

            // Card glow based on temperature (Cool -> Blue, Warm -> Orange/Red)
            let shadowColor = '';
            if (temp < 10) shadowColor = '0 0 15px rgba(0, 150, 255, 0.6)'; // Blue
            else if (temp > 25) shadowColor = '0 0 15px rgba(255, 100, 0, 0.6)'; // Orange
            else shadowColor = 'var(--hover-glow-intensity)'; // Default
            
            card.style.boxShadow = `var(--neon-shadow), ${shadowColor}`;
        }
    } catch (error) {
        console.error("Error fetching weather data:", error);
        document.getElementById('weather-condition').textContent = "Weather Failed";
    }
}

function getWeatherCondition(code) {
    if (code === 0) return "Clear Sky";
    if (code >= 1 && code <= 3) return "Mainly Clear";
    if (code >= 45 && code <= 48) return "Fog/Rime Fog";
    if (code >= 51 && code <= 55) return "Drizzle";
    if (code >= 61 && code <= 65) return "Rain";
    if (code >= 71 && code <= 75) return "Snow Fall";
    if (code >= 95) return "Thunderstorm";
    return "Unknown";
}

function getWeatherIcon(code) {
    if (code === 0) return "fa-sun";
    if (code >= 1 && code <= 3) return "fa-cloud-sun";
    if (code >= 45 && code <= 48) return "fa-smog";
    if (code >= 51 && code <= 65) return "fa-cloud-showers-heavy";
    if (code >= 71 && code <= 75) return "fa-snowflake";
    if (code >= 95) return "fa-cloud-bolt";
    return "fa-cloud";
}

function loadQuotes() {
    const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
    document.getElementById('motivational-quote').textContent = motivationalQuotes[randomIndex];
}


// --- NAVIGATION ---
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = item.getAttribute('data-section');
            navigate(sectionId);
        });
    });
}

function navigate(sectionId) {
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    const targetNav = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
    if (targetNav) targetNav.classList.add('active');

    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
        if (section.id === sectionId) {
            section.classList.add('active');
        }
    });

    if (sectionId === 'alarms') renderAlarms();
    if (sectionId === 'stopwatch') renderLaps();
    if (sectionId === 'todo-list') renderTodos();
}


// --- 2. ALARM SYSTEM ---
let alarms = [];
let alarmInterval;

function loadAlarms() {
    alarms = loadFromLocalStorage('smartDeskProAlarms', []);
    renderAlarms();
    if (!alarmInterval) {
        alarmInterval = setInterval(checkAlarms, 1000);
    }
}

function renderAlarms() {
    const listContainer = document.getElementById('alarms-list-container');
    const previewTime = document.getElementById('next-alarm-time');
    const previewLabel = document.getElementById('next-alarm-label');
    listContainer.innerHTML = '';
    
    alarms.sort((a, b) => a.time.localeCompare(b.time));

    let nextAlarm = null;
    const now = new Date();
    const nowTime = now.toTimeString().substring(0, 5);

    alarms.forEach(alarm => {
        // Determine the next time this alarm will sound (today or tomorrow)
        const [h, m] = alarm.time.split(':');
        const alarmDate = new Date();
        alarmDate.setHours(h, m, 0, 0);

        if (alarm.time < nowTime) {
             alarmDate.setDate(alarmDate.getDate() + 1);
        }

        if (!nextAlarm || alarmDate < nextAlarm.date) {
            nextAlarm = { time: alarm.time, label: alarm.label, date: alarmDate };
        }

        const alarmCard = document.createElement('div');
        alarmCard.className = 'alarm-card glass-blur';
        alarmCard.dataset.time = alarm.time;
        alarmCard.innerHTML = `
            <div>
                <div class="alarm-time">${alarm.time}</div>
                <div class="alarm-label">${alarm.label || 'Alarm'}</div>
            </div>
            <button class="neon-btn danger small delete-alarm" data-time="${alarm.time}">
                <i class="fas fa-trash"></i>
            </button>
        `;
        listContainer.appendChild(alarmCard);
    });

    // Update Dashboard Preview
    if (nextAlarm) {
        previewTime.textContent = nextAlarm.time;
        previewLabel.textContent = nextAlarm.label || 'Upcoming';
    } else {
        previewTime.textContent = 'No alarms set';
        previewLabel.textContent = '';
    }

    document.querySelectorAll('.delete-alarm').forEach(btn => {
        btn.addEventListener('click', deleteAlarm);
    });
}

function setupAlarmListeners() {
    document.getElementById('set-alarm-btn').addEventListener('click', addAlarm);
    document.getElementById('dismiss-alarm-btn').addEventListener('click', dismissAlarm);
    document.getElementById('snooze-alarm-btn').addEventListener('click', snoozeAlarm);
}

function addAlarm() {
    const timeInput = document.getElementById('alarm-time-input');
    const labelInput = document.getElementById('alarm-label-input');
    const time = timeInput.value;
    const label = labelInput.value.trim();

    if (!time) {
        alert('Please select a time for the alarm.');
        return;
    }

    if (alarms.some(alarm => alarm.time === time)) {
        alert('An alarm is already set for this time.');
        return;
    }

    alarms.push({ time, label });
    saveToLocalStorage('smartDeskProAlarms', alarms);
    timeInput.value = '';
    labelInput.value = '';
    renderAlarms();
}

function deleteAlarm(e) {
    const timeToDelete = e.currentTarget.dataset.time;
    alarms = alarms.filter(alarm => alarm.time !== timeToDelete);
    saveToLocalStorage('smartDeskProAlarms', alarms);
    renderAlarms();
}

function checkAlarms() {
    if (isAlarmRinging) return;

    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5); // HH:MM

    const ringingAlarm = alarms.find(alarm => alarm.time === currentTime);

    if (ringingAlarm) {
        ringAlarm(ringingAlarm.label);

        const alarmCard = document.querySelector(`.alarm-card[data-time="${currentTime}"]`);
        if (alarmCard) {
            alarmCard.classList.add('ringing');
        }
    }
}

function ringAlarm(label) {
    isAlarmRinging = true;
    document.getElementById('ringing-label').textContent = label || 'Alarm Clock';
    POPUP.classList.add('active');

    // Attempt to play sound and trigger vibration
    ALARM_SOUND.play().catch(e => console.error("Audio playback failed:", e));
    if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500]);
    }
}

function dismissAlarm() {
    isAlarmRinging = false;
    ALARM_SOUND.pause();
    ALARM_SOUND.currentTime = 0;
    POPUP.classList.remove('active');
    document.querySelectorAll('.alarm-card.ringing').forEach(card => card.classList.remove('ringing'));
}

function snoozeAlarm() {
    const now = new Date();
    const snoozeTime = new Date(now.getTime() + ALARM_SNOOZE_TIME);
    const time = snoozeTime.toTimeString().substring(0, 5);
    const label = document.getElementById('ringing-label').textContent + ' (Snooze)';

    dismissAlarm();

    if (!alarms.some(alarm => alarm.time === time)) {
        alarms.push({ time, label });
        saveToLocalStorage('smartDeskProAlarms', alarms);
        renderAlarms();
        console.log(`Alarm snoozed for ${time}.`);
    } else {
        console.log('Snooze time already has an alarm set. Alarm dismissed.');
    }
}


// --- 3. COUNTDOWN TIMER ---
let timerInterval;
let timeRemaining = 0; // in seconds
let isTimerRunning = false;
const CIRCLE_RADIUS = 140;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

function loadTimerValues() {
    const lastTime = loadFromLocalStorage('smartDeskProTimer', { minutes: 5, seconds: 0, initialTime: 300 });
    document.getElementById('timer-minutes').value = String(lastTime.minutes).padStart(2, '0');
    document.getElementById('timer-seconds').value = String(lastTime.seconds).padStart(2, '0');
    timeRemaining = lastTime.minutes * 60 + lastTime.seconds;
    updateTimerDisplay(timeRemaining);
    updateTimerCircle(timeRemaining, lastTime.initialTime);
}

function setupTimerListeners() {
    document.getElementById('timer-start-btn').addEventListener('click', startTimer);
    document.getElementById('timer-pause-btn').addEventListener('click', pauseTimer);
    document.getElementById('timer-stop-btn').addEventListener('click', stopTimer);
    
    document.getElementById('timer-progress').style.strokeDasharray = CIRCUMFERENCE;
    document.getElementById('timer-progress').style.transition = 'stroke-dashoffset 0.9s linear';
}

function startTimer() {
    if (isTimerRunning) return;

    const min = parseInt(document.getElementById('timer-minutes').value) || 0;
    const sec = parseInt(document.getElementById('timer-seconds').value) || 0;
    const totalSeconds = (min * 60) + sec;
    
    if (timeRemaining <= 0) timeRemaining = totalSeconds;

    if (timeRemaining <= 0) {
        alert('Please set a time greater than zero.');
        return;
    }

    isTimerRunning = true;
    toggleTimerButtons(true);
    
    saveToLocalStorage('smartDeskProTimer', { 
        minutes: Math.floor(timeRemaining / 60), 
        seconds: timeRemaining % 60, 
        initialTime: totalSeconds > 0 ? totalSeconds : timeRemaining 
    });

    timerInterval = setInterval(() => {
        if (timeRemaining <= 0) {
            timerFinished();
            return;
        }

        timeRemaining--;
        updateTimerDisplay(timeRemaining);
        // Use the total time saved in local storage for correct percentage calculation
        const initialTime = loadFromLocalStorage('smartDeskProTimer', {}).initialTime || totalSeconds;
        updateTimerCircle(timeRemaining, initialTime);
    }, 1000);
}

function pauseTimer() {
    if (!isTimerRunning) return;
    clearInterval(timerInterval);
    isTimerRunning = false;
    toggleTimerButtons(false);
}

function stopTimer() {
    pauseTimer();
    timeRemaining = 0;
    document.getElementById('timer-minutes').value = '00';
    document.getElementById('timer-seconds').value = '00';
    updateTimerDisplay(0);
    updateTimerCircle(0, 1);
    toggleTimerButtons(false, true);
}

function timerFinished() {
    pauseTimer();
    timeRemaining = 0;
    updateTimerDisplay(0);
    updateTimerCircle(0, 1);
    toggleTimerButtons(false, true);
    
    ringAlarm('Countdown Complete!');
    setTimeout(dismissAlarm, 5000); // Auto-dismiss after 5s
}

function updateTimerDisplay(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('timer-display').textContent = display;
    
    if (isTimerRunning) {
        document.getElementById('timer-minutes').value = minutes.toString().padStart(2, '0');
        document.getElementById('timer-seconds').value = seconds.toString().padStart(2, '0');
    }
}

function updateTimerCircle(remainingSeconds, initialSeconds) {
    const progressElement = document.getElementById('timer-progress');
    if (initialSeconds === 0) initialSeconds = 1; // Prevent division by zero
    const percentage = (initialSeconds - remainingSeconds) / initialSeconds;
    const offset = CIRCUMFERENCE - (percentage * CIRCUMFERENCE);
    progressElement.style.strokeDashoffset = offset;
}

function toggleTimerButtons(running, forceReset = false) {
    document.getElementById('timer-start-btn').disabled = running;
    document.getElementById('timer-pause-btn').disabled = !running;
    document.getElementById('timer-stop-btn').disabled = !running && !timeRemaining;
    
    document.getElementById('timer-minutes').disabled = running;
    document.getElementById('timer-seconds').disabled = running;
    
    if (forceReset) {
        document.getElementById('timer-stop-btn').disabled = true;
    }
}


// --- 4. STOPWATCH ---
let stopwatchTime = 0; // in milliseconds
let stopwatchInterval;
let isStopwatchRunning = false;
let laps = [];

function loadStopwatch() {
    laps = loadFromLocalStorage('smartDeskProLaps', []);
    renderLaps();
    // Initialize buttons state
    toggleStopwatchButtons(false, stopwatchTime > 0); 
}

function setupStopwatchListeners() {
    document.getElementById('sw-start-btn').addEventListener('click', startStopwatch);
    document.getElementById('sw-pause-btn').addEventListener('click', pauseStopwatch);
    document.getElementById('sw-reset-btn').addEventListener('click', resetStopwatch);
    document.getElementById('sw-lap-btn').addEventListener('click', lapStopwatch);
}

function formatTime(ms) {
    const centiseconds = Math.floor((ms % 1000) / 10);
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));

    const h = String(hours).padStart(2, '0');
    const m = String(minutes).padStart(2, '0');
    const s = String(seconds).padStart(2, '0');
    const cs = String(centiseconds).padStart(2, '0');

    return `${h}:${m}:${s}.${cs}`;
}

function updateStopwatchDisplay() {
    document.getElementById('stopwatch-display').textContent = formatTime(stopwatchTime);
}

function startStopwatch() {
    if (isStopwatchRunning) return;

    let startTime = Date.now() - stopwatchTime;
    isStopwatchRunning = true;
    toggleStopwatchButtons(true);

    stopwatchInterval = setInterval(() => {
        stopwatchTime = Date.now() - startTime;
        updateStopwatchDisplay();
    }, 10);
}

function pauseStopwatch() {
    if (!isStopwatchRunning) return;
    clearInterval(stopwatchInterval);
    isStopwatchRunning = false;
    toggleStopwatchButtons(false);
}

function resetStopwatch() {
    pauseStopwatch();
    stopwatchTime = 0;
    laps = [];
    saveToLocalStorage('smartDeskProLaps', laps);
    updateStopwatchDisplay();
    renderLaps();
    toggleStopwatchButtons(false, true);
}

function lapStopwatch() {
    if (!isStopwatchRunning) return;

    const lapCount = laps.length + 1;
    
    const prevTime = laps.length > 0 ? laps[laps.length - 1].rawTime : 0;
    const splitTimeMs = stopwatchTime - prevTime;

    const newLap = {
        index: lapCount,
        time: formatTime(stopwatchTime),
        splitTime: formatTime(splitTimeMs),
        rawTime: stopwatchTime
    };

    laps.push(newLap);
    saveToLocalStorage('smartDeskProLaps', laps);
    renderLaps();
}

function renderLaps() {
    const lapList = document.getElementById('lap-list');
    lapList.innerHTML = '';
    
    if (laps.length === 0) {
        lapList.innerHTML = '<p style="text-align:center; opacity:0.6; padding-top:10px;">No laps recorded yet.</p>';
        return;
    }

    laps.slice().reverse().forEach(lap => {
        const lapItem = document.createElement('div');
        lapItem.className = 'lap-item';
        lapItem.innerHTML = `
            <span class="lap-index">LAP ${lap.index}</span>
            <span class="lap-split">${lap.splitTime}</span>
            <span class="lap-time">${lap.time}</span>
        `;
        lapList.appendChild(lapItem);
    });
}

function toggleStopwatchButtons(running, forceReset = false) {
    document.getElementById('sw-start-btn').disabled = running;
    document.getElementById('sw-pause-btn').disabled = !running;
    document.getElementById('sw-reset-btn').disabled = running && !forceReset ? false : (stopwatchTime === 0);
    document.getElementById('sw-lap-btn').disabled = !running;
}


// --- 5. TO-DO LIST ---
let todos = [];

function loadTodos() {
    todos = loadFromLocalStorage('smartDeskProTodos', []);
    renderTodos();
    renderMiniTodoList();
}

function setupTodoListeners() {
    document.getElementById('add-todo-btn').addEventListener('click', addTodo);
    document.getElementById('todo-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });
}

function addTodo() {
    const input = document.getElementById('todo-input');
    const text = input.value.trim();

    if (text) {
        const newTodo = {
            id: Date.now(),
            text: text,
            completed: false
        };
        todos.push(newTodo);
        saveToLocalStorage('smartDeskProTodos', todos);
        input.value = '';
        renderTodos();
        renderMiniTodoList();
    }
}

function toggleTodoCompleted(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveToLocalStorage('smartDeskProTodos', todos);
        renderTodos();
        renderMiniTodoList();
    }
}

function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    saveToLocalStorage('smartDeskProTodos', todos);
    renderTodos();
    renderMiniTodoList();
}

function renderTodos() {
    const container = document.getElementById('todo-list-container');
    container.innerHTML = '';

    if (todos.length === 0) {
        container.innerHTML = '<p style="text-align:center; opacity:0.6; margin-top:20px;">No tasks. Time to relax or create a new mission!</p>';
        return;
    }

    todos.forEach(todo => {
        const item = document.createElement('div');
        item.className = `todo-item glass-blur ${todo.completed ? 'completed' : ''}`;
        item.innerHTML = `
            <div class="todo-content" data-id="${todo.id}">
                <div class="todo-checkbox">
                    <i class="fas fa-check"></i>
                </div>
                <span class="todo-text">${todo.text}</span>
            </div>
            <button class="todo-delete-btn" data-id="${todo.id}">
                <i class="fas fa-trash-can"></i>
            </button>
        `;

        item.querySelector('.todo-content').addEventListener('click', () => {
            toggleTodoCompleted(todo.id);
        });

        item.querySelector('.todo-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTodo(todo.id);
        });

        container.appendChild(item);
    });
}

function renderMiniTodoList() {
    const list = document.getElementById('mini-todo-list');
    list.innerHTML = '';
    
    const incompleteTasks = todos.filter(t => !t.completed).slice(0, 3);

    if (incompleteTasks.length === 0) {
        list.innerHTML = `<li><span class="mini-task-text">All tasks completed!</span></li>`;
        return;
    }

    incompleteTasks.forEach(task => {
        const item = document.createElement('li');
        item.innerHTML = `<span class="mini-task-text">${task.text}</span>`;
        list.appendChild(item);
    });
}


// --- 6. THEME SWITCHER ---
function setupThemeListeners() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme');
            applyTheme(theme);
            localStorage.setItem('theme', theme);
        });
    });
}

function applyTheme(theme) {
    document.body.className = `theme-${theme}`;

    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active-theme');
        if (btn.getAttribute('data-theme') === theme) {
            btn.classList.add('active-theme');
        }
    });
}