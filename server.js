const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Auto-persist state after every POST request that modifies it
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    // Persist after any successful POST that returns ok:true
    if (req.method === 'POST' && data?.ok && gameState) {
      persistState();
    }
    return originalJson(data);
  };
  next();
});

// ── PERSISTENT STATE ──
const STATE_FILE = path.join(__dirname, 'gamestate.json');

function loadPersistedState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      const saved = JSON.parse(raw);
      console.log(`Restored game state: Round ${saved.round}, Phase: ${saved.phase}, Players: ${saved.players?.length || 0}`);
      return saved;
    }
  } catch (e) {
    console.error('Could not load persisted state:', e.message);
  }
  return null;
}

function persistState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(gameState), 'utf8');
  } catch (e) {
    console.error('Could not persist state:', e.message);
  }
}

function defaultState() {
  return {
    gameName: 'Ticcio Survivor',
    hostPass: 'ticcio',
    phase: 'active',
    round: 1,
    eliminationMode: 'individual',
    teams: [],
    players: [],
    votes: {},
    teamVotes: {},
    teamTallies: {},
    votingPool: [],
    votingTeams: [],
    revealedTeams: [],
    multiTeamVoting: false,
    immuneNames: [],
    currentChallenge: null,
    pictureChallenge: null,
    triviaChallenge: null,
    sortChallenge: null,
    nttChallenge: null,
    revealed: false,
    doubleElim: false,
    revealCount: 0,
    elimHistory: [],
    updatedAt: Date.now(),
  };
}

let gameState = loadPersistedState() || defaultState();

// ── PICTURE CHALLENGE ANSWERS ──
// Images live in PIC_DB on the frontend — server only stores answers for scoring
const PIC_ANSWERS = {
  paintings: [
    { answers: ["mona lisa"], hint: "Leonardo da Vinci, Louvre" },
    { answers: ["the starry night","starry night"], hint: "Van Gogh, 1889" },
    { answers: ["the scream","scream"], hint: "Edvard Munch, 1893" },
    { answers: ["girl with a pearl earring","pearl earring"], hint: "Vermeer, 1665" },
    { answers: ["the birth of venus","birth of venus"], hint: "Botticelli, 1484" },
  ],
  cities: [
    { answers: ["sydney"], hint: "Opera House, Australia" },
    { answers: ["rome"], hint: "Colosseum, Eternal City" },
    { answers: ["new york","new york city","nyc"], hint: "Central Park" },
    { answers: ["istanbul"], hint: "Hagia Sophia, Turkey" },
    { answers: ["machu picchu"], hint: "Incan citadel, Peru" },
  ],
  politicians: [
    { answers: ["abraham lincoln","lincoln"], hint: "16th US President" },
    { answers: ["barack obama","obama"], hint: "44th US President" },
    { answers: ["winston churchill","churchill"], hint: "British WWII PM" },
    { answers: ["john f kennedy","jfk","kennedy"], hint: "35th US President" },
    { answers: ["nelson mandela","mandela"], hint: "South Africa" },
  ],
  athletes: [
    { answers: ["usain bolt","bolt"], hint: "World's fastest man" },
    { answers: ["muhammad ali","ali","cassius clay"], hint: "The Greatest" },
    { answers: ["roger federer","federer"], hint: "Swiss tennis legend" },
    { answers: ["caitlin clark","clark"], hint: "Iowa Hawkeyes, Indiana Fever" },
    { answers: ["pele","pelé"], hint: "Brazilian soccer legend" },
  ],
  animals: [
    { answers: ["koala"], hint: "Australian marsupial" },
    { answers: ["crocodile","nile crocodile"], hint: "Large African reptile" },
    { answers: ["anteater","giant anteater"], hint: "Long snout, eats ants" },
    { answers: ["snow leopard","leopard"], hint: "Big cat, Central Asia" },
    { answers: ["narwhal"], hint: "Unicorn of the sea" },
  ],
};

// Label map for categories
const PIC_LABELS = {
  paintings: "🖼️ Famous Paintings",
  cities: "🌆 Cities",
  politicians: "🏛️ Politicians",
  athletes: "🏆 Athletes",
  animals: "🐾 Animals",
};


// ── CORE HELPERS ──
function verifyHost(req, res) {
  const pass = req.body?.hostPass;
  if (pass !== gameState.hostPass && pass !== 'ticcio') {
    res.status(403).json({ error: 'Wrong host password' });
    return false;
  }
  return true;
}

// ── STATE ENDPOINTS ──
app.get('/state', (req, res) => {
  res.json(gameState);
});

app.post('/state', (req, res) => {
  if (!verifyHost(req, res)) return;
  const { state } = req.body;
  if (state) {
    gameState = { ...state, updatedAt: Date.now() };
  }
  res.json({ ok: true, state: gameState });
});

app.get('/categories', (req, res) => {
  const cats = Object.entries(PIC_ANSWERS).map(([key, val]) => ({
    key, label: PIC_LABELS[key] || key, count: val.length
  }));
  res.json(cats);
});

