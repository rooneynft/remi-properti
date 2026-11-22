// cards.js — the 52-card deck, shuffling and rummy meld detection for Remi Properti.
// A card is { suit: 'S'|'H'|'D'|'C', rank: 2..14 } where 11=J, 12=Q, 13=K, 14=A.
// A meld is either a SET (3-4 cards of the same rank) or a RUN (3+ cards of the
// same suit in consecutive rank order). Melds pay cash; see properties.js for money.

export const SUITS = ['S', 'H', 'D', 'C'];

export const SUIT_SYMBOL = { S: '\u2660', H: '\u2665', D: '\u2666', C: '\u2663' };
export const SUIT_NAME = { S: 'Sekop', H: 'Hati', D: 'Wajik', C: 'Keriting' };

export function rankLabel(rank) {
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  if (rank === 14) return 'A';
  return String(rank);
}

export function cardLabel(card) {
  return rankLabel(card.rank) + SUIT_SYMBOL[card.suit];
}

export function isRed(card) {
  return card.suit === 'H' || card.suit === 'D';
}

export function cardId(card) {
  return card.suit + card.rank;
}

// Small deterministic RNG (mulberry32) so staged screenshots are reproducible.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) deck.push({ suit, rank });
  }
  return deck;
}

export function shuffle(deck, rng) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}

export function sortHand(hand) {
  const suitOrder = { S: 0, H: 1, D: 2, C: 3 };
  return [...hand].sort((a, b) => suitOrder[a.suit] - suitOrder[b.suit] || a.rank - b.rank);
}

// Cash value of one meld. Sets pay $100, runs pay $150, +$50 per card past three.
export function meldValue(meld) {
  const base = meld.kind === 'set' ? 100 : 150;
  return base + Math.max(0, meld.cards.length - 3) * 50;
}

function findSets(hand, used) {
  const melds = [];
  const byRank = new Map();
  for (const card of hand) {
    if (used.has(cardId(card))) continue;
    if (!byRank.has(card.rank)) byRank.set(card.rank, []);
    byRank.get(card.rank).push(card);
  }
  for (const group of byRank.values()) {
    if (group.length >= 3) {
      const cards = group.slice(0, 4);
      melds.push({ kind: 'set', cards });
      for (const c of cards) used.add(cardId(c));
    }
  }
  return melds;
}

function findRuns(hand, used) {
  const melds = [];
  for (const suit of SUITS) {
    const cards = hand
      .filter((c) => c.suit === suit && !used.has(cardId(c)))
      .sort((a, b) => a.rank - b.rank);
    let run = [];
    const flush = () => {
      if (run.length >= 3) {
        melds.push({ kind: 'run', cards: [...run] });
        for (const c of run) used.add(cardId(c));
      }
      run = [];
    };
    for (const card of cards) {
      if (run.length && card.rank !== run[run.length - 1].rank + 1) flush();
      run.push(card);
    }
    flush();
  }
  return melds;
}

// Greedy meld finder: sets first, then runs from what is left. Returns melds
// (each { kind, cards }) and the cards that stay in the hand.
export function findMelds(hand) {
  const used = new Set();
  const melds = [...findSets(hand, used), ...findRuns(hand, used)];
  const rest = hand.filter((c) => !used.has(cardId(c)));
  return { melds, rest };
}

// Would this card complete a meld with the given hand? Used by the AI to
// decide whether the top discard is worth taking.
export function completesMeld(card, hand) {
  const withCard = [...hand, card];
  return findMelds(withCard).melds.length > findMelds(hand).melds.length;
}

// Deadwood value of a card: high cards hurt more when the deck runs out.
export function deadwood(card) {
  return Math.min(card.rank, 10);
}
