import { applyCardPlay, finalizeTrickResolution, declarePlayerAss, applyCardTransfer, startGameDeal, isActivePlayer, shufflePlayerSeats } from './gameRules';
import { Card, emptyGameState, GameState, PlayerRow, CardRequest } from '../types';

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

// Test 7: Final 2 players showdown - P2 declares Ass / Donkey
{
  const p1 = createPlayer('p1', 'Player 1', 0, [createCard('hearts', 'K')]);
  const p2 = createPlayer('p2', 'Player 2', 1, [createCard('spades', '2'), createCard('clubs', '3')]);
  const p3 = { ...createPlayer('p3', 'Player 3', 2, []), escaped: true, escape_rank: 1 };
  const p4 = { ...createPlayer('p4', 'Player 4', 3, []), escaped: true, escape_rank: 2 };

  let players = [p1, p2, p3, p4];
  let gs: GameState = {
    ...emptyGameState(),
    gameStarted: true,
    roundNumber: 8,
    rankings: ['p3', 'p4'],
    currentLeader: 'p1',
    currentTurn: 'p1',
  };

  const res = declarePlayerAss(players, gs, 'p2');
  assert(res.gameEnded, 'Game should end immediately');
  assert(res.gameState.donkeyPlayerId === 'p2', 'P2 should be the donkey');

  const p1F = res.players.find(p => p.id === 'p1')!;
  const p2F = res.players.find(p => p.id === 'p2')!;
  assert(p1F.escaped && p1F.escape_rank === 3, 'P1 should escape in 3rd place');
  assert(!p2F.escaped, 'P2 is the donkey, not escaped');
  assert(
    JSON.stringify(res.gameState.rankings) === JSON.stringify(['p3', 'p4', 'p1', 'p2']),
    'Rankings should order P1 then P2 as last'
  );
  assert(res.gameState.lastEvent?.type === 'game_over', 'Game over event emitted');
  console.log('✓ Test 7 Passed: Final 2 player Ass/Donkey button ends game and crowns donkey');
}

// Test 8: Round 1 lead rule (player holding Ace of Spades can lead ANY card from hand)
{
  const p1Ace = createCard('spades', 'A');
  const p1Other = createCard('hearts', 'K');
  const p1 = createPlayer('p1', 'Player 1', 0, [p1Ace, p1Other]);
  const p2 = createPlayer('p2', 'Player 2', 1, [createCard('spades', '10')]);
  const players = [p1, p2];

  const gs: GameState = {
    ...emptyGameState(),
    gameStarted: true,
    roundNumber: 1,
    currentLeader: 'p1',
    currentTurn: 'p1',
  };

  // Playing non-Ace of Spades (e.g. K♥) on Round 1 lead MUST succeed
  const stepNonAce = applyCardPlay(players, gs, 'p1', p1Other);
  assert(stepNonAce.gameState.centerPile.length === 1, 'Card played onto table');
  assert(stepNonAce.gameState.leadSuit === 'hearts', 'Lead suit set to Hearts');

  // Alternatively, playing Ace of Spades is also allowed
  const stepAce = applyCardPlay(players, gs, 'p1', p1Ace);
  assert(stepAce.gameState.centerPile.length === 1, 'Ace of Spades played onto table');
  assert(stepAce.gameState.leadSuit === 'spades', 'Lead suit is Spades');
  console.log('✓ Test 8 Passed: Round 1 leader can lead any card (not forced to play Ace of Spades)');
}

