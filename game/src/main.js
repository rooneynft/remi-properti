// main.js — Remi Properti: state machine, input, AI turns and screenshot staging.
// One turn: draw a card (deck or discard), then meld sets/runs for cash, buy a
// property from the market, and discard one card. Rent is collected at the
// start of a turn from every completed colour group and paid by the opponent.
// First to $1000 wins; dropping below $0 means bankruptcy and defeat.

import { buildDeck, cardId, cardLabel, findMelds, makeRng, meldValue, shuffle, sortHand } from './cards.js';
import { RENT_PER_SET, START_MONEY, WIN_MONEY, allProperties, completedGroups, propertyById, rentDue } from './properties.js';
import { aiBuy, aiChooseDraw, aiDiscard, aiMeld } from './ai.js';
import { H, W, render } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

let state = null;
let hits = [];
let aiTimer = null;

function log(line) {
  state.log.push(line);
  if (state.log.length > 6) state.log.shift();
}

function newGame(seed) {
  const rng = makeRng(seed || 20261123);
  const deck = shuffle(buildDeck(), rng);
  const playerHand = sortHand(deck.splice(0, 7));
  const aiHand = deck.splice(0, 7);
  const discard = [deck.pop()];
  state = {
    screen: 'play',
    phase: 'draw',
    round: 1,
    deck,
    discard,
    playerHand,
    aiHand,
    playerMelds: [],
    aiMelds: [],
    market: allProperties().map((p) => p.id),
    playerProps: [],
    aiProps: [],
    playerMoney: START_MONEY,
    aiMoney: START_MONEY,
    message: 'Giliranmu: ambil satu kartu dari deck atau buangan.',
    hint: 'Tombol: D = deck, B = buangan, M = bentuk meld, klik kartu = buang.',
    log: ['Game dimulai. Kamu $' + START_MONEY + ', lawan $' + START_MONEY + '.'],
    selected: -1,
    winText: '',
    loseText: '',
  };
  return state;
}

function endGame(won, reason) {
  state.screen = won ? 'win' : 'lose';
  state.phase = 'over';
  if (won) state.winText = reason;
  else state.loseText = reason;
  state.message = won ? 'Kamu menang!' : 'Kamu kalah.';
  announce();
}

// Returns 'win' | 'lose' | null after any money change.
function checkEnd() {
  if (state.playerMoney >= WIN_MONEY) {
    endGame(true, 'Kamu mencapai $' + WIN_MONEY + ' duluan — juara meja!');
    return 'win';
  }
  if (state.aiMoney >= WIN_MONEY) {
    endGame(false, 'Lawan mencapai $' + WIN_MONEY + ' duluan.');
    return 'lose';
  }
  if (state.playerMoney < 0) {
    endGame(false, 'Kamu bangkrut karena sewa properti lawan.');
    return 'lose';
  }
  if (state.aiMoney < 0) {
    endGame(true, 'Lawan bangkrut karena sewa propertimu!');
    return 'win';
  }
  return null;
}

// Rent for `owner` ('you' | 'ai') at the start of their turn, paid by the other side.
function collectRent(owner) {
  const owned = owner === 'you' ? state.playerProps : state.aiProps;
  const due = rentDue(owned);
  if (!due) return;
  const groups = completedGroups(owned).map((g) => g.name).join(', ');
  if (owner === 'you') {
    state.aiMoney -= due;
    state.playerMoney += due;
    log('Sewa ' + groups + ': lawan bayar kamu $' + due);
  } else {
    state.playerMoney -= due;
    state.aiMoney += due;
    log('Sewa ' + groups + ': kamu bayar lawan $' + due);
  }
  state.message = 'Sewa $' + due + ' dibayar (' + groups + ').';
}

function reshuffleIfNeeded() {
  if (state.deck.length) return;
  const top = state.discard.pop();
  state.deck = shuffle(state.discard.splice(0), makeRng(Date.now() % 100000));
  state.discard = [top];
  log('Deck habis — buangan dikocok jadi deck baru.');
}

function playerDraw(from) {
  if (state.screen !== 'play' || state.phase !== 'draw') return;
  reshuffleIfNeeded();
  let card;
  if (from === 'discard') {
    card = state.discard.pop();
    state.playerHand = sortHand([...state.playerHand, card]);
    log('Kamu ambil ' + cardLabel(card) + ' dari buangan.');
  } else {
    card = state.deck.pop();
    state.playerHand = sortHand([...state.playerHand, card]);
    log('Kamu ambil kartu dari deck.');
  }
  state.phase = 'act';
  state.message = 'Kartu diambil. Bentuk meld, beli properti, lalu buang 1 kartu.';
  announce();
}