app.post('/picture/start', (req, res) => {
  if (!verifyHost(req, res)) return;
  const { category, timeLimit, immunityType } = req.body;
  const questions = PIC_ANSWERS[category];
  if (!questions) return res.status(400).json({ error: 'Unknown category' });
  const label = PIC_LABELS[category] || category;

  // Shuffle question order — frontend maps indices to its own PIC_DB images
  const indices = [0,1,2,3,4].sort(() => Math.random() - 0.5);

  gameState.pictureChallenge = {
    category,
    categoryLabel: label,
    questionIndices: indices,
    // No image URLs stored server-side — frontend handles display
    questions: indices.map(i => ({
      answers: questions[i].answers,
      hint: questions[i].hint,
      index: i,
    })),
    playerAnswers: {}, scores: {}, overrides: {},
    timeLimit: timeLimit || 60,
    immunityType: immunityType || 'individual',
    startedAt: Date.now(),
    ended: false,
  };
  gameState.phase = 'challenge';
  gameState.currentChallenge = { name: label + ' Challenge', type: 'picture' };
  gameState.immuneNames = [];
  gameState.triviaChallenge = null;
  gameState.sortChallenge = null;
  gameState.nttChallenge = null;
  gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

app.post('/picture/answer', (req, res) => {
  const { playerName, answers } = req.body;
  if (!gameState?.pictureChallenge) return res.status(400).json({ error: 'No challenge active' });
  if (gameState.pictureChallenge.ended) return res.status(400).json({ error: 'Challenge ended' });
  gameState.pictureChallenge.playerAnswers[playerName] = answers;
  const q = gameState.pictureChallenge.questions;
  let score = 0;
  answers.forEach((ans, i) => {
    const norm = (ans || '').trim().toLowerCase();
    if (q[i] && q[i].answers.some(a => a.toLowerCase() === norm)) score++;
  });
  gameState.pictureChallenge.scores[playerName] = score;
  gameState.updatedAt = Date.now();
  res.json({ ok: true, score });
});

app.post('/picture/end', (req, res) => {
  if (!verifyHost(req, res)) return;
  if (!gameState?.pictureChallenge) return res.status(400).json({ error: 'No challenge' });
  gameState.pictureChallenge.ended = true;
  const { overrides, questions, playerAnswers, scores, immunityType } = gameState.pictureChallenge;
  if (overrides) {
    Object.entries(overrides).forEach(([playerName, qOverrides]) => {
      let score = scores[playerName] || 0;
      Object.entries(qOverrides).forEach(([qIdx, correct]) => {
        const ans = (playerAnswers[playerName]?.[qIdx] || '').trim().toLowerCase();
        const wasCorrect = questions[qIdx]?.answers.some(a => a.toLowerCase() === ans);
        if (correct && !wasCorrect) score++;
        if (!correct && wasCorrect) score--;
      });
      gameState.pictureChallenge.scores[playerName] = Math.max(0, score);
    });
  }
  const finalScores = gameState.pictureChallenge.scores;
  let immuneNames = [];
  if (immunityType === 'team') {
    const teamScores = {};
    gameState.teams.forEach(t => teamScores[t] = 0);
    gameState.players.filter(p => !p.eliminated).forEach(p => {
      if (p.team && teamScores[p.team] !== undefined) teamScores[p.team] += finalScores[p.name] || 0;
    });
    const maxTeam = Math.max(...Object.values(teamScores));
    const winTeams = Object.entries(teamScores).filter(([, s]) => s === maxTeam).map(([t]) => t);
    immuneNames = gameState.players.filter(p => !p.eliminated && winTeams.includes(p.team)).map(p => p.name);
  } else {
    const maxScore = Math.max(...Object.values(finalScores), 0);
    immuneNames = Object.entries(finalScores).filter(([, s]) => s === maxScore).map(([n]) => n);
  }
  gameState.immuneNames = immuneNames;
  gameState.players.forEach(p => { p.immune = immuneNames.includes(p.name); });
  gameState.votingPool = gameState.players.filter(p => !p.eliminated && !p.immune).map(p => p.name);
  gameState.updatedAt = Date.now();
  res.json({ ok: true, scores: finalScores, immuneNames });
});

app.post('/picture/override', (req, res) => {
  if (!verifyHost(req, res)) return;
  const { playerName, qIndex, correct } = req.body;
  if (!gameState?.pictureChallenge) return res.status(400).json({ error: 'No challenge' });
  if (!gameState.pictureChallenge.overrides[playerName]) gameState.pictureChallenge.overrides[playerName] = {};
  gameState.pictureChallenge.overrides[playerName][qIndex] = correct;
  const { questions, playerAnswers, overrides } = gameState.pictureChallenge;
  const pAnswers = playerAnswers[playerName] || [];
  let score = 0;
  questions.forEach((q, i) => {
    const ov = overrides[playerName]?.[i];
    if (ov !== undefined) { if (ov) score++; }
    else { const ans = (pAnswers[i] || '').trim().toLowerCase(); if (q.answers.some(a => a.toLowerCase() === ans)) score++; }
  });
  gameState.pictureChallenge.scores[playerName] = score;
  gameState.updatedAt = Date.now();
  res.json({ ok: true, score });
});

app.post('/challenge/start', (req, res) => {
  if (!verifyHost(req, res)) return;
  const { name, description } = req.body;
  gameState.currentChallenge = { name: name || 'Challenge', description: description || '', type: 'physical', startedAt: Date.now() };
  gameState.pictureChallenge = null;
  gameState.phase = 'challenge'; gameState.immuneNames = []; gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

app.post('/challenge/immunity', (req, res) => {
  if (!verifyHost(req, res)) return;
  const { winnerType, winnerName } = req.body;
  if (winnerType === 'team') {
    const ip = gameState.players.filter(p => !p.eliminated && p.team === winnerName).map(p => p.name);
    gameState.immuneNames = ip;
    gameState.players.forEach(p => { p.immune = ip.includes(p.name); });
    gameState.votingPool = gameState.players.filter(p => !p.eliminated && !p.immune).map(p => p.name);
  } else {
    gameState.immuneNames = [winnerName];
    gameState.players.forEach(p => { p.immune = p.name === winnerName; });
    gameState.votingPool = gameState.players.filter(p => !p.eliminated && p.name !== winnerName).map(p => p.name);
  }
  gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

app.post('/vote', (req, res) => {
  const { voterName, targetName } = req.body;
  if (!gameState) return res.status(400).json({ error: 'No game' });
  if (gameState.phase !== 'voting') return res.status(400).json({ error: 'Voting not open' });

  const voter = gameState.players.find(p => p.name === voterName);
  const target = gameState.players.find(p => p.name === targetName);
  if (!voter || voter.eliminated) return res.status(400).json({ error: 'Not eligible' });

  const teamsActive = gameState.teams.length > 1;
  const isMultiTeam = gameState.multiTeamVoting && gameState.votingTeams && gameState.votingTeams.length > 0;
  const voterTeam = voter.team || 'none';

  // Check already voted — look in the right bucket
  if (isMultiTeam) {
    const teamBucket = gameState.teamVotes[voterTeam] || {};
    if (teamBucket[voterName]) return res.status(400).json({ error: 'Already voted' });
  } else {
    if (gameState.votes[voterName]) return res.status(400).json({ error: 'Already voted' });
  }

  // Eligibility checks
  if (teamsActive || isMultiTeam) {
    if (gameState.votingPool.length > 0 && !gameState.votingPool.includes(voterName))
      return res.status(403).json({ error: 'Your team won — no vote needed' });
    if (target && voter.team && target.team !== voter.team)
      return res.status(403).json({ error: 'You can only vote for your own team members' });
  }
  if (target && target.immune) return res.status(403).json({ error: 'That player has immunity' });
  if (target && target.eliminated) return res.status(403).json({ error: 'That player is already out' });

  // Store vote in the right bucket
  if (isMultiTeam) {
    if (!gameState.teamVotes[voterTeam]) gameState.teamVotes[voterTeam] = {};
    gameState.teamVotes[voterTeam][voterName] = targetName;
  } else {
    gameState.votes[voterName] = targetName;
  }

  gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

app.post('/voting/open', (req, res) => {
  if (!verifyHost(req, res)) return;
  const { doubleElim, multiTeam } = req.body;
  let { losingTeams } = req.body;

  gameState.phase = 'voting';
  gameState.votes = {};
  gameState.teamVotes = {};
  gameState.teamTallies = {};
  gameState.revealedTeams = [];
  gameState.players.forEach(p => { p.votes = 0; });
  gameState.revealed = false;
  gameState.doubleElim = doubleElim || false;
  gameState.revealCount = 0;
  gameState.multiTeamVoting = multiTeam || false;

  if (multiTeam) {
    // Auto-detect losing teams: all teams without immunity
    if (!losingTeams || !losingTeams.length) {
      const immuneTeams = new Set(gameState.players.filter(p => p.immune).map(p => p.team));
      losingTeams = gameState.teams.filter(t =>
        !immuneTeams.has(t) &&
        gameState.players.some(p => !p.eliminated && p.team === t)
      );
    }
    gameState.votingTeams = losingTeams;
    gameState.votingPool = gameState.players
      .filter(p => !p.eliminated && losingTeams.includes(p.team))
      .map(p => p.name);
    losingTeams.forEach(t => { gameState.teamVotes[t] = {}; });
  } else {
    gameState.votingTeams = [];
    const teamsActive = gameState.teams.length > 1;
    if (!teamsActive) {
      gameState.votingPool = [];
    }
  }

  gameState.updatedAt = Date.now();
  res.json({ ok: true, votingTeams: gameState.votingTeams });
});

app.post('/voting/close', (req, res) => {
  if (!verifyHost(req, res)) return;

  if (gameState.multiTeamVoting && gameState.votingTeams && gameState.votingTeams.length) {
    // Tally per team separately from teamVotes
    gameState.votingTeams.forEach(team => {
      const teamVotes = gameState.teamVotes[team] || {};
      const tally = {};
      gameState.players
        .filter(p => !p.eliminated && p.team === team)
        .forEach(p => { tally[p.name] = 0; });
      Object.values(teamVotes).forEach(target => {
        if (tally[target] !== undefined) tally[target]++;
      });
      gameState.teamTallies[team] = tally;
      // Write vote counts back to players so reveal can use p.votes
      Object.entries(tally).forEach(([name, count]) => {
        const p = gameState.players.find(x => x.name === name);
        if (p) p.votes = count;
      });
    });
  } else {
    // Standard single tally
    const tally = {};
    gameState.players.filter(p => !p.eliminated).forEach(p => { tally[p.name] = 0; });
    Object.values(gameState.votes).forEach(t => {
      if (tally[t] !== undefined) tally[t]++;
    });
    gameState.players.forEach(p => { p.votes = tally[p.name] || 0; });
  }

  gameState.phase = 'reveal';
  gameState.updatedAt = Date.now();
  res.json({ ok: true, teamTallies: gameState.teamTallies });
});

app.post('/voting/reveal', (req, res) => {
  if (!verifyHost(req, res)) return;

  // ── MULTI-TEAM MODE: reveal one team at a time ──
  if (gameState.multiTeamVoting && gameState.votingTeams && gameState.votingTeams.length) {
    const { teamName } = req.body;
    // Pick next unrevealed team if not specified
    const team = teamName || gameState.votingTeams.find(t => !(gameState.revealedTeams || []).includes(t));
    if (!team) return res.status(400).json({ error: 'All teams already revealed' });

    // Use teamTallies for this team
    const tally = gameState.teamTallies[team] || {};
    const teamPlayers = gameState.players.filter(p => !p.eliminated && p.team === team);
    if (!teamPlayers.length) return res.status(400).json({ error: 'No active players in team ' + team });

    // Find player with most votes in this team
    const topTeamVotes = Math.max(...teamPlayers.map(p => tally[p.name] || 0));
    const tiedTeamPlayers = teamPlayers.filter(p => (tally[p.name] || 0) === topTeamVotes);
    const { forceEliminate } = req.body;

    let target;
    if (forceEliminate) {
      target = teamPlayers.find(p => p.name === forceEliminate);
    } else if (tiedTeamPlayers.length > 1 && topTeamVotes > 0) {
      gameState.updatedAt = Date.now();
      return res.json({ ok: true, tie: true, tiedPlayers: tiedTeamPlayers.map(p=>p.name), team, topVotes: topTeamVotes });
    } else if (topTeamVotes === 0) {
      gameState.updatedAt = Date.now();
      return res.json({ ok: true, tie: true, tiedPlayers: teamPlayers.map(p=>p.name), team, topVotes: 0 });
    } else {
      target = tiedTeamPlayers[0];
    }

    target.eliminated = true;
    if (!gameState.revealedTeams) gameState.revealedTeams = [];
    gameState.revealedTeams.push(team);
    gameState.elimHistory.push({
      name: target.name,
      team: target.team,
      round: gameState.round,
      votes: tally[target.name] || 0,
      revealNum: gameState.revealedTeams.length,
    });
    gameState.revealed = true;

    const allRevealed = gameState.revealedTeams.length >= gameState.votingTeams.length;
    gameState.updatedAt = Date.now();
    return res.json({
      ok: true,
      eliminated: { ...target, votes: tally[target.name] || 0 },
      team,
      allRevealed,
      remaining: gameState.votingTeams.filter(t => !gameState.revealedTeams.includes(t)),
    });
  }

  // ── STANDARD MODE: single or double elim ──
  const active = gameState.players.filter(p => !p.eliminated);
  if (!active.length) return res.status(400).json({ error: 'No players' });

  const revealNum = (gameState.revealCount || 0) + 1;
  const sorted = [...active].sort((a, b) => b.votes - a.votes);
  const topVotes = sorted[0]?.votes || 0;

  // Check for tie — forceEliminate overrides tie
  const { forceEliminate } = req.body;
  const tied = sorted.filter(p => p.votes === topVotes && topVotes > 0);

  let target;
  if (forceEliminate) {
    // Host broke the tie manually
    target = active.find(p => p.name === forceEliminate);
    if (!target) return res.status(400).json({ error: 'Player not found' });
  } else if (tied.length > 1 && topVotes > 0) {
    // Tie detected — ask host to break it
    gameState.updatedAt = Date.now();
    return res.json({ ok: true, tie: true, tiedPlayers: tied.map(p => p.name), topVotes });
  } else if (topVotes === 0) {
    // No votes cast at all
    gameState.updatedAt = Date.now();
    return res.json({ ok: true, tie: true, tiedPlayers: active.map(p => p.name), topVotes: 0 });
  } else {
    target = sorted[0];
  }

  target.eliminated = true;
  gameState.elimHistory.push({
    name: target.name, team: target.team, round: gameState.round,
    votes: target.votes, revealNum, tiebroken: !!forceEliminate
  });
  gameState.revealCount = revealNum;
  gameState.revealed = true;

  const isDone = !gameState.doubleElim || revealNum >= 2;
  gameState.updatedAt = Date.now();
  res.json({ ok: true, eliminated: target, revealNum, doubleElim: gameState.doubleElim, isDone, tiebroken: !!forceEliminate });
});

// ── MERGE TRIBES ──
app.post('/merge', (req, res) => {
  if (!verifyHost(req, res)) return;
  const tribeName = req.body.tribeName || 'No Mercy';
  gameState.teams = [tribeName];
  gameState.players.forEach(p => { if (!p.eliminated) p.team = tribeName; });
  gameState.updatedAt = Date.now();
  res.json({ ok: true, tribeName });
});

app.post('/round/next', (req, res) => {
  if (!verifyHost(req, res)) return;
  gameState.round++;
  gameState.phase = 'active';
  gameState.players.forEach(p => { p.immune = false; p.votes = 0; });
  gameState.votes = {};
  gameState.teamVotes = {};
  gameState.teamTallies = {};
  gameState.votingTeams = [];
  gameState.revealedTeams = [];
  gameState.multiTeamVoting = false;
  gameState.votingPool = [];
  gameState.immuneNames = [];
  gameState.currentChallenge = null;
  gameState.pictureChallenge = null;
  gameState.triviaChallenge = null;
  gameState.sortChallenge = null;
  gameState.nttChallenge = null;
  gameState.revealed = false;
  gameState.doubleElim = false;
  gameState.revealCount = 0;
  if (gameState.players.filter(p => !p.eliminated).length <= 1) gameState.phase = 'done';
  gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

app.post('/reset', (req, res) => {
  if (!verifyHost(req, res)) return;
  gameState = defaultState();
  persistState();
  res.json({ ok: true });
});



// ── SORT IT DATABASE ──
// Each question has 4 items sorted correct order (index 0 = first/smallest/oldest)
const SORT_DB = {
  movies: { label: "🎬 Movies — Release Year", prompt: "Oldest to newest", questions: [
    { items: ["Star Wars (1977)","E.T. (1982)","Titanic (1997)","Avatar (2009)"], hint:"Order by release year, oldest first" },
    { items: ["Casablanca (1942)","The Godfather (1972)","Jurassic Park (1993)","The Dark Knight (2008)"], hint:"Order by release year, oldest first" },
    { items: ["Psycho (1960)","Jaws (1975)","Forrest Gump (1994)","Inception (2010)"], hint:"Order by release year, oldest first" },
    { items: ["Gone With the Wind (1939)","2001: A Space Odyssey (1968)","Rocky (1976)","Gladiator (2000)"], hint:"Order by release year, oldest first" },
    { items: ["Citizen Kane (1941)","The Exorcist (1973)","Schindler's List (1993)","No Country for Old Men (2007)"], hint:"Order by release year, oldest first" }
  ]},
  presidents: { label: "🏛️ US Presidents — Order of Service", prompt: "First to most recent", questions: [
    { items: ["Abraham Lincoln","Theodore Roosevelt","John F. Kennedy","Barack Obama"], hint:"Order by when they served, earliest first" },
    { items: ["George Washington","Andrew Jackson","Dwight Eisenhower","Ronald Reagan"], hint:"Order by when they served, earliest first" },
    { items: ["Thomas Jefferson","Ulysses S. Grant","Franklin D. Roosevelt","Richard Nixon"], hint:"Order by when they served, earliest first" },
    { items: ["John Adams","Woodrow Wilson","Harry Truman","Bill Clinton"], hint:"Order by when they served, earliest first" },
    { items: ["James Madison","Abraham Lincoln","Herbert Hoover","George H.W. Bush"], hint:"Order by when they served, earliest first" }
  ]},
  population: { label: "🌍 Countries — Population", prompt: "Smallest to largest population", questions: [
    { items: ["Canada","United States","Brazil","China"], hint:"Order by population, smallest first" },
    { items: ["Australia","Germany","Indonesia","India"], hint:"Order by population, smallest first" },
    { items: ["Portugal","Mexico","Russia","China"], hint:"Order by population, smallest first" },
    { items: ["New Zealand","South Korea","Japan","United States"], hint:"Order by population, smallest first" },
    { items: ["Switzerland","Spain","Nigeria","Bangladesh"], hint:"Order by population, smallest first" }
  ]},
  inventions: { label: "⚙️ Inventions — When Invented", prompt: "Oldest to most recent", questions: [
    { items: ["Printing Press","Steam Engine","Telephone","Internet"], hint:"Order by invention date, oldest first" },
    { items: ["Compass","Gunpowder","Light Bulb","Microwave"], correct:[0,1,2,3], hint:"Order by invention date, oldest first" },
    { items: ["Wheel","Telescope","Radio","Television"], hint:"Order by invention date, oldest first" },
    { items: ["Paper","Bicycle","Airplane","Smartphone"], hint:"Order by invention date, oldest first" },
    { items: ["Concrete","Steam Locomotive","X-Ray Machine","GPS"], hint:"Order by invention date, oldest first" }
  ]},
  space: { label: "🚀 Space Milestones", prompt: "Earliest to most recent", questions: [
    { items: ["First Satellite (Sputnik)","First Human in Space","Moon Landing","Mars Rover (Curiosity)"], hint:"Order by when it happened, earliest first" },
    { items: ["First Rocket Launch","First Dog in Space","First Spacewalk","Hubble Telescope Launch"], hint:"Order by when it happened, earliest first" },
    { items: ["First American in Space","First Woman in Space","Space Shuttle First Flight","International Space Station"], hint:"Order by when it happened, earliest first" },
    { items: ["Sputnik Launch","Moon Landing","Space Shuttle Program","SpaceX Falcon 9 Reuse"], hint:"Order by when it happened, earliest first" },
    { items: ["First Satellite","Yuri Gagarin in Space","Viking Mars Landing","Voyager leaving Solar System"], hint:"Order by when it happened, earliest first" }
  ]},
  animals: { label: "🐾 Animals — Lifespan", prompt: "Shortest to longest lifespan", questions: [
    { items: ["Mouse","Cat","Horse","Tortoise"], hint:"Order by average lifespan, shortest first" },
    { items: ["Hamster","Dog","Elephant","Bowhead Whale"], hint:"Order by average lifespan, shortest first" },
    { items: ["Rabbit","Chimpanzee","Hippopotamus","Greenland Shark"], hint:"Order by average lifespan, shortest first" },
    { items: ["Guinea Pig","Lion","Camel","Giant Tortoise"], hint:"Order by average lifespan, shortest first" },
    { items: ["Bee","Crow","Crocodile","Koi Fish"], hint:"Order by average lifespan, shortest first" }
  ]},
  music: { label: "🎵 Albums — Release Year", prompt: "Oldest to newest", questions: [
    { items: ["Abbey Road (Beatles)","Thriller (Jackson)","The Eminem Show","Lemonade (Beyonce)"], hint:"Order by release year, oldest first" },
    { items: ["Led Zeppelin IV","Purple Rain (Prince)","The Slim Shady LP","Adele - 21"], hint:"Order by release year, oldest first" },
    { items: ["Dark Side of the Moon","Born in the USA (Springsteen)","Nevermind (Nirvana)","Fearless (T. Swift)"], hint:"Order by release year, oldest first" },
    { items: ["Rumours (Fleetwood Mac)","Graceland (Paul Simon)","Jagged Little Pill (Alanis)","Get Rich or Die Tryin'"], hint:"Order by release year, oldest first" },
    { items: ["Pet Sounds (Beach Boys)","Hotel California (Eagles)","The Chronic (Dr. Dre)","21 Adele"], hint:"Order by release year, oldest first" }
  ]},
  buildings: { label: "🏢 Buildings — Height", prompt: "Shortest to tallest", questions: [
    { items: ["Eiffel Tower","Empire State Building","One World Trade Center","Burj Khalifa"], hint:"Order by height, shortest first" },
    { items: ["Washington Monument","Chrysler Building","CN Tower","Shanghai Tower"], hint:"Order by height, shortest first" },
    { items: ["Leaning Tower of Pisa","Eiffel Tower","Taipei 101","Burj Khalifa"], hint:"Order by height, shortest first" },
    { items: ["Big Ben","Empire State Building","Petronas Towers","Makkah Royal Clock Tower"], hint:"Order by height, shortest first" },
    { items: ["Statue of Liberty","Eiffel Tower","One World Trade Center","Burj Khalifa"], hint:"Order by height, shortest first" }
  ]},
  sports: { label: "🏅 Sports Records & Events", prompt: "Earliest to most recent", questions: [
    { items: ["First Modern Olympics","First Super Bowl","First FIFA World Cup Final on TV","Michael Jordan's 6th Championship"], hint:"Order by when it happened, earliest first" },
    { items: ["Babe Ruth's 60 Home Runs","Roger Bannister 4-min Mile","Muhammad Ali vs Frazier I","Michael Phelps 8 Gold Medals"], hint:"Order by when it happened, earliest first" },
    { items: ["Jesse Owens 4 Golds (Olympics)","First NBA Season","First Wimbledon on TV","LeBron's First Championship"], hint:"Order by when it happened, earliest first" },
    { items: ["First Baseball World Series","First NFL Championship","First NBA Finals","First Soccer World Cup"], hint:"Order by when it happened, earliest first" },
    { items: ["Jim Thorpe Olympics Gold","Wilt Chamberlain 100-pt Game","Secretariat Triple Crown","Serena Williams First Slam"], hint:"Order by when it happened, earliest first" }
  ]},
  science: { label: "🔬 Scientific Discoveries", prompt: "Earliest to most recent", questions: [
    { items: ["Gravity (Newton)","Evolution Theory (Darwin)","Penicillin (Fleming)","DNA Structure (Watson/Crick)"], hint:"Order by discovery date, earliest first" },
    { items: ["Electricity (Franklin)","Periodic Table (Mendeleev)","Theory of Relativity (Einstein)","Higgs Boson Confirmed"], hint:"Order by discovery date, earliest first" },
    { items: ["Heliocentrism (Copernicus)","Laws of Motion (Newton)","Germ Theory (Pasteur)","Human Genome Mapped"], hint:"Order by discovery date, earliest first" },
    { items: ["Oxygen Discovered","Vaccination (Jenner)","X-Rays (Roentgen)","Nuclear Fission"], hint:"Order by discovery date, earliest first" },
    { items: ["Calculus (Newton/Leibniz)","Electrons Discovered","Quantum Theory (Planck)","Black Hole Photographed"], hint:"Order by discovery date, earliest first" }
  ]}
};

// ── TRIVIA DATABASE ──
// 10 categories, 5 questions each, easy→hard, multiple choice (4 options, index of correct)
const TRIVIA_DB = {
  movies: {
    label: "🎬 Movies",
    questions: [
      { q:"Which movie features the line 'You're gonna need a bigger boat'?", options:["Jaws","Titanic","The Abyss","Sharknado"], correct:0, difficulty:1 },
      { q:"Who directed Jurassic Park?", options:["James Cameron","Steven Spielberg","George Lucas","Ridley Scott"], correct:1, difficulty:2 },
      { q:"Which film won the first Academy Award for Best Picture?", options:["Gone with the Wind","Wings","Casablanca","Ben-Hur"], correct:1, difficulty:3 },
      { q:"What year was The Godfather released?", options:["1969","1970","1972","1974"], correct:2, difficulty:4 },
      { q:"Which director made both Schindler's List and Saving Private Ryan?", options:["Martin Scorsese","Francis Ford Coppola","Steven Spielberg","Stanley Kubrick"], correct:2, difficulty:5 }
    ]
  },
  tv_shows: {
    label: "📺 TV Shows",
    questions: [
      { q:"What is the name of the coffee shop in Friends?", options:["The Perk","Central Perk","Java Hut","Cafe Mocha"], correct:1, difficulty:1 },
      { q:"Which show features Walter White?", options:["Better Call Saul","Ozark","Breaking Bad","The Wire"], correct:2, difficulty:1 },
      { q:"How many seasons does Game of Thrones have?", options:["6","7","8","9"], correct:2, difficulty:2 },
      { q:"What network originally aired The Sopranos?", options:["AMC","Netflix","Showtime","HBO"], correct:3, difficulty:3 },
      { q:"Which show coined the term 'jumping the shark'?", options:["Happy Days","Fonzie","Laverne & Shirley","Mork & Mindy"], correct:0, difficulty:5 }
    ]
  },
  musicians: {
    label: "🎵 Musicians",
    questions: [
      { q:"Which band sang 'Bohemian Rhapsody'?", options:["Led Zeppelin","Queen","The Beatles","Aerosmith"], correct:1, difficulty:1 },
      { q:"What is Michael Jackson's best-selling album?", options:["Bad","Off the Wall","Thriller","Dangerous"], correct:2, difficulty:1 },
      { q:"Which artist has the most Grammy wins of all time?", options:["Beyoncé","Taylor Swift","Georg Solti","Paul McCartney"], correct:2, difficulty:3 },
      { q:"What was Elvis Presley's first number one hit?", options:["Hound Dog","Heartbreak Hotel","Jailhouse Rock","Blue Suede Shoes"], correct:1, difficulty:4 },
      { q:"Which musician's real name is Stefani Joanne Angelina Germanotta?", options:["Katy Perry","Lady Gaga","Billie Eilish","Adele"], correct:1, difficulty:2 }
    ]
  },
  politicians: {
    label: "🏛️ Politicians",
    questions: [
      { q:"Who was the first President of the United States?", options:["John Adams","Benjamin Franklin","Thomas Jefferson","George Washington"], correct:3, difficulty:1 },
      { q:"Which country did Winston Churchill lead during WWII?", options:["Australia","Canada","United Kingdom","United States"], correct:2, difficulty:1 },
      { q:"How many terms did Franklin D. Roosevelt serve as US President?", options:["2","3","4","5"], correct:2, difficulty:3 },
      { q:"Who was the first female Prime Minister of the UK?", options:["Theresa May","Angela Merkel","Margaret Thatcher","Hillary Clinton"], correct:2, difficulty:2 },
      { q:"Nelson Mandela was imprisoned on which island?", options:["Alcatraz","Ellis Island","Robben Island","Devil's Island"], correct:2, difficulty:3 }
    ]
  },
  cities: {
    label: "🌆 Cities",
    questions: [
      { q:"What is the capital of Australia?", options:["Sydney","Melbourne","Brisbane","Canberra"], correct:3, difficulty:2 },
      { q:"Which city is known as 'The City of Light'?", options:["Rome","London","Paris","Vienna"], correct:2, difficulty:1 },
      { q:"What is the most populous city in the world?", options:["Mumbai","Shanghai","Tokyo","Beijing"], correct:2, difficulty:2 },
      { q:"Which city hosted the 2016 Summer Olympics?", options:["London","Rio de Janeiro","Tokyo","Athens"], correct:1, difficulty:2 },
      { q:"What is the oldest continuously inhabited city in the world?", options:["Rome","Athens","Damascus","Cairo"], correct:2, difficulty:5 }
    ]
  },
  foods: {
    label: "🍕 Foods",
    questions: [
      { q:"What country did pizza originate from?", options:["Greece","France","Italy","Spain"], correct:2, difficulty:1 },
      { q:"What is the main ingredient in guacamole?", options:["Tomato","Avocado","Lime","Onion"], correct:1, difficulty:1 },
      { q:"Which spice is the most expensive in the world by weight?", options:["Vanilla","Cardamom","Saffron","Truffle"], correct:2, difficulty:3 },
      { q:"What type of pastry is a croissant?", options:["Choux","Puff","Shortcrust","Laminated"], correct:3, difficulty:4 },
      { q:"Worcestershire sauce was originally created in which city?", options:["London","Worcester","Birmingham","Bristol"], correct:1, difficulty:5 }
    ]
  },
  athletes: {
    label: "🏆 Athletes",
    questions: [
      { q:"How many Olympic gold medals did Michael Phelps win?", options:["18","21","23","28"], correct:2, difficulty:2 },
      { q:"Which country does Lionel Messi play for?", options:["Brazil","Spain","Portugal","Argentina"], correct:3, difficulty:1 },
      { q:"Usain Bolt's world record 100m time is approximately:", options:["9.58 sec","9.72 sec","9.84 sec","10.01 sec"], correct:0, difficulty:3 },
      { q:"Which tennis player has won the most Grand Slam titles (men's)?", options:["Roger Federer","Rafael Nadal","Novak Djokovic","Pete Sampras"], correct:2, difficulty:3 },
      { q:"Muhammad Ali's original name before converting to Islam was:", options:["Cassius Clay","Rubin Carter","Joe Louis","Sugar Ray Robinson"], correct:0, difficulty:2 }
    ]
  },
  paintings: {
    label: "🖼️ Famous Paintings",
    questions: [
      { q:"Who painted the Mona Lisa?", options:["Michelangelo","Raphael","Leonardo da Vinci","Botticelli"], correct:2, difficulty:1 },
      { q:"In which museum is the Mona Lisa displayed?", options:["The Met","The Louvre","The Prado","The Uffizi"], correct:1, difficulty:2 },
      { q:"Who painted The Starry Night?", options:["Paul Gauguin","Pablo Picasso","Claude Monet","Vincent van Gogh"], correct:3, difficulty:1 },
      { q:"The Scream was painted by which Norwegian artist?", options:["Edvard Munch","Gustav Klimt","Egon Schiele","Ernst Kirchner"], correct:0, difficulty:2 },
      { q:"Which movement is Salvador Dalí associated with?", options:["Cubism","Impressionism","Surrealism","Dadaism"], correct:2, difficulty:3 }
    ]
  },
  animals: {
    label: "🐾 Animals",
    questions: [
      { q:"What is the fastest land animal?", options:["Lion","Cheetah","Pronghorn","Greyhound"], correct:1, difficulty:1 },
      { q:"How many hearts does an octopus have?", options:["1","2","3","4"], correct:2, difficulty:3 },
      { q:"What is the only mammal capable of true flight?", options:["Flying squirrel","Sugar glider","Bat","Flying lemur"], correct:2, difficulty:2 },
      { q:"A group of flamingos is called a:", options:["Flock","Colony","Flamboyance","Gaggle"], correct:2, difficulty:4 },
      { q:"Which animal has the highest blood pressure?", options:["Blue whale","Elephant","Giraffe","Horse"], correct:2, difficulty:5 }
    ]
  },
  logos: {
    label: "🏢 Company Logos",
    questions: [
      { q:"Which company uses a bitten apple as its logo?", options:["Google","Amazon","Apple","Microsoft"], correct:2, difficulty:1 },
      { q:"What color is the Netflix logo?", options:["Blue","Green","Red","Orange"], correct:2, difficulty:1 },
      { q:"The Amazon logo has an arrow pointing from A to Z. What does it symbolize?", options:["Speed","Everything from A to Z","A smile","Growth"], correct:1, difficulty:3 },
      { q:"Which company's logo is a stylized bird?", options:["Facebook","Instagram","Twitter/X","Snapchat"], correct:2, difficulty:2 },
      { q:"What year was the Google logo first introduced?", options:["1995","1997","1998","2000"], correct:2, difficulty:5 }
    ]
  }
};

// ── TRIVIA: GET CATEGORIES ──

// ── SORT IT: CATEGORIES ──
app.get('/sortit/categories', (req, res) => {
  res.json(Object.entries(SORT_DB).map(([key, val]) => ({ key, label: val.label, prompt: val.prompt })));
});

// ── SORT IT: START ──
app.post('/sortit/start', (req, res) => {
  if (!verifyHost(req, res)) return;
  const { category, timeLimit, immunityType } = req.body;
  const cat = SORT_DB[category];
  if (!cat) return res.status(400).json({ error: 'Unknown category' });

  // Pick random question
  const q = cat.questions[Math.floor(Math.random() * cat.questions.length)];
  // Strip parenthetical hints from display (e.g. "Star Wars (1977)" -> "Star Wars")
  const displayItems = q.items.map(item => item.replace(/\s*\([^)]+\)\s*$/, '').trim());
  // Shuffle display items — track by index to preserve correct order mapping
  const shuffledDisplay = [...displayItems].sort(() => Math.random() - 0.5);

  gameState.sortChallenge = {
    category, categoryLabel: cat.label,
    prompt: cat.prompt,
    correctOrder: q.items,         // full items with hints (used for scoring + reveal)
    displayItems: displayItems,    // clean display labels matching correctOrder positions
    shuffledItems: shuffledDisplay, // what players see during game (no hints)
    hint: q.hint,
    playerAnswers: {},
    scores: {},
    revealed: false,
    timeLimit: timeLimit || 45,
    immunityType: immunityType || 'individual',
    startedAt: Date.now(),
    ended: false,
  };
  gameState.phase = 'challenge';
  gameState.currentChallenge = { name: cat.label, type: 'sortit' };
  gameState.immuneNames = [];
  gameState.pictureChallenge = null;
  gameState.triviaChallenge = null;
  gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

// ── SORT IT: SUBMIT ANSWER ──
app.post('/sortit/answer', (req, res) => {
  const { playerName, orderedItems, timeTaken } = req.body;
  const sc = gameState.sortChallenge;
  if (!sc || sc.ended) return res.status(400).json({ error: 'No active challenge' });
  if (sc.playerAnswers[playerName]) return res.json({ ok: true, alreadyAnswered: true });

  sc.playerAnswers[playerName] = orderedItems;
  sc.playerTimes = sc.playerTimes || {};
  sc.playerTimes[playerName] = timeTaken || sc.timeLimit;

  // Score: match trimmed display items against correct display order
  const correctDisplay = sc.displayItems
    ? sc.displayItems
    : sc.correctOrder.map(item => item.replace(/\s*\([^)]+\)\s*$/, '').trim());

  let correct = 0;
  orderedItems.forEach((item, i) => {
    const submitted = (item || '').trim();
    const expected = (correctDisplay[i] || '').trim();
    if (submitted === expected) correct++;
  });

  // Speed bonus: answer time affects score within accuracy tier
  // 4 correct: 10-13pts based on speed
  // 3 correct: 6-8pts
  // 2 correct: 3-4pts
  // 1 correct: 1pt
  // 0 correct: 0pts
  const t = timeTaken || sc.timeLimit;
  const speedRatio = Math.max(0, 1 - (t / sc.timeLimit)); // 0-1, faster = higher
  let pts = 0;
  if (correct === 4) pts = 10 + Math.round(speedRatio * 3);       // 10-13
  else if (correct === 3) pts = 6 + Math.round(speedRatio * 2);   // 6-8
  else if (correct === 2) pts = 3 + Math.round(speedRatio * 1);   // 3-4
  else if (correct === 1) pts = 1;
  else pts = 0;

  sc.scores[playerName] = pts;
  gameState.updatedAt = Date.now();
  // Return debug info to help catch mismatches
  res.json({ ok: true, correct, pts, correctDisplay, submitted: orderedItems });
});

// ── SORT IT: REVEAL (host) ──
app.post('/sortit/reveal', (req, res) => {
  if (!verifyHost(req, res)) return;
  const sc = gameState.sortChallenge;
  if (!sc) return res.status(400).json({ error: 'No challenge' });
  sc.revealed = true;
  gameState.updatedAt = Date.now();
  res.json({ ok: true, correctOrder: sc.correctOrder });
});

// ── SORT IT: END ──
app.post('/sortit/end', (req, res) => {
  if (!verifyHost(req, res)) return;
  const sc = gameState.sortChallenge;
  if (!sc) return res.status(400).json({ error: 'No challenge' });
  sc.ended = true;
  const { scores, immunityType } = sc;
  let immuneNames = [];
  if (immunityType === 'team') {
    const ts = {};
    gameState.teams.forEach(t => ts[t] = 0);
    gameState.players.filter(p => !p.eliminated).forEach(p => {
      if (p.team) ts[p.team] = (ts[p.team] || 0) + (scores[p.name] || 0);
    });
    const max = Math.max(...Object.values(ts));
    const winTeams = Object.entries(ts).filter(([, s]) => s === max).map(([t]) => t);
    immuneNames = gameState.players.filter(p => !p.eliminated && winTeams.includes(p.team)).map(p => p.name);
  } else {
    const max = Math.max(...Object.values(scores), 0);
    immuneNames = Object.entries(scores).filter(([, s]) => s === max).map(([n]) => n);
  }
  gameState.immuneNames = immuneNames;
  gameState.players.forEach(p => { p.immune = immuneNames.includes(p.name); });
  gameState.votingPool = gameState.players.filter(p => !p.eliminated && !p.immune).map(p => p.name);
  gameState.updatedAt = Date.now();
  res.json({ ok: true, scores, immuneNames, correctOrder: sc.correctOrder });
});


// ── NAME THAT TUNE ENDPOINTS ──
app.post('/ntt/start', (req, res) => {
  if (!verifyHost(req, res)) return;
  const { roundLabel, timerSeconds, immunityType } = req.body;
  const totalSongs = req.body.totalSongs || 5;
  gameState.nttChallenge = {
    roundLabel: roundLabel || 'Song 1 of '+totalSongs,
    timerSeconds: timerSeconds || 20,
    immunityType: immunityType || 'individual',
    totalSongs,
    songNumber: 1,
    playing: false,
    stopped: false,
    playedAt: null,
    playerAnswers: {},
    scores: {},       // cumulative across all songs
    currentSongScores: {},
    startedAt: Date.now(),
    ended: false,
  };
  gameState.phase = 'challenge';
  gameState.currentChallenge = { name: roundLabel || 'Name That Tune', type: 'ntt' };
  gameState.pictureChallenge = null;
  gameState.triviaChallenge = null;
  gameState.sortChallenge = null;
  gameState.immuneNames = [];
  gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

app.post('/ntt/play', (req, res) => {
  if (!verifyHost(req, res)) return;
  if (!gameState.nttChallenge) return res.status(400).json({ error: 'No NTT active' });
  gameState.nttChallenge.playing = true;
  gameState.nttChallenge.stopped = false;
  gameState.nttChallenge.playedAt = Date.now();
  gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

app.post('/ntt/stop', (req, res) => {
  if (!verifyHost(req, res)) return;
  if (!gameState.nttChallenge) return res.status(400).json({ error: 'No NTT active' });
  gameState.nttChallenge.playing = false;
  gameState.nttChallenge.stopped = true;
  gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

app.post('/ntt/answer', (req, res) => {
  const { playerName, artist, song } = req.body;
  const ntt = gameState.nttChallenge;
  if (!ntt || ntt.ended) return res.status(400).json({ error: 'No active NTT' });
  if (ntt.playerAnswers[playerName]) return res.json({ ok: true, alreadyAnswered: true });
  // Record how long after timer started they answered
  const timeTaken = ntt.playedAt ? (Date.now() - ntt.playedAt) / 1000 : ntt.timerSeconds;
  ntt.playerAnswers[playerName] = { artist: artist||'', song: song||'', timeTaken };
  ntt.scores[playerName] = 0; // set to 0 until host scores
  gameState.updatedAt = Date.now();
  res.json({ ok: true, timeTaken });
});

app.post('/ntt/score', (req, res) => {
  if (!verifyHost(req, res)) return;
  const { playerName, points } = req.body;
  const ntt = gameState.nttChallenge;
  if (!ntt) return res.status(400).json({ error: 'No NTT active' });

  let finalScore = points; // 0=wrong, 1=song only, 2=both

  if (points > 0) {
    // Add speed bonus based on how quickly they answered relative to timer
    const timeTaken = ntt.playerAnswers[playerName]?.timeTaken || ntt.timerSeconds;
    const ratio = timeTaken / ntt.timerSeconds; // 0=instant, 1=last second
    let speedBonus = 0;
    if (ratio <= 0.25) speedBonus = 2;       // answered in first 25% of time
    else if (ratio <= 0.50) speedBonus = 1;  // answered in first 50% of time
    finalScore = points + speedBonus;
  }

  // Accumulate into total scores (add this song's score to running total)
  // First remove previous score for this song if host re-scores
  const prevSongScore = ntt.currentSongScores[playerName] || 0;
  ntt.currentSongScores[playerName] = finalScore;
  ntt.scores[playerName] = Math.max(0, (ntt.scores[playerName] || 0) - prevSongScore + finalScore);
  gameState.updatedAt = Date.now();
  res.json({ ok: true, score: finalScore, totalScore: ntt.scores[playerName] });
});

app.post('/ntt/next', (req, res) => {
  if (!verifyHost(req, res)) return;
  const ntt = gameState.nttChallenge;
  if (!ntt) return res.status(400).json({ error: 'No NTT active' });
  const { roundLabel } = req.body;
  // Advance to next song — keep cumulative scores, reset per-song state
  ntt.songNumber = (ntt.songNumber || 1) + 1;
  ntt.roundLabel = roundLabel || `Song ${ntt.songNumber} of ${ntt.totalSongs || 5}`;
  ntt.playing = false;
  ntt.stopped = false;
  ntt.playedAt = null;
  ntt.playerAnswers = {};
  ntt.currentSongScores = {}; // scores just for this song
  ntt.startedAt = Date.now(); // trigger client reset via startedAt change
  gameState.updatedAt = Date.now();
  res.json({ ok: true, songNumber: ntt.songNumber });
});

app.post('/ntt/end', (req, res) => {
  if (!verifyHost(req, res)) return;
  const ntt = gameState.nttChallenge;
  if (!ntt) return res.status(400).json({ error: 'No NTT' });
  ntt.ended = true;
  const { scores, immunityType } = ntt;
  let immuneNames = [];
  if (immunityType === 'team') {
    const ts = {};
    gameState.teams.forEach(t => ts[t] = 0);
    gameState.players.filter(p => !p.eliminated).forEach(p => {
      if (p.team) ts[p.team] = (ts[p.team]||0) + (scores[p.name]||0);
    });
    const max = Math.max(...Object.values(ts));
    const winTeams = Object.entries(ts).filter(([,s]) => s===max).map(([t]) => t);
    immuneNames = gameState.players.filter(p => !p.eliminated && winTeams.includes(p.team)).map(p => p.name);
  } else {
    const max = Math.max(...Object.values(scores), 0);
    immuneNames = Object.entries(scores).filter(([,s]) => s===max).map(([n]) => n);
  }
  gameState.immuneNames = immuneNames;
  gameState.players.forEach(p => { p.immune = immuneNames.includes(p.name); });
  gameState.votingPool = gameState.players.filter(p => !p.eliminated && !p.immune).map(p => p.name);
  gameState.updatedAt = Date.now();
  res.json({ ok: true, scores, immuneNames });
});


app.get('/trivia/categories', (req, res) => {
  const cats = Object.entries(TRIVIA_DB).map(([key, val]) => ({ key, label: val.label, count: val.questions.length }));
  res.json(cats);
});

// ── TRIVIA: START ──
app.post('/trivia/start', (req, res) => {
  if (!verifyHost(req, res)) return;
  const { category, timePerQ, immunityType } = req.body;
  const cat = TRIVIA_DB[category];
  if (!cat) return res.status(400).json({ error: 'Unknown category' });

  const questions = [...cat.questions].sort((a, b) => a.difficulty - b.difficulty);
  gameState.triviaChallenge = {
    category, categoryLabel: cat.label,
    questions: questions.map(q => ({ q: q.q, options: q.options, correct: q.correct })),
    currentQ: 0,           // which question we're on (0-4)
    playerAnswers: {},     // { playerName: [answerIndex, ...] }
    playerTimes: {},       // { playerName: [secondsTaken, ...] }
    scores: {},            // { playerName: totalPoints }
    timePerQ: timePerQ || 15,
    immunityType: immunityType || 'individual',
    qStartedAt: Date.now(),
    ended: false,
  };
  gameState.phase = 'challenge';
  gameState.currentChallenge = { name: cat.label + ' Trivia', type: 'trivia' };
  gameState.immuneNames = [];
  gameState.pictureChallenge = null;
  gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

// ── TRIVIA: NEXT QUESTION (host advances) ──
app.post('/trivia/next', (req, res) => {
  if (!verifyHost(req, res)) return;
  if (!gameState?.triviaChallenge) return res.status(400).json({ error: 'No trivia active' });
  const tc = gameState.triviaChallenge;
  if (tc.currentQ >= tc.questions.length - 1) {
    tc.ended = true;
  } else {
    tc.currentQ++;
    tc.qStartedAt = Date.now();
  }
  gameState.updatedAt = Date.now();
  res.json({ ok: true, currentQ: tc.currentQ, ended: tc.ended });
});

// ── TRIVIA: SUBMIT ANSWER ──
app.post('/trivia/answer', (req, res) => {
  const { playerName, answerIndex, timeTaken } = req.body;
  if (!gameState?.triviaChallenge) return res.status(400).json({ error: 'No trivia active' });
  const tc = gameState.triviaChallenge;
  if (tc.ended) return res.status(400).json({ error: 'Trivia ended' });

  if (!tc.playerAnswers[playerName]) tc.playerAnswers[playerName] = [];
  if (!tc.playerTimes[playerName]) tc.playerTimes[playerName] = [];

  const qIdx = tc.currentQ;
  // Only accept first answer per question
  if (tc.playerAnswers[playerName][qIdx] !== undefined) {
    return res.json({ ok: true, alreadyAnswered: true });
  }

  tc.playerAnswers[playerName][qIdx] = answerIndex;
  tc.playerTimes[playerName][qIdx] = timeTaken || tc.timePerQ;

  // Score: correct answer earns points based on speed
  const correct = tc.questions[qIdx].correct === answerIndex;
  let pts = 0;
  if (correct) {
    if (timeTaken <= 5) pts = 3;
    else if (timeTaken <= 10) pts = 2;
    else pts = 1;
  }
  if (!tc.scores[playerName]) tc.scores[playerName] = 0;
  tc.scores[playerName] += pts;

  gameState.updatedAt = Date.now();
  res.json({ ok: true, correct, pts, correctIndex: tc.questions[qIdx].correct });
});

// ── TRIVIA: END + AWARD IMMUNITY ──
app.post('/trivia/end', (req, res) => {
  if (!verifyHost(req, res)) return;
  if (!gameState?.triviaChallenge) return res.status(400).json({ error: 'No trivia' });
  gameState.triviaChallenge.ended = true;
  const { scores, immunityType } = gameState.triviaChallenge;
  let immuneNames = [];

  if (immunityType === 'team') {
    const teamScores = {};
    gameState.teams.forEach(t => teamScores[t] = 0);
    gameState.players.filter(p => !p.eliminated).forEach(p => {
      if (p.team) teamScores[p.team] = (teamScores[p.team] || 0) + (scores[p.name] || 0);
    });
    const maxTeam = Math.max(...Object.values(teamScores));
    const winTeams = Object.entries(teamScores).filter(([, s]) => s === maxTeam).map(([t]) => t);
    immuneNames = gameState.players.filter(p => !p.eliminated && winTeams.includes(p.team)).map(p => p.name);
  } else {
    const maxScore = Math.max(...Object.values(scores), 0);
    immuneNames = Object.entries(scores).filter(([, s]) => s === maxScore).map(([n]) => n);
  }

  gameState.immuneNames = immuneNames;
  gameState.players.forEach(p => { p.immune = immuneNames.includes(p.name); });
  gameState.votingPool = gameState.players.filter(p => !p.eliminated && !p.immune).map(p => p.name);
  gameState.updatedAt = Date.now();
  res.json({ ok: true, scores, immuneNames });
});


app.get('/', (req, res) => res.json({
  status: 'Ticcio Parties 🔥',
  round: gameState?.round || 0,
  phase: gameState?.phase || 'none',
  players: gameState?.players?.length || 0,
  persisted: fs.existsSync(STATE_FILE),
}));

app.listen(PORT, () => console.log(`Ticcio Parties server on port ${PORT}`));