// Test 9: User exact scenario: P1 leads Spade Ace, P2 plays Spade 10, P3 hits with Heart 5.
// P1 played the highest card of the lead suit (A > 10), so P1 MUST take ALL cards (A♠, 10♠, 5♥) into hand!
// Also verifies that gameState.players is atomically synchronized.
{
  const p1Ace = createCard('spades', 'A');
  const p2Spade = createCard('spades', '10');
  const p3Hit = createCard('hearts', '5'); // HIT!

  const p1 = createPlayer('p1', 'User', 0, [p1Ace, createCard('clubs', '2'), createCard('diamonds', '3')]);
  const p2 = createPlayer('p2', 'Bot 1', 1, [p2Spade, createCard('clubs', '4')]);
  const p3 = createPlayer('p3', 'Bot 2', 2, [p3Hit, createCard('diamonds', '9')]); // No spades!

  let players = [p1, p2, p3];
  let gs: GameState = {
    ...emptyGameState(),
    gameStarted: true,
    roundNumber: 1,
    currentLeader: 'p1',
    currentTurn: 'p1',
  };

  // P1 plays Ace of Spades
  const r1 = applyCardPlay(players, gs, 'p1', p1Ace);
  assert(!r1.isPendingResolution, 'r1 continuing');

  // P2 plays 10 of Spades
  const r2 = applyCardPlay(r1.players, r1.gameState, 'p2', p2Spade);
  assert(!r2.isPendingResolution, 'r2 continuing');

  // P3 has no Spades and gives HIT with Heart 5!
  const r3 = applyCardPlay(r2.players, r2.gameState, 'p3', p3Hit);
  assert(r3.isPendingResolution, 'r3 hit completes trick');
  assert(r3.resolution!.wasHit, 'Was hit is true');
  assert(r3.resolution!.collectorId === 'p1', 'P1 played highest lead suit (A), so P1 is collector');

  // Finalize trick resolution
  const final = finalizeTrickResolution(r3.players, r3.gameState, r3.resolution!);
  const p1Final = final.players.find(p => p.id === 'p1')!;
  
  // P1 started with 3 cards, played 1 (2 remaining), then collected 3 cards (A♠, 10♠, 5♥) -> exactly 5 cards in hand!
  assert(p1Final.cards.length === 5, `P1 must hold 5 cards, got ${p1Final.cards.length}`);
  assert(p1Final.cards.some(c => c.id === 'spades-A'), 'P1 must have A♠ back in hand');
  assert(p1Final.cards.some(c => c.id === 'spades-10'), 'P1 must have 10♠ in hand');
  assert(p1Final.cards.some(c => c.id === 'hearts-5'), 'P1 must have 5♥ in hand');
  assert(!p1Final.escaped, 'P1 must not be escaped');

  // Verify atomic gameState.players has identical hand
  const p1StatePlayer = final.gameState.players ? final.gameState.players.find(p => p.id === 'p1') : null;
  assert(p1StatePlayer !== null && p1StatePlayer !== undefined && p1StatePlayer.cards.length === 5, 'gameState.players must carry the exact 5 cards for atomic sync');

  // P1 leads next round with any card (leadSuit is null)
  assert(final.gameState.currentLeader === 'p1', 'P1 (collector) leads next round');
  assert(final.gameState.currentTurn === 'p1', 'P1 takes next turn');
  assert(final.gameState.leadSuit === null, 'Lead suit reset to null so P1 can lead with any card');
  assert(final.gameState.roundNumber === 2, 'Round advanced to 2');
  console.log('✓ Test 9 Passed: User hit scenario where P1 collects all 3 cards into hand and leads next round');
}

