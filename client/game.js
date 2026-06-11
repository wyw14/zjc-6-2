const API_BASE_URL = 'http://localhost:6031/api';

const levelSelectScreen = document.getElementById('levelSelectScreen');
const gameScreen = document.getElementById('gameScreen');
const themeList = document.getElementById('themeList');
const difficultyList = document.getElementById('difficultyList');
const levelList = document.getElementById('levelList');
const backToSelectBtn = document.getElementById('backToSelectBtn');

const currentThemeIcon = document.getElementById('currentThemeIcon');
const currentThemeName = document.getElementById('currentThemeName');
const currentDifficultyBadge = document.getElementById('currentDifficultyBadge');

const gameBoard = document.getElementById('gameBoard');
const timerEl = document.getElementById('timer');
const movesEl = document.getElementById('moves');
const matchedEl = document.getElementById('matched');
const timeTargetEl = document.getElementById('timeTarget');
const moveLimitEl = document.getElementById('moveLimit');
const restartBtn = document.getElementById('restartBtn');
const leaderboardBtn = document.getElementById('leaderboardBtn');

const winModal = document.getElementById('winModal');
const loseModal = document.getElementById('loseModal');
const loseTitle = document.getElementById('loseTitle');
const loseMessage = document.getElementById('loseMessage');
const finalTimeEl = document.getElementById('finalTime');
const finalMovesEl = document.getElementById('finalMoves');
const winLevelInfo = document.getElementById('winLevelInfo');
const starsContainer = document.getElementById('starsContainer');
const playerNameInput = document.getElementById('playerName');
const submitScoreBtn = document.getElementById('submitScoreBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const retryBtn = document.getElementById('retryBtn');
const backToLevelsBtn = document.getElementById('backToLevelsBtn');

const leaderboardModal = document.getElementById('leaderboardModal');
const leaderboardSelector = document.getElementById('leaderboardSelector');
const leaderboardLevelInfo = document.getElementById('leaderboardLevelInfo');
const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
const leaderboardList = document.getElementById('leaderboardList');

let allLevels = [];
let allThemes = [];
let allDifficulties = [];
let selectedThemeKey = 'all';
let selectedDifficultyKey = 'all';

let currentLevelConfig = null;
let currentEmojis = {};
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let moves = 0;
let timer = null;
let startTime = null;
let elapsedTime = 0;
let gameStarted = false;
let isProcessing = false;
let gameEnded = false;
let pendingTimeouts = [];

function safeSetTimeout(fn, delay) {
  if (gameEnded) return -1;
  const id = setTimeout(() => {
    pendingTimeouts = pendingTimeouts.filter(tid => tid !== id);
    if (gameEnded) return;
    fn();
  }, delay);
  pendingTimeouts.push(id);
  return id;
}

function clearAllPendingTimeouts() {
  pendingTimeouts.forEach(id => clearTimeout(id));
  pendingTimeouts = [];
}

function validateScoreForSubmission() {
  const cfg = currentLevelConfig;
  const timeInSeconds = Math.floor(elapsedTime / 1000);
  
  if (!cfg) return { valid: false, reason: '无关卡配置' };
  if (matchedPairs !== cfg.pairs) return { valid: false, reason: '未完成所有配对' };
  if (timeInSeconds <= 0) return { valid: false, reason: '用时无效' };
  if (moves < cfg.pairs) return { valid: false, reason: '步数异常' };
  if (moves > cfg.moveLimit) return { valid: false, reason: '超过步数限制' };
  if (timeInSeconds > cfg.timeTarget) return { valid: false, reason: '超过时间目标' };
  if (!gameStarted) return { valid: false, reason: '游戏未开始' };
  if (!gameEnded) return { valid: false, reason: '游戏未结束' };
  
  return { valid: true };
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

async function loadLevels() {
  try {
    const response = await fetch(`${API_BASE_URL}/levels`);
    const data = await response.json();
    allLevels = data.levels;
    allThemes = data.themes;
    allDifficulties = data.difficulties;
    renderThemes();
    renderDifficulties();
    renderLevels();
  } catch (error) {
    console.error('加载关卡配置失败:', error);
    themeList.innerHTML = '<p class="error-message">加载失败，请刷新重试</p>';
  }
}

function renderThemes() {
  let html = `<button class="theme-card ${selectedThemeKey === 'all' ? 'active' : ''}" data-theme="all">
    <div class="theme-icon-large">🎨</div>
    <div class="theme-name">全部主题</div>
  </button>`;
  
  allThemes.forEach(theme => {
    html += `<button class="theme-card ${selectedThemeKey === theme.key ? 'active' : ''}" data-theme="${theme.key}">
      <div class="theme-icon-large">${theme.icon}</div>
      <div class="theme-name">${theme.name}</div>
      <div class="theme-desc">${theme.description}</div>
    </button>`;
  });
  
  themeList.innerHTML = html;
  
  themeList.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedThemeKey = card.dataset.theme;
      renderThemes();
      renderLevels();
    });
  });
}

