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

let gameState = loadPersistedState();

const IMAGE_DB = {
  paintings: {
    label: "🖼️ Famous Paintings",
    questions: [
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/300px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg", answers: ["mona lisa"], hint: "Leonardo da Vinci, mysterious smile, Louvre" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/400px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg", answers: ["the starry night","starry night"], hint: "Van Gogh, swirling night sky over a village" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg/300px-Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg", answers: ["the scream","scream"], hint: "Edvard Munch, 1893, anguished figure on a bridge" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/300px-1665_Girl_with_a_Pearl_Earring.jpg", answers: ["girl with a pearl earring","pearl earring"], hint: "Vermeer, Dutch Golden Age, 1665" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Gustave_Caillebotte_-_Paris_Street%3B_Rainy_Day_-_Google_Art_Project.jpg/400px-Gustave_Caillebotte_-_Paris_Street%3B_Rainy_Day_-_Google_Art_Project.jpg", answers: ["paris street rainy day","rainy day","paris street; rainy day"], hint: "Caillebotte, 1877, wet cobblestones in Paris" }
    ]
  },
  cities: {
    label: "🌆 Cities",
    questions: [
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Sydney_Opera_House_-_Dec_2008.jpg/400px-Sydney_Opera_House_-_Dec_2008.jpg", answers: ["sydney"], hint: "Iconic opera house, Australia" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Colosseum_in_Rome-April_2007-1-_copie_2B.jpg/400px-Colosseum_in_Rome-April_2007-1-_copie_2B.jpg", answers: ["rome"], hint: "Ancient amphitheater, Eternal City, Italy" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Southwest_corner_of_Central_Park%2C_looking_east%2C_NYC.jpg/400px-Southwest_corner_of_Central_Park%2C_looking_east%2C_NYC.jpg", answers: ["new york","new york city","nyc"], hint: "Central Park, The Big Apple" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Hagia_Sophia_mosque_amk.jpg/400px-Hagia_Sophia_mosque_amk.jpg", answers: ["istanbul"], hint: "Hagia Sophia, Turkey, East meets West" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Machu_Picchu%2C_Peru.jpg/400px-Machu_Picchu%2C_Peru.jpg", answers: ["machu picchu"], hint: "Ancient Incan citadel, high in the Andes, Peru" }
    ]
  },
  politicians: {
    label: "🏛️ Politicians",
    questions: [
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Abraham_Lincoln_O-77_matte_collodion_print.jpg/300px-Abraham_Lincoln_O-77_matte_collodion_print.jpg", answers: ["abraham lincoln","lincoln"], hint: "16th US President, Gettysburg Address" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/President_Barack_Obama.jpg/300px-President_Barack_Obama.jpg", answers: ["barack obama","obama"], hint: "44th US President, Hope" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Churchill_V_sign_HU_55521.jpg/300px-Churchill_V_sign_HU_55521.jpg", answers: ["winston churchill","churchill"], hint: "British WWII Prime Minister, V for Victory" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Jfk2.jpg/300px-Jfk2.jpg", answers: ["john f kennedy","jfk","kennedy"], hint: "35th US President, assassinated 1963" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Nelson_Mandela-2008_%28edit%29.jpg/300px-Nelson_Mandela-2008_%28edit%29.jpg", answers: ["nelson mandela","mandela"], hint: "South Africa's first Black president, anti-apartheid icon" }
    ]
  },
  athletes: {
    label: "🏆 Athletes",
    questions: [
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Usain_Bolt_Olympics_cropped.jpg/300px-Usain_Bolt_Olympics_cropped.jpg", answers: ["usain bolt","bolt"], hint: "World's fastest man, Jamaican sprinter" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Muhammad_Ali_NYWTS.jpg/300px-Muhammad_Ali_NYWTS.jpg", answers: ["muhammad ali","ali","cassius clay"], hint: "The Greatest, heavyweight boxing champion" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Roger_Federer_2012_Wimbledon.jpg/300px-Roger_Federer_2012_Wimbledon.jpg", answers: ["roger federer","federer"], hint: "Swiss tennis legend, 8x Wimbledon champion" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Elvis_Presley_promoting_Jailhouse_Rock.jpg/300px-Elvis_Presley_promoting_Jailhouse_Rock.jpg", answers: ["elvis presley","elvis"], hint: "The King — of rock and roll!" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Pele_con_brasil.jpg/300px-Pele_con_brasil.jpg", answers: ["pele","pelé"], hint: "Brazilian soccer legend, 3x World Cup winner" }
    ]
  },
  animals: {
    label: "🐾 Animals",
    questions: [
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat_03.jpg/400px-Cat_03.jpg", answers: ["cat"], hint: "Common household pet, says meow" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Koala_climbing_tree.jpg/300px-Koala_climbing_tree.jpg", answers: ["koala"], hint: "Australian marsupial, loves eucalyptus" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Nile_crocodile_head.jpg/400px-Nile_crocodile_head.jpg", answers: ["crocodile","nile crocodile"], hint: "Large reptile found in Africa, ancient predator" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Eublepharis_macularius_2009_G1.jpg/400px-Eublepharis_macularius_2009_G1.jpg", answers: ["leopard gecko","gecko"], hint: "Small spotted lizard, popular exotic pet" },
      { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Tikal-oso_hormiguero.jpg/300px-Tikal-oso_hormiguero.jpg", answers: ["anteater","giant anteater"], hint: "Long snout, no teeth, eats thousands of ants daily" }
    ]
  }
};

