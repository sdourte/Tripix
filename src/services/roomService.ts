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
): Promise<CreateRoomResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.signInAnonymously()

  if (authError || !user) {
    throw new Error(
      authError?.message ?? 'Impossible de créer une session.',
    )
  }

  let code = generateRoomCode()

  let { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({
      name: roomName,
      code,
      admin_id: user.id,
    })
    .select('id, code')
    .single()

  /*
   * Le code est unique.
   * Dans le cas extrêmement improbable d'une collision,
   * on génère simplement un nouveau code.
   */
  if (roomError?.code === '23505') {
    code = generateRoomCode()

    const result = await supabase
      .from('rooms')
      .insert({
        name: roomName,
        code,
        admin_id: user.id,
      })
      .select('id, code')
      .single()

    room = result.data
    roomError = result.error
  }

  if (roomError || !room) {
    throw new Error(
      roomError?.message ?? 'Impossible de créer la salle.',
    )
  }

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      room_id: room.id,
      user_id: user.id,
      name: playerName,
    })
    .select('id')
    .single()

  if (playerError || !player) {
    // Si la création du joueur échoue, on évite de garder
    // une salle sans son administrateur.
    await supabase
      .from('rooms')
      .delete()
      .eq('id', room.id)

    throw new Error(
      playerError?.message ?? 'Impossible de créer le joueur.',
    )
  }

  return {
    roomId: room.id,
    code: room.code,
    playerId: player.id,
  }
}