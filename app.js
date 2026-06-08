// Data keys
const USER_KEY = 'pigu_user';
const FASTING_START_KEY = 'pigu_fasting_start';
const WEIGHT_RECORDS_KEY = 'pigu_weights';
const TARGET_WEIGHT_KEY = 'pigu_target_weight';
const REFLECTIONS_KEY = 'pigu_reflections';

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const displayUsername = document.getElementById('display-username');

const startFastBtn = document.getElementById('start-fast-btn');
const stopFastBtn = document.getElementById('stop-fast-btn');
const timerText = document.getElementById('timer-text');
const timerDays = document.getElementById('timer-days');
const fastingStatus = document.getElementById('fasting-status');
const timerContainer = document.querySelector('.timer-display');

const targetWeightInput = document.getElementById('target-weight-input');
const weightInput = document.getElementById('weight-input');
const recordWeightBtn = document.getElementById('record-weight-btn');
const weightChartCanvas = document.getElementById('weight-chart');

// Reflection DOM Elements
const reflectionInput = document.getElementById('reflection-input');
const recordReflectionBtn = document.getElementById('record-reflection-btn');
const reflectionsList = document.getElementById('reflections-list');

// Data Management DOM Elements
const dataManageBtn = document.getElementById('data-manage-btn');
const dataModal = document.getElementById('data-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const exportBtn = document.getElementById('export-btn');
const importInput = document.getElementById('import-input');

// State
let timerInterval = null;
let chartInstance = null;

// Initialization
function init() {
    const user = localStorage.getItem(USER_KEY);
    if (user) {
        showAppScreen(user);
    } else {
        showLoginScreen();
    }
}

// UI Navigation
function showLoginScreen() {
    loginScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
}

function showAppScreen(username) {
    loginScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    displayUsername.textContent = username;
    
    // Load target weight if exists
    const savedTarget = localStorage.getItem(TARGET_WEIGHT_KEY);
    if (savedTarget) {
        targetWeightInput.value = savedTarget;
    }
    
    checkFastingStatus();
    renderChart();
    renderReflections();
}

// Event Listeners
loginBtn.addEventListener('click', () => {
    const name = usernameInput.value.trim();
    if (name) {
        localStorage.setItem(USER_KEY, name);
        showAppScreen(name);
    } else {
        alert("请输入道号");
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(USER_KEY);
    showLoginScreen();
});

startFastBtn.addEventListener('click', () => {
    const now = new Date().getTime();
    localStorage.setItem(FASTING_START_KEY, now);
    checkFastingStatus();
});

stopFastBtn.addEventListener('click', () => {
    // Optionally save the record here
    const startTime = localStorage.getItem(FASTING_START_KEY);
    const endTime = new Date().getTime();
    
    // In a full app, we would save {start: startTime, end: endTime} to a history array.
    localStorage.removeItem(FASTING_START_KEY);
    checkFastingStatus();
});

targetWeightInput.addEventListener('change', (e) => {
    const target = parseFloat(e.target.value);
    if (!isNaN(target) && target > 0) {
        localStorage.setItem(TARGET_WEIGHT_KEY, target);
        renderChart(); // re-render chart to show the target line
    }
});

recordWeightBtn.addEventListener('click', () => {
    const weight = parseFloat(weightInput.value);
    if (isNaN(weight) || weight <= 0) {
        alert("请输入有效的体重");
        return;
    }

    const now = new Date().getTime();
    const records = getWeightRecords();
    records.push({ time: now, weight: weight });
    localStorage.setItem(WEIGHT_RECORDS_KEY, JSON.stringify(records));
    
    weightInput.value = '';
    renderChart();
});

// Daily Reflection Logic
function getReflections() {
    const data = localStorage.getItem(REFLECTIONS_KEY);
    return data ? JSON.parse(data) : [];
}

recordReflectionBtn.addEventListener('click', () => {
    const text = reflectionInput.value.trim();
    if (!text) {
        alert("请填写感悟内容");
        return;
    }

    const now = new Date().getTime();
    const records = getReflections();
    // Add to the beginning so newest is top
    records.unshift({ time: now, text: text });
    localStorage.setItem(REFLECTIONS_KEY, JSON.stringify(records));
    
    reflectionInput.value = '';
    renderReflections();
});

function renderReflections() {
    const records = getReflections();
    reflectionsList.innerHTML = '';
    
    if (records.length === 0) {
        reflectionsList.innerHTML = '<p class="text-gray-400 text-center text-sm py-4">暂无感悟，开始写下你的第一篇反思吧。</p>';
        return;
    }
    
    records.forEach(r => {
        const d = new Date(r.time);
        const dateStr = `${d.getFullYear()}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        
        const item = document.createElement('div');
        item.className = 'p-4 bg-gray-50 rounded-lg border border-gray-100 flex flex-col';
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'text-xs text-gray-400 mb-2';
        timeDiv.textContent = dateStr;
        
        const textDiv = document.createElement('div');
        textDiv.className = 'text-sm text-daoBlack leading-relaxed whitespace-pre-wrap';
        textDiv.textContent = r.text;
        
        item.appendChild(timeDiv);
        item.appendChild(textDiv);
        reflectionsList.appendChild(item);
    });
}

// Fasting Timer Logic
function checkFastingStatus() {
    const startTime = localStorage.getItem(FASTING_START_KEY);
    
    if (startTime) {
        startFastBtn.classList.add('hidden');
        stopFastBtn.classList.remove('hidden');
        fastingStatus.classList.remove('hidden');
        timerContainer.classList.add('breathing');
        
        startTimer(parseInt(startTime));
    } else {
        startFastBtn.classList.remove('hidden');
        stopFastBtn.classList.add('hidden');
        fastingStatus.classList.add('hidden');
        timerContainer.classList.remove('breathing');
        
        stopTimer();
        timerText.textContent = "00:00:00";
        timerDays.textContent = "0 天";
    }
}

function startTimer(startTime) {
    if (timerInterval) clearInterval(timerInterval);
    
    updateTimerDisplay(startTime); // update immediately
    timerInterval = setInterval(() => {
        updateTimerDisplay(startTime);
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay(startTime) {
    const now = new Date().getTime();
    const diff = Math.max(0, now - startTime); // difference in ms
    
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const pad = (num) => num.toString().padStart(2, '0');
    
    timerText.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    timerDays.textContent = `${days} 天`;
}

// Weight Chart Logic
function getWeightRecords() {
    const data = localStorage.getItem(WEIGHT_RECORDS_KEY);
    return data ? JSON.parse(data) : [];
}

// Data Management Logic
dataManageBtn.addEventListener('click', () => {
    dataModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => {
    dataModal.classList.add('hidden');
});

exportBtn.addEventListener('click', () => {
    const data = {
        user: localStorage.getItem(USER_KEY),
        fastingStart: localStorage.getItem(FASTING_START_KEY),
        weights: getWeightRecords(),
        reflections: getReflections()
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "pigu_backup_" + new Date().getTime() + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
});

importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = JSON.parse(event.target.result);
            if (data.user) localStorage.setItem(USER_KEY, data.user);
            if (data.fastingStart) localStorage.setItem(FASTING_START_KEY, data.fastingStart);
            if (data.weights) localStorage.setItem(WEIGHT_RECORDS_KEY, JSON.stringify(data.weights));
            if (data.reflections) localStorage.setItem(REFLECTIONS_KEY, JSON.stringify(data.reflections));
            
            alert('数据恢复成功！');
            dataModal.classList.add('hidden');
            location.reload(); // Reload to apply changes
        } catch (error) {
            alert('文件格式错误或损坏，恢复失败。');
        }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
});

function renderChart() {
    const records = getWeightRecords();
    
    // Sort by time just in case
    records.sort((a, b) => a.time - b.time);
    
    const labels = records.map(r => {
        const d = new Date(r.time);
        return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    });
    
    const dataPoints = records.map(r => r.weight);

    if (chartInstance) {
        chartInstance.destroy();
    }

    const ctx = weightChartCanvas.getContext('2d');
    
    // Daoist aesthetic for chart
    Chart.defaults.font.family = '"Noto Serif SC", serif';
    Chart.defaults.color = '#1a1a1a';
    
    const targetWeight = localStorage.getItem(TARGET_WEIGHT_KEY);
    
    // Optional: Add target line to chart dataset if exists
    const datasets = [{
        label: '体重 (kg)',
        data: dataPoints,
        borderColor: '#1a1a1a',
        backgroundColor: 'rgba(26, 26, 26, 0.1)',
        borderWidth: 2,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#1a1a1a',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.3
    }];
    
    if (targetWeight && records.length > 0) {
        const targetData = Array(records.length).fill(parseFloat(targetWeight));
        datasets.push({
            label: '目标体重 (kg)',
            data: targetData,
            borderColor: '#6366f1', // Indigo color for target
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
            tension: 0
        });
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: '#e5e5e5'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // Hide legend for cleaner look
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 26, 26, 0.9)',
                    titleFont: { family: '"Noto Serif SC", serif' },
                    bodyFont: { family: '"Noto Serif SC", serif' }
                }
            }
        }
    });
}

// Run app
init();

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registered', reg))
            .catch(err => console.log('Service Worker registration failed', err));
    });
}
