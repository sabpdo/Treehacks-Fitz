/**
 * Test script for Elo Ranking Algorithm
 * This simulates ranking 3 shirts against each other
 */

import {
  updateEloRatings,
  eloToScore,
  getInitialElo,
} from './src/lib/ranking';

// Simulate 3 shirts with initial Elo ratings
interface TestItem {
  id: string;
  name: string;
  elo: number;
  score: number;
}

// Initialize 3 shirts
const shirts: TestItem[] = [
  { id: '1', name: 'White T-Shirt', elo: getInitialElo(), score: 5.0 },
  { id: '2', name: 'Black Sweater', elo: getInitialElo(), score: 5.0 },
  { id: '3', name: 'Blue Button-Up', elo: getInitialElo(), score: 5.0 },
];

console.log('='.repeat(60));
console.log('ELO RANKING ALGORITHM TEST');
console.log('='.repeat(60));
console.log('\n📊 INITIAL STATE (All items start at 1500 Elo = 5.0 score)\n');
shirts.forEach((shirt) => {
  console.log(`${shirt.name.padEnd(20)} | Elo: ${shirt.elo.toFixed(0).padStart(4)} | Score: ${shirt.score.toFixed(1)}/10`);
});

// Test different comparison scenarios
console.log('\n' + '='.repeat(60));
console.log('SCENARIO 1: You prefer White T-Shirt over Black Sweater');
console.log('='.repeat(60));

const comparison1 = updateEloRatings(shirts[0].elo, shirts[1].elo);
shirts[0].elo = comparison1.newWinnerElo;
shirts[1].elo = comparison1.newLoserElo;
shirts[0].score = eloToScore(shirts[0].elo);
shirts[1].score = eloToScore(shirts[1].elo);

console.log(`\n${shirts[0].name} wins! (+${(comparison1.newWinnerElo - getInitialElo()).toFixed(0)} Elo)`);
console.log(`${shirts[1].name} loses! (${(comparison1.newLoserElo - getInitialElo()).toFixed(0)} Elo)`);
console.log('\nUpdated Rankings:\n');
const sorted1 = [...shirts].sort((a, b) => b.elo - a.elo);
sorted1.forEach((shirt, i) => {
  console.log(`#${i + 1} ${shirt.name.padEnd(20)} | Elo: ${shirt.elo.toFixed(0).padStart(4)} | Score: ${shirt.score.toFixed(1)}/10`);
});

console.log('\n' + '='.repeat(60));
console.log('SCENARIO 2: You prefer White T-Shirt over Blue Button-Up');
console.log('='.repeat(60));

const comparison2 = updateEloRatings(shirts[0].elo, shirts[2].elo);
shirts[0].elo = comparison2.newWinnerElo;
shirts[2].elo = comparison2.newLoserElo;
shirts[0].score = eloToScore(shirts[0].elo);
shirts[2].score = eloToScore(shirts[2].elo);

console.log(`\n${shirts[0].name} wins again! (+${(comparison2.newWinnerElo - comparison1.newWinnerElo).toFixed(0)} Elo)`);
console.log(`${shirts[2].name} loses! (${(comparison2.newLoserElo - getInitialElo()).toFixed(0)} Elo)`);
console.log('\nUpdated Rankings:\n');
const sorted2 = [...shirts].sort((a, b) => b.elo - a.elo);
sorted2.forEach((shirt, i) => {
  console.log(`#${i + 1} ${shirt.name.padEnd(20)} | Elo: ${shirt.elo.toFixed(0).padStart(4)} | Score: ${shirt.score.toFixed(1)}/10`);
});

console.log('\n' + '='.repeat(60));
console.log('SCENARIO 3: You prefer Blue Button-Up over Black Sweater');
console.log('='.repeat(60));

const comparison3 = updateEloRatings(shirts[2].elo, shirts[1].elo);
shirts[2].elo = comparison3.newWinnerElo;
shirts[1].elo = comparison3.newLoserElo;
shirts[2].score = eloToScore(shirts[2].elo);
shirts[1].score = eloToScore(shirts[1].elo);

console.log(`\n${shirts[2].name} wins! (+${(comparison3.newWinnerElo - comparison2.newLoserElo).toFixed(0)} Elo)`);
console.log(`${shirts[1].name} loses again! (${(comparison3.newLoserElo - comparison1.newLoserElo).toFixed(0)} Elo)`);
console.log('\n📊 FINAL RANKINGS:\n');
const finalSorted = [...shirts].sort((a, b) => b.elo - a.elo);
finalSorted.forEach((shirt, i) => {
  const change = shirt.elo - getInitialElo();
  const changeStr = change > 0 ? `+${change.toFixed(0)}` : change.toFixed(0);
  console.log(`#${i + 1} ${shirt.name.padEnd(20)} | Elo: ${shirt.elo.toFixed(0).padStart(4)} (${changeStr}) | Score: ${shirt.score.toFixed(1)}/10`);
});

console.log('\n' + '='.repeat(60));
console.log('KEY INSIGHTS:');
console.log('='.repeat(60));
console.log(`
✓ All items started at 1500 Elo (5.0/10 score)
✓ Each comparison updates both items' Elo ratings
✓ The K-factor (32) determines how much ratings change
✓ Rankings emerge from head-to-head comparisons
✓ Elo is converted to 0-10 scale for display

The algorithm ensures:
- Winning against higher-rated items gives more Elo points
- Losing to lower-rated items costs more Elo points
- Rankings converge after enough comparisons
`);

console.log('='.repeat(60));

// Show different choice outcomes
console.log('\nALTERNATIVE SCENARIO: If you made DIFFERENT choices\n');
const altShirts: TestItem[] = [
  { id: '1', name: 'White T-Shirt', elo: getInitialElo(), score: 5.0 },
  { id: '2', name: 'Black Sweater', elo: getInitialElo(), score: 5.0 },
  { id: '3', name: 'Blue Button-Up', elo: getInitialElo(), score: 5.0 },
];

// Black Sweater beats White T-Shirt
const alt1 = updateEloRatings(altShirts[1].elo, altShirts[0].elo);
altShirts[1].elo = alt1.newWinnerElo;
altShirts[0].elo = alt1.newLoserElo;

// Blue Button-Up beats White T-Shirt
const alt2 = updateEloRatings(altShirts[2].elo, altShirts[0].elo);
altShirts[2].elo = alt2.newWinnerElo;
altShirts[0].elo = alt2.newLoserElo;

// Black Sweater beats Blue Button-Up
const alt3 = updateEloRatings(altShirts[1].elo, altShirts[2].elo);
altShirts[1].elo = alt3.newWinnerElo;
altShirts[2].elo = alt3.newLoserElo;

altShirts.forEach(s => s.score = eloToScore(s.elo));

console.log('If you chose: Black Sweater > White, Blue > White, Black > Blue\n');
const altSorted = [...altShirts].sort((a, b) => b.elo - a.elo);
altSorted.forEach((shirt, i) => {
  const change = shirt.elo - getInitialElo();
  const changeStr = change > 0 ? `+${change.toFixed(0)}` : change.toFixed(0);
  console.log(`#${i + 1} ${shirt.name.padEnd(20)} | Elo: ${shirt.elo.toFixed(0).padStart(4)} (${changeStr}) | Score: ${shirt.score.toFixed(1)}/10`);
});

console.log('\n' + '='.repeat(60));
console.log('✨ YOUR TURN! ✨');
console.log('='.repeat(60));
console.log(`
Go to http://localhost:5175/ and:
1. Log in
2. Go to Closet tab
3. Add a new item
4. Make comparisons when prompted
5. See your personalized rankings!
`);