// render.js — every pixel of Remi Properti, drawn on one 1280x720 canvas.
// Screens: title, table (player hand below, opponent hand above, deck and
// discard in the middle, property market along the bottom), win, lose.
// render(state) draws the current screen and returns the clickable hit areas
// [{ id, x, y, w, h }] for main.js to test mouse clicks against.

import { SUIT_SYMBOL, cardLabel, isRed, rankLabel } from './cards.js';
import { allProperties } from './properties.js';

export const W = 1280;
export const H = 720;

const FELT = '#1d6b3c';
const FELT_DARK = '#155231';
const GOLD = '#e8b93c';
const INK = '#20242a';
const PANEL = 'rgba(0,0,0,0.28)';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, align = 'left', bold = false) {
  ctx.fillStyle = color;
  ctx.font = (bold ? 'bold ' : '') + size + 'px Verdana, sans-serif';
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}

function wrapName(name) {
  const words = name.split(' ');
  if (words.length <= 1) return [name];
  if (name.length <= 11) return [name];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

export function drawCard(ctx, card, x, y, w, h, faceUp = true) {
  rr(ctx, x, y, w, h, 8);
  if (!faceUp) {
    ctx.fillStyle = '#0f5f7a';
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.stroke();
    rr(ctx, x + 6, y + 6, w - 12, h - 12, 5);
    ctx.strokeStyle = 'rgba(232,185,60,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
    text(ctx, '\u2666', x + w / 2, y + h / 2 + 12, 30, GOLD, 'center');
    return;
  }
  ctx.fillStyle = '#fdfdf8';
  ctx.fill();
  ctx.strokeStyle = '#b9b3a4';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const red = isRed(card);
  const color = red ? '#c22e2e' : INK;
  const rank = rankLabel(card.rank);
  const suit = SUIT_SYMBOL[card.suit];
  text(ctx, rank, x + 8, y + 22, 20, color, 'left', true);
  text(ctx, suit, x + 8, y + 44, 18, color, 'left');
  text(ctx, suit, x + w / 2, y + h / 2 + 16, 34, color, 'center');
  text(ctx, rank, x + w - 8, y + h - 10, 20, color, 'right', true);
}

function drawButton(ctx, hit, label, enabled) {
  rr(ctx, hit.x, hit.y, hit.w, hit.h, 8);
  ctx.fillStyle = enabled ? GOLD : '#5a5a52';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, label, hit.x + hit.w / 2, hit.y + hit.h / 2 + 6, 16, enabled ? INK : '#d8d8d0', 'center', true);
}

function drawProperty(ctx, prop, x, y, w, h, owner, affordable, hitId, hits) {
  rr(ctx, x, y, w, h, 8);
  ctx.fillStyle = owner === 'you' ? '#fff8dd' : owner === 'ai' ? '#e6eef7' : '#fdfdf8';
  ctx.fill();
  ctx.strokeStyle = owner ? prop.color : '#b9b3a4';
  ctx.lineWidth = owner ? 3 : 1.5;
  ctx.stroke();
  ctx.fillStyle = prop.color;
  ctx.fillRect(x + 1, y + 1, w - 2, 16);
  const lines = wrapName(prop.name);
  text(ctx, lines[0], x + w / 2, y + 36, 13, INK, 'center', true);
  if (lines[1]) text(ctx, lines[1], x + w / 2, y + 52, 13, INK, 'center', true);
  text(ctx, '$' + prop.price, x + w / 2, y + h - 20, 15, affordable ? '#1e6b34' : '#8a8a80', 'center', true);
  const tag = owner === 'you' ? 'MILIKMU' : owner === 'ai' ? 'LAWAN' : '';
  if (tag) text(ctx, tag, x + w / 2, y + h - 7, 10, prop.dark, 'center', true);
  if (hitId) hits.push({ id: hitId, x, y, w, h });
}

function drawMoneyBar(ctx, state) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, W, 46);
  text(ctx, 'REMI PROPERTI', 18, 30, 20, GOLD, 'left', true);
  text(ctx, 'Ronde ' + state.round + '  |  Target $1000', 300, 30, 15, '#ffffff', 'left');
  text(ctx, 'KAMU  $' + state.playerMoney, 700, 30, 18, '#ffffff', 'left', true);
  text(ctx, 'LAWAN  $' + state.aiMoney, 980, 30, 18, '#ffffff', 'left', true);
}

function drawMeldRow(ctx, melds, x, y, scale) {
  let cx = x;
  for (const meld of melds) {
    for (const card of meld.cards) {
      drawCard(ctx, card, cx, y, 46 * scale, 64 * scale);
      cx += 34 * scale;
    }
    cx += 14 * scale;
  }
  return cx;
}

