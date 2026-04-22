const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let gameState = null;

// ── IMAGE DATABASE ──
// 10 categories, 5 questions each, easy→hard
// Using Wikimedia Commons URLs (stable, free, public domain)
const IMAGE_DB = {
  movies: {
    label: "🎬 Movies",
    questions: [
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/300px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg", answers: ["jaws","jaw"], hint: "1975 Spielberg shark thriller" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Colosseum_in_Rome-April_2007-1-_copie_2B.jpg/400px-Colosseum_in_Rome-April_2007-1-_copie_2B.jpg", answers: ["gladiator"], hint: "Russell Crowe, Roman arena" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Sydney_Opera_House_-_Dec_2008.jpg/400px-Sydney_Opera_House_-_Dec_2008.jpg", answers: ["titanic"], hint: "Kate Winslet, Leonardo DiCaprio, 1997" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Barack_Obama.jpg/300px-Barack_Obama.jpg", answers: ["the matrix","matrix"], hint: "Red pill or blue pill" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Abraham_Lincoln_O-77_matte_collodion_print.jpg/300px-Abraham_Lincoln_O-77_matte_collodion_print.jpg", answers: ["casablanca"], hint: "1942 Humphrey Bogart classic" }
    ]
  },
  tv_shows: {
    label: "📺 TV Shows",
    questions: [
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/400px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg", answers: ["friends"], hint: "Could this BE any more iconic?" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg/400px-Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg", answers: ["the simpsons","simpsons"], hint: "D'oh! Springfield family" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Muhammad_Ali_NYWTS.jpg/300px-Muhammad_Ali_NYWTS.jpg", answers: ["breaking bad"], hint: "I am the one who knocks" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Usain_Bolt_Olympics_cropped.jpg/300px-Usain_Bolt_Olympics_cropped.jpg", answers: ["stranger things"], hint: "Upside Down, Hawkins Indiana" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Roger_Federer_2012_Wimbledon.jpg/300px-Roger_Federer_2012_Wimbledon.jpg", answers: ["game of thrones","got"], hint: "Winter is coming, dragons" }
    ]
  },
  paintings: {
    label: "🖼️ Famous Paintings",
    questions: [
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/400px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg", answers: ["mona lisa"], hint: "Leonardo da Vinci, mysterious smile" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/400px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg", answers: ["the starry night","starry night"], hint: "Van Gogh, swirling night sky" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg/400px-Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg", answers: ["the scream","scream"], hint: "Edvard Munch, anguished figure" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/400px-0f_1665_Girl_with_a_Pearl_Earring.jpg", answers: ["girl with a pearl earring","pearl earring"], hint: "Vermeer, Dutch Golden Age" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Gustave_Caillebotte_-_Paris_Street%3B_Rainy_Day_-_Google_Art_Project.jpg/400px-Gustave_Caillebotte_-_Paris_Street%3B_Rainy_Day_-_Google_Art_Project.jpg", answers: ["paris street rainy day","rainy day"], hint: "Caillebotte, 1877 Paris" }
    ]
  },
  cities: {
    label: "🌆 Cities",
    questions: [
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Sydney_Opera_House_-_Dec_2008.jpg/400px-Sydney_Opera_House_-_Dec_2008.jpg", answers: ["sydney"], hint: "Opera House, Australia" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Colosseum_in_Rome-April_2007-1-_copie_2B.jpg/400px-Colosseum_in_Rome-April_2007-1-_copie_2B.jpg", answers: ["rome"], hint: "Colosseum, eternal city" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Southwest_corner_of_Central_Park%2C_looking_east%2C_NYC.jpg/400px-Southwest_corner_of_Central_Park%2C_looking_east%2C_NYC.jpg", answers: ["new york","new york city","nyc"], hint: "Central Park, The Big Apple" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Hagia_Sophia_mosque_amk.jpg/400px-Hagia_Sophia_mosque_amk.jpg", answers: ["istanbul"], hint: "Hagia Sophia, Turkey" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Tikal-oso_hormiguero.jpg/300px-Tikal-oso_hormiguero.jpg", answers: ["tikal","guatemala city","guatemala"], hint: "Ancient Mayan ruins, jungle" }
    ]
  },
  animals: {
    label: "🐾 Animals",
    questions: [
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat_03.jpg/400px-Cat_03.jpg", answers: ["cat"], hint: "Common household pet" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Koala_climbing_tree.jpg/300px-Koala_climbing_tree.jpg", answers: ["koala"], hint: "Australian marsupial, eucalyptus lover" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Nile_crocodile_head.jpg/400px-Nile_crocodile_head.jpg", answers: ["crocodile","nile crocodile"], hint: "Large reptile, Africa" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Bicolor_corn_snake.jpg/400px-Bicolor_corn_snake.jpg", answers: ["corn snake","snake"], hint: "Colorful North American reptile" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Tikal-oso_hormiguero.jpg/300px-Tikal-oso_hormiguero.jpg", answers: ["anteater","giant anteater"], hint: "Long snout, eats insects" }
    ]
  }
};

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
    pictureChallenge: null,   // {category, questions, answers:{playerName:[guess0..4]}, scores:{}, timeLimit, startedAt, ended}
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

