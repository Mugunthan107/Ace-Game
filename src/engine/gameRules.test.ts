import { applyCardPlay, finalizeTrickResolution } from './gameRules';
import { Card, emptyGameState, GameState, PlayerRow } from '../types';

function createCard(suit: 'spades' | 'hearts' | 'clubs' | 'diamonds', rank: any): Card {
  return { id: `${suit}-${rank}`, suit, rank };
}

function createPlayer(id: string, name: string, seatOrder: number, cards: Card[]): PlayerRow {
  return {
    id,
    room_id: 'room-1',
    name,
    is_host: seatOrder === 0,
    cards,
    escaped: false,
    escape_rank: null,
    ready: true,
    avatar_color: '#3b82f6',
    joined_at: new Date().toISOString(),
    seat_order: seatOrder,
    connected: true,
  };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('--- Running Game Rules Tests ---');

// Test 1: User's exact scenario - Clean round
// p1 has 5 cards, p2 has 1 card, p3 has 3 cards
// p1 drops 2 of hearts, p2 drops 4 of hearts (p2 now has 0 cards, but MUST NOT escape yet!)
// p3 drops 3 of hearts (trick completes, p2 escapes, p3 is 2nd biggest and MUST lead round 2!)
{
  const p1Card = createCard('hearts', '2');
  const p2Card = createCard('hearts', '4');
  const p3Card = createCard('hearts', '3');

  const p1 = createPlayer('p1', 'Player 1', 0, [p1Card, createCard('spades', 'K'), createCard('spades', 'Q'), createCard('clubs', 'J'), createCard('diamonds', '10')]);
  const p2 = createPlayer('p2', 'Player 2', 1, [p2Card]); // exactly 1 card
  const p3 = createPlayer('p3', 'Player 3', 2, [p3Card, createCard('clubs', '5'), createCard('diamonds', '6')]);

  let players = [p1, p2, p3];
  let gs: GameState = {
    ...emptyGameState(),
    gameStarted: true,
    roundNumber: 1,
    currentLeader: 'p1',
    currentTurn: 'p1',
  };

  // Step 1: p1 plays 2 of hearts
  const step1_p1 = applyCardPlay(players, gs, 'p1', p1Card);
  assert(!step1_p1.isPendingResolution, 'p1 play should not complete trick');
  assert(step1_p1.gameState.currentTurn === 'p2', 'Next turn should be p2');
  players = step1_p1.players;
  gs = step1_p1.gameState;

  // Step 2: p2 plays 4 of hearts (their only card)
  const step1_p2 = applyCardPlay(players, gs, 'p2', p2Card);
  const p2After = step1_p2.players.find(p => p.id === 'p2')!;
  assert(p2After.cards.length === 0, 'p2 should now have 0 cards in hand');
  assert(!p2After.escaped, 'p2 MUST NOT be escaped mid-round!');
  assert(!step1_p2.isPendingResolution, 'Trick must NOT finish when p2 drops card because p3 has not played yet!');
  assert(step1_p2.gameState.currentTurn === 'p3', 'Turn MUST advance to p3 so p3 can drop card!');
  players = step1_p2.players;
  gs = step1_p2.gameState;

  // Step 3: p3 plays 3 of hearts (clean round)
  const step1_p3 = applyCardPlay(players, gs, 'p3', p3Card);
  assert(step1_p3.isPendingResolution, 'Trick should complete after p3 plays');
  assert(!step1_p3.resolution!.wasHit, 'Round should be clean');
  assert(step1_p3.resolution!.collectorId === 'p2', 'p2 played highest lead card (4)');

  // Finalize resolution
  const final = finalizeTrickResolution(step1_p3.players, step1_p3.gameState, step1_p3.resolution!);
  const p2Final = final.players.find(p => p.id === 'p2')!;
  assert(p2Final.escaped, 'p2 should now be escaped after round finishes with 0 cards');
  assert(p2Final.escape_rank === 1, 'p2 escape rank should be 1');
  assert(final.gameState.rankings[0] === 'p2', 'Rankings should record p2');
  assert(final.gameState.currentLeader === 'p3', 'Next leader MUST be the second biggest player (p3 who played 3)!');
  assert(final.gameState.currentTurn === 'p3', 'Next turn MUST be p3!');
  assert(!final.gameEnded, 'Game should still be active');
  console.log('✓ Test 1 Passed: Clean round with p2 escaping and p3 (second biggest) leading next round');
}

// Test 2: User's exact scenario - Hit round
// p1 plays 2 of hearts, p2 plays 4 of hearts (last card), p3 has no hearts and hits with 9 of spades
// Result: p2 collects cards! p2 has 3 cards, does NOT escape, and leads next round!
{
  const p1Card = createCard('hearts', '2');
  const p2Card = createCard('hearts', '4');
  const p3Card = createCard('spades', '9'); // HIT!

  const p1 = createPlayer('p1', 'Player 1', 0, [p1Card, createCard('spades', 'K'), createCard('spades', 'Q'), createCard('clubs', 'J'), createCard('diamonds', '10')]);
  const p2 = createPlayer('p2', 'Player 2', 1, [p2Card]); // 1 card
  const p3 = createPlayer('p3', 'Player 3', 2, [p3Card, createCard('clubs', '5'), createCard('diamonds', '6')]);

  let players = [p1, p2, p3];
  let gs: GameState = {
    ...emptyGameState(),
    gameStarted: true,
    roundNumber: 1,
    currentLeader: 'p1',
    currentTurn: 'p1',
  };

  // p1 plays
  const r1 = applyCardPlay(players, gs, 'p1', p1Card);
  // p2 plays last card
  const r2 = applyCardPlay(r1.players, r1.gameState, 'p2', p2Card);
  assert(!r2.isPendingResolution, 'r2 should not complete trick');
  assert(r2.gameState.currentTurn === 'p3', 'Turn goes to p3');

  // p3 hits!
  const r3 = applyCardPlay(r2.players, r2.gameState, 'p3', p3Card);
  assert(r3.isPendingResolution, 'Hit should trigger trick completion');
  assert(r3.resolution!.wasHit, 'Resolution wasHit should be true');
  assert(r3.resolution!.collectorId === 'p2', 'p2 held highest lead card (4), so p2 is hit collector');

  // Finalize hit resolution
  const finalHit = finalizeTrickResolution(r3.players, r3.gameState, r3.resolution!);
  const p2Hit = finalHit.players.find(p => p.id === 'p2')!;
  assert(!p2Hit.escaped, 'p2 MUST NOT escape on hit where p2 collects the pile!');
  assert(p2Hit.cards.length === 3, 'p2 collected 3 cards from center pile');
  assert(finalHit.gameState.currentLeader === 'p2', 'p2 (collector) leads the next round');
  assert(finalHit.gameState.currentTurn === 'p2', 'p2 (collector) takes next turn');
  console.log('✓ Test 2 Passed: Hit round where p2 collected cards, did NOT escape, and leads next round');
}

// Test 3: Multiple players empty hand in same trick
// p1 plays 2 (has cards), p2 plays 4 (had 1 card), p3 plays 3 (had 1 card)
{
  const p1Card = createCard('hearts', '2');
  const p2Card = createCard('hearts', '4');
  const p3Card = createCard('hearts', '3');

  const p1 = createPlayer('p1', 'Player 1', 0, [p1Card, createCard('spades', 'K')]);
  const p2 = createPlayer('p2', 'Player 2', 1, [p2Card]);
  const p3 = createPlayer('p3', 'Player 3', 2, [p3Card]);

  let players = [p1, p2, p3];
  let gs: GameState = { ...emptyGameState(), gameStarted: true, roundNumber: 1, currentLeader: 'p1', currentTurn: 'p1' };

  const r1 = applyCardPlay(players, gs, 'p1', p1Card);
  const r2 = applyCardPlay(r1.players, r1.gameState, 'p2', p2Card);
  const r3 = applyCardPlay(r2.players, r2.gameState, 'p3', p3Card);

  const final = finalizeTrickResolution(r3.players, r3.gameState, r3.resolution!);
  const p2F = final.players.find(p => p.id === 'p2')!;
  const p3F = final.players.find(p => p.id === 'p3')!;
  assert(p2F.escaped && p2F.escape_rank === 1, 'p2 escapes 1st (card 4 > 3)');
  assert(p3F.escaped && p3F.escape_rank === 2, 'p3 escapes 2nd (card 3 < 4)');
  assert(final.gameEnded, 'Game should end because only p1 remains');
  assert(final.gameState.donkeyPlayerId === 'p1', 'p1 is the Donkey');
  console.log('✓ Test 3 Passed: Multiple escapes correctly ordered by card rank, Donkey assigned');
}

// Test 4: 4 players, clean round where winner escapes, second biggest has 0 cards and escapes, third biggest leads
// p1: 2, p2: 8 (0 cards), p3: 6 (0 cards), p4: 4 (2 cards)
{
  const p1Card = createCard('hearts', '2');
  const p2Card = createCard('hearts', '8');
  const p3Card = createCard('hearts', '6');
  const p4Card = createCard('hearts', '4');

  const p1 = createPlayer('p1', 'Player 1', 0, [p1Card, createCard('spades', 'K')]);
  const p2 = createPlayer('p2', 'Player 2', 1, [p2Card]);
  const p3 = createPlayer('p3', 'Player 3', 2, [p3Card]);
  const p4 = createPlayer('p4', 'Player 4', 3, [p4Card, createCard('clubs', 'A')]);

  let players = [p1, p2, p3, p4];
  let gs: GameState = { ...emptyGameState(), gameStarted: true, roundNumber: 1, currentLeader: 'p1', currentTurn: 'p1' };

  const r1 = applyCardPlay(players, gs, 'p1', p1Card);
  const r2 = applyCardPlay(r1.players, r1.gameState, 'p2', p2Card);
  const r3 = applyCardPlay(r2.players, r2.gameState, 'p3', p3Card);
  const r4 = applyCardPlay(r3.players, r3.gameState, 'p4', p4Card);

  const final = finalizeTrickResolution(r4.players, r4.gameState, r4.resolution!);
  const p2F = final.players.find(p => p.id === 'p2')!;
  const p3F = final.players.find(p => p.id === 'p3')!;
  assert(p2F.escaped && p2F.escape_rank === 1, 'p2 escapes 1st (8)');
  assert(p3F.escaped && p3F.escape_rank === 2, 'p3 escapes 2nd (6)');
  assert(final.gameState.currentLeader === 'p4', 'p4 (card 4, highest with cards) leads next round');
  assert(final.gameState.currentTurn === 'p4', 'p4 has next turn');
  assert(!final.gameEnded, 'Game continues with p1 and p4');
  console.log('✓ Test 4 Passed: 4-player chain resolution where first 2 highest cards escape and 3rd leads');
}

// Test 5: P1 leads with their last card (1 card), clean round
// P1 plays 2 (0 cards), P2 plays 8 (has cards), P3 plays 4 (has cards)
// Winner is P2 (8). P2 has cards -> P2 leads next round. P1 has 0 cards -> P1 escapes!
{
  const p1Card = createCard('hearts', '2');
  const p2Card = createCard('hearts', '8');
  const p3Card = createCard('hearts', '4');

  const p1 = createPlayer('p1', 'Player 1', 0, [p1Card]); // 1 card
  const p2 = createPlayer('p2', 'Player 2', 1, [p2Card, createCard('spades', 'K')]);
  const p3 = createPlayer('p3', 'Player 3', 2, [p3Card, createCard('diamonds', 'Q')]);

  let players = [p1, p2, p3];
  let gs: GameState = { ...emptyGameState(), gameStarted: true, roundNumber: 1, currentLeader: 'p1', currentTurn: 'p1' };

  const r1 = applyCardPlay(players, gs, 'p1', p1Card);
  assert(!r1.isPendingResolution, 'P1 leading with last card must NOT end trick');
  assert(r1.gameState.currentTurn === 'p2', 'P2 gets next turn');
  assert(!r1.players.find(p => p.id === 'p1')!.escaped, 'P1 must not escape mid-round');

  const r2 = applyCardPlay(r1.players, r1.gameState, 'p2', p2Card);
  assert(!r2.isPendingResolution, 'P2 play must not end trick');
  assert(r2.gameState.currentTurn === 'p3', 'P3 gets next turn');

  const r3 = applyCardPlay(r2.players, r2.gameState, 'p3', p3Card);
  assert(r3.isPendingResolution, 'Trick completes after all 3 play');

  const final = finalizeTrickResolution(r3.players, r3.gameState, r3.resolution!);
  const p1F = final.players.find(p => p.id === 'p1')!;
  assert(p1F.escaped && p1F.escape_rank === 1, 'P1 escapes after round finishes');
  assert(final.gameState.currentLeader === 'p2', 'P2 (winner with cards) leads next round');
  assert(final.gameState.currentTurn === 'p2', 'P2 has next turn');
  console.log('✓ Test 5 Passed: P1 leads with last card, P2 wins and leads next round, P1 escapes');
}

// Test 6: P1 leads with their last card (1 card), P2 plays 8, P3 hits with off-suit!
// P2 takes hit. P1 has 0 cards, didn't take hit -> P1 escapes! P2 leads next round!
{
  const p1Card = createCard('hearts', '2');
  const p2Card = createCard('hearts', '8');
  const p3Card = createCard('spades', 'K'); // off-suit hit

  const p1 = createPlayer('p1', 'Player 1', 0, [p1Card]); // 1 card
  const p2 = createPlayer('p2', 'Player 2', 1, [p2Card, createCard('spades', 'Q')]);
  const p3 = createPlayer('p3', 'Player 3', 2, [p3Card, createCard('diamonds', 'Q')]);

  let players = [p1, p2, p3];
  let gs: GameState = { ...emptyGameState(), gameStarted: true, roundNumber: 1, currentLeader: 'p1', currentTurn: 'p1' };

  const r1 = applyCardPlay(players, gs, 'p1', p1Card);
  const r2 = applyCardPlay(r1.players, r1.gameState, 'p2', p2Card);
  const r3 = applyCardPlay(r2.players, r2.gameState, 'p3', p3Card);
  assert(r3.isPendingResolution && r3.resolution!.wasHit, 'P3 triggers hit');
  assert(r3.resolution!.collectorId === 'p2', 'P2 is collector');

  const final = finalizeTrickResolution(r3.players, r3.gameState, r3.resolution!);
  const p1F = final.players.find(p => p.id === 'p1')!;
  const p2F = final.players.find(p => p.id === 'p2')!;
  assert(p1F.escaped && p1F.escape_rank === 1, 'P1 did not collect and had 0 cards, so P1 escapes');
  assert(!p2F.escaped, 'P2 collected cards, so P2 does not escape');
  assert(final.gameState.currentLeader === 'p2', 'P2 (collector) leads next round');
  console.log('✓ Test 6 Passed: P1 leads with last card, P2 collects hit pile, P1 escapes, P2 leads');
}

console.log('--- All Game Rules Tests Passed Successfully! ---');