function drawTable(ctx, state, hits) {
  ctx.fillStyle = FELT;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = FELT_DARK;
  ctx.lineWidth = 10;
  rr(ctx, 14, 56, W - 28, H - 70, 26);
  ctx.stroke();
  drawMoneyBar(ctx, state);

  // Opponent hand (face down) across the top.
  text(ctx, 'LAWAN  (AI)  —  ' + state.aiHand.length + ' kartu', 24, 82, 14, '#cfe8d4', 'left', true);
  const aiW = 54;
  const aiTotal = state.aiHand.length * (aiW + 6);
  let ax = (W - aiTotal) / 2;
  for (const card of state.aiHand) {
    drawCard(ctx, card, ax, 92, aiW, 76, false);
    ax += aiW + 6;
  }
  // Opponent melds + properties, top right.
  text(ctx, 'Meld lawan:', 900, 82, 13, '#cfe8d4', 'left', true);
  drawMeldRow(ctx, state.aiMelds, 900, 90, 0.62);
  text(ctx, 'Properti lawan: ' + (state.aiProps.length ? state.aiProps.map((id) => allProperties().find((p) => p.id === id).name).join(', ') : '—'), 900, 168, 13, '#cfe8d4', 'left');

  // Deck and discard piles, middle left.
  text(ctx, 'DECK (' + state.deck.length + ')', 60, 210, 13, '#cfe8d4', 'left', true);
  if (state.deck.length) {
    drawCard(ctx, state.deck[state.deck.length - 1], 60, 220, 78, 108, false);
    hits.push({ id: 'draw-deck', x: 60, y: 220, w: 78, h: 108 });
  } else {
    rr(ctx, 60, 220, 78, 108, 8);
    ctx.strokeStyle = '#cfe8d4';
    ctx.stroke();
    text(ctx, 'Habis', 99, 278, 13, '#cfe8d4', 'center');
  }
  text(ctx, 'BUANGAN', 170, 210, 13, '#cfe8d4', 'left', true);
  const top = state.discard[state.discard.length - 1];
  if (top) {
    drawCard(ctx, top, 170, 220, 78, 108, true);
    hits.push({ id: 'draw-discard', x: 170, y: 220, w: 78, h: 108 });
  } else {
    rr(ctx, 170, 220, 78, 108, 8);
    ctx.strokeStyle = '#cfe8d4';
    ctx.stroke();
  }

  // Action buttons under the piles.
  const canDraw = state.phase === 'draw';
  const canAct = state.phase === 'act';
  drawButton(ctx, { x: 60, y: 344, w: 188, h: 38 }, 'Ambil Deck  (D)', canDraw);
  if (canDraw) hits.push({ id: 'draw-deck', x: 60, y: 344, w: 188, h: 38 });
  drawButton(ctx, { x: 60, y: 390, w: 188, h: 38 }, 'Ambil Buangan  (B)', canDraw && !!top);
  if (canDraw && top) hits.push({ id: 'draw-discard', x: 60, y: 390, w: 188, h: 38 });
  drawButton(ctx, { x: 60, y: 436, w: 188, h: 38 }, 'Bentuk Meld  (M)', canAct);
  if (canAct) hits.push({ id: 'meld', x: 60, y: 436, w: 188, h: 38 });

  // Player melds, centre.
  text(ctx, 'Meld kamu (set = $100, run = $150):', 300, 210, 13, '#cfe8d4', 'left', true);
  drawMeldRow(ctx, state.playerMelds, 300, 220, 0.85);
  text(ctx, 'Properti kamu: ' + (state.playerProps.length ? state.playerProps.map((id) => allProperties().find((p) => p.id === id).name).join(', ') : '—'), 300, 300, 13, '#cfe8d4', 'left');

  // Message + hint, centre right.
  ctx.fillStyle = PANEL;
  rr(ctx, 300, 330, 660, 78, 10);
  ctx.fill();
  text(ctx, state.message, 316, 362, 17, '#ffffff', 'left', true);
  text(ctx, state.hint, 316, 390, 14, '#d8ecd9', 'left');
  for (let i = 0; i < Math.min(3, state.log.length); i++) {
    text(ctx, state.log[state.log.length - 1 - i], 1000, 220 + i * 20, 13, '#d8ecd9', 'left');
  }

  // Property market, one row of twelve.
  text(ctx, 'PASAR PROPERTI — klik properti untuk membeli  •  set warna lengkap = sewa $60/ronde dari lawan', 24, 500, 14, GOLD, 'left', true);
  const props = allProperties();
  const pw = 96;
  const gap = 6;
  const startX = (W - (props.length * pw + (props.length - 1) * gap)) / 2;
  props.forEach((prop, i) => {
    const px = startX + i * (pw + gap);
    const owner = state.playerProps.includes(prop.id) ? 'you' : state.aiProps.includes(prop.id) ? 'ai' : null;
    const inMarket = state.market.includes(prop.id);
    if (!inMarket && !owner) return;
    const affordable = canAct && !owner && state.playerMoney >= prop.price;
    drawProperty(ctx, prop, px, 508, pw, 88, owner, affordable, !owner && canAct ? 'buy:' + prop.id : null, hits);
  });

  // Player hand across the bottom.
  text(ctx, 'TANGANMU  —  ' + state.playerHand.length + ' kartu  •  klik kartu untuk membuang (setelah ambil)', 24, 618, 14, '#cfe8d4', 'left', true);
  const cw = 62;
  const overlap = state.playerHand.length > 1 ? Math.min(68, (W - 120) / state.playerHand.length) : 68;
  const handW = cw + (state.playerHand.length - 1) * overlap;
  let hx = (W - handW) / 2;
  state.playerHand.forEach((card, i) => {
    const selected = state.selected === i;
    drawCard(ctx, card, hx, selected ? 614 : 626, cw, 88, true);
    if (canAct) hits.push({ id: 'discard:' + i, x: hx, y: 614, w: cw, h: 100 });
    hx += overlap;
  });
}

