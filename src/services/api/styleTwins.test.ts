/**
 * Sanity check: Personalized PageRank returns expected scores for a tiny graph.
 * Run with: npx vitest run src/services/api/styleTwins.test.ts
 * (If vitest is not installed, this file still documents expected behavior.)
 */
import { describe, it, expect } from 'vitest';
import { personalizedPageRank, type AdjacencyList } from './styleTwins';

describe('personalizedPageRank', () => {
  it('concentrates mass at seed and spreads to neighbors', () => {
    const adj: AdjacencyList = new Map([
      ['u:a', { 'p:1': 1 }],
      ['u:b', { 'p:1': 1 }],
      ['p:1', { 'u:a': 0.5, 'u:b': 0.5 }],
    ]);
    const scores = personalizedPageRank(adj, 'u:a', 0.2, 50, 1e-6);
    expect(scores.get('u:a')).toBeGreaterThan(0);
    expect(scores.get('u:b')).toBeGreaterThan(0);
    expect(scores.get('p:1')).toBeGreaterThan(0);
    expect(scores.get('u:a')).toBeGreaterThan(scores.get('u:b')!);
  });

  it('restart keeps seed score positive', () => {
    const adj: AdjacencyList = new Map([
      ['u:seed', { 'u:other': 1 }],
      ['u:other', {}],
    ]);
    const scores = personalizedPageRank(adj, 'u:seed', 0.2, 30);
    expect(scores.get('u:seed')).toBeGreaterThan(0.1);
    expect(scores.get('u:other')).toBeGreaterThan(0);
  });
});
