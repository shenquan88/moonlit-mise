// The menu: ingredients, their one correct prep, and the dishes that combine them. A recipe is
// a set of ingredients (any order) rather than a fixed sequence, so the player plans a route
// through the kitchen instead of memorising a chain. Green items are chopped on the board, and
// proteins, starches and the egg are seared or cooked on the stove.

export const PREP_CHOP = 'chop';
export const PREP_COOK = 'cook';

export const INGREDIENTS = {
  salmon: { name: 'Salmon', prep: PREP_COOK },
  rice: { name: 'Rice', prep: PREP_COOK },
  nori: { name: 'Nori', prep: PREP_CHOP },
  beef: { name: 'Beef', prep: PREP_COOK },
  noodles: { name: 'Noodles', prep: PREP_COOK },
  greens: { name: 'Greens', prep: PREP_CHOP },
  tomato: { name: 'Tomato', prep: PREP_CHOP },
  egg: { name: 'Egg', prep: PREP_COOK },
};

export const INGREDIENT_IDS = Object.keys(INGREDIENTS);

/** A recipe needs each ingredient, in any order; patience is base seconds to serve it. */
export const RECIPES = {
  salmonBowl: { name: 'Moon Salmon Bowl', zh: '月港三文鱼饭', price: 42, patience: 36, ingredients: ['salmon', 'rice', 'nori'] },
  beefNoodle: { name: 'Harbor Beef Noodle', zh: '港式牛肉面', price: 46, patience: 33, ingredients: ['beef', 'noodles', 'greens'] },
  tomatoEgg: { name: 'Jade Tomato Egg Rice', zh: '翡翠番茄蛋饭', price: 38, patience: 31, ingredients: ['tomato', 'egg', 'rice'] },
  gardenRamen: { name: 'Garden Night Ramen', zh: '夜花园拉面', price: 50, patience: 37, ingredients: ['noodles', 'egg', 'nori', 'greens'] },
};

export const RECIPE_IDS = Object.keys(RECIPES);

/** The one station a prep belongs to, used for hit-testing and the player's guidance. */
export function prepStation(prep) {
  return prep === PREP_CHOP ? 'board' : 'stove';
}