function defaultState() {
  return {
    gameName: 'Ticcio Survivor', hostPass: 'ticcio', phase: 'active', round: 1,
    eliminationMode: 'individual', teams: [], players: [], votes: {},
    votingPool: [], immuneNames: [], currentChallenge: null, pictureChallenge: null,
    revealed: false, doubleElim: false, revealCount: 0, elimHistory: [], updatedAt: Date.now(),
  };
}

function verifyHost(req, res) {
  if (!gameState) gameState = defaultState();
  const pass = req.body.hostPass;
  if (pass !== gameState.hostPass && pass !== 'ticcio') {
    res.status(403).json({ error: 'Wrong host password' }); return false;
  }
  return true;
}

app.get('/state', (req, res) => {
  if (!gameState) gameState = defaultState();
  res.json(gameState);
});

app.post('/state', (req, res) => {
  if (!verifyHost(req, res)) return;
  gameState = { ...req.body.state, updatedAt: Date.now() };
  res.json({ ok: true });
});

app.get('/categories', (req, res) => {
  const cats = Object.entries(IMAGE_DB).map(([key, val]) => ({ key, label: val.label, count: val.questions.length }));
  res.json(cats);
});

app.post('/picture/start', (req, res) => {
  if (!verifyHost(req, res)) return;
  const { category, timeLimit, immunityType } = req.body;
  const cat = IMAGE_DB[category];
  if (!cat) return res.status(400).json({ error: 'Unknown category' });
  const shuffled = [...cat.questions].sort(() => Math.random() - 0.5).slice(0, 5);
  gameState.pictureChallenge = {
    category, categoryLabel: cat.label,
    questions: shuffled.map(q => ({ image: q.image, hint: q.hint, answers: q.answers })),
    playerAnswers: {}, scores: {}, overrides: {},
    timeLimit: timeLimit || 60, immunityType: immunityType || 'individual',
    startedAt: Date.now(), ended: false,
  };
  gameState.phase = 'challenge';
  gameState.currentChallenge = { name: cat.label + ' Challenge', type: 'picture' };
  gameState.immuneNames = [];
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
  if (gameState.votes[voterName]) return res.status(400).json({ error: 'Already voted' });
  const teamsActive = gameState.teams.length > 1;
  if (teamsActive) {
    // Team mode: only losing team can vote, can only vote for own team
    if (gameState.votingPool.length > 0 && !gameState.votingPool.includes(voterName))
      return res.status(403).json({ error: 'Your team won — no vote needed' });
    if (target && voter.team && target.team !== voter.team)
      return res.status(403).json({ error: 'You can only vote for your own team members' });
  }
  // Both modes: can't vote for immune player
  if (target && target.immune) return res.status(403).json({ error: 'That player has immunity' });
  // Can't vote for eliminated player
  if (target && target.eliminated) return res.status(403).json({ error: 'That player is already out' });
  gameState.votes[voterName] = targetName;
  gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

app.post('/voting/open', (req, res) => {
  if (!verifyHost(req, res)) return;
  gameState.phase = 'voting'; gameState.votes = {};
  gameState.players.forEach(p => { p.votes = 0; });
  gameState.revealed = false;
  gameState.doubleElim = req.body.doubleElim || false;
  gameState.revealCount = 0;
  const teamsActive = gameState.teams.length > 1;
  if (!teamsActive) {
    // Individual mode: all alive players can vote (immune player votes but can't be voted for)
    gameState.votingPool = [];  // empty = everyone can vote
  }
  // Team mode: votingPool already set by challenge/immunity endpoints
  gameState.updatedAt = Date.now();
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

  // Sort by votes descending
  const sorted = [...active].sort((a, b) => b.votes - a.votes);
  const revealNum = (gameState.revealCount || 0) + 1;

  let target;
  if (revealNum === 1) {
    // First reveal: most votes
    target = sorted[0];
  } else {
    // Second reveal: second most votes (already eliminated first)
    const stillAlive = gameState.players.filter(p => !p.eliminated);
    if (!stillAlive.length) return res.status(400).json({ error: 'No players left' });
    target = stillAlive.sort((a, b) => b.votes - a.votes)[0];
  }

  target.eliminated = true;
  gameState.elimHistory.push({ name: target.name, team: target.team, round: gameState.round, votes: target.votes, revealNum });
  gameState.revealCount = revealNum;
  gameState.revealed = true;

  // Done if single elim, or second reveal of double elim
  const isDone = !gameState.doubleElim || revealNum >= 2;
  if (isDone) gameState.phase = 'reveal'; // stays reveal until host advances

  gameState.updatedAt = Date.now();
  res.json({ ok: true, eliminated: target, revealNum, doubleElim: gameState.doubleElim, isDone });
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
  const { youtubeUrl, startSeconds, roundLabel, immunityType } = req.body;

  // Extract YouTube video ID from URL
  const match = youtubeUrl.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  const videoId = match ? match[1] : null;
  if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' });

  gameState.nttChallenge = {
    videoId,
    startSeconds: startSeconds || 0,
    roundLabel: roundLabel || 'Name That Tune',
    immunityType: immunityType || 'individual',
    playing: false,
    stopped: false,
    playerAnswers: {},   // { playerName: { artist, song } }
    scores: {},          // { playerName: 0|1|2 } (0=wrong, 1=song only, 2=both)
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
  res.json({ ok: true, videoId });
});

// Host: signal play/stop to all clients
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

// Player: submit guess
app.post('/ntt/answer', (req, res) => {
  const { playerName, artist, song } = req.body;
  const ntt = gameState.nttChallenge;
  if (!ntt) return res.status(400).json({ error: 'No NTT active' });
  if (ntt.playerAnswers[playerName]) return res.json({ ok: true, alreadyAnswered: true });
  ntt.playerAnswers[playerName] = { artist: artist||'', song: song||'' };
  ntt.scores[playerName] = 0; // default, host will score
  gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

// Host: score a player (0=wrong, 1=song only, 2=artist+song)
app.post('/ntt/score', (req, res) => {
  if (!verifyHost(req, res)) return;
  const { playerName, points } = req.body;
  const ntt = gameState.nttChallenge;
  if (!ntt) return res.status(400).json({ error: 'No NTT active' });
  ntt.scores[playerName] = points;
  gameState.updatedAt = Date.now();
  res.json({ ok: true });
});

// Host: end + award immunity
app.post('/ntt/end', (req, res) => {
  if (!verifyHost(req, res)) return;
  const ntt = gameState.nttChallenge;
  if (!ntt) return res.status(400).json({ error: 'No NTT active' });
  ntt.ended = true;
  const { scores, immunityType } = ntt;
  let immuneNames = [];
  if (immunityType === 'team') {
    const ts = {};
    gameState.teams.forEach(t => ts[t] = 0);
    gameState.players.filter(p => !p.eliminated).forEach(p => {
      if (p.team) ts[p.team] = (ts[p.team] || 0) + (scores[p.name] || 0);
    });
    const max = Math.max(...Object.values(ts));
    const winTeams = Object.entries(ts).filter(([,s]) => s === max).map(([t]) => t);
    immuneNames = gameState.players.filter(p => !p.eliminated && winTeams.includes(p.team)).map(p => p.name);
  } else {
    const max = Math.max(...Object.values(scores), 0);
    immuneNames = Object.entries(scores).filter(([,s]) => s === max).map(([n]) => n);
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
