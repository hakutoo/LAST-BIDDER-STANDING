import { spinRoulette } from './roulet';

export function draftCardSelect(nop: number, turns: number): number[] {
  let cardsWeight: number[] = [];
  if (turns < 6) {
    cardsWeight = [35, 15, 5, 25, 10, 10];
  } else if (turns < 11) {
    cardsWeight = [20, 30, 10, 20, 10, 10];
  } else {
    cardsWeight = [5, 20, 25, 25, 15, 10];
  }

  const selectedCards: number[] = [];
  for (let i = 0; i < nop + 2; i++) {
    selectedCards.push(spinRoulette(cardsWeight));
  }
  return selectedCards;
}