function renderDifficulties() {
  let html = `<button class="difficulty-card ${selectedDifficultyKey === 'all' ? 'active' : ''}" data-difficulty="all" style="--diff-color:#667eea">
    <div class="diff-name">全部难度</div>
    <div class="diff-desc">显示所有关卡</div>
  </button>`;
  
  allDifficulties.forEach(diff => {
    html += `<button class="difficulty-card ${selectedDifficultyKey === diff.key ? 'active' : ''}" data-difficulty="${diff.key}" style="--diff-color:${diff.color}">
      <div class="diff-name">${diff.name}</div>
      <div class="diff-desc">${diff.description}</div>
    </button>`;
  });
  
  difficultyList.innerHTML = html;
  
  difficultyList.querySelectorAll('.difficulty-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedDifficultyKey = card.dataset.difficulty;
      renderDifficulties();
      renderLevels();
    });
  });
}

function renderLevels() {
  const filtered = allLevels.filter(level => {
    const themeOk = selectedThemeKey === 'all' || level.themeKey === selectedThemeKey;
    const diffOk = selectedDifficultyKey === 'all' || level.difficultyKey === selectedDifficultyKey;
    return themeOk && diffOk;
  });
  
  if (filtered.length === 0) {
    levelList.innerHTML = '<p class="empty-message">没有符合条件的关卡</p>';
    return;
  }
  
  levelList.innerHTML = filtered.map(level => `
    <button class="level-card" data-level-id="${level.id}">
      <div class="level-card-header">
        <span class="level-theme-icon">${level.themeIcon}</span>
        <span class="level-difficulty-tag" style="background:${level.difficultyColor}">${level.difficultyName}</span>
      </div>
      <div class="level-card-name">${level.themeName}</div>
      <div class="level-card-stats">
        <span>🃏 ${level.pairs}对</span>
        <span>👟 ${level.moveLimit}步</span>
        <span>⏱️ ${formatTime(level.timeTarget)}</span>
      </div>
    </button>
  `).join('');
  
  levelList.querySelectorAll('.level-card').forEach(card => {
    card.addEventListener('click', () => {
      startLevel(card.dataset.levelId);
    });
  });
}

