import { supabase } from '../lib/supabase'

export interface Room {
  id: string
  name: string
  code: string
  admin_id: string
}

export interface Player {
  id: string
  user_id: string
  name: string
}

export interface UserRoom {
  id: string
  name: string
  code: string
  admin_id: string
  player_id: string
  player_name: string
}

/**
 * Crée une nouvelle salle.
 *
 * L'utilisateur connecté devient automatiquement
 * administrateur de la salle.
 */
export async function createRoom(
  roomName: string,
  playerName: string,
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(
      'Impossible de récupérer ton compte.',
    )
  }

  if (!user) {
    throw new Error(
      'Tu dois être connecté pour créer une salle.',
    )
  }

  const { data, error } = await supabase.rpc(
    'create_room',
    {
      room_name: roomName,
      player_name: playerName,
    },
  )

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Rejoint une salle existante.
 *
 * Si l'utilisateur est déjà membre de la salle,
 * la fonction SQL retourne son joueur existant.
 */
export async function joinRoom(
  roomCode: string,
  playerName: string,
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(
      'Impossible de récupérer ton compte.',
    )
  }

  if (!user) {
    throw new Error(
      'Tu dois être connecté pour rejoindre une salle.',
    )
  }

  const { data, error } = await supabase.rpc(
    'join_room',
    {
      room_code: roomCode,
      player_name: playerName,
    },
  )

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Récupère une salle à partir de son code.
 */
export async function getRoomByCode(
  code: string,
): Promise<Room> {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, name, code, admin_id')
    .eq('code', code.toUpperCase())
    .single()

  if (error) {
    throw new Error(
      'Impossible de trouver cette salle.',
    )
  }

  return data
}

/**
 * Récupère tous les joueurs d'une salle.
 */
export async function getRoomPlayers(
  roomId: string,
): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('id, user_id, name')
    .eq('room_id', roomId)
    .order('created_at', {
      ascending: true,
    })

  if (error) {
    throw new Error(
      'Impossible de récupérer les joueurs.',
    )
  }

  return data
}

/**
 * Récupère toutes les salles auxquelles
 * l'utilisateur actuellement connecté participe.
 *
 * On part de players car un utilisateur peut
 * participer à plusieurs salles.
 */
export async function getUserRooms(): Promise<
  UserRoom[]
> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(
      'Impossible de récupérer ton compte.',
    )
  }

  if (!user) {
    throw new Error(
      'Tu dois être connecté pour voir tes salles.',
    )
  }

  const { data, error } = await supabase
    .from('players')
    .select(`
      id,
      name,
      room:rooms (
        id,
        name,
        code,
        admin_id
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', {
      ascending: true,
    })

  if (error) {
    throw new Error(
      'Impossible de récupérer tes salles.',
    )
  }

  return data.map((player) => {
    const room = Array.isArray(player.room)
      ? player.room[0]
      : player.room

    if (!room) {
      throw new Error(
        'Une salle associée à ton compte est introuvable.',
      )
    }

    return {
      id: room.id,
      name: room.name,
      code: room.code,
      admin_id: room.admin_id,
      player_id: player.id,
      player_name: player.name,
    }
  })
}