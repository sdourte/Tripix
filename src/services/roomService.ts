import { supabase } from '../lib/supabase'

interface CreateRoomResult {
  roomId: string
  code: string
  playerId: string
}

function generateRoomCode(length = 6): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

  let code = ''

  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * characters.length)
    code += characters[index]
  }

  return code
}

export async function createRoom(
  roomName: string,
  playerName: string,
) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.signInAnonymously()

  if (authError || !user) {
    throw new Error(
      authError?.message ?? 'Impossible de créer une session.',
    )
  }

  const { data, error } = await supabase.rpc(
    'create_room',
    {
      room_name: roomName,
      player_name: playerName,
    },
  )

  if (error || !data) {
    throw new Error(
      error?.message ?? 'Impossible de créer la salle.',
    )
  }

  return {
    roomId: data.room_id,
    code: data.code,
    playerId: data.player_id,
  }
}

export async function getRoomByCode(code: string) {
  const { data, error } = await supabase
    .from('rooms')
    .select(`
      id,
      name,
      code,
      admin_id
    `)
    .eq('code', code)
    .single()

  if (error) {
    throw new Error(
      error.message || 'Impossible de récupérer la salle.',
    )
  }

  return data
}

export async function getRoomPlayers(roomId: string) {
  const { data, error } = await supabase
    .from('players')
    .select(`
      id,
      user_id,
      name
    `)
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(
      error.message || 'Impossible de récupérer les joueurs.',
    )
  }

  return data
}

export async function joinRoom(
  roomCode: string,
  playerName: string,
) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.signInAnonymously()

  if (authError || !user) {
    throw new Error(
      authError?.message ?? 'Impossible de créer une session.',
    )
  }

  const { data, error } = await supabase.rpc(
    'join_room',
    {
      room_code: roomCode,
      player_name: playerName,
    },
  )

  if (error || !data) {
    throw new Error(
      error?.message ?? 'Impossible de rejoindre la salle.',
    )
  }

  const room = await getRoomByCode(roomCode)

  return {
    roomId: data.id,
    playerId: data.id,
    code: room.code,
  }
}