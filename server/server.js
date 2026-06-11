const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 6031;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

const THEMES = {
  fruits: {
    name: '水果乐园',
    icon: '🍎',
    description: '各种美味的水果',
    emojis: ['🍎', '🍊', '🍋', '🍇', '🍓', '🍑', '🍒', '🥝', '🍌', '🍉', '🥭', '🍍', '🫐', '🍐', '🥥']
  },
  animals: {
    name: '动物世界',
    icon: '🐶',
    description: '可爱的动物朋友们',
    emojis: ['🐶', '🐱', '🐼', '🐨', '🦁', '🐯', '🐻', '🐸', '🐵', '🐰', '🦊', '🐷', '🐮', '🐔', '🐧']
  },
  festivals: {
    name: '节日庆典',
    icon: '🎉',
    description: '充满欢乐的节日元素',
    emojis: ['🎉', '🎊', '🎁', '🎈', '🎄', '🎃', '🎆', '🎇', '🧧', '🏮', '🎂', '🍰', '🎀', '🪅', '🎏']
  },
  sports: {
    name: '运动竞技场',
    icon: '⚽',
    description: '各种体育运动',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🏸', '🥊', '⛳', '🎱', '🏹', '🛹', '🚴', '🏊']
  },
  space: {
    name: '星际探索',
    icon: '🚀',
    description: '浩瀚宇宙的奥秘',
    emojis: ['🚀', '🛸', '🌍', '🌙', '⭐', '☄️', '🪐', '👽', '🌌', '🌠', '🌞', '🛰️', '🔭', '🌓', '🌔']
  },
  food: {
    name: '美食盛宴',
    icon: '🍔',
    description: '令人垂涎的美食',
    emojis: ['🍔', '🍕', '🌭', '🍟', '🍿', '🧁', '🍩', '🍪', '🌮', '🍣', '🍜', '🍝', '🥗', '🍱', '🍙']
  }
};

const DIFFICULTY_CONFIG = {
  easy: {
    name: '简单',
    color: '#10b981',
    pairs: 6,
    gridCols: 4,
    moveLimit: 30,
    timeTarget: 60,
    description: '6对卡牌，30步限制，60秒目标'
  },
  medium: {
    name: '中等',
    color: '#f59e0b',
    pairs: 8,
    gridCols: 4,
    moveLimit: 40,
    timeTarget: 90,
    description: '8对卡牌，40步限制，90秒目标'
  },
  hard: {
    name: '困难',
    color: '#ef4444',
    pairs: 12,
    gridCols: 6,
    moveLimit: 60,
    timeTarget: 150,
    description: '12对卡牌，60步限制，150秒目标'
  }
};

function generateLevels() {
  const levels = [];
  let id = 1;
  
  Object.keys(THEMES).forEach(themeKey => {
    Object.keys(DIFFICULTY_CONFIG).forEach(diffKey => {
      const theme = THEMES[themeKey];
      const diff = DIFFICULTY_CONFIG[diffKey];
      
      if (theme.emojis.length >= diff.pairs) {
        levels.push({
          id: `level_${id++}`,
          themeKey: themeKey,
          themeName: theme.name,
          themeIcon: theme.icon,
          themeDescription: theme.description,
          difficultyKey: diffKey,
          difficultyName: diff.name,
          difficultyColor: diff.color,
          pairs: diff.pairs,
          gridCols: diff.gridCols,
          moveLimit: diff.moveLimit,
          timeTarget: diff.timeTarget,
          description: diff.description,
          emojis: theme.emojis.slice(0, diff.pairs)
        });
      }
    });
  });
  
  return levels;
}

const LEVELS = generateLevels();

const leaderboards = {};

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getLevelById(levelId) {
  return LEVELS.find(l => l.id === levelId);
}

app.get('/api/levels', (req, res) => {
  const levelsSummary = LEVELS.map(l => ({
    id: l.id,
    themeKey: l.themeKey,
    themeName: l.themeName,
    themeIcon: l.themeIcon,
    themeDescription: l.themeDescription,
    difficultyKey: l.difficultyKey,
    difficultyName: l.difficultyName,
    difficultyColor: l.difficultyColor,
    pairs: l.pairs,
    gridCols: l.gridCols,
    moveLimit: l.moveLimit,
    timeTarget: l.timeTarget,
    description: l.description
  }));
  
  res.json({ 
    levels: levelsSummary,
    themes: Object.keys(THEMES).map(key => ({
      key: key,
      name: THEMES[key].name,
      icon: THEMES[key].icon,
      description: THEMES[key].description
    })),
    difficulties: Object.keys(DIFFICULTY_CONFIG).map(key => ({
      key: key,
      name: DIFFICULTY_CONFIG[key].name,
      color: DIFFICULTY_CONFIG[key].color,
      description: DIFFICULTY_CONFIG[key].description
    }))
  });
});