async function startLevel(levelId) {
  const level = allLevels.find(l => l.id === levelId);
  if (!level) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/shuffle?levelId=${levelId}`);
    const data = await response.json();
    
    currentLevelConfig = data.levelConfig;
    currentEmojis = {};
    data.emojis.forEach((emoji, idx) => {
      currentEmojis[idx] = emoji;
    });
    
    showGameScreen();
    setupLevelDisplay();
    resetGameState();
    renderCards(data.cards);
  } catch (error) {
    console.error('启动关卡失败:', error);
    alert('启动关卡失败，请重试');
  }
}

function showGameScreen() {
  levelSelectScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
}

function showLevelSelectScreen() {
  gameScreen.classList.add('hidden');
  levelSelectScreen.classList.remove('hidden');
  winModal.classList.add('hidden');
  loseModal.classList.add('hidden');
}

function setupLevelDisplay() {
  const cfg = currentLevelConfig;
  currentThemeIcon.textContent = cfg.themeIcon;
  currentThemeName.textContent = cfg.themeName;
  currentDifficultyBadge.textContent = cfg.difficultyName;
  currentDifficultyBadge.style.background = cfg.difficultyColor;
  
  timeTargetEl.textContent = formatTime(cfg.timeTarget);
  moveLimitEl.textContent = cfg.moveLimit;
  gameBoard.style.gridTemplateColumns = `repeat(${cfg.gridCols}, 1fr)`;
}

function resetGameState() {
  cards = [];
  flippedCards = [];
  matchedPairs = 0;
  moves = 0;
  elapsedTime = 0;
  gameStarted = false;
  isProcessing = false;
  gameEnded = false;
  clearAllPendingTimeouts();
  
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  
  updateTimerDisplay();
  movesEl.textContent = '0';
  const cfg = currentLevelConfig;
  matchedEl.textContent = `0/${cfg.pairs}`;
  gameBoard.innerHTML = '';
}

function renderCards(cardIds) {
  cardIds.forEach((cardId, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = cardId;
    card.dataset.index = index;
    
    const cardBack = document.createElement('div');
    cardBack.className = 'card-face card-back';
    
    const cardFront = document.createElement('div');
    cardFront.className = 'card-face card-front';
    cardFront.textContent = currentEmojis[cardId] || '❓';
    
    card.appendChild(cardBack);
    card.appendChild(cardFront);
    
    card.addEventListener('click', () => handleCardClick(card));
    
    gameBoard.appendChild(card);
    cards.push(card);
  });
}

function handleCardClick(card) {
  if (isProcessing) return;
  if (card.classList.contains('flipped')) return;
  if (card.classList.contains('matched')) return;
  if (flippedCards.length >= 2) return;

  if (!gameStarted) {
    startTimer();
    gameStarted = true;
  }

  flipCard(card);
  flippedCards.push(card);

  if (flippedCards.length === 2) {
    moves++;
    movesEl.textContent = moves;
    checkMatch();
  }
}

function flipCard(card) {
  card.classList.add('flipped');
}

function unflipCard(card) {
  card.classList.remove('flipped');
}

function checkMatch() {
  isProcessing = true;
  
  const [card1, card2] = flippedCards;
  const id1 = parseInt(card1.dataset.id);
  const id2 = parseInt(card2.dataset.id);
  const cfg = currentLevelConfig;

  if (id1 === id2) {
    safeSetTimeout(() => {
      if (gameEnded) return;
      card1.classList.add('matched');
      card2.classList.add('matched');
      matchedPairs++;
      matchedEl.textContent = `${matchedPairs}/${cfg.pairs}`;
      flippedCards = [];
      isProcessing = false;
      
      if (matchedPairs === cfg.pairs) {
        endGame(true);
      }
    }, 500);
  } else {
    safeSetTimeout(() => {
      if (gameEnded) return;
      unflipCard(card1);
      unflipCard(card2);
      flippedCards = [];
      isProcessing = false;
      
      if (moves >= cfg.moveLimit && matchedPairs < cfg.pairs) {
        endGame(false, 'moves');
      }
    }, 1000);
  }
}

function startTimer() {
  startTime = Date.now() - elapsedTime;
  timer = setInterval(() => {
    if (gameEnded) return;
    elapsedTime = Date.now() - startTime;
    updateTimerDisplay();
    
    const cfg = currentLevelConfig;
    const elapsedSec = Math.floor(elapsedTime / 1000);
    if (elapsedSec >= cfg.timeTarget && matchedPairs < cfg.pairs) {
      endGame(false, 'time');
    }
  }, 100);
}

function updateTimerDisplay() {
  const totalSeconds = Math.floor(elapsedTime / 1000);
  timerEl.textContent = formatTime(totalSeconds);
}

function calculateStars() {
  const cfg = currentLevelConfig;
  const elapsedSec = Math.floor(elapsedTime / 1000);
  const timeRatio = elapsedSec / cfg.timeTarget;
  const moveRatio = moves / cfg.moveLimit;
  
  let stars = 3;
  if (timeRatio > 0.8 || moveRatio > 0.85) stars = 2;
  if (timeRatio > 1 || moveRatio >= 1) stars = 1;
  
  return stars;
}

function renderStars(count) {
  const filled = '⭐';
  const empty = '☆';
  let html = '';
  for (let i = 0; i < 3; i++) {
    html += `<span class="star ${i < count ? 'filled' : ''}">${i < count ? filled : empty}</span>`;
  }
  starsContainer.innerHTML = html;
}

function endGame(won, reason = null) {
  if (gameEnded) return;
  gameEnded = true;
  
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  clearAllPendingTimeouts();
  isProcessing = true;
  flippedCards = [];
  
  if (won) {
    const cfg = currentLevelConfig;
    finalTimeEl.textContent = timerEl.textContent;
    finalMovesEl.textContent = moves;
    winLevelInfo.innerHTML = `<span class="level-tag">${cfg.themeIcon} ${cfg.themeName}</span>
      <span class="difficulty-tag-inline" style="background:${cfg.difficultyColor}">${cfg.difficultyName}</span>`;
    renderStars(calculateStars());
    
    safeSetTimeout(() => {
      winModal.classList.remove('hidden');
    }, 500);
  } else {
    if (reason === 'moves') {
      loseTitle.textContent = '😢 步数耗尽';
      loseMessage.textContent = '已用完所有步数，再接再厉！';
    } else if (reason === 'time') {
      loseTitle.textContent = '⏰ 时间到';
      loseMessage.textContent = '已超过目标时间，下次加油！';
    }
    
    safeSetTimeout(() => {
      loseModal.classList.remove('hidden');
    }, 500);
  }
}

async function submitScore() {
  const validation = validateScoreForSubmission();
  if (!validation.valid) {
    alert(`成绩校验失败：${validation.reason}`);
    console.error('成绩校验失败详情:', {
      reason: validation.reason,
      matchedPairs,
      pairs: currentLevelConfig?.pairs,
      moves,
      moveLimit: currentLevelConfig?.moveLimit,
      timeInSeconds: Math.floor(elapsedTime / 1000),
      timeTarget: currentLevelConfig?.timeTarget,
      gameStarted,
      gameEnded
    });
    return;
  }
  
  const playerName = playerNameInput.value.trim() || '匿名玩家';
  const timeInSeconds = Math.floor(elapsedTime / 1000);
  const cfg = currentLevelConfig;

  try {
    const response = await fetch(`${API_BASE_URL}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        time: timeInSeconds,
        moves: moves,
        playerName: playerName,
        levelId: cfg.id
      })
    });

    const data = await response.json();
    
    if (data.success) {
      alert(`恭喜！你排名第 ${data.rank} 名！`);
      winModal.classList.add('hidden');
      showLeaderboard(cfg.id);
    }
  } catch (error) {
    console.error('提交成绩失败:', error);
    alert('提交成绩失败，请稍后重试');
  }
}