// ── STATE ──
app.get('/state', (req, res) => {
  if (!gameState) gameState = defaultState();
  res.json(gameState);
});

app.post('/state', (req, res) => {
  if (!verifyHost(req, res)) return;
  gameState = { ...req.body.state, updatedAt: Date.now() };
  res.json({ ok: true });
});

// ── CATEGORIES ──
app.get('/categories', (req, res) => {
  const cats = Object.entries(IMAGE_DB).map(([key, val]) => ({
    key,
    label: val.label,
    count: val.questions.length
  }));
  res.json(cats);
});

// ── PICTURE CHALLENGE: START ──
app.post('/picture/start', (req, res) => {
  if (!verifyHost(req, res)) return;
  const { category, timeLimit, immunityType } = req.body;
  const cat = IMAGE_DB[category];
  if (!cat) return res.status(400).json({ error: 'Unknown category' });

  // Shuffle and pick 5
  const shuffled = [...cat.questions].sort(() => Math.random() - 0.5).slice(0, 5);

  gameState.pictureChallenge = {
    category,
    categoryLabel: cat.label,
    questions: shuffled.map(q => ({
      image: q.image,
      hint: q.hint,
      answers: q.answers  // kept server-side for scoring
    })),
    playerAnswers: {},   // {playerName: [guess0,guess1,guess2,guess3,guess4]}
    scores: {},          // {playerName: number}
    overrides: {},       // {playerName: {qIndex: true/false}} host overrides
    timeLimit: timeLimit || 60,
    immunityType: immunityType || 'individual',
    startedAt: Date.now(),
    ended: false,
  };
  gameState.phase = 'challenge';
  gameState.currentChallenge = { name: cat.label+' Challenge', type: 'picture' };
  gameState.immuneNames = [];
  gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

// ── PICTURE CHALLENGE: SUBMIT ANSWERS ──
app.post('/picture/answer', (req, res) => {
  const { playerName, answers } = req.body; // answers: array of 5 strings
  if (!gameState?.pictureChallenge) return res.status(400).json({ error: 'No challenge active' });
  if (gameState.pictureChallenge.ended) return res.status(400).json({ error: 'Challenge ended' });

  gameState.pictureChallenge.playerAnswers[playerName] = answers;

  // Auto-score: exact match (case-insensitive, trimmed)
  const q = gameState.pictureChallenge.questions;
  let score = 0;
  answers.forEach((ans, i) => {
    const normalized = (ans || '').trim().toLowerCase();
    if (q[i] && q[i].answers.some(a => a.toLowerCase() === normalized)) score++;
  });
  gameState.pictureChallenge.scores[playerName] = score;
  gameState.updatedAt = Date.now();
  res.json({ ok: true, score });
});

// ── PICTURE CHALLENGE: END + SCORE ──
app.post('/picture/end', (req, res) => {
  if (!verifyHost(req, res)) return;
  if (!gameState?.pictureChallenge) return res.status(400).json({ error: 'No challenge' });
  gameState.pictureChallenge.ended = true;

  // Apply host overrides to scores
  const { overrides } = gameState.pictureChallenge;
  if (overrides) {
    Object.entries(overrides).forEach(([playerName, qOverrides]) => {
      let score = gameState.pictureChallenge.scores[playerName] || 0;
      Object.entries(qOverrides).forEach(([qIdx, correct]) => {
        const wasCorrect = (() => {
          const ans = (gameState.pictureChallenge.playerAnswers[playerName]?.[qIdx] || '').trim().toLowerCase();
          return gameState.pictureChallenge.questions[qIdx]?.answers.some(a => a.toLowerCase() === ans);
        })();
        if (correct && !wasCorrect) score++;
        if (!correct && wasCorrect) score--;
      });
      gameState.pictureChallenge.scores[playerName] = Math.max(0, score);
    });
  }

  // Determine winner(s)
  const scores = gameState.pictureChallenge.scores;
  const immunityType = gameState.pictureChallenge.immunityType;
  let immuneNames = [];

  if (immunityType === 'team') {
    // Sum scores by team
    const teamScores = {};
    gameState.teams.forEach(t => teamScores[t] = 0);
    gameState.players.filter(p => !p.eliminated).forEach(p => {
      if (p.team && teamScores[p.team] !== undefined) teamScores[p.team] += scores[p.name] || 0;
    });
    const maxTeamScore = Math.max(...Object.values(teamScores));
    const winningTeams = Object.entries(teamScores).filter(([,s]) => s === maxTeamScore).map(([t]) => t);
    immuneNames = gameState.players.filter(p => !p.eliminated && winningTeams.includes(p.team)).map(p => p.name);
  } else {
    const maxScore = Math.max(...Object.values(scores), 0);
    immuneNames = Object.entries(scores).filter(([,s]) => s === maxScore).map(([n]) => n);
  }

  gameState.immuneNames = immuneNames;
  gameState.players.forEach(p => { p.immune = immuneNames.includes(p.name); });
  gameState.votingPool = gameState.players.filter(p => !p.eliminated && !p.immune).map(p => p.name);
  gameState.updatedAt = Date.now();
  res.json({ ok: true, scores, immuneNames });
});

// ── HOST OVERRIDE SCORE ──
app.post('/picture/override', (req, res) => {
  if (!verifyHost(req, res)) return;
  const { playerName, qIndex, correct } = req.body;
  if (!gameState?.pictureChallenge) return res.status(400).json({ error: 'No challenge' });
  if (!gameState.pictureChallenge.overrides) gameState.pictureChallenge.overrides = {};
  if (!gameState.pictureChallenge.overrides[playerName]) gameState.pictureChallenge.overrides[playerName] = {};
  gameState.pictureChallenge.overrides[playerName][qIndex] = correct;

  // Recalculate score live
  const base = gameState.pictureChallenge.questions;
  const playerAnswers = gameState.pictureChallenge.playerAnswers[playerName] || [];
  let score = 0;
  base.forEach((q, i) => {
    const override = gameState.pictureChallenge.overrides[playerName]?.[i];
    if (override !== undefined) { if (override) score++; }
    else {
      const ans = (playerAnswers[i] || '').trim().toLowerCase();
      if (q.answers.some(a => a.toLowerCase() === ans)) score++;
    }
  });
  gameState.pictureChallenge.scores[playerName] = score;
  gameState.updatedAt = Date.now();
  res.json({ ok: true, score });
});

// ── CHALLENGE: PHYSICAL START ──
app.post('/challenge/start', (req, res) => {
  if (!verifyHost(req, res)) return;
  const { name, description, immunityType } = req.body;
  gameState.currentChallenge = { name: name||'Challenge', description: description||'', type:'physical', startedAt: Date.now() };
  gameState.pictureChallenge = null;
  gameState.phase = 'challenge';
  gameState.immuneNames = [];
  gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

// ── IMMUNITY ──
app.post('/challenge/immunity', (req, res) => {
  if (!verifyHost(req, res)) return;
  const { winnerType, winnerName } = req.body;
  if (winnerType === 'team') {
    const immunePlayers = gameState.players.filter(p => !p.eliminated && p.team === winnerName).map(p => p.name);
    gameState.immuneNames = immunePlayers;
    gameState.players.forEach(p => { p.immune = immunePlayers.includes(p.name); });
    gameState.votingPool = gameState.players.filter(p => !p.eliminated && !p.immune).map(p => p.name);
  } else {
    gameState.immuneNames = [winnerName];
    gameState.players.forEach(p => { p.immune = p.name === winnerName; });
    gameState.votingPool = gameState.players.filter(p => !p.eliminated && p.name !== winnerName).map(p => p.name);
  }
  gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

// ── VOTING ──
app.post('/vote', (req, res) => {
  const { voterName, targetName } = req.body;
  if (!gameState) return res.status(400).json({ error: 'No game' });
  if (gameState.phase !== 'voting') return res.status(400).json({ error: 'Voting not open' });
  const voter = gameState.players.find(p => p.name === voterName);
  if (!voter || voter.eliminated) return res.status(400).json({ error: 'Not eligible' });
  if (gameState.votes[voterName]) return res.status(400).json({ error: 'Already voted' });
  if (gameState.votingPool.length > 0 && !gameState.votingPool.includes(voterName))
    return res.status(403).json({ error: 'Your team won — no vote needed' });
  gameState.votes[voterName] = targetName;
  gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

app.post('/voting/open', (req, res) => {
  if (!verifyHost(req, res)) return;
  gameState.phase = 'voting'; gameState.votes = {};
  gameState.players.forEach(p => { p.votes = 0; });
  gameState.revealed = false; gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

app.post('/voting/close', (req, res) => {
  if (!verifyHost(req, res)) return;
  const tally = {};
  gameState.players.filter(p => !p.eliminated).forEach(p => tally[p.name] = 0);
  Object.values(gameState.votes).forEach(t => { if (tally[t] !== undefined) tally[t]++; });
  gameState.players.forEach(p => { p.votes = tally[p.name] || 0; });
  gameState.phase = 'reveal'; gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

app.post('/voting/reveal', (req, res) => {
  if (!verifyHost(req, res)) return;
  const active = gameState.players.filter(p => !p.eliminated);
  if (!active.length) return res.status(400).json({ error: 'No players' });
  const top = active.reduce((a, b) => b.votes > a.votes ? b : a, active[0]);
  top.eliminated = true;
  gameState.elimHistory.push({ name: top.name, team: top.team, round: gameState.round, votes: top.votes });
  gameState.revealed = true; gameState.updatedAt = Date.now();
  res.json({ ok: true, eliminated: top });
});

app.post('/round/next', (req, res) => {
  if (!verifyHost(req, res)) return;
  gameState.round++;
  gameState.phase = 'active';
  gameState.players.forEach(p => { p.immune = false; p.votes = 0; });
  gameState.votes = {}; gameState.votingPool = []; gameState.immuneNames = [];
  gameState.currentChallenge = null; gameState.pictureChallenge = null;
  gameState.revealed = false;
  if (gameState.players.filter(p => !p.eliminated).length <= 1) gameState.phase = 'done';
  gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

app.post('/reset', (req, res) => {
  if (!verifyHost(req, res)) return;
  gameState = defaultState();
  res.json({ ok: true });
});

app.get('/', (req, res) => res.json({ status: 'Ticcio Parties 🔥', round: gameState?.round || 0 }));

app.listen(PORT, () => console.log(`Ticcio Parties server on port ${PORT}`));
