const STORAGE_KEY = 'daily_planner_v1';
const SLEEP_START_MINUTES = 22 * 60 + 30;
const NO_HEAVY_THINKING_MINUTES = 21 * 60 + 30;
const GYM_TIME_MINUTES = 17 * 60;

const state = {
  date: new Date().toISOString().slice(0, 10),
  currentTime: null,
  energy: 'medium',
  context: '',
  done: {
    sat: false,
    homework: false,
    gym: false,
    reading: false,
    life: false,
  },
  habits: {},
};

const elements = {
  currentTime: document.getElementById('current-time'),
  useNow: document.getElementById('use-now'),
  energy: document.getElementById('energy-level'),
  context: document.getElementById('context-input'),
  doneSat: document.getElementById('done-sat'),
  doneHomework: document.getElementById('done-homework'),
  doneGym: document.getElementById('done-gym'),
  doneReading: document.getElementById('done-reading'),
  doneLife: document.getElementById('done-life'),
  generatePlan: document.getElementById('generate-plan'),
  remainingHours: document.getElementById('remaining-hours'),
  doNow: document.getElementById('do-now'),
  executionTips: document.getElementById('execution-tips'),
  improvementTip: document.getElementById('improvement-tip'),
  miniPlan: document.getElementById('mini-plan'),
  planReason: document.getElementById('plan-reason'),
  habitSummary: document.getElementById('habit-summary'),
  statusMsg: document.getElementById('status-msg'),
  plannerCanvas: document.getElementById('plannerCanvas'),
  themeToggle: document.getElementById('theme-toggle'),
  themeIcon: document.getElementById('theme-icon'),
};

const habitInputs = Array.from(document.querySelectorAll('[data-habit]'));

const tipsByTask = {
  sat: [
    'Open the SAT materials and highlight the exact set you will finish.',
    'Start with 10 minutes of warm-up questions before the full set.',
    'Keep water at your desk and stay seated for the full block.',
  ],
  homework: [
    'List the assignments in order of difficulty before starting.',
    'Set a 25-minute timer for the first problem set.',
    'Keep distractions off your desk so you can flow quickly.',
  ],
  gym: [
    'Pack water and a towel before you leave.',
    'Do 3 minutes of dynamic warm-up to save time.',
    'Pick 1-2 key lifts so you feel strong and focused.',
  ],
  reading: [
    'Read with a pen and write one sentence summary.',
    'Set a 15-minute timer to keep momentum.',
    'Sit somewhere with low distractions and good light.',
  ],
  life: [
    'Pick the smallest task to build momentum.',
    'Combine chores to reduce context switching.',
    'Play calm background music to keep the pace.',
  ],
  windDown: [
    'Dim lights and close any screens 30 minutes before bed.',
    'Lay out clothes and materials for tomorrow.',
    'Do a 2-minute tidy so your desk is ready.',
  ],
};

const improvementTips = [
  'Drink a full glass of water before starting.',
  'Wash your hands before dinner to reset your focus.',
  'Clear your desk to one open book before the next block.',
  'Open the SAT workbook to the exact page you will use.',
  'Put your phone on silent and face down for 60 minutes.',
];

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (!saved || saved.date !== state.date) {
    return;
  }
  Object.assign(state, saved);
}

