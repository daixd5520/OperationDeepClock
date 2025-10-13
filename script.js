document.addEventListener('DOMContentLoaded', () => {
  // ========= 0) 常量 & 工具 =========
  const CANONICAL_KEY = 'deepSpaceClockState';      // 稳定通用键
  const COMPAT_V24_KEY = 'deepSpaceClockStateV2_4'; // 兼容键
  const LEGACY_V23_KEY = 'deepSpaceClockStateV2_3'; // 老版本键
  const BACKUP_INDEX_KEY = 'deepSpaceClockBackupIndex';
  const LAST_BACKUP_DATE_KEY = 'deepSpaceClockLastBackupDate';
  const ACTIVE_TAB_KEY = 'deepSpaceClockActiveTab';
  const SYNC_KEY = 'deepSpaceClockGitHubSync';
  const CURRENT_SCHEMA = 4;

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const pad2 = (n) => String(n).padStart(2, '0');

  const parseHM = (hm) => { const [h, m] = hm.split(':').map(Number); return { h, m }; };
  const dateFrom = (dateStr, hm) => { const d = new Date(`${dateStr}T00:00:00`); const { h, m } = parseHM(hm); d.setHours(h, m, 0, 0); return d; };
  const addMinutes = (date, mins) => { const d = new Date(date.getTime()); d.setMinutes(d.getMinutes() + mins); return d; };
  const fmt = (date) => `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

  const showToast = (msg) => { const el = document.getElementById('toast'); el.textContent = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2200); };
  const getTodayDateString = () => new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60 * 1000)).toISOString().split('T')[0];

  // ========= 1) 计划数据 =========
  const planData = [
    { day: 1,  phase: '强制着陆', sleep: '05:15', wake: '14:15', quest: '最艰难的一步：在天亮前回卧室。无论如何，到点就躺下。', encouragement: '“所有变革的开端，都伴随着巨大的阵痛。”', sleepRitual: ['<strong>[关键]</strong> 04:45 必须放下手机', '拉上窗帘，制造黑暗', '洗漱，换上睡衣'], wakeActions: ['醒来后喝水','拉开窗帘，接触日光','简单吃点东西']},
    { day: 2,  phase: '巩固航线', sleep: '05:15', wake: '14:15', quest: '重复昨天的行动。身体正在激烈反抗，但你需要比它更坚定。', encouragement: '“胜利属于能够坚持重复的人。”', sleepRitual: ['04:45 放下手机', '拉上窗帘，制造黑暗', '洗漱，换上睡衣']},
    { day: 3,  phase: '黎明防线', sleep: '04:30', wake: '13:30', quest: '你成功了！现在要在天亮前回卧室变成一种习惯。', encouragement: '“你已在黑夜中建立起第一个前哨站。”', sleepRitual: ['04:00 电脑关机', '听10分钟舒缓音乐或播客', '洗漱']},
    { day: 4,  phase: '巩固防线', sleep: '04:30', wake: '13:30', quest: '感受一下，白天的时间是不是变长了一点？', encouragement: '“每提前一分钟，都是从混乱中夺回的一分钟生命。”', sleepRitual: ['04:00 电脑关机', '听10分钟舒缓音乐或播客', '洗漱']},
    { day: 5,  phase: '午夜突进', sleep: '03:45', wake: '12:45', quest: '现在，你的睡觉时间已经进入了大多数人的“深夜”范畴。', encouragement: '“你正在穿越无人区，即将抵达文明边界。”', sleepRitual: ['03:15 停止所有娱乐活动', '进行10分钟的拉伸', '确保卧室完全黑暗']},
    { day: 6,  phase: '巩固突进', sleep: '03:45', wake: '12:45', quest: '你的起床时间已经提前到了中午，这是一个巨大的进步！', encouragement: '“你看到了吗？正午的阳光。”', sleepRitual: ['03:15 停止所有娱乐活动', '进行10分钟的拉伸', '确保卧室完全黑暗']},
    { day: 7,  phase: '阶段总结', sleep: '03:00', wake: '12:00', quest: '第一周结束！你把入睡时间提前了整整3个小时！值得庆祝！', encouragement: '“第一阶段跃迁完成！飞船状态稳定。”', sleepRitual: ['02:30 停止工作和学习', '洗个热水澡', '冥想或放空5分钟']},
    { day: 8,  phase: '飞跃0200', sleep: '02:15', wake: '11:15', quest: '你的起床时间首次进入“上午”！这意味着你有更长的白天。', encouragement: '“上午好！对你来说，这可能是一句久违的问候。”', sleepRitual: ['睡前1小时关掉所有电子屏幕', '阅读15分钟实体书', '喝一小杯温水']},
    { day: 9,  phase: '巩固上午', sleep: '02:15', wake: '11:15', quest: '尝试在下午完成一项需要专注的任务，重建白天的效率。', encouragement: '“重新连接‘白天’与‘工作’的神经通路。”', sleepRitual: ['睡前1小时关掉所有电子屏幕', '阅读15分钟实体书', '喝一小杯温水']},
    { day: 10, phase: '冲向0100', sleep: '01:30', wake: '10:30', quest: '现在，你只比“晚睡”的普通人晚一点了。', encouragement: '“你正在从‘另一个时区’回归。”', sleepRitual: ['00:30 开始睡前准备', '洗漱', '听一段白噪音']},
    { day: 11, phase: '巩固战果', sleep: '01:30', wake: '10:30', quest: '你可能开始在晚上11点、12点感到困意，这是身体适应的好信号！', encouragement: '“倾听身体的声音，它正在被你唤醒。”', sleepRitual: ['00:30 开始睡前准备', '洗漱', '听一段白噪音']},
    { day: 12, phase: '决战子夜', sleep: '00:45', wake: '09:45', quest: '这是关键的一步，你的入睡时间将首次写上昨天的日期。', encouragement: '“时间的旅行者，欢迎回到昨天。”', sleepRitual: ['睡前1.5小时停止进食', '泡脚15分钟', '关闭主灯，只留床头灯']},
    { day: 13, phase: '午夜巡航', sleep: '00:45', wake: '09:45', quest: '适应在午夜前结束一天的感觉。', encouragement: '“黑夜本该用来安眠，而非狂欢。”', sleepRitual: ['睡前1.5小时停止进食', '泡脚15分钟', '关闭主灯，只留床头灯']},
    { day: 14, phase: '阶段总结', sleep: '00:00', wake: '09:00', quest: '第二周结束！你做到了在午夜入睡！这是决定性的胜利！', encouragement: '“午夜钟声响起，宣告旧作息的终结。”', sleepRitual: ['23:00 开始放松', '回顾今天完成的事', '准备好明天的衣服']},
    { day: 15, phase: '最后进近', sleep: '23:15', wake: '08:15', quest: '目标就在眼前！现在是精细微调阶段。', encouragement: '“即将进入同步轨道，请做最后校准。”', sleepRitual: ['22:15 关闭电脑和手机', '和家人/朋友聊聊天', '整理书桌']},
    { day: 16, phase: '同步轨道', sleep: '23:15', wake: '08:15', quest: '感受身体的节律，它是否已接近目标？', encouragement: '“你的生物钟正在与地球同步。”', sleepRitual: ['22:15 关闭电脑和手机', '和家人/朋友聊聊天', '整理书桌']},
    { day: 17, phase: '目标达成', sleep: '23:00', wake: '08:00', quest: '恭喜！你已抵达目的地！现在开始，是习惯的养成。', encouragement: '“欢迎来到规律作息俱乐部。”', sleepRitual: ['22:00 停止高强度用脑', '22:30 关屏，手机充电', '洗漱/热水澡', '10分钟拉伸/冥想']},
    { day: 18, phase: '习惯固化', sleep: '23:00', wake: '08:00', quest: '重复、重复、再重复。让这个作息成为你身体的本能。', encouragement: '“好习惯不是被想起的，而是被忘记的——忘记它需要努力。”', sleepRitual: ['22:00 停止高强度用脑', '22:30 关屏，手机充电', '洗漱/热水澡', '10分钟拉伸/冥想']},
    { day: 19, phase: '应对周末', sleep: '23:00', wake: '08:00', quest: '即使是周末，也要尽量保持作息。可以稍微放宽，但不要超过1小时。', encouragement: '“作息的堤坝，毁于一次“就一晚”的溃口。”', sleepRitual: ['22:00 停止高强度用脑', '22:30 关屏，手机充电', '洗漱/热水澡', '10分钟拉伸/冥想']},
    { day: 20, phase: '内化本能', sleep: '23:00', wake: '08:00', quest: '尝试不看清单，回忆并完成所有仪式。', encouragement: '“你不再需要导航，因为星图已刻在你的脑海里。”', sleepRitual: ['22:00 停止高强度用脑', '22:30 关屏，手机充电', '洗漱/热水澡', '10分钟拉伸/冥想']},
    { day: 21, phase: '旅程碑', sleep: '23:00', wake: '08:00', quest: '庆祝！你完成了21天的挑战！作息已重获新生！', encouragement: '“这不是结束，而是你掌控生活新纪元的开始。”', sleepRitual: ['22:00 停止高强度用脑', '22:30 关屏，手机充电', '洗漱/热水澡', '10分钟拉伸/冥想']}
  ];

  // ========= 2) DOM =========
  const streakDaysEl = document.getElementById('streak-days');
  const currentDayEl = document.getElementById('current-day');
  const currentPhaseEl = document.getElementById('current-phase');
  const targetSleepEl = document.getElementById('target-sleep');
  const targetWakeEl = document.getElementById('target-wake');
  const progressBarEl = document.getElementById('progress-bar');
  const progressTextEl = document.getElementById('progress-text');
  const encouragementTextEl = document.getElementById('encouragement-text');
  const sleepRitualListEl = document.getElementById('sleep-ritual-list');
  const wakeActionsListEl = document.getElementById('wake-actions-list');
  const resetButton = document.getElementById('reset-button');
  const backupButton = document.getElementById('backup-button');
  const exportButton = document.getElementById('export-button');
  const importFileInput = document.getElementById('import-file');
  const wakeupButton = document.getElementById('wakeup-button');
  const wakeupTimeDisplay = document.getElementById('wakeup-time-display');
  const longestStreakEl = document.getElementById('longest-streak');
  const totalDaysEl = document.getElementById('total-days');
  const completionRateEl = document.getElementById('completion-rate');
  const heatmapContainer = document.getElementById('heatmap-container') || document.querySelector('.heatmap-container');
  const chartCanvas = document.getElementById('wakeup-chart');
  const chartPlaceholder = document.getElementById('chart-placeholder');
  const heatmapPlaceholder = document.getElementById('heatmap-placeholder');
  const comboBadgeEl = document.getElementById('combo-badge');
  const comboDescEl = document.getElementById('combo-desc');
  const achievementsEl = document.getElementById('achievements');
  const morningWeightEl = document.getElementById('morning-weight');
  const eveningWeightEl = document.getElementById('evening-weight');
  const focusMorningWindowEl = document.getElementById('focus-morning-window');
  const focusEveningWindowEl = document.getElementById('focus-evening-window');
  const focusMorningDoneEl = document.getElementById('focus-morning-done');
  const focusEveningDoneEl = document.getElementById('focus-evening-done');

  // Tabs
  const tabButtons = Array.from(document.querySelectorAll('.tab'));
  const tabPanels  = Array.from(document.querySelectorAll('.tab-panel'));

  // GitHub Sync DOM
  const ghTokenInput = document.getElementById('gh-token');
  const ghGistIdInput = document.getElementById('gh-gist-id');
  const ghFileInput = document.getElementById('gh-filename');
  const ghAutoSyncInput = document.getElementById('gh-auto-sync');
  const ghSaveBtn = document.getElementById('gh-save');
  const ghCreateBtn = document.getElementById('gh-create');
  const ghUploadBtn = document.getElementById('gh-upload');
  const ghDownloadBtn = document.getElementById('gh-download');
  const ghDisconnectBtn = document.getElementById('gh-disconnect');

  // ========= 3) 状态 =========
  let state = {};
  let wakeupChartInstance = null;
  let activeTab = 'today';
  let syncConfig = { enabled: false, token: '', gistId: '', fileName: 'deep-space-clock.json', autoSync: false };
  let autoSyncTimer = null;

  // ========= 4) 存储 & 备份 =========
  const readJSON  = (k) => { try { const t = localStorage.getItem(k); return t ? JSON.parse(t) : null; } catch { return null; } };
  const writeJSON = (k,v) => localStorage.setItem(k, JSON.stringify(v));

  function getBackupIndex() { return readJSON(BACKUP_INDEX_KEY) || []; }
  function saveBackupIndex(list){ writeJSON(BACKUP_INDEX_KEY, list); }
  function createBackup(reason='manual'){
    try{
      const now = new Date();
      const id = now.toISOString().replace(/[:.]/g, '-');
      const key = `deepSpaceClockBackup:${id}:${reason}`;
      localStorage.setItem(key, JSON.stringify(state));
      const idx = getBackupIndex(); idx.unshift({ key, ts: now.toISOString(), reason });
      saveBackupIndex(idx.slice(0, 10));
      showToast('✅ 备份完成');
    }catch{ showToast('⚠️ 备份失败：本地存储可能不足'); }
  }
  function ensureDailyBackup(){
    const today = getTodayDateString();
    const last = localStorage.getItem(LAST_BACKUP_DATE_KEY);
    if (last !== today){
      if (Object.keys(state.history || {}).length > 0) createBackup('auto-daily');
      localStorage.setItem(LAST_BACKUP_DATE_KEY, today);
    }
  }

  function chooseBestSavedState(){
    return readJSON(CANONICAL_KEY) || readJSON(COMPAT_V24_KEY) || readJSON(LEGACY_V23_KEY) || null;
  }
  function applyMigrations(s){
    if (!s) s = {};
    if (!s.history) s.history = {};
    if (!s.achievements) s.achievements = {};
    if (typeof s.currentDay !== 'number') s.currentDay = 1;
    if (typeof s.longestStreak !== 'number') s.longestStreak = 0;
    if (!s.version) s.version = 1;
    if (s.version < 2){ if (!s.achievements) s.achievements = {}; s.version = 2; }
    if (s.version < 3){
      Object.values(s.history).forEach(h => {
        if (!Array.isArray(h.morning)) h.morning = [];
        if (typeof h.morningFocusDone !== 'boolean') h.morningFocusDone = false;
        if (typeof h.eveningFocusDone !== 'boolean') h.eveningFocusDone = false;
      });
      s.version = 3;
    }
    if (s.version < 4){
      const keys = Object.keys(s.history).sort();
      keys.forEach((d, idx) => {
        const h = s.history[d]; if (!h) return;
        const planIdx = Math.min(idx, planData.length - 1);
        h.targetWake = h.targetWake || planData[planIdx].wake;
        h.dateStr = h.dateStr || d;
      });
      s.version = 4;
    }
    if (s.currentDay < 1) s.currentDay = 1;
    return s;
  }
  function loadState(){
    const picked = chooseBestSavedState();
    if (picked){
      try{ state = JSON.parse(JSON.stringify(picked)); }catch{ state = picked; }
      createBackup('pre-migrate');
    }else{
      state = { currentDay: 1, longestStreak: 0, history: {}, achievements: {}, version: CURRENT_SCHEMA };
    }
    state = applyMigrations(state);
    state.version = CURRENT_SCHEMA;

    // Tabs & GitHub Sync
    activeTab = localStorage.getItem(ACTIVE_TAB_KEY) || 'today';
    const savedSync = readJSON(SYNC_KEY);
    if (savedSync) syncConfig = Object.assign(syncConfig, savedSync);
  }
  function scheduleAutoSync(){
    clearTimeout(autoSyncTimer);
    if (syncConfig.enabled && syncConfig.autoSync && syncConfig.token && (syncConfig.gistId || syncConfig.pendingCreate)) {
      autoSyncTimer = setTimeout(() => uploadToGist().catch(()=>{}), 1200);
    }
  }
  function saveState(){
    try{
      writeJSON(CANONICAL_KEY, state);
      writeJSON(COMPAT_V24_KEY, state); // 兼容旧版
      ensureDailyBackup();
      scheduleAutoSync();
    }catch{ showToast('⚠️ 保存失败：本地存储可能不足'); }
  }

  // ========= 5) Δt / 连击 / 成就 =========
  function calculateDeltaT(){
    const todayStr = getTodayDateString();
    const todayHistory = state.history[todayStr];
    if (!todayHistory) return 0;

    const bedtimeTasks = todayHistory.bedtime || [];
    const bedtimeCompleted = bedtimeTasks.filter(Boolean).length;
    let bedtimeDelta = 0;
    if (bedtimeTasks.length > 0){
      if (bedtimeCompleted === bedtimeTasks.length) bedtimeDelta = 2;
      else if (bedtimeCompleted > 0) bedtimeDelta = 1;
    }

    let wakeupDelta = 0;
    if (todayHistory.wakeupTime){
      const dayIndex = Math.min(state.currentDay - 1, planData.length - 1);
      const targetTime = dateFrom(todayStr, planData[dayIndex].wake);
      const actualTime = dateFrom(todayStr, todayHistory.wakeupTime.slice(0,5));
      const diffMinutes = (actualTime - targetTime) / 60000;
      if (diffMinutes <= 15) wakeupDelta = 2;
      else if (diffMinutes <= 45) wakeupDelta = 1;
      else wakeupDelta = 0;
    }

    todayHistory.deltaT = bedtimeDelta + wakeupDelta;
    return todayHistory.deltaT;
  }
  function dailyUpdate(){
    const historyKeys = Object.keys(state.history).sort();
    if (historyKeys.length === 0) return;
    const lastLogDateStr = historyKeys[historyKeys.length - 1];
    const todayStr = getTodayDateString();
    if (lastLogDateStr !== todayStr){
      const lastLogData = state.history[lastLogDateStr];
      if (lastLogData && lastLogData.deltaT > 0) state.currentDay++;
    }
  }

  function getCurrentCombo(){
    const days = Object.keys(state.history).sort();
    let combo = 0;
    for (let i = days.length - 1; i >= 0; i--){
      const d = days[i];
      const h = state.history[d];
      if ((h?.deltaT || 0) >= 3) combo++;
      else break;
    }
    return combo;
  }
  function comboTier(combo){
    if (combo >= 14) return { tier: 'diamond', name: '钻石连击', desc: '势不可挡！' };
    if (combo >= 7)  return { tier: 'gold',    name: '黄金连击', desc: '王者节奏！' };
    if (combo >= 5)  return { tier: 'silver',  name: '白银连击', desc: '稳步攀升！' };
    if (combo >= 3)  return { tier: 'bronze',  name: '青铜连击', desc: '良好开局！' };
    return { tier: 'none', name: '暂无连击', desc: '连续获得 ≥3 Δt 即可开始连击！' };
  }
  function renderCombo(){
    const combo = getCurrentCombo();
    const t = comboTier(combo);
    comboBadgeEl.className = `badge ${t.tier}`;
    comboBadgeEl.textContent = t.tier === 'none' ? '暂无连击' : `${t.name} ×${combo}`;
    comboDescEl.textContent = t.desc;
  }

  const ACHS = [
    { id: 'first3',        name: '起势三分',   icon: '🔥', desc: '首次单日 Δt ≥ 3',                    check: (s) => Object.values(s.history).some(h => (h.deltaT || 0) >= 3) },
    { id: 'bedtime3',      name: '黑夜守门员', icon: '🌙', desc: '睡前清单满分达成 3 天',                check: (s) => countDays(s, h => { const arr = h.bedtime || []; return arr.length > 0 && arr.every(Boolean); }) >= 3 },
    { id: 'ontime3',       name: '日光初见',   icon: '🌅', desc: '准点起床（≤15min）达成 3 天',          check: (s) => countDays(s, h => onTime(h) >= 2) >= 3 },
    { id: 'morningStreak3',name: '晨光战士',   icon: '☀️', desc: '连续 3 天在 12:00 前起床',             check: (s) => hasMorningStreak(s, 3) },
    { id: 'combo5',        name: '手感来了',   icon: '⚡', desc: '达成 5 连击（≥3 Δt）',                 check: (s) => getCurrentCombo() >= 5 },
    { id: 'focusShift5',   name: '重心迁移',   icon: '🎯', desc: '完成晨间专注 5 天',                    check: (s) => countDays(s, h => !!h.morningFocusDone) >= 5 }
  ];
  function onTime(h){
    if (!h || !h.wakeupTime || !h.targetWake) return 0;
    const d = h.dateStr || getTodayDateString();
    const target = dateFrom(d, h.targetWake);
    const actual = dateFrom(d, h.wakeupTime.slice(0,5));
    const diff = (actual - target) / 60000;
    if (diff <= 15) return 2; if (diff <= 45) return 1; return 0;
  }
  function countDays(s, pred){ let c = 0; Object.keys(s.history).forEach(k => { if (pred(s.history[k])) c++; }); return c; }
  function hasMorningStreak(s, need){
    const days = Object.keys(s.history).sort(); let streak = 0;
    for (const d of days){
      const w = s.history[d]?.wakeupTime;
      if (w){
        const { h } = parseHM(w.slice(0,5));
        if (h < 12) streak++; else streak = 0;
        if (streak >= need) return true;
      } else streak = 0;
    }
    return false;
  }
  function renderAchievements(){
    const unlockedNow = [];
    ACHS.forEach(a => {
      if (!state.achievements[a.id] && a.check(state)){
        state.achievements[a.id] = { unlockedAt: Date.now() };
        unlockedNow.push(a);
      }
    });
    if (unlockedNow.length > 0){
      saveState();
      unlockedNow.forEach(a => showToast(`成就解锁：${a.icon} ${a.name}`));
    }
    achievementsEl.innerHTML = '';
    ACHS.forEach(a => {
      const unlocked = !!state.achievements[a.id];
      const div = document.createElement('div');
      div.className = `ach-card ${unlocked ? 'unlocked' : 'locked'}`;
      div.innerHTML = `<div class="ach-icon">${a.icon}</div><div class="ach-body"><div class="ach-name">${a.name}</div><div class="ach-desc">${a.desc}</div></div>`;
      achievementsEl.appendChild(div);
    });
  }

  // ========= 6) Focus =========
  function calcFocusWeights(){
    // Day1 晨:20% 晚:80% → Day21 晨:80% 晚:20%
    const f = clamp((state.currentDay - 1) / (planData.length - 1), 0, 1);
    const morning = Math.round((0.2 + 0.6 * f) * 100);
    const evening = 100 - morning;
    return { morning, evening, f };
  }
  function calcFocusWindows(dayInfo, todayStr){
    const wake  = dateFrom(todayStr, dayInfo.wake);
    const sleep = dateFrom(todayStr, dayInfo.sleep);
    const { f } = calcFocusWeights();
    const morningDurMin = Math.round(60 + 120 * f);   // 1h → 3h
    const eveningDurMin = Math.round(180 - 120 * f);  // 3h → 1h
    const morningStart = addMinutes(wake, 45);
    const morningEnd   = addMinutes(morningStart, morningDurMin);
    const eveningEnd   = addMinutes(sleep, -30);
    const eveningStart = addMinutes(eveningEnd, -eveningDurMin);
    return { morning: `${fmt(morningStart)} — ${fmt(morningEnd)}`, evening: `${fmt(eveningStart)} — ${fmt(eveningEnd)}` };
  }

  // ========= 7) Tabs =========
  function setActiveTab(name){
    activeTab = name; localStorage.setItem(ACTIVE_TAB_KEY, name);
    tabButtons.forEach(btn => { const on = btn.dataset.tab === name; btn.classList.toggle('active', on); btn.setAttribute('aria-selected', on ? 'true' : 'false'); });
    tabPanels.forEach(panel => { panel.classList.toggle('active', panel.dataset.tabPanel === name); });
    if (name === 'data') renderWakeupChart(true);
  }
  function setupTabs(){
    tabButtons.forEach(btn => btn.addEventListener('click', () => setActiveTab(btn.dataset.tab)));
    setActiveTab(localStorage.getItem(ACTIVE_TAB_KEY) || 'today');
  }

  // ========= 8) UI =========
  function planIndexByDate(dateStr){
    const keys = Object.keys(state.history).sort();
    const idx = keys.indexOf(dateStr);
    return Math.min(Math.max(idx, 0), planData.length - 1);
  }
  function renderChecklist(ulElement, type, tasks, completion){
    ulElement.innerHTML = '';
    tasks.forEach((task, index) => {
      const li = document.createElement('li');
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox';
      checkbox.id = `${type}-${index}`; checkbox.checked = completion[index] || false;
      checkbox.dataset.type = type; checkbox.dataset.index = index;
      const label = document.createElement('label'); label.htmlFor = `${type}-${index}`; label.innerHTML = task;
      li.appendChild(checkbox); li.appendChild(label); ulElement.appendChild(li);
    });
  }

  function updateUI(){
    const dayIndex = Math.min(state.currentDay - 1, planData.length - 1);
    let dayInfo = { ...planData[dayIndex] };
    if (state.currentDay > planData.length){
      const maintenanceDay = state.currentDay - planData.length;
      dayInfo.day = state.currentDay; dayInfo.phase = '习惯保持';
      dayInfo.quest = `这是你进入保持期的第 ${maintenanceDay} 天。继续加油！`;
      dayInfo.encouragement = '“卓越不是一种行为，而是一种习惯。”';
    }
    if (!dayInfo.wakeActions){ dayInfo.wakeActions = ['醒来后喝水', '拉开窗帘，接触日光', '简单吃点东西']; }

    const todayStr = getTodayDateString();
    if (!state.history[todayStr]){
      state.history[todayStr] = { bedtime: Array(dayInfo.sleepRitual.length).fill(false), morning: Array((dayInfo.wakeActions || []).length).fill(false), wakeupTime: null, deltaT: 0, morningFocusDone: false, eveningFocusDone: false };
    }
    Object.keys(state.history).forEach(d => {
      const idx = Math.min((Number(d >= todayStr) ? dayIndex : planIndexByDate(d)), planData.length - 1);
      state.history[d].targetWake = state.history[d].targetWake || planData[idx].wake;
      state.history[d].dateStr = state.history[d].dateStr || d;
      if (typeof state.history[d].morningFocusDone !== 'boolean') state.history[d].morningFocusDone = false;
      if (typeof state.history[d].eveningFocusDone !== 'boolean') state.history[d].eveningFocusDone = false;
    });

    currentDayEl.textContent = dayInfo.day;
    currentPhaseEl.textContent = dayInfo.phase;
    targetSleepEl.textContent = dayInfo.sleep;
    targetWakeEl.textContent = dayInfo.wake;
    encouragementTextEl.textContent = dayInfo.encouragement;

    renderChecklist(sleepRitualListEl, 'bedtime', dayInfo.sleepRitual, state.history[todayStr].bedtime);
    if (wakeActionsListEl){
      if (dayInfo.wakeActions && dayInfo.wakeActions.length){
        if (!state.history[todayStr].morning || state.history[todayStr].morning.length !== dayInfo.wakeActions.length){
          state.history[todayStr].morning = Array(dayInfo.wakeActions.length).fill(false);
        }
        renderChecklist(wakeActionsListEl, 'morning', dayInfo.wakeActions, state.history[todayStr].morning);
        wakeActionsListEl.parentElement.style.display = '';
      } else wakeActionsListEl.parentElement.style.display = 'none';
    }

    const todayHistory = state.history[todayStr];
    if (todayHistory.wakeupTime){ wakeupButton.disabled = true; wakeupButton.textContent = "已记录"; wakeupTimeDisplay.textContent = todayHistory.wakeupTime; }
    else { wakeupButton.disabled = false; wakeupButton.textContent = "我起床了！"; wakeupTimeDisplay.textContent = "--:--:--"; }

    updateProgressBar();
    renderDashboard();
    if (localStorage.getItem(ACTIVE_TAB_KEY) === 'data') renderWakeupChart(true); else renderWakeupChart(false);
    renderCombo();
    renderAchievements();

    const { morning, evening } = calcFocusWeights();
    morningWeightEl.textContent = `${morning}%`; eveningWeightEl.textContent = `${evening}%`;
    const windows = calcFocusWindows(dayInfo, todayStr);
    focusMorningWindowEl.textContent = windows.morning;
    focusEveningWindowEl.textContent = windows.evening;

    focusMorningDoneEl.checked = !!todayHistory.morningFocusDone;
    focusEveningDoneEl.checked = !!todayHistory.eveningFocusDone;

    saveState();
  }

  function updateProgressBar(){ const totalDeltaT = calculateDeltaT(); const percentage = (totalDeltaT / 4) * 100; progressBarEl.style.width = `${percentage}%`; progressTextEl.textContent = `${totalDeltaT} / 4 Δt`; }

  function renderDashboard(){
    const historyKeys = Object.keys(state.history).sort();
    const totalDays = historyKeys.length;
    let totalDeltaT = 0, currentStreak = 0, longestStreak = 0;

    if (totalDays > 0){
      let lastDate = new Date(historyKeys[0]); lastDate.setDate(lastDate.getDate() - 1);
      for (const dateStr of historyKeys){
        const dayDelta = state.history[dateStr]?.deltaT || 0; totalDeltaT += dayDelta;
        const currentDate = new Date(dateStr); const diffDays = Math.round((currentDate - lastDate) / 86400000);
        if (diffDays === 1 && dayDelta > 0) currentStreak++; else if (dayDelta > 0) currentStreak = 1;
        if (currentStreak > longestStreak) longestStreak = currentStreak; lastDate = currentDate;
      }
    }
    state.longestStreak = Math.max(state.longestStreak, longestStreak);
    const completionRate = totalDays > 0 ? ((totalDeltaT / (totalDays * 4)) * 100).toFixed(0) : 0;

    streakDaysEl.textContent = currentStreak;
    longestStreakEl.textContent = state.longestStreak;
    totalDaysEl.textContent = totalDays;
    completionRateEl.textContent = completionRate;

    // Heatmap
    if (totalDays === 0){
      heatmapPlaceholder.style.display = 'flex';
      const existing = heatmapContainer ? heatmapContainer.querySelectorAll('.heatmap-day') : [];
      existing.forEach(day => day.remove());
    } else {
      heatmapPlaceholder.style.display = 'none';
      if (heatmapContainer){
        heatmapContainer.innerHTML = '';
        const endDate = new Date(); const startDate = new Date(); startDate.setDate(endDate.getDate() - 89);
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)){
          const dateStr = d.toISOString().split('T')[0];
          const level = state.history[dateStr]?.deltaT || 0;
          const dayDiv = document.createElement('div');
          dayDiv.className = `heatmap-day level-${level}`;
          const tooltip = document.createElement('span'); tooltip.className = 'tooltip'; tooltip.textContent = `${dateStr}: ${level} Δt`;
          dayDiv.appendChild(tooltip); heatmapContainer.appendChild(dayDiv);
        }
      }
    }
  }

  function renderWakeupChart(forceRedraw = false){
    if (!forceRedraw && (localStorage.getItem(ACTIVE_TAB_KEY) || 'today') !== 'data') return;

    const historyKeys = Object.keys(state.history);
    if (historyKeys.length === 0){
      if (chartCanvas) chartCanvas.style.display = 'none';
      if (chartPlaceholder) chartPlaceholder.style.display = 'flex';
      if (wakeupChartInstance) { wakeupChartInstance.destroy(); wakeupChartInstance = null; }
      return;
    }
    if (chartCanvas) chartCanvas.style.display = 'block';
    if (chartPlaceholder) chartPlaceholder.style.display = 'none';

    const ctx = chartCanvas.getContext('2d');
    const last30Keys = historyKeys.sort().slice(-30);
    const labels = [], actualData = [], targetData = [];
    const timeToFloat = (timeStr) => { if (!timeStr) return null; const [h, m] = timeStr.split(':').map(Number); return h + m / 60; };
    last30Keys.forEach(dateStr => {
      labels.push(dateStr.slice(5));
      const dayHistory = state.history[dateStr];
      const planDayIndex = Object.keys(state.history).sort().indexOf(dateStr);
      const planDay = planData[Math.min(planDayIndex, planData.length - 1)];
      actualData.push(timeToFloat(dayHistory.wakeupTime));
      targetData.push(timeToFloat(planDay.wake));
    });

    if (wakeupChartInstance) { wakeupChartInstance.destroy(); }
    wakeupChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: '实际起床', data: actualData, borderColor: 'rgba(0, 240, 192, 1)', backgroundColor: 'rgba(0, 240, 192, 0.2)', fill: false, tension: 0.3, spanGaps: true },
          { label: '目标起床', data: targetData, borderColor: 'rgba(0, 170, 255, 0.5)', borderDash: [5, 5], fill: false }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          y: { ticks: { color: 'rgba(224, 224, 224, 0.8)', callback: (value) => { const h = Math.floor(value); const m = Math.round((value - h) * 60); return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; } }, grid: { color: 'rgba(255,255,255,.1)' }, reverse: true },
          x: { ticks: { color: 'rgba(224, 224, 224, 0.8)' }, grid: { display: false } }
        },
        plugins: { legend: { labels: { color: 'rgba(224, 224, 224, 0.8)' } } }
      }
    });
  }

  // ========= 9) GitHub 同步 =========
  function loadSyncUI(){
    ghTokenInput.value = syncConfig.token ? '********' : '';
    ghGistIdInput.value = syncConfig.gistId || '';
    ghFileInput.value = syncConfig.fileName || 'deep-space-clock.json';
    ghAutoSyncInput.checked = !!syncConfig.autoSync;
  }
  function saveSyncConfig(partial){
    syncConfig = Object.assign(syncConfig, partial);
    syncConfig.enabled = !!(syncConfig.token); // 有令牌即视为启用
    writeJSON(SYNC_KEY, { ...syncConfig, token: syncConfig.token }); // 明确保存
  }
  async function ghApi(path, method='GET', body){
    if (!syncConfig.token) throw new Error('缺少 GitHub 令牌');
    const res = await fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `token ${syncConfig.token}`
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const t = await res.text().catch(()=> '');
      throw new Error(`GitHub API 错误 ${res.status}: ${t.slice(0,120)}`);
    }
    return res.json();
  }
  async function ensureGist(){
    if (syncConfig.gistId) return syncConfig.gistId;
    const body = {
      description: 'Deep Space Clock data backup',
      public: false,
      files: { [syncConfig.fileName || 'deep-space-clock.json']: { content: JSON.stringify(state) } }
    };
    const data = await ghApi('/gists', 'POST', body);
    saveSyncConfig({ gistId: data.id });
    showToast('✅ 已创建私密 Gist');
    return data.id;
  }
  async function uploadToGist(){
    const gistId = await ensureGist();
    const body = { files: { [syncConfig.fileName || 'deep-space-clock.json']: { content: JSON.stringify(state) } } };
    await ghApi(`/gists/${gistId}`, 'PATCH', body);
    showToast('☁️ 已上传到 GitHub');
  }
  async function downloadFromGist(){
    if (!syncConfig.gistId) { showToast('请先填写或创建 Gist'); return; }
    const data = await ghApi(`/gists/${syncConfig.gistId}`, 'GET');
    const file = data.files[syncConfig.fileName] || Object.values(data.files)[0];
    if (!file) { showToast('在该 Gist 未找到文件'); return; }

    let content = file.content;
    if (file.truncated && file.raw_url) {
      const raw = await fetch(file.raw_url, { headers: { 'Authorization': `token ${syncConfig.token}` }});
      if (!raw.ok) throw new Error('下载 raw 文件失败');
      content = await raw.text();
    }
    let incoming;
    try { incoming = JSON.parse(content); } catch { showToast('云端文件格式错误'); return; }

    createBackup('pre-import');
    state = applyMigrations(incoming);
    state.version = CURRENT_SCHEMA;
    saveState();
    updateUI();
    showToast('✅ 已从 GitHub 下载并应用');
  }

  // ========= 10) 事件 =========
  function handleChecklistChange(e){
    if (e.target.type !== 'checkbox') return;
    const todayStr = getTodayDateString();
    const t = e.target.dataset.type || 'bedtime';
    const idx = parseInt(e.target.dataset.index);
    if (!state.history[todayStr][t]) state.history[todayStr][t] = [];
    state.history[todayStr][t][idx] = e.target.checked;
    saveState(); updateProgressBar(); renderDashboard(); renderCombo(); renderAchievements();
  }
  function handleWakeupClick(){
    const timeString = new Date().toTimeString().split(' ')[0];
    const todayStr = getTodayDateString();
    if (!state.history[todayStr]) return;
    state.history[todayStr].wakeupTime = timeString;
    saveState(); updateUI();
    const combo = getCurrentCombo();
    if ([3,5,7,14].includes(combo)) { const t = comboTier(combo); showToast(`徽章解锁：${t.name} ×${combo}`); }
  }
  function handleFocusToggle(e){
    const todayStr = getTodayDateString(); if (!state.history[todayStr]) return;
    if (e.target === focusMorningDoneEl) state.history[todayStr].morningFocusDone = e.target.checked;
    else if (e.target === focusEveningDoneEl) state.history[todayStr].eveningFocusDone = e.target.checked;
    saveState(); renderAchievements();
  }
  function exportData(){
    try{
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      const ts = new Date().toISOString().replace(/[:.]/g, '-'); a.download = `DeepSpaceClock-backup-${ts}.json`;
      document.body.appendChild(a); a.click(); a.remove(); showToast('✅ 导出完成');
    }catch{ showToast('⚠️ 导出失败'); }
  }
  function importData(file){
    const reader = new FileReader();
    reader.onload = (e) => {
      try{
        const incoming = JSON.parse(e.target.result);
        if (!incoming || typeof incoming !== 'object' || !incoming.history){ showToast('⚠️ 文件格式不正确'); return; }
        createBackup('pre-import'); state = applyMigrations(incoming); state.version = CURRENT_SCHEMA;
        saveState(); updateUI(); showToast('✅ 导入成功并已迁移');
      }catch{ showToast('⚠️ 导入失败：无法解析文件'); }
    };
    reader.readAsText(file);
  }

  // GitHub Sync events
  if (ghSaveBtn) ghSaveBtn.addEventListener('click', () => {
    const tokenInputVal = ghTokenInput.value.trim();
    // 如果用户没有重新输入，就保持旧 token；如果有输入（不是星号），更新为新 token
    const newToken = tokenInputVal && tokenInputVal !== '********' ? tokenInputVal : syncConfig.token;
    saveSyncConfig({
      token: newToken,
      gistId: ghGistIdInput.value.trim(),
      fileName: (ghFileInput.value.trim() || 'deep-space-clock.json'),
      autoSync: ghAutoSyncInput.checked
    });
    loadSyncUI();
    showToast('✅ 设置已保存');
  });
  if (ghCreateBtn) ghCreateBtn.addEventListener('click', async () => {
    try{
      if (!ghTokenInput.value && !syncConfig.token){ showToast('请先填写个人令牌'); return; }
      if (ghTokenInput.value && ghTokenInput.value !== '********') syncConfig.token = ghTokenInput.value.trim();
      await ensureGist(); writeJSON(SYNC_KEY, syncConfig); loadSyncUI();
    }catch(e){ showToast(e.message || '创建 Gist 失败'); }
  });
  if (ghUploadBtn) ghUploadBtn.addEventListener('click', async () => {
    try{
      if (ghTokenInput.value && ghTokenInput.value !== '********') syncConfig.token = ghTokenInput.value.trim();
      saveSyncConfig({ gistId: ghGistIdInput.value.trim(), fileName: ghFileInput.value.trim() || 'deep-space-clock.json', autoSync: ghAutoSyncInput.checked });
      await uploadToGist();
    }catch(e){ showToast(e.message || '上传失败'); }
  });
  if (ghDownloadBtn) ghDownloadBtn.addEventListener('click', async () => {
    try{
      if (ghTokenInput.value && ghTokenInput.value !== '********') syncConfig.token = ghTokenInput.value.trim();
      saveSyncConfig({ gistId: ghGistIdInput.value.trim(), fileName: ghFileInput.value.trim() || 'deep-space-clock.json' });
      await downloadFromGist();
    }catch(e){ showToast(e.message || '下载失败'); }
  });
  if (ghDisconnectBtn) ghDisconnectBtn.addEventListener('click', () => {
    saveSyncConfig({ token: '', enabled: false }); loadSyncUI(); showToast('🔒 已清除令牌');
  });

  // ========= 11) 初始化 =========
  function init(){
    loadState();
    setupTabs();
    dailyUpdate();
    updateUI();

    sleepRitualListEl.addEventListener('change', handleChecklistChange);
    if (wakeActionsListEl) wakeActionsListEl.addEventListener('change', handleChecklistChange);
    wakeupButton.addEventListener('click', handleWakeupClick);
    focusMorningDoneEl.addEventListener('change', handleFocusToggle);
    focusEveningDoneEl.addEventListener('change', handleFocusToggle);

    if (backupButton) backupButton.addEventListener('click', () => createBackup('manual'));
    if (exportButton) exportButton.addEventListener('click', exportData);
    if (importFileInput) importFileInput.addEventListener('change', (e) => { if (e.target.files && e.target.files[0]) importData(e.target.files[0]); e.target.value = ''; });
    if (resetButton) resetButton.addEventListener('click', () => { if (confirm('警告：这将清除你所有的数据和进度（备份不会删除）。确定要重置吗？')){ localStorage.removeItem(CANONICAL_KEY); location.reload(); } });

    // 同步设置 UI
    loadSyncUI();
  }

  init();
});