function playerMeld() {
  if (state.screen !== 'play' || state.phase !== 'act') return;
  const { melds, rest } = findMelds(state.playerHand);
  if (!melds.length) {
    state.message = 'Belum ada set/run di tanganmu.';
    return;
  }
  let earned = 0;
  for (const m of melds) earned += meldValue(m);
  state.playerHand = rest;
  state.playerMelds.push(...melds);
  state.playerMoney += earned;
  const names = melds.map((m) => (m.kind === 'set' ? 'Set' : 'Run') + ' +$' + meldValue(m));
  log('Kamu membentuk ' + names.join(', ') + ' = +$' + earned);
  state.message = 'Meld jadi! +' + '$' + earned + '. Sisa tangan: ' + state.playerHand.length + ' kartu.';
  if (checkEnd()) return;
  announce();
}

function playerBuy(propId) {
  if (state.screen !== 'play' || state.phase !== 'act') return;
  const prop = propertyById(propId);
  if (!prop || !state.market.includes(propId)) return;
  if (state.playerMoney < prop.price) {
    state.message = 'Uangmu kurang untuk ' + prop.name + ' ($' + prop.price + ').';
    return;
  }
  state.playerMoney -= prop.price;
  state.playerProps.push(propId);
  state.market = state.market.filter((id) => id !== propId);
  log('Kamu membeli ' + prop.name + ' (-$' + prop.price + ')');
  const done = completedGroups(state.playerProps);
  state.message = done.length
    ? prop.name + ' dibeli! Set ' + done[done.length - 1].name + ' lengkap — sewa $' + RENT_PER_SET + '/ronde.'
    : prop.name + ' dibeli seharga $' + prop.price + '.';
  announce();
}

function playerDiscard(index) {
  if (state.screen !== 'play' || state.phase !== 'act') return;
  if (index < 0 || index >= state.playerHand.length) return;
  const card = state.playerHand[index];
  state.playerHand = state.playerHand.filter((_, i) => i !== index);
  state.discard.push(card);
  state.selected = -1;
  log('Kamu buang ' + cardLabel(card) + '.');
  state.phase = 'ai';
  state.message = 'Giliran lawan...';
  announce();
  runAiTurn();
}

function runAiTurn() {
  clearTimeout(aiTimer);
  const steps = [];
  steps.push(() => {
    if (state.screen !== 'play') return;
    collectRent('ai');
    if (checkEnd()) return;
  });
  steps.push(() => {
    if (state.screen !== 'play') return;
    reshuffleIfNeeded();
    const from = aiChooseDraw(state);
    const card = from === 'discard' ? state.discard.pop() : state.deck.pop();
    state.aiHand.push(card);
    log('Lawan ambil kartu dari ' + (from === 'discard' ? 'buangan' : 'deck') + '.');
  });
  steps.push(() => {
    if (state.screen !== 'play') return;
    const msg = aiMeld(state);
    if (msg) log(msg);
    if (checkEnd()) return;
  });
  steps.push(() => {
    if (state.screen !== 'play') return;
    const msg = aiBuy(state);
    if (msg) log(msg);
  });
  steps.push(() => {
    if (state.screen !== 'play') return;
    const card = aiDiscard(state);
    if (card) log('Lawan buang 1 kartu.');
    state.round += 1;
    state.phase = 'draw';
    collectRent('you');
    if (checkEnd()) return;
    state.message = 'Giliranmu (ronde ' + state.round + '): ambil satu kartu.';
    state.hint = 'Tombol: D = deck, B = buangan, M = bentuk meld, klik kartu = buang.';
    announce();
  });
  let i = 0;
  const next = () => {
    if (i >= steps.length) return;
    steps[i++]();
    if (state.screen === 'play' && state.phase === 'ai') aiTimer = setTimeout(next, 650);
  };
  aiTimer = setTimeout(next, 650);
}

// ---- Screenshot staging: ?shot=start|play|win|lose&seed=1 -----------------
function card(suit, rank) {
  return { suit, rank };
}

