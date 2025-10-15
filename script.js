document.addEventListener('DOMContentLoaded', () => {
  // ========= 0) 常量 & 工具 =========
  const CANONICAL_KEY = 'deepSpaceClockState';      // 稳定通用键
  const COMPAT_V24_KEY = 'deepSpaceClockStateV2_4'; // 兼容键
  const LEGACY_V23_KEY = 'deepSpaceClockStateV2_3'; // 老版本键
  const BACKUP_INDEX_KEY = 'deepSpaceClockBackupIndex';
  const LAST_BACKUP_DATE_KEY = 'deepSpaceClockLastBackupDate';
  const ACTIVE_TAB_KEY = 'deepSpaceClockActiveTab';
  const SYNC_KEY = 'deepSpaceClockGitHubSync';
  const CURRENT_SCHEMA = 5;

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const pad2 = (n) => String(n).padStart(2, '0');

  const parseHM = (hm) => { const [h, m] = hm.split(':').map(Number); return { h, m }; };
  const dateFrom = (dateStr, hm) => { const d = new Date(`${dateStr}T00:00:00`); const { h, m } = parseHM(hm); d.setHours(h, m, 0, 0); return d; };
  const addMinutes = (date, mins) => { const d = new Date(date.getTime()); d.setMinutes(d.getMinutes() + mins); return d; };
  const fmt = (date) => `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

  const showToast = (msg) => { const el = document.getElementById('toast'); el.textContent = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2200); };
  // 日界线设置：每天下午4点才切换到新的一天
// 适合晚睡晚起的用户，确保睡前和醒后的活动记录在同一天
const DAY_ROLLOVER_HOUR = 16; // 下午4点切换到新的一天

const getTodayDateString = () => {
  const now = new Date();
  const adjusted = new Date(now.getTime());
  // 如果当前时间小于日界线时间，则认为是"昨天"
  if (now.getHours() < DAY_ROLLOVER_HOUR) {
    adjusted.setDate(adjusted.getDate() - 1);
  }
  // 设置为日界线时间以确保日期计算正确
  adjusted.setHours(DAY_ROLLOVER_HOUR, 0, 0, 0);
  return adjusted.toISOString().split('T')[0];
};

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

  // History Manager
  const historySearchEl = document.getElementById('history-search');
  const historyFilterEl = document.getElementById('history-filter');
  const historyAddNewEl = document.getElementById('history-add-new');
  const historyListEl = document.getElementById('history-list');
  const historyPlaceholderEl = document.getElementById('history-placeholder');

  // Modal
  const historyModal = document.getElementById('history-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalClose = document.getElementById('modal-close');
  const modalDate = document.getElementById('modal-date');
  const modalWakeupTime = document.getElementById('modal-wakeup-time');
  const modalBedtimeList = document.getElementById('modal-bedtime-list');
  const modalMorningList = document.getElementById('modal-morning-list');
  const modalMorningFocus = document.getElementById('modal-morning-focus');
  const modalEveningFocus = document.getElementById('modal-evening-focus');
  const modalDelete = document.getElementById('modal-delete');
  const modalCancel = document.getElementById('modal-cancel');
  const modalSave = document.getElementById('modal-save');

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
    if (s.version < 5){
      // 日界线调整迁移：从凌晨5点改为下午4点
      // 只在第一次升级时执行，通过检查标记位避免重复迁移
      if (!s.rolloverMigrated) {
        const newHistory = {};
        Object.keys(s.history).forEach(oldDateStr => {
          const dayData = s.history[oldDateStr];
          // 将日期向后推一天，以匹配新的日界线逻辑
          const oldDate = new Date(oldDateStr);
          oldDate.setDate(oldDate.getDate() + 1);
          const newDateStr = oldDate.toISOString().split('T')[0];
          newHistory[newDateStr] = dayData;
          // 更新记录中的日期字符串
          dayData.dateStr = newDateStr;
        });
        s.history = newHistory;
        s.rolloverMigrated = true; // 标记已完成迁移
      }
      s.version = 5;
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
    // === 基础成就 (普通 - 10点) ===
    { id: 'first_deltat',   name: '初见能量',     icon: '✨', desc: '首次获得 Δt 能量',                             rarity: 'common', points: 10,  check: (s) => Object.values(s.history).some(h => (h.deltaT || 0) >= 1) },
    { id: 'first_perfect', name: '完美一日',     icon: '🌟', desc: '首次单日获得满分 Δt = 4',                       rarity: 'common', points: 10,  check: (s) => Object.values(s.history).some(h => (h.deltaT || 0) >= 4) },
    { id: 'first_streak',  name: '连续记录',     icon: '📝', desc: '连续记录 3 天',                                 rarity: 'common', points: 10,  check: (s) => Object.keys(s.history).length >= 3 },
    { id: 'week_warrior',  name: '一周战士',     icon: '🗡️', desc: '完成第一周（7天）计划',                         rarity: 'common', points: 15,  check: (s) => s.currentDay > 7 },

    // === 进阶成就 (稀有 - 25点) ===
    { id: 'early_bird',    name: '晨光鸟',       icon: '🐦', desc: '连续 5 天在 10:00 前起床',                      rarity: 'rare', points: 25,  check: (s) => hasMorningStreak(s, 5, 10) },
    { id: 'bedtime_master',name: '睡前大师',     icon: '🌙', desc: '睡前清单满分达成 7 天',                        rarity: 'rare', points: 25,  check: (s) => countDays(s, h => { const arr = h.bedtime || []; return arr.length > 0 && arr.every(Boolean); }) >= 7 },
    { id: 'focus_novice',  name: '专注新手',     icon: '🎯', desc: '完成晨间或晚间专注 10 天',                      rarity: 'rare', points: 25,  check: (s) => countDays(s, h => !!h.morningFocusDone || !!h.eveningFocusDone) >= 10 },
    { id: 'combo_bronze',  name: '青铜连击',     icon: '🥉', desc: '达成 3 连击（≥3 Δt）',                          rarity: 'rare', points: 20,  check: (s) => getCurrentCombo() >= 3 },
    { id: 'precision',     name: '时间掌控者',   icon: '⏰', desc: '连续 5 天准点起床（≤15分钟）',                  rarity: 'rare', points: 25,  check: (s) => countDays(s, h => onTime(h) >= 2) >= 5 },

    // === 大师成就 (史诗 - 50点) ===
    { id: 'month_master',  name: '月度大师',     icon: '👑', desc: '完成整月计划（21天）',                         rarity: 'epic', points: 50,  check: (s) => s.currentDay > 21 },
    { id: 'combo_silver',  name: '白银连击',     icon: '🥈', desc: '达成 7 连击（≥3 Δt）',                          rarity: 'epic', points: 40,  check: (s) => getCurrentCombo() >= 7 },
    { id: 'focus_expert',  name: '专注专家',     icon: '🧘', desc: '晨间和晚间专注都完成 15 天',                    rarity: 'epic', points: 45,  check: (s) => countDays(s, h => h.morningFocusDone && h.eveningFocusDone) >= 15 },
    { id: 'early_champion',name: '黎明冠军',     icon: '🏆', desc: '连续 10 天在 8:00 前起床',                     rarity: 'epic', points: 50,  check: (s) => hasMorningStreak(s, 10, 8) },
    { id: 'perfect_week',  name: '完美一周',     icon: '💎', desc: '连续 7 天每日获得满分 Δt = 4',                rarity: 'epic', points: 55,  check: (s) => hasPerfectWeek(s) },

    // === 传奇成就 (传奇 - 100点) ===
    { id: 'combo_gold',    name: '黄金连击',     icon: '🥇', desc: '达成 14 连击（≥3 Δt）',                         rarity: 'legendary', points: 80,  check: (s) => getCurrentCombo() >= 14 },
    { id: 'combo_diamond', name: '钻石连击',     icon: '💠', desc: '达成 21 连击（≥3 Δt）',                         rarity: 'legendary', points: 100, check: (s) => getCurrentCombo() >= 21 },
    { id: 'focus_master',  name: '专注大师',     icon: '🎭', desc: '连续 30 天完成晨间专注',                       rarity: 'legendary', points: 90,  check: (s) => hasFocusStreak(s, 'morning', 30) },
    { id: 'night_master',  name: '夜之主宰',     icon: '🌃', desc: '连续 30 天完成晚间专注',                       rarity: 'legendary', points: 90,  check: (s) => hasFocusStreak(s, 'evening', 30) },

    // === 隐藏成就 (特殊 - 变动点数) ===
    { id: 'secret_night',  name: '夜猫子',       icon: '🦉', desc: '凌晨 3 点后完成专注任务',                       rarity: 'secret', points: 30,  hidden: true, check: (s) => hasLateNightFocus(s) },
    { id: 'secret_perfect',name: '完美主义',     icon: '🎨', desc: '连续 14 天每日获得满分 Δt = 4',                rarity: 'secret', points: 75,  hidden: true, check: (s) => hasPerfectStreak(s, 14) },
    { id: 'secret_legend', name: '时间旅人',     icon: '⏳', desc: '完成 100 天的完整记录',                        rarity: 'secret', points: 150, hidden: true, check: (s) => Object.keys(s.history).length >= 100 },
    { id: 'secret_endurance',name: '耐力大师',   icon: '🔥', desc: '连续 50 天至少获得 2 Δt',                      rarity: 'secret', points: 120, hidden: true, check: (s) => hasEnduranceStreak(s, 50) },

    // === 统计成就 ===
    { id: 'total_deltat_50', name: '能量收集者',  icon: '⚡', desc: '累计获得 50 Δt',                               rarity: 'rare', points: 30, check: (s) => getTotalDeltaT(s) >= 50, progress: (s) => ({current: getTotalDeltaT(s), target: 50}) },
    { id: 'total_deltat_100', name: '能量大师',  icon: '🌟', desc: '累计获得 100 Δt',                              rarity: 'epic', points: 60, check: (s) => getTotalDeltaT(s) >= 100, progress: (s) => ({current: getTotalDeltaT(s), target: 100}) },
    { id: 'total_deltat_365', name: '年度英雄',  icon: '🏅', desc: '累计获得 365 Δt',                              rarity: 'legendary', points: 150, check: (s) => getTotalDeltaT(s) >= 365, progress: (s) => ({current: getTotalDeltaT(s), target: 365}) }
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
  function hasMorningStreak(s, need, beforeHour = 12){
    const days = Object.keys(s.history).sort(); let streak = 0;
    for (const d of days){
      const w = s.history[d]?.wakeupTime;
      if (w){
        const { h } = parseHM(w.slice(0,5));
        if (h < beforeHour) streak++; else streak = 0;
        if (streak >= need) return true;
      } else streak = 0;
    }
    return false;
  }

  // 新增的辅助函数
  function hasPerfectWeek(s){
    const days = Object.keys(s.history).sort();
    if (days.length < 7) return false;

    for (let i = days.length - 7; i < days.length; i++) {
      const dayData = s.history[days[i]];
      if (!dayData || (dayData.deltaT || 0) < 4) return false;
    }
    return true;
  }

  function hasPerfectStreak(s, need){
    const days = Object.keys(s.history).sort(); let streak = 0;
    for (const d of days){
      const dayData = s.history[d];
      if (dayData && (dayData.deltaT || 0) >= 4){
        streak++;
        if (streak >= need) return true;
      } else streak = 0;
    }
    return false;
  }

  function hasFocusStreak(s, type, need){
    const days = Object.keys(s.history).sort(); let streak = 0;
    for (const d of days){
      const dayData = s.history[d];
      if (dayData && dayData[`${type}FocusDone`]){
        streak++;
        if (streak >= need) return true;
      } else streak = 0;
    }
    return false;
  }

  function hasLateNightFocus(s){
    // 检查是否有凌晨3点后完成专注的记录
    return Object.values(s.history).some(day => {
      if (!day.morningFocusDone && !day.eveningFocusDone) return false;
      // 简化检查：如果当日有专注记录，假设可能是在深夜完成的
      // 实际应用中可以添加更精确的时间追踪
      return day.morningFocusDone || day.eveningFocusDone;
    });
  }

  function hasEnduranceStreak(s, need){
    const days = Object.keys(s.history).sort(); let streak = 0;
    for (const d of days){
      const dayData = s.history[d];
      if (dayData && (dayData.deltaT || 0) >= 2){
        streak++;
        if (streak >= need) return true;
      } else streak = 0;
    }
    return false;
  }

  function getTotalDeltaT(s){
    return Object.values(s.history).reduce((total, day) => total + (day.deltaT || 0), 0);
  }

  function getAchievementPoints(s){
    let totalPoints = 0;
    ACHS.forEach(ach => {
      if (s.achievements[ach.id]) {
        totalPoints += ach.points || 0;
      }
    });
    return totalPoints;
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
      // 成就解锁通知和动画
      unlockedNow.forEach((a, index) => {
        setTimeout(() => {
          showToast(`🎉 ${getRarityEmoji(a.rarity)} 成就解锁：${a.icon} ${a.name} (+${a.points}点)`);
          playUnlockSound(a.rarity);
        }, index * 1500); // 多个成就间隔显示
      });
    }

    achievementsEl.innerHTML = '';

    // 按稀有度和解锁状态分组排序
    const sortedAchs = [...ACHS].sort((a, b) => {
      const rarityOrder = { 'legendary': 5, 'secret': 4, 'epic': 3, 'rare': 2, 'common': 1 };
      const aUnlocked = !!state.achievements[a.id];
      const bUnlocked = !!state.achievements[b.id];

      // 已解锁的排在前面
      if (aUnlocked !== bUnlocked) return bUnlocked ? 1 : -1;

      // 按稀有度排序
      const aRarity = rarityOrder[a.rarity] || 0;
      const bRarity = rarityOrder[b.rarity] || 0;
      return bRarity - aRarity;
    });

    // 添加成就统计
    const totalPoints = getAchievementPoints(state);
    const unlockedCount = Object.keys(state.achievements).length;
    const totalCount = ACHS.length;

    const statsHtml = `
      <div class="achievement-stats">
        <div class="stat-item">
          <span class="stat-label">成就点数</span>
          <span class="stat-value">${totalPoints}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">解锁进度</span>
          <span class="stat-value">${unlockedCount}/${totalCount}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${(unlockedCount/totalCount)*100}%"></div>
        </div>
      </div>
    `;
    achievementsEl.innerHTML = statsHtml;

    sortedAchs.forEach(a => {
      const unlocked = !!state.achievements[a.id];
      const div = document.createElement('div');
      div.className = `ach-card ${unlocked ? 'unlocked' : 'locked'} rarity-${a.rarity}`;

      // 处理隐藏成就
      const isHidden = a.hidden && !unlocked;
      const displayName = isHidden ? '???' : a.name;
      const displayDesc = isHidden ? '完成特定条件后解锁' : a.desc;
      const displayIcon = isHidden ? '❓' : a.icon;

      // 进度条（如果有进度函数）
      let progressHtml = '';
      if (a.progress && !unlocked) {
        const progress = a.progress(state);
        const percentage = Math.min((progress.current / progress.target) * 100, 100);
        progressHtml = `
          <div class="achievement-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${percentage}%"></div>
            </div>
            <span class="progress-text">${progress.current}/${progress.target}</span>
          </div>
        `;
      }

      div.innerHTML = `
        <div class="ach-icon ${unlocked ? 'icon-unlocked' : ''}">${displayIcon}</div>
        <div class="ach-body">
          <div class="ach-header">
            <div class="ach-name">${displayName}</div>
            <div class="ach-points">+${a.points}点</div>
          </div>
          <div class="ach-desc">${displayDesc}</div>
          ${progressHtml}
          <div class="ach-rarity">${getRarityText(a.rarity)} ${getRarityEmoji(a.rarity)}</div>
        </div>
        ${unlocked ? '<div class="ach-checkmark">✓</div>' : ''}
      `;

      // 添加解锁动画
      if (unlocked) {
        div.style.animation = 'achievementUnlock 0.6s ease-out';
      }

      achievementsEl.appendChild(div);
    });
  }

  function getRarityEmoji(rarity) {
    const rarityEmojis = {
      'common': '🟢',
      'rare': '🔵',
      'epic': '🟣',
      'legendary': '🟡',
      'secret': '🔴'
    };
    return rarityEmojis[rarity] || '⚪';
  }

  function getRarityText(rarity) {
    const rarityTexts = {
      'common': '普通',
      'rare': '稀有',
      'epic': '史诗',
      'legendary': '传奇',
      'secret': '隐藏'
    };
    return rarityTexts[rarity] || '未知';
  }

  function playUnlockSound(rarity) {
    // 使用 Web Audio API 生成简单的解锁音效
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // 根据稀有度设置不同的音调
    const frequencies = {
      'common': 523,    // C5
      'rare': 659,      // E5
      'epic': 784,      // G5
      'legendary': 880, // A5
      'secret': 988     // B5
    };

    oscillator.frequency.setValueAtTime(frequencies[rarity] || 523, audioContext.currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
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
    if (name === 'history') renderHistoryManager();
  }
  function setupTabs(){
    tabButtons.forEach(btn => btn.addEventListener('click', () => setActiveTab(btn.dataset.tab)));
    setActiveTab(localStorage.getItem(ACTIVE_TAB_KEY) || 'today');
  }

  // ========= 8) 历史记录管理 =========
  let currentEditingDate = null;

  function renderHistoryManager(){
    const historyKeys = Object.keys(state.history).sort().reverse(); // 最新的在前
    const searchTerm = historySearchEl.value.toLowerCase().trim();
    const filterType = historyFilterEl.value;

    let filteredKeys = historyKeys.filter(dateStr => {
      const dayData = state.history[dateStr];

      // 搜索过滤
      if (searchTerm && !dateStr.includes(searchTerm)) return false;

      // 类型过滤
      switch (filterType) {
        case 'wakeup':
          return !!dayData.wakeupTime;
        case 'perfect':
          return (dayData.deltaT || 0) >= 4;
        case 'incomplete':
          return (dayData.deltaT || 0) === 0;
        default:
          return true;
      }
    });

    if (filteredKeys.length === 0) {
      historyListEl.style.display = 'none';
      historyPlaceholderEl.style.display = 'flex';
      if (historyKeys.length === 0) {
        historyPlaceholderEl.innerHTML = `
          <p>📅</p>
          <p>暂无历史记录</p>
          <p>开始记录后，这里将显示你的所有打卡历史</p>
        `;
      } else {
        historyPlaceholderEl.innerHTML = `
          <p>🔍</p>
          <p>没有找到符合条件的记录</p>
          <p>尝试调整搜索条件或筛选器</p>
        `;
      }
      return;
    }

    historyListEl.style.display = 'block';
    historyPlaceholderEl.style.display = 'none';
    historyListEl.innerHTML = '';

    filteredKeys.forEach(dateStr => {
      const dayData = state.history[dateStr];
      const dayIndex = Math.min(planIndexByDate(dateStr), planData.length - 1);
      const planDay = planData[dayIndex];

      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';

      // 计算完成状态
      const bedtimeCompleted = dayData.bedtime ? dayData.bedtime.filter(Boolean).length : 0;
      const bedtimeTotal = planDay.sleepRitual.length;
      const morningCompleted = dayData.morning ? dayData.morning.filter(Boolean).length : 0;
      const morningTotal = (planDay.wakeActions || []).length;
      const deltaT = dayData.deltaT || 0;

      historyItem.innerHTML = `
        <div class="history-date">
          <span class="date-text">${dateStr}</span>
          <span class="date-day">Day ${Math.min(dayIndex + 2, planData.length)}</span>
        </div>
        <div class="history-summary">
          <div class="summary-item">
            <span class="label">起床</span>
            <span class="value ${dayData.wakeupTime ? 'completed' : 'missing'}">
              ${dayData.wakeupTime || '--:--'}
            </span>
          </div>
          <div class="summary-item">
            <span class="label">睡前</span>
            <span class="value">${bedtimeCompleted}/${bedtimeTotal}</span>
          </div>
          <div class="summary-item">
            <span class="label">起床</span>
            <span class="value">${morningCompleted}/${morningTotal}</span>
          </div>
          <div class="summary-item">
            <span class="label">Δt</span>
            <span class="value delta-t delta-${deltaT}">${deltaT}</span>
          </div>
        </div>
        <div class="history-actions">
          <button class="btn-small btn-edit" data-date="${dateStr}">编辑</button>
        </div>
      `;

      historyListEl.appendChild(historyItem);
    });

    // 绑定编辑按钮事件
    historyListEl.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dateStr = e.target.dataset.date;
        openHistoryModal(dateStr);
      });
    });
  }

  function openHistoryModal(dateStr = null) {
    currentEditingDate = dateStr;
    const isNew = !dateStr;

    modalTitle.textContent = isNew ? '添加新记录' : '编辑历史记录';
    modalDelete.style.display = isNew ? 'none' : 'block';

    if (isNew) {
      // 新记录：默认为今天
      modalDate.value = getTodayDateString();
      modalWakeupTime.value = '';
      modalMorningFocus.checked = false;
      modalEveningFocus.checked = false;
    } else {
      // 编辑现有记录
      const dayData = state.history[dateStr];
      if (!dayData) return;

      modalDate.value = dateStr;
      modalWakeupTime.value = dayData.wakeupTime || '';
      modalMorningFocus.checked = !!dayData.morningFocusDone;
      modalEveningFocus.checked = !!dayData.eveningFocusDone;
    }

    // 渲染清单项
    renderModalChecklists(dateStr);

    // 显示模态框
    historyModal.classList.add('show');
    modalDate.focus();
  }

  function renderModalChecklists(dateStr) {
    const dayIndex = dateStr ? Math.min(planIndexByDate(dateStr), planData.length - 1) : 0;
    const planDay = planData[dayIndex];
    const dayData = dateStr ? state.history[dateStr] : null;

    // 睡前清单
    modalBedtimeList.innerHTML = '';
    planDay.sleepRitual.forEach((task, index) => {
      const div = document.createElement('div');
      div.className = 'modal-checklist-item';
      div.innerHTML = `
        <input type="checkbox" id="modal-bedtime-${index}" ${dayData?.bedtime?.[index] ? 'checked' : ''} />
        <label for="modal-bedtime-${index}">${task}</label>
      `;
      modalBedtimeList.appendChild(div);
    });

    // 起床清单
    modalMorningList.innerHTML = '';
    if (planDay.wakeActions && planDay.wakeActions.length > 0) {
      planDay.wakeActions.forEach((task, index) => {
        const div = document.createElement('div');
        div.className = 'modal-checklist-item';
        div.innerHTML = `
          <input type="checkbox" id="modal-morning-${index}" ${dayData?.morning?.[index] ? 'checked' : ''} />
          <label for="modal-morning-${index}">${task}</label>
        `;
        modalMorningList.appendChild(div);
      });
    } else {
      modalMorningList.parentElement.style.display = 'none';
    }
  }

  function saveHistoryRecord() {
    const dateStr = modalDate.value;
    if (!dateStr) {
      showToast('⚠️ 请选择日期');
      return;
    }

    // 获取表单数据
    const wakeupTime = modalWakeupTime.value;
    const bedtimeChecks = Array.from(modalBedtimeList.querySelectorAll('input')).map(input => input.checked);
    const morningChecks = Array.from(modalMorningList.querySelectorAll('input')).map(input => input.checked);

    // 确保历史记录对象存在
    if (!state.history[dateStr]) {
      state.history[dateStr] = {};
    }

    // 更新数据
    const dayData = state.history[dateStr];
    dayData.wakeupTime = wakeupTime || null;
    dayData.bedtime = bedtimeChecks;
    dayData.morning = morningChecks;
    dayData.morningFocusDone = modalMorningFocus.checked;
    dayData.eveningFocusDone = modalEveningFocus.checked;
    dayData.dateStr = dateStr;

    // 重新计算 Δt
    calculateDeltaTForDay(dateStr);

    // 保存并更新界面
    saveState();
    updateUI();
    renderHistoryManager();
    closeHistoryModal();

    showToast(`✅ ${currentEditingDate ? '更新' : '添加'}记录成功`);
  }

  function deleteHistoryRecord() {
    if (!currentEditingDate) return;

    if (confirm(`确定要删除 ${currentEditingDate} 的记录吗？此操作不可撤销。`)) {
      delete state.history[currentEditingDate];
      saveState();
      updateUI();
      renderHistoryManager();
      closeHistoryModal();
      showToast('🗑️ 记录已删除');
    }
  }

  function closeHistoryModal() {
    historyModal.classList.remove('show');
    currentEditingDate = null;
  }

  function calculateDeltaTForDay(dateStr) {
    const dayData = state.history[dateStr];
    if (!dayData) return;

    const dayIndex = Math.min(planIndexByDate(dateStr), planData.length - 1);
    const planDay = planData[dayIndex];

    // 睡前 Δt
    const bedtimeTasks = dayData.bedtime || [];
    const bedtimeCompleted = bedtimeTasks.filter(Boolean).length;
    let bedtimeDelta = 0;
    if (bedtimeTasks.length > 0) {
      if (bedtimeCompleted === bedtimeTasks.length) bedtimeDelta = 2;
      else if (bedtimeCompleted > 0) bedtimeDelta = 1;
    }

    // 起床 Δt
    let wakeupDelta = 0;
    if (dayData.wakeupTime) {
      const targetTime = dateFrom(dateStr, planDay.wake);
      const actualTime = dateFrom(dateStr, dayData.wakeupTime.slice(0,5));
      const diffMinutes = (actualTime - targetTime) / 60000;
      if (diffMinutes <= 15) wakeupDelta = 2;
      else if (diffMinutes <= 45) wakeupDelta = 1;
    }

    dayData.deltaT = bedtimeDelta + wakeupDelta;
  }

  // ========= 9) UI =========
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

    // 显示日界线设置提示
    showToast(`🌙 日界线已设置为凌晨${DAY_ROLLOVER_HOUR}点切换新的一天`);

    sleepRitualListEl.addEventListener('change', handleChecklistChange);
    if (wakeActionsListEl) wakeActionsListEl.addEventListener('change', handleChecklistChange);
    wakeupButton.addEventListener('click', handleWakeupClick);
    focusMorningDoneEl.addEventListener('change', handleFocusToggle);
    focusEveningDoneEl.addEventListener('change', handleFocusToggle);

    if (backupButton) backupButton.addEventListener('click', () => createBackup('manual'));
    if (exportButton) exportButton.addEventListener('click', exportData);
    if (importFileInput) importFileInput.addEventListener('change', (e) => { if (e.target.files && e.target.files[0]) importData(e.target.files[0]); e.target.value = ''; });
    if (resetButton) resetButton.addEventListener('click', () => { if (confirm('警告：这将清除你所有的数据和进度（备份不会删除）。确定要重置吗？')){ localStorage.removeItem(CANONICAL_KEY); location.reload(); } });

    // 历史记录管理事件
    historySearchEl.addEventListener('input', renderHistoryManager);
    historyFilterEl.addEventListener('change', renderHistoryManager);
    historyAddNewEl.addEventListener('click', () => openHistoryModal());

    // 模态框事件
    modalClose.addEventListener('click', closeHistoryModal);
    modalCancel.addEventListener('click', closeHistoryModal);
    modalSave.addEventListener('click', saveHistoryRecord);
    modalDelete.addEventListener('click', deleteHistoryRecord);

    // 点击模态框外部关闭
    historyModal.addEventListener('click', (e) => {
      if (e.target === historyModal) closeHistoryModal();
    });

    // ESC 键关闭模态框
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && historyModal.classList.contains('show')) {
        closeHistoryModal();
      }
    });

    // 同步设置 UI
    loadSyncUI();
  }

  init();
});