// Test 10: Card transfer protection when a card is dropped (prevents card disappearance)
{
  const p1Spade4 = createCard('spades', '4');
  const p1 = createPlayer('p1', 'Player 1', 0, [p1Spade4, createCard('hearts', '10')]);
  const p2 = createPlayer('p2', 'Player 2', 1, [createCard('clubs', '7')]);
  const p3 = createPlayer('p3', 'Player 3', 2, [createCard('diamonds', 'K')]);
  const players = [p1, p2, p3];

  const pendingRequest: CardRequest = {
    id: 'req_123',
    requesterId: 'p2',
    requesterName: 'Player 2',
    targetId: 'p3',
    targetName: 'Player 3',
    cardCount: 1,
    status: 'pending',
    createdAt: Date.now(),
  };

  const gs: GameState = {
    ...emptyGameState(),
    gameStarted: true,
    roundNumber: 2,
    currentLeader: 'p1',
    currentTurn: 'p1',
    cardRequest: pendingRequest,
  };

  // 1. P1 drops Spade 4 onto the table
  const playStep = applyCardPlay(players, gs, 'p1', p1Spade4);
  assert(playStep.gameState.centerPile.length === 1, 'Spade 4 is now in center pile');
  assert(playStep.gameState.centerPile[0].card.id === 'spades-4', 'Center card is 4♠');
  assert(playStep.gameState.cardRequest === null, 'Playing card must immediately cancel any pending card request');

  // 2. Attempting applyCardTransfer while Spade 4 is on the table MUST be rejected
  const transferAttempt = applyCardTransfer(playStep.players, playStep.gameState, 'p3', 'p2');
  assert(transferAttempt.gameState.centerPile.length === 1, 'Spade 4 remains safely in center pile');
  assert(transferAttempt.gameState.centerPile[0].card.id === 'spades-4', 'Spade 4 did not get wiped out');
  assert(transferAttempt.players[1].cards.length === 1, 'P2 cards were not modified');
  assert(transferAttempt.players[2].cards.length === 1, 'P3 cards were not modified');
  assert(!transferAttempt.players[2].escaped, 'P3 did not escape inappropriately');
  console.log('✓ Test 10 Passed: Card transfer is blocked during active tricks, preventing card loss');
}

// Test 11: P1 buys full cards from P2 (P2 now has 0 cards and escapes). In a 3-player game,
// when P1 drops a card, turn must skip P2 and go directly to P3.
{
  const p1Cards: Card[] = [
    createCard('spades', 'A'),
    createCard('hearts', '5'),
  ];
  const p2Cards: Card[] = [
    createCard('spades', 'K'),
    createCard('clubs', '10'),
  ];
  const p3Cards: Card[] = [
    createCard('spades', '9'),
    createCard('diamonds', 'K'),
  ];

  const p1 = createPlayer('p1', 'Player 1', 0, p1Cards);
  const p2 = createPlayer('p2', 'Player 2', 1, p2Cards);
  const p3 = createPlayer('p3', 'Player 3', 2, p3Cards);
  const players = [p1, p2, p3];

  const initialGs: GameState = {
    ...emptyGameState(),
    gameStarted: true,
    roundNumber: 1,
    currentLeader: 'p1',
    currentTurn: 'p1',
    players,
  };

  // P1 buys all cards from P2
  const transfer = applyCardTransfer(players, initialGs, 'p2', 'p1');
  const p2AfterTransfer = transfer.players.find(p => p.id === 'p2')!;
  const p1AfterTransfer = transfer.players.find(p => p.id === 'p1')!;

  assert(p2AfterTransfer.cards.length === 0, 'P2 must have 0 cards after transfer');
  assert(p2AfterTransfer.escaped === true, 'P2 must be marked as escaped');
  assert(p1AfterTransfer.cards.length === 4, 'P1 must have 4 cards (2 original + 2 from P2)');
  assert(transfer.gameState.currentTurn === 'p1', 'Current turn should remain P1');

  // P1 drops a card for normal game
  const cardToPlay = p1AfterTransfer.cards[0];
  const playStep = applyCardPlay(transfer.players, transfer.gameState, 'p1', cardToPlay);

  assert(playStep.gameState.centerPile.length === 1, 'Card must be placed in center pile');
  assert(playStep.gameState.centerPile[0].card.id === cardToPlay.id, 'Center card matches played card');
  assert(playStep.gameState.currentTurn === 'p3', `Next turn MUST be P3, but got ${playStep.gameState.currentTurn}`);
  console.log('✓ Test 11 Passed: When P1 buys full cards from P2 and plays, turn skips P2 (0 cards) and goes to P3');
}