async function showLeaderboard(levelId = null) {
  leaderboardModal.classList.remove('hidden');
  renderLeaderboardSelector();
  
  const targetId = levelId || (currentLevelConfig ? currentLevelConfig.id : allLevels[0]?.id);
  
  if (targetId) {
    await loadAndRenderLeaderboard(targetId);
  } else {
    leaderboardList.innerHTML = '<li class="empty-message">请先选择关卡</li>';
  }
}

function renderLeaderboardSelector() {
  leaderboardSelector.innerHTML = `
    <select id="leaderboardLevelSelect" class="leaderboard-select">
      ${allLevels.map(level => {
        const selected = currentLevelConfig && currentLevelConfig.id === level.id ? 'selected' : '';
        return `<option value="${level.id}" ${selected}>
          ${level.themeIcon} ${level.themeName} - ${level.difficultyName}
        </option>`;
      }).join('')}
    </select>
  `;
  
  const select = document.getElementById('leaderboardLevelSelect');
  select.addEventListener('change', () => {
    loadAndRenderLeaderboard(select.value);
  });
}

async function loadAndRenderLeaderboard(levelId) {
  try {
    const response = await fetch(`${API_BASE_URL}/leaderboard?levelId=${levelId}`);
    const data = await response.json();
    
    if (data.levelConfig) {
      const cfg = data.levelConfig;
      leaderboardLevelInfo.innerHTML = `<span class="level-tag">${cfg.themeIcon} ${cfg.themeName}</span>
        <span class="difficulty-tag-inline" style="background:${cfg.difficultyColor}">${cfg.difficultyName}</span>`;
    }
    
    renderLeaderboard(data.leaderboard);
  } catch (error) {
    console.error('获取排行榜失败:', error);
    leaderboardList.innerHTML = '<li class="empty-message">加载排行榜失败</li>';
  }
}

function renderLeaderboard(leaderboard) {
  if (!leaderboard || leaderboard.length === 0) {
    leaderboardList.innerHTML = '<li class="empty-message">暂无记录，快来挑战吧！</li>';
    return;
  }

  leaderboardList.innerHTML = '';
  
  leaderboard.forEach((entry, index) => {
    const li = document.createElement('li');
    li.className = 'rank-item';
    
    li.innerHTML = `
      <span class="rank-name">
        <span class="rank">#${index + 1}</span>
        <span class="name">${entry.playerName}</span>
      </span>
      <span class="rank-stats">
        <span class="time">⏱️ ${formatTime(entry.time)}</span>
        <span class="moves">👟 ${entry.moves}步</span>
      </span>
    `;
    
    leaderboardList.appendChild(li);
  });
}

restartBtn.addEventListener('click', () => {
  if (currentLevelConfig) {
    startLevel(currentLevelConfig.id);
  }
});

backToSelectBtn.addEventListener('click', showLevelSelectScreen);
playAgainBtn.addEventListener('click', () => {
  winModal.classList.add('hidden');
  if (currentLevelConfig) {
    startLevel(currentLevelConfig.id);
  }
});

retryBtn.addEventListener('click', () => {
  loseModal.classList.add('hidden');
  if (currentLevelConfig) {
    startLevel(currentLevelConfig.id);
  }
});

backToLevelsBtn.addEventListener('click', showLevelSelectScreen);

leaderboardBtn.addEventListener('click', () => showLeaderboard());

closeLeaderboardBtn.addEventListener('click', () => {
  leaderboardModal.classList.add('hidden');
});

submitScoreBtn.addEventListener('click', submitScore);

loadLevels();