app.get('/api/shuffle', (req, res) => {
  const levelId = req.query.levelId;
  
  if (!levelId) {
    return res.status(400).json({ error: '请提供关卡ID (levelId)' });
  }
  
  const level = getLevelById(levelId);
  if (!level) {
    return res.status(404).json({ error: '未找到该关卡' });
  }
  
  const cardIds = [];
  for (let i = 0; i < level.pairs; i++) {
    cardIds.push(i, i);
  }
  
  const shuffled = shuffle(cardIds);
  
  res.json({ 
    cards: shuffled,
    emojis: level.emojis,
    levelConfig: {
      id: level.id,
      pairs: level.pairs,
      gridCols: level.gridCols,
      moveLimit: level.moveLimit,
      timeTarget: level.timeTarget,
      themeName: level.themeName,
      themeIcon: level.themeIcon,
      difficultyName: level.difficultyName,
      difficultyColor: level.difficultyColor
    }
  });
});

function validateScore(level, scoreData) {
  const { time, moves } = scoreData;
  const errors = [];
  
  if (!Number.isFinite(time) || time <= 0) {
    errors.push('无效的时间数据');
  }
  
  if (!Number.isInteger(moves) || moves < 0) {
    errors.push('无效的步数数据');
  }
  
  if (errors.length > 0) return { valid: false, errors };
  
  if (moves < level.pairs) {
    errors.push(`步数异常：少于最少需要的${level.pairs}步`);
  }
  
  if (moves > level.moveLimit) {
    errors.push(`超过步数限制${level.moveLimit}步`);
  }
  
  if (time > level.timeTarget) {
    errors.push(`超过时间目标${level.timeTarget}秒`);
  }
  
  const minTimePerPair = 1;
  const minTime = level.pairs * minTimePerPair;
  if (time < minTime) {
    errors.push(`时间数据异常：少于理论最小值${minTime}秒`);
  }
  
  const maxTime = level.timeTarget + 1;
  if (time > maxTime) {
    errors.push(`时间数据异常`);
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

app.post('/api/score', (req, res) => {
  const { time, moves, playerName, levelId } = req.body;
  
  if (!levelId) {
    return res.status(400).json({ error: '请提供关卡ID' });
  }
  
  const level = getLevelById(levelId);
  if (!level) {
    return res.status(404).json({ error: '未找到该关卡' });
  }
  
  const validation = validateScore(level, { time, moves });
  if (!validation.valid) {
    console.warn('[Score Rejected]', {
      levelId,
      time,
      moves,
      levelConfig: { pairs: level.pairs, moveLimit: level.moveLimit, timeTarget: level.timeTarget },
      errors: validation.errors
    });
    return res.status(400).json({ 
      error: '成绩数据校验失败', 
      details: validation.errors 
    });
  }
  
  if (!leaderboards[levelId]) {
    leaderboards[levelId] = [];
  }
  
  const safePlayerName = String(playerName || '匿名玩家').trim().slice(0, 20) || '匿名玩家';
  
  const entry = {
    id: Date.now() + Math.random(),
    time: Math.floor(time),
    moves: moves,
    playerName: safePlayerName,
    date: new Date().toLocaleString('zh-CN'),
    levelId: levelId
  };
  
  const lb = leaderboards[levelId];
  lb.push(entry);
  lb.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    return a.moves - b.moves;
  });
  leaderboards[levelId] = lb.slice(0, 20);
  
  const rank = lb.findIndex(e => e.id === entry.id) + 1;
  
  console.log('[Score Accepted]', {
    level: `${level.themeName}/${level.difficultyName}`,
    player: safePlayerName,
    time: time,
    moves: moves,
    rank: rank
  });
  
  res.json({
    success: true,
    rank: rank,
    leaderboard: lb.slice(0, 10),
    levelConfig: {
      id: level.id,
      themeName: level.themeName,
      themeIcon: level.themeIcon,
      difficultyName: level.difficultyName
    }
  });
});

app.get('/api/leaderboard', (req, res) => {
  const levelId = req.query.levelId;
  
  if (!levelId) {
    const allLeaderboards = {};
    Object.keys(leaderboards).forEach(lid => {
      allLeaderboards[lid] = leaderboards[lid].slice(0, 10);
    });
    return res.json({ leaderboards: allLeaderboards });
  }
  
  const level = getLevelById(levelId);
  if (!level) {
    return res.status(404).json({ error: '未找到该关卡' });
  }
  
  const lb = leaderboards[levelId] || [];
  res.json({ 
    leaderboard: lb.slice(0, 10),
    levelConfig: {
      id: level.id,
      themeName: level.themeName,
      themeIcon: level.themeIcon,
      difficultyName: level.difficultyName,
      difficultyColor: level.difficultyColor
    }
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`已生成 ${LEVELS.length} 个关卡配置`);
});