// Test 12: Comprehensive verification for all player counts from 3 to 11 players.
// Verifies:
// 1. Correct card deal across N players.
// 2. Card transfer of full hand from P2 to P1 leaves P2 with 0 cards and escaped.
// 3. Turn progression cleanly skips P2 and only advances through active players with cards.
// 4. Trick completes with exactly N-1 cards (clean) or earlier (hit).
// 5. Trick resolution transitions cleanly to round 2 with an active leader (never 0-card/escaped).
{
  for (let n = 3; n <= 11; n++) {
    const initialPlayers: PlayerRow[] = Array.from({ length: n }, (_, i) =>
      createPlayer(`p${i + 1}`, `Player ${i + 1}`, i, [])
    );

    const dealt = startGameDeal(initialPlayers);
    let players = dealt.players;
    let gs = dealt.gameState;

    assert(players.length === n, `Should have ${n} players`);
    assert(gs.players?.length === n, `GameState should have ${n} players`);

    // P1 buys all cards from P2
    const targetId = 'p2';
    const requesterId = 'p1';
    const p2OriginalCount = players.find((p) => p.id === targetId)!.cards.length;
    const p1OriginalCount = players.find((p) => p.id === requesterId)!.cards.length;

    const transfer = applyCardTransfer(players, gs, targetId, requesterId);
    players = transfer.players;
    gs = transfer.gameState;

    const p2After = players.find((p) => p.id === targetId)!;
    const p1After = players.find((p) => p.id === requesterId)!;
    assert(p2After.cards.length === 0, `${targetId} must have 0 cards after transfer in ${n}-player game`);
    assert(p2After.escaped === true, `${targetId} must be marked escaped in ${n}-player game`);
    assert(
      p1After.cards.length === p1OriginalCount + p2OriginalCount,
      `${requesterId} must hold all cards in ${n}-player game`
    );

    // Ensure currentTurn is an active player with cards
    const turnPlayer = players.find((p) => p.id === gs.currentTurn);
    assert(
      turnPlayer !== undefined && !turnPlayer.escaped && turnPlayer.cards.length > 0,
      `Current turn must be active in ${n}-player game, got ${gs.currentTurn}`
    );

    // Current turn player plays
    const currentLeaderId = gs.currentTurn!;
    const leaderPlayer = players.find((p) => p.id === currentLeaderId)!;
    const leadCard = leaderPlayer.cards[0];

    const playStep1 = applyCardPlay(players, gs, currentLeaderId, leadCard);
    players = playStep1.players;
    gs = playStep1.gameState;

    assert(gs.centerPile.length === 1, `Center pile must have 1 card in ${n}-player game`);
    assert(gs.currentTurn !== targetId, `Next turn must NEVER be ${targetId} (0 cards) in ${n}-player game`);

    // Play remaining turns until trick completes
    let loopCount = 0;
    while (!gs.hitOccurred && gs.currentTurn && loopCount < n + 5) {
      loopCount++;
      const currentActorId = gs.currentTurn;
      assert(currentActorId !== targetId, `Turn must never be ${targetId} in ${n}-player game`);
      const actor = players.find((p) => p.id === currentActorId)!;
      assert(isActivePlayer(actor), `Actor ${actor.id} must be active with cards`);

      const leadSuit = gs.leadSuit!;
      const legalCard = actor.cards.find((c) => c.suit === leadSuit) ?? actor.cards[0];

      const playResult = applyCardPlay(players, gs, currentActorId, legalCard);
      players = playResult.players;
      gs = playResult.gameState;

      if (playResult.isPendingResolution) {
        assert(playResult.resolution !== null, `Resolution must exist in ${n}-player game`);
        if (!playResult.resolution!.wasHit) {
          assert(
            gs.centerPile.length === n - 1,
            `Clean trick in ${n}-player game with 1 escaped must have ${n - 1} cards, got ${gs.centerPile.length}`
          );
        }

        // Finalize trick into round 2
        const finalStep = finalizeTrickResolution(players, gs, playResult.resolution!);
        players = finalStep.players;
        gs = finalStep.gameState;
        assert(gs.roundNumber === 2, `Round number must advance to 2 in ${n}-player game`);
        assert(gs.currentTurn !== targetId, `Round 2 turn must not be ${targetId}`);
        assert(gs.currentLeader !== targetId, `Round 2 leader must not be ${targetId}`);
        break;
      }
    }
  }
  console.log('✓ Test 12 Passed: All player counts from 3 to 11 successfully tested (buy card, skip 0-card player, complete trick, and lead round 2)');
}

