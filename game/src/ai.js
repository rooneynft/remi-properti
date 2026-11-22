// ai.js — the opponent ("Lawan") for Remi Properti.
// It plays the same rummy game as the player: draw, meld, buy property, discard.
// Its choices are readable and counterable: it takes the discard when it
// completes a meld, buys the cheapest property of a group it already owns
// (or the cheapest it can afford), and throws away its highest deadwood card.

import { cardId, completesMeld, deadwood, findMelds, meldValue } from './cards.js';
import { allProperties, groupComplete } from './properties.js';

// Pick which pile to draw from: 'discard' when the top card completes a meld.
export function aiChooseDraw(state) {
  const top = state.discard[state.discard.length - 1];
  if (top && completesMeld(top, state.aiHand)) return 'discard';
  return 'deck';
}

// Meld everything the AI can, collect the cash, and describe what happened.
export function aiMeld(state) {
  const { melds, rest } = findMelds(state.aiHand);
  if (!melds.length) return null;
  let earned = 0;
  for (const m of melds) earned += meldValue(m);
  state.aiHand = rest;
  state.aiMelds.push(...melds);
  state.aiMoney += earned;
  const names = melds.map((m) => (m.kind === 'set' ? 'Set' : 'Run') + ' +' + '$' + meldValue(m));
  return 'Lawan membentuk ' + names.join(', ');
}

// Buy one property: prefer finishing a colour group, else the cheapest it can
// afford. Returns a description string or null when it buys nothing.
export function aiBuy(state) {
  const market = allProperties().filter((p) => state.market.includes(p.id));
  const affordable = market.filter((p) => p.price <= state.aiMoney);
  if (!affordable.length) return null;
  const finishing = affordable.filter((p) =>
    groupComplete(p.id, [...state.aiProps, p.id])
  );
  const pick = (finishing.length ? finishing : affordable).sort((a, b) => a.price - b.price)[0];
  state.aiMoney -= pick.price;
  state.aiProps.push(pick.id);
  state.market = state.market.filter((id) => id !== pick.id);
  return 'Lawan membeli ' + pick.name + ' (-$' + pick.price + ')';
}

// Discard the highest deadwood card (never a card that is part of a meld, since
// melds were already taken out of the hand).
export function aiDiscard(state) {
  if (!state.aiHand.length) return null;
  let worst = state.aiHand[0];
  for (const card of state.aiHand) {
    if (deadwood(card) > deadwood(worst)) worst = card;
  }
  state.aiHand = state.aiHand.filter((c) => cardId(c) !== cardId(worst));
  state.discard.push(worst);
  return worst;
}