function stageShot(shot) {
  if (shot === 'start') {
    state = {
      screen: 'title', phase: 'draw', round: 1, deck: [], discard: [],
      playerHand: [], aiHand: [], playerMelds: [], aiMelds: [],
      market: [], playerProps: [], aiProps: [],
      playerMoney: START_MONEY, aiMoney: START_MONEY,
      message: '', hint: '', log: [], selected: -1, winText: '', loseText: '',
    };
    return;
  }
  newGame(1);
  // A lively mid-game: melds already on the table, properties owned, cash visible.
  state.playerMelds = [
    { kind: 'set', cards: [card('H', 7), card('D', 7), card('C', 7)] },
    { kind: 'run', cards: [card('H', 9), card('H', 10), card('H', 11)] },
  ];
  state.aiMelds = [{ kind: 'set', cards: [card('S', 12), card('H', 12), card('D', 12)] }];
  state.playerHand = sortHand([
    card('S', 14), card('H', 5), card('D', 9), card('C', 2), card('S', 8), card('H', 3), card('D', 13),
  ]);
  state.aiHand = [card('S', 2), card('H', 6), card('D', 4), card('C', 9), card('S', 10), card('H', 13), card('D', 5)];
  state.discard = [card('C', 6), card('H', 5)];
  state.deck = state.deck.slice(0, 30);
  state.playerProps = ['warung-kopi', 'toko-kelontong'];
  state.aiProps = ['villa-pantai'];
  state.market = allProperties().map((p) => p.id).filter((id) => !state.playerProps.includes(id) && !state.aiProps.includes(id));
  state.playerMoney = 420;
  state.aiMoney = 380;
  state.round = 3;
  state.phase = 'act';
  state.message = 'Giliranmu: bentuk meld, beli properti, lalu buang 1 kartu.';
  state.log = [
    'Kamu membentuk Set +$100, Run +$150.',
    'Kamu membeli Warung Kopi (-$120).',
    'Lawan membeli Villa Pantai (-$230).',
  ];
  if (shot === 'win') {
    state.playerMoney = 1020;
    state.screen = 'win';
    state.phase = 'over';
    state.winText = 'Kamu mencapai $1000 duluan — juara meja!';
  } else if (shot === 'lose') {
    state.aiMoney = 1000;
    state.playerMoney = 40;
    state.screen = 'lose';
    state.phase = 'over';
    state.loseText = 'Lawan mencapai $1000 duluan.';
  } else {
    state.screen = 'play';
  }
}

function announce() {
  if (!statusEl) return;
  statusEl.textContent = state.message + ' Kamu $' + state.playerMoney + ', lawan $' + state.aiMoney + '.';
}

function handleAction(id) {
  if (!state) return;
  if (id === 'start' || id === 'restart') {
    clearTimeout(aiTimer);
    newGame(Date.now() % 100000);
    announce();
    return;
  }
  if (id === 'draw-deck') playerDraw('deck');
  else if (id === 'draw-discard') playerDraw('discard');
  else if (id === 'meld') playerMeld();
  else if (id.startsWith('buy:')) playerBuy(id.slice(4));
  else if (id.startsWith('discard:')) playerDiscard(Number(id.slice(8)));
}

canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (W / rect.width);
  const y = (event.clientY - rect.top) * (H / rect.height);
  for (let i = hits.length - 1; i >= 0; i--) {
    const h = hits[i];
    if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) {
      handleAction(h.id);
      return;
    }
  }
});

document.addEventListener('keydown', (event) => {
  if (!state) return;
  const key = event.key.toLowerCase();
  if (state.screen === 'title' && (key === 'enter' || key === ' ')) handleAction('start');
  else if ((state.screen === 'win' || state.screen === 'lose') && key === 'enter') handleAction('restart');
  else if (state.screen === 'play') {
    if (key === 'd') playerDraw('deck');
    else if (key === 'b') playerDraw('discard');
    else if (key === 'm') playerMeld();
    else if (key === 'escape') state.screen = 'title';
  }
});

function frame() {
  if (state) hits = render(ctx, state);
  requestAnimationFrame(frame);
}

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) stageShot(shot);
else {
  state = {
    screen: 'title', phase: 'draw', round: 1, deck: [], discard: [],
    playerHand: [], aiHand: [], playerMelds: [], aiMelds: [],
    market: [], playerProps: [], aiProps: [],
    playerMoney: START_MONEY, aiMoney: START_MONEY,
    message: '', hint: '', log: [], selected: -1, winText: '', loseText: '',
  };
}
announce();
frame();