function minutesFromTime(timeValue) {
  if (!timeValue) return null;
  const [hours, minutes] = timeValue.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function setNowTime() {
  const now = new Date();
  const timeValue = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  elements.currentTime.value = timeValue;
  state.currentTime = timeValue;
  saveState();
}

function computeRemainingHours(nowMinutes) {
  const remaining = Math.max(SLEEP_START_MINUTES - nowMinutes, 0);
  const hours = (remaining / 60).toFixed(1);
  elements.remainingHours.textContent = `${hours}h`;
}

function summarizeHabits() {
  const tally = { good: 0, neutral: 0, bad: 0 };
  habitInputs.forEach(input => {
    if (input.checked) {
      tally[input.dataset.habit] += 1;
    }
  });
  elements.habitSummary.textContent = `Good: ${tally.good} • Neutral: ${tally.neutral} • Bad: ${tally.bad}`;
}

function updateTheme() {
  const isDark = document.body.classList.toggle('dark');
  elements.themeIcon.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('planner_theme', isDark ? 'dark' : 'light');
}

function hydrateTheme() {
  const savedTheme = localStorage.getItem('planner_theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    elements.themeIcon.textContent = '☀️';
  }
}

function getTaskOrder() {
  return [
    { id: 'sat', label: 'SAT prep deep work', duration: 75, type: 'deep' },
    { id: 'homework', label: 'School & homework', duration: 60, type: 'deep' },
    { id: 'gym', label: 'Go to the gym', duration: 60, type: 'fixed' },
    { id: 'reading', label: 'Read Atomic Habits', duration: 20, type: 'light' },
    { id: 'life', label: 'Life habits & responsibilities', duration: 25, type: 'light' },
  ];
}

function chooseNextTask(nowMinutes) {
  if (nowMinutes >= NO_HEAVY_THINKING_MINUTES) {
    return { id: 'windDown', label: 'Wind down: light reset and prep for sleep' };
  }

  if (!state.done.gym) {
    if (nowMinutes >= GYM_TIME_MINUTES - 30 && nowMinutes < GYM_TIME_MINUTES) {
      return { id: 'gym', label: 'Prep for gym: change, water, quick stretch' };
    }
    if (nowMinutes >= GYM_TIME_MINUTES && nowMinutes < GYM_TIME_MINUTES + 90) {
      return { id: 'gym', label: 'Go to the gym (fixed 17:00 slot)' };
    }
  }

  if (!state.done.sat && state.energy !== 'low') {
    return { id: 'sat', label: 'SAT prep deep work (60–90 min)' };
  }

  if (!state.done.homework) {
    return { id: 'homework', label: 'School & homework focus block' };
  }

  if (!state.done.sat && state.energy === 'low') {
    return { id: 'sat', label: 'SAT prep with a small warm-up set' };
  }

  if (!state.done.reading) {
    return { id: 'reading', label: 'Read Atomic Habits (20 min)' };
  }

  if (!state.done.life) {
    return { id: 'life', label: 'Life habits & responsibilities (quick wins)' };
  }

  return { id: 'windDown', label: 'Light review, gratitude, and sleep prep' };
}

function buildPlan(nowMinutes) {
  const plan = [];
  let pointer = nowMinutes;

  const addBlock = (label, duration, type = 'focus') => {
    if (pointer >= SLEEP_START_MINUTES) return;
    const end = Math.min(pointer + duration, SLEEP_START_MINUTES);
    plan.push({ start: pointer, end, label, type });
    pointer = end;
  };

  const addBreak = () => addBlock('Break (5-10 min)', 10, 'break');

  const scheduleTask = (task, duration) => {
    addBlock(task, duration, 'focus');
    addBreak();
  };

  if (pointer < GYM_TIME_MINUTES - 20 && !state.done.sat) {
    scheduleTask('SAT deep work', 75);
  }

  if (pointer < GYM_TIME_MINUTES - 20 && !state.done.homework) {
    scheduleTask('Homework block', 60);
  }

  if (!state.done.gym) {
    if (pointer < GYM_TIME_MINUTES) {
      addBlock('Prep for gym', Math.max(GYM_TIME_MINUTES - pointer, 15), 'prep');
    }
    addBlock('Gym (fixed at 17:00)', 60, 'fixed');
    addBreak();
  }

  if (!state.done.sat && pointer < NO_HEAVY_THINKING_MINUTES - 30) {
    scheduleTask('SAT review / mistakes log', 45);
  }

  if (!state.done.reading && pointer < NO_HEAVY_THINKING_MINUTES) {
    addBlock('Read Atomic Habits', 20, 'light');
  }

  if (!state.done.life && pointer < NO_HEAVY_THINKING_MINUTES) {
    addBlock('Life habits & responsibilities', 20, 'light');
  }

  if (pointer < NO_HEAVY_THINKING_MINUTES) {
    addBlock('Easy admin / prep for tomorrow', NO_HEAVY_THINKING_MINUTES - pointer, 'light');
  }

  addBlock('Wind down & sleep routine', SLEEP_START_MINUTES - pointer, 'wind');

  return plan;
}

function renderPlan(plan) {
  elements.miniPlan.innerHTML = '';
  plan.forEach(block => {
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60';
    item.innerHTML = `
      <div>
        <p class="font-semibold">${block.label}</p>
        <p class="text-xs label-muted">${formatTime(block.start)} → ${formatTime(block.end)}</p>
      </div>
      <span class="text-xs uppercase label-muted">${block.type}</span>
    `;
    elements.miniPlan.appendChild(item);
  });
}

function drawCanvas(plan) {
  const canvas = elements.plannerCanvas;
  const ctx = canvas.getContext('2d');
  const width = canvas.width = canvas.offsetWidth;
  const height = canvas.height = 160;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(0, height - 30, width, 6);

  const dayStart = Math.min(...plan.map(block => block.start));
  const dayEnd = SLEEP_START_MINUTES;

  plan.forEach((block, index) => {
    const startX = ((block.start - dayStart) / (dayEnd - dayStart)) * width;
    const endX = ((block.end - dayStart) / (dayEnd - dayStart)) * width;
    const barWidth = Math.max(endX - startX, 6);

    const colors = {
      focus: '#6366f1',
      fixed: '#22c55e',
      break: '#f97316',
      light: '#38bdf8',
      prep: '#a855f7',
      wind: '#94a3b8',
    };

    ctx.fillStyle = colors[block.type] || '#64748b';
    ctx.fillRect(startX, 30 + (index % 3) * 28, barWidth, 20);
  });

  ctx.fillStyle = '#0f172a';
  ctx.font = '12px system-ui';
  ctx.fillText('Now → Sleep', 8, 18);
}

function updateOutputs() {
  const nowMinutes = minutesFromTime(state.currentTime || elements.currentTime.value);
  if (nowMinutes === null) {
    elements.statusMsg.textContent = 'Please set the current time.';
    return;
  }

  state.currentTime = elements.currentTime.value;
  state.energy = elements.energy.value;
  state.context = elements.context.value.trim();
  state.done = {
    sat: elements.doneSat.checked,
    homework: elements.doneHomework.checked,
    gym: elements.doneGym.checked,
    reading: elements.doneReading.checked,
    life: elements.doneLife.checked,
  };

  const nextTask = chooseNextTask(nowMinutes);
  const tips = tipsByTask[nextTask.id] || tipsByTask.life;

  elements.doNow.textContent = nextTask.label;
  elements.executionTips.innerHTML = '';
  tips.slice(0, 3).forEach(tip => {
    const li = document.createElement('li');
    li.textContent = tip;
    elements.executionTips.appendChild(li);
  });

  const improvement = improvementTips[Math.floor(Math.random() * improvementTips.length)];
  elements.improvementTip.textContent = improvement;

  computeRemainingHours(nowMinutes);
  const plan = buildPlan(nowMinutes);
  renderPlan(plan);
  drawCanvas(plan);

  const reasonParts = [
    'SAT prep stays early and protected for deep work.',
    'The gym is locked at 17:00 so energy stays steady.',
    'Light tasks and wind-down protect your sleep window.',
  ];

  if (state.context) {
    reasonParts.push(`Context noted: ${state.context}.`);
  }

  elements.planReason.textContent = reasonParts.join(' ');
  elements.statusMsg.textContent = 'Plan refreshed.';

  saveState();
}

function hydrateInputs() {
  elements.currentTime.value = state.currentTime || '';
  elements.energy.value = state.energy;
  elements.context.value = state.context;
  elements.doneSat.checked = state.done.sat;
  elements.doneHomework.checked = state.done.homework;
  elements.doneGym.checked = state.done.gym;
  elements.doneReading.checked = state.done.reading;
  elements.doneLife.checked = state.done.life;

  habitInputs.forEach(input => {
    input.checked = Boolean(state.habits[input.value]);
  });
  summarizeHabits();
}

function bindEvents() {
  elements.useNow.addEventListener('click', () => {
    setNowTime();
    updateOutputs();
  });

  elements.generatePlan.addEventListener('click', updateOutputs);

  elements.themeToggle.addEventListener('click', updateTheme);

  habitInputs.forEach(input => {
    input.addEventListener('change', () => {
      state.habits[input.value] = input.checked;
      summarizeHabits();
      saveState();
    });
  });

  [
    elements.currentTime,
    elements.energy,
    elements.context,
    elements.doneSat,
    elements.doneHomework,
    elements.doneGym,
    elements.doneReading,
    elements.doneLife,
  ].forEach(input => {
    input.addEventListener('change', () => {
      saveState();
    });
  });
}

function init() {
  loadState();
  hydrateTheme();
  hydrateInputs();
  bindEvents();
  if (!elements.currentTime.value) {
    setNowTime();
  }
  updateOutputs();
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => console.log('Service Worker registered'))
    .catch(err => console.log('SW error:', err));
}

init();
