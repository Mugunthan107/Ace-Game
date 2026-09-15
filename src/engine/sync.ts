import { supabase } from '../lib/supabase';
import { AVATAR_COLORS, GameState, PlayerRow, RoomRow, emptyGameState } from '../types';
import { BOT_NAMES } from './bot';

function randomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Creates a room with a unique 4-digit code, retrying a handful of times on collision. */
export async function createRoomRecord(
  hostName: string,
  maxPlayers: number,
  minPlayers: number
): Promise<{ room: RoomRow; player: PlayerRow }> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode();
    const { data: room, error } = await supabase
      .from('rooms')
      .insert({
        code,
        host_id: '00000000-0000-0000-0000-000000000000', // patched below once we know player id
        status: 'waiting',
        max_players: maxPlayers,
        min_players: minPlayers,
        game_state: emptyGameState(),
      })
      .select()
      .single();

    if (error) {
      // Unique violation on code -> try another code.
      if (error.code === '23505') {
        lastError = error;
        continue;
      }
      throw error;
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        room_id: room.id,
        name: hostName,
        is_host: true,
        cards: [],
        escaped: false,
        ready: true,
        avatar_color: AVATAR_COLORS[0],
        seat_order: 0,
        connected: true,
      })
      .select()
      .single();

    if (playerError) throw playerError;

    const { data: patchedRoom, error: patchError } = await supabase
      .from('rooms')
      .update({ host_id: player.id })
      .eq('id', room.id)
      .select()
      .single();
    if (patchError) throw patchError;

    return { room: patchedRoom as RoomRow, player: player as PlayerRow };
  }
  throw lastError ?? new Error('Could not generate a unique room code. Please try again.');
}

export async function findRoomByCode(code: string): Promise<RoomRow | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', code)
    .neq('status', 'ended')
    .maybeSingle();
  if (error) throw error;
  return (data as RoomRow) ?? null;
}

export async function fetchPlayers(roomId: string): Promise<PlayerRow[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId)
    .order('seat_order', { ascending: true });
  if (error) throw error;
  return ((data as PlayerRow[]) ?? []).map((p) => ({
    ...p,
    is_bot: p.name.startsWith('Bot ') || p.name.toLowerCase().includes('bot'),
  }));
}

export async function fetchRoom(roomId: string): Promise<RoomRow | null> {
  const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).maybeSingle();
  if (error) throw error;
  return (data as RoomRow) ?? null;
}

export async function joinRoomRecord(room: RoomRow, name: string): Promise<PlayerRow> {
  const existing = await fetchPlayers(room.id);
  if (existing.some((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase())) {
    throw new Error('That name is already taken in this room.');
  }
  if (existing.length >= room.max_players) {
    throw new Error('This room is full.');
  }
  if (room.status !== 'waiting') {
    throw new Error('This game has already started.');
  }
  const seat = existing.length;
  const { data, error } = await supabase
    .from('players')
    .insert({
      room_id: room.id,
      name,
      is_host: false,
      cards: [],
      escaped: false,
      ready: true,
      avatar_color: AVATAR_COLORS[seat % AVATAR_COLORS.length],
      seat_order: seat,
      connected: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data as PlayerRow;
}

export async function updateRoom(roomId: string, patch: Partial<RoomRow>) {
  const { error } = await supabase.from('rooms').update(patch).eq('id', roomId);
  if (error) throw error;
}

export async function updateGameState(roomId: string, gameState: GameState) {
  const { error } = await supabase.from('rooms').update({ game_state: gameState }).eq('id', roomId);
  if (error) throw error;
}

export async function updatePlayer(playerId: string, patch: Partial<PlayerRow>) {
  const cleanPatch = { ...patch };
  delete cleanPatch.is_bot;
  const { error } = await supabase.from('players').update(cleanPatch).eq('id', playerId);
  if (error) throw error;
}

export async function updatePlayersBulk(patches: { id: string; patch: Partial<PlayerRow> }[]) {
  await Promise.all(patches.map(({ id, patch }) => updatePlayer(id, patch)));
}

export async function removePlayerRecord(playerId: string) {
  const { error } = await supabase.from('players').delete().eq('id', playerId);
  if (error) throw error;
}

export async function deleteRoomRecord(roomId: string) {
  const { error } = await supabase.from('rooms').delete().eq('id', roomId);
  if (error) throw error;
}

export function roomSync(
  roomId: string,
  onRoomChange: (room: RoomRow) => void,
  onRoomDeleted: () => void,
  onPlayersChange: (players: PlayerRow[]) => void
) {
  const channel = supabase
    .channel(`room-${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          onRoomDeleted();
        } else {
          onRoomChange(payload.new as RoomRow);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
      async () => {
        const players = await fetchPlayers(roomId);
        onPlayersChange(players);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/** Inserts automated bot players into the room to fill remaining player slots. */
export async function addBotPlayers(
  roomId: string,
  count: number,
  existingPlayers: PlayerRow[]
): Promise<PlayerRow[]> {
  const existingNames = new Set(existingPlayers.map((p) => p.name.trim().toLowerCase()));
  const availableNames = BOT_NAMES.filter((n) => !existingNames.has(n.toLowerCase()));

  const botRows = Array.from({ length: count }, (_, i) => {
    const seat = existingPlayers.length + i;
    const name = availableNames[i] ?? `Bot ${i + 1}`;
    return {
      room_id: roomId,
      name,
      is_host: false,
      cards: [],
      escaped: false,
      ready: true,
      avatar_color: AVATAR_COLORS[seat % AVATAR_COLORS.length],
      seat_order: seat,
      connected: true,
    };
  });

  const { data, error } = await supabase.from('players').insert(botRows).select();
  if (error) throw error;
  return ((data as PlayerRow[]) ?? []).map((p, idx) => ({
    ...p,
    seat_order: typeof p.seat_order === 'number' ? p.seat_order : existingPlayers.length + idx,
    is_bot: true,
  }));
}