function drawTitle(ctx, hits) {
  ctx.fillStyle = '#123f27';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = FELT;
  rr(ctx, 30, 30, W - 60, H - 60, 30);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.stroke();
  // A fan of sample cards across the top.
  const sample = [
    { suit: 'H', rank: 14 }, { suit: 'S', rank: 13 }, { suit: 'D', rank: 12 },
    { suit: 'C', rank: 11 }, { suit: 'H', rank: 10 },
  ];
  sample.forEach((card, i) => {
    drawCard(ctx, card, 433 + i * 84, 110, 78, 108);
  });
  text(ctx, 'REMI PROPERTI', W / 2, 300, 64, GOLD, 'center', true);
  text(ctx, 'Remi + Properti: kumpulkan set & run, beli properti, tagih sewa!', W / 2, 350, 22, '#ffffff', 'center');
  text(ctx, 'Set (3 kartu sama) = $100   •   Run (3 berurutan) = $150   •   Set warna lengkap = sewa $60/ronde', W / 2, 392, 17, '#d8ecd9', 'center');
  text(ctx, 'Pertama sampai $1000 menang — atau bikin lawan bangkrut.', W / 2, 420, 17, '#d8ecd9', 'center');
  rr(ctx, W / 2 - 190, 470, 380, 62, 12);
  ctx.fillStyle = GOLD;
  ctx.fill();
  text(ctx, '▶  MULAI MAIN', W / 2, 510, 24, INK, 'center', true);
  hits.push({ id: 'start', x: W / 2 - 190, y: 470, w: 380, h: 62 });
  text(ctx, 'Klik tombol atau tekan Enter  •  Mouse + keyboard  •  Offline', W / 2, 580, 15, '#9fc7a8', 'center');
  text(ctx, 'Warung Kopi • Pasar Pagi • Villa Pantai • Hotel Melati — properti asli Indonesia', W / 2, 612, 14, '#9fc7a8', 'center');
}

function drawEnd(ctx, state, won, hits) {
  drawTable(ctx, state, []);
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, 0, W, H);
  rr(ctx, W / 2 - 360, 170, 720, 380, 20);
  ctx.fillStyle = won ? '#fff3c4' : '#f3d9d9';
  ctx.fill();
  ctx.strokeStyle = won ? GOLD : '#c22e2e';
  ctx.lineWidth = 4;
  ctx.stroke();
  text(ctx, won ? 'MENANG!' : 'KALAH', W / 2, 280, 64, won ? '#8a6a12' : '#a11f1f', 'center', true);
  text(ctx, won ? state.winText : state.loseText, W / 2, 330, 20, INK, 'center');
  text(ctx, 'Kamu $' + state.playerMoney + '   •   Lawan $' + state.aiMoney, W / 2, 380, 22, INK, 'center', true);
  text(ctx, 'Properti kamu: ' + state.playerProps.length + '   •   Properti lawan: ' + state.aiProps.length, W / 2, 414, 16, '#555550', 'center');
  rr(ctx, W / 2 - 150, 450, 300, 54, 10);
  ctx.fillStyle = GOLD;
  ctx.fill();
  text(ctx, 'MAIN LAGI  (Enter)', W / 2, 486, 20, INK, 'center', true);
  hits.push({ id: 'restart', x: W / 2 - 150, y: 450, w: 300, h: 54 });
}

export function render(ctx, state) {
  const hits = [];
  if (state.screen === 'title') drawTitle(ctx, hits);
  else if (state.screen === 'win') drawEnd(ctx, state, true, hits);
  else if (state.screen === 'lose') drawEnd(ctx, state, false, hits);
  else drawTable(ctx, state, hits);
  return hits;
}