// Test 13: shufflePlayerSeats produces valid permutations 0..N-1 and ensures different order
{
  const p1 = createPlayer('p1', 'Player 1', 0, [createCard('spades', 'A')]);
  const p2 = createPlayer('p2', 'Player 2', 1, [createCard('hearts', 'K')]);
  const p3 = createPlayer('p3', 'Player 3', 2, [createCard('diamonds', 'Q')]);
  const p4 = createPlayer('p4', 'Player 4', 3, [createCard('clubs', 'J')]);
  const initial = [p1, p2, p3, p4];

  const shuffled = shufflePlayerSeats(initial);
  assert(shuffled.length === 4, 'Shuffled players count must match');
  
  const seatOrders = shuffled.map((p) => p.seat_order).sort();
  assert(seatOrders.join(',') === '0,1,2,3', `Seat orders must be 0,1,2,3, got ${seatOrders.join(',')}`);

  // Cards and escaped status must be reset
  assert(shuffled.every((p) => p.cards.length === 0), 'All cards must be cleared on shuffle');
  assert(shuffled.every((p) => !p.escaped), 'All escaped statuses must be false');
  assert(shuffled.every((p) => p.escape_rank === null), 'All escape_rank must be null');

  // Verify that the order changed
  const initialIds = initial.map((p) => p.id);
  const shuffledSorted = [...shuffled].sort((a, b) => a.seat_order - b.seat_order).map((p) => p.id);
  assert(
    shuffledSorted.some((id, idx) => id !== initialIds[idx]),
    'Shuffled seating order must differ from initial entry order'
  );
  console.log('✓ Test 13 Passed: shufflePlayerSeats resets cards and guarantees a new distinct seating order');
}

// Test 14: Full multi-match cycle: Match 1 in entry order -> Play again -> Match 2 in new shuffled order -> Match 3
{
  const p1 = createPlayer('p1', 'Player 1', 0, []);
  const p2 = createPlayer('p2', 'Player 2', 1, []);
  const p3 = createPlayer('p3', 'Player 3', 2, []);
  const p4 = createPlayer('p4', 'Player 4', 3, []);

  // Match 1: entered order 0, 1, 2, 3
  const match1 = startGameDeal([p1, p2, p3, p4], 1);
  assert(match1.gameState.matchNumber === 1, 'Match 1 number should be 1');
  assert(match1.players.map((p) => p.id).join(',') === 'p1,p2,p3,p4', 'Match 1 players should follow entry order');

  // Match 1 ends, host clicks Play Again -> shuffle seats
  const shuffledForMatch2 = shufflePlayerSeats(match1.players);
  const match2 = startGameDeal(shuffledForMatch2, 2);
  assert(match2.gameState.matchNumber === 2, 'Match 2 number should be 2');

  const match2Order = [...match2.players].sort((a, b) => a.seat_order - b.seat_order).map((p) => p.id);
  assert(
    match2Order.some((id, idx) => id !== ['p1', 'p2', 'p3', 'p4'][idx]),
    'Match 2 seating order must be different from Match 1 entry order'
  );

  // Match 2 ends, host clicks Play Again -> shuffle seats for Match 3
  const shuffledForMatch3 = shufflePlayerSeats(match2.players);
  const match3 = startGameDeal(shuffledForMatch3, 3);
  assert(match3.gameState.matchNumber === 3, 'Match 3 number should be 3');

  const match3Order = [...match3.players].sort((a, b) => a.seat_order - b.seat_order).map((p) => p.id);
  assert(
    match3Order.some((id, idx) => id !== match2Order[idx]),
    'Match 3 seating order must be different from Match 2 order'
  );

  console.log('✓ Test 14 Passed: Multi-match flow successfully preserves entry order for Match 1, and shuffles for Match 2 and Match 3');
}

console.log('--- All Game Rules Tests Passed Successfully! ---');
