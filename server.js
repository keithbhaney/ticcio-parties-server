const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In-memory game state — resets if server restarts
// Good enough for a party, we'll persist later if needed
let gameState = null;

function defaultState() {
  return {
    gameName: 'Ticcio Survivor',
    hostPass: 'ticcio',
    phase: 'lobby',
    round: 1,
    players: [],
    votes: {},
    revealed: false,
    elimHistory: [],
    updatedAt: Date.now(),
  };
}

// ── GET STATE ──
// All clients poll this every 2.5 seconds
app.get('/state', (req, res) => {
  if (!gameState) gameState = defaultState();
  res.json(gameState);
});

// ── HOST: FULL STATE WRITE ──
// Host sends the entire new state (setup, round advance, immunity, etc.)
app.post('/state', (req, res) => {
  const { hostPass, state } = req.body;
  if (!gameState) gameState = defaultState();
  if (hostPass !== gameState.hostPass && hostPass !== 'ticcio') {
    return res.status(403).json({ error: 'Wrong host password' });
  }
  gameState = { ...state, updatedAt: Date.now() };
  res.json({ ok: true, state: gameState });
});

// ── PLAYER: SUBMIT VOTE ──
// Players only write their own vote, can't overwrite full state
app.post('/vote', (req, res) => {
  const { voterName, targetName } = req.body;
  if (!gameState) return res.status(400).json({ error: 'No game in progress' });
  if (gameState.phase !== 'voting') return res.status(400).json({ error: 'Voting not open' });

  const voter = gameState.players.find(p => p.name === voterName);
  if (!voter) return res.status(400).json({ error: 'Player not found' });
  if (voter.eliminated) return res.status(400).json({ error: 'You are eliminated' });
  if (gameState.votes[voterName]) return res.status(400).json({ error: 'Already voted' });

  gameState.votes[voterName] = targetName;
  gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

// ── RESET (host only) ──
app.post('/reset', (req, res) => {
  const { hostPass } = req.body;
  if (hostPass !== (gameState?.hostPass || 'ticcio') && hostPass !== 'ticcio') {
    return res.status(403).json({ error: 'Wrong host password' });
  }
  gameState = defaultState();
  res.json({ ok: true });
});

// ── HEALTH CHECK ──
app.get('/', (req, res) => res.json({ status: 'Ticcio Parties server running 🔥' }));

app.listen(PORT, () => console.log(`Ticcio Parties server on port ${PORT}`));
