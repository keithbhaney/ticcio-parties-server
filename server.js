const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let gameState = null;

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
    votingPool: [],
    immuneNames: [],
    currentChallenge: null,
    revealed: false,
    elimHistory: [],
    updatedAt: Date.now(),
  };
}

function verifyHost(req, res) {
  if (!gameState) gameState = defaultState();
  const pass = req.body.hostPass;
  if (pass !== gameState.hostPass && pass !== 'ticcio') {
    res.status(403).json({ error: 'Wrong host password' });
    return false;
  }
  return true;
}

app.get('/state', (req, res) => {
  if (!gameState) gameState = defaultState();
  res.json(gameState);
});

app.post('/state', (req, res) => {
  if (!verifyHost(req, res)) return;
  const { state } = req.body;
  gameState = { ...state, updatedAt: Date.now() };
  res.json({ ok: true, state: gameState });
});

app.post('/vote', (req, res) => {
  const { voterName, targetName } = req.body;
  if (!gameState) return res.status(400).json({ error: 'No game in progress' });
  if (gameState.phase !== 'voting') return res.status(400).json({ error: 'Voting not open' });
  const voter = gameState.players.find(p => p.name === voterName);
  if (!voter) return res.status(400).json({ error: 'Player not found' });
  if (voter.eliminated) return res.status(400).json({ error: 'You are eliminated' });
  if (gameState.votes[voterName]) return res.status(400).json({ error: 'Already voted' });
  if (gameState.votingPool.length > 0 && !gameState.votingPool.includes(voterName)) {
    return res.status(403).json({ error: 'Your team won — you don\'t vote this round' });
  }
  gameState.votes[voterName] = targetName;
  gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

app.post('/challenge/start', (req, res) => {
  if (!verifyHost(req, res)) return;
  const { name, description, type } = req.body;
  gameState.currentChallenge = {
    name: name || 'Challenge',
    description: description || '',
    type: type || 'physical',
    startedAt: Date.now(),
  };
  gameState.phase = 'challenge';
  gameState.immuneNames = [];
  gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

app.post('/challenge/immunity', (req, res) => {
  if (!verifyHost(req, res)) return;
  const { winnerType, winnerName } = req.body;
  if (winnerType === 'team') {
    const immunePlayers = gameState.players
      .filter(p => !p.eliminated && p.team === winnerName)
      .map(p => p.name);
    gameState.immuneNames = immunePlayers;
    gameState.players.forEach(p => { p.immune = immunePlayers.includes(p.name); });
    gameState.votingPool = gameState.players
      .filter(p => !p.eliminated && !p.immune)
      .map(p => p.name);
  } else {
    gameState.immuneNames = [winnerName];
    gameState.players.forEach(p => { p.immune = p.name === winnerName; });
    gameState.votingPool = gameState.players
      .filter(p => !p.eliminated && p.name !== winnerName)
      .map(p => p.name);
  }
  gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

app.post('/voting/open', (req, res) => {
  if (!verifyHost(req, res)) return;
  gameState.phase = 'voting';
  gameState.votes = {};
  gameState.players.forEach(p => { p.votes = 0; });
  gameState.revealed = false;
  gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

app.post('/voting/close', (req, res) => {
  if (!verifyHost(req, res)) return;
  const tally = {};
  gameState.players.filter(p => !p.eliminated).forEach(p => tally[p.name] = 0);
  Object.values(gameState.votes).forEach(t => { if (tally[t] !== undefined) tally[t]++; });
  gameState.players.forEach(p => { p.votes = tally[p.name] || 0; });
  gameState.phase = 'reveal';
  gameState.updatedAt = Date.now();
  res.json({ ok: true, tally });
});

app.post('/voting/reveal', (req, res) => {
  if (!verifyHost(req, res)) return;
  const active = gameState.players.filter(p => !p.eliminated);
  if (!active.length) return res.status(400).json({ error: 'No players' });
  const top = active.reduce((a, b) => b.votes > a.votes ? b : a, active[0]);
  top.eliminated = true;
  gameState.elimHistory.push({ name: top.name, team: top.team, round: gameState.round, votes: top.votes });
  gameState.revealed = true;
  gameState.updatedAt = Date.now();
  res.json({ ok: true, eliminated: top });
});

app.post('/round/next', (req, res) => {
  if (!verifyHost(req, res)) return;
  gameState.round++;
  gameState.phase = 'active';
  gameState.players.forEach(p => { p.immune = false; p.votes = 0; });
  gameState.votes = {};
  gameState.votingPool = [];
  gameState.immuneNames = [];
  gameState.currentChallenge = null;
  gameState.revealed = false;
  const alive = gameState.players.filter(p => !p.eliminated);
  if (alive.length <= 1) gameState.phase = 'done';
  gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

app.post('/reset', (req, res) => {
  if (!verifyHost(req, res)) return;
  gameState = defaultState();
  res.json({ ok: true });
});

app.get('/', (req, res) => res.json({ status: 'Ticcio Parties server running 🔥', round: gameState?.round || 0 }));

app.listen(PORT, () => console.log(`Ticcio Parties server on port ${PORT}`));
