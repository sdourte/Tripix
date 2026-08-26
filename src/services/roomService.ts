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

export type DayStatus =
  | 'upcoming'
  | 'active'
  | 'submission'
  | 'slideshow'
  | 'voting'
  | 'finished'

export interface Day {
  id: string
  room_id: string
  day_number: number
  title: string | null
  theme: string | null
  status: DayStatus
  created_at: string
}

/* ============================================================
   ROOMS
   ============================================================ */

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

/* ============================================================
   DAYS
   ============================================================ */

/**
 * Récupère toutes les journées d'une salle.
 */
export async function getRoomDays(
  roomId: string,
): Promise<Day[]> {
  const { data, error } = await supabase
    .from('days')
    .select(`
      id,
      room_id,
      day_number,
      title,
      theme,
      status,
      created_at
    `)
    .eq('room_id', roomId)
    .order('day_number', {
      ascending: true,
    })

  if (error) {
    console.error(
      'Erreur getRoomDays:',
      error,
    )

    throw new Error(error.message)
  }

  return data
}

/**
 * Crée une nouvelle journée.
 */
export async function createDay(
  roomId: string,
  title: string,
  theme: string,
): Promise<Day> {
  const { data, error } = await supabase.rpc(
    'create_day',
    {
      target_room_id: roomId,
      day_title: title,
      day_theme: theme,
    },
  )

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Modifie le statut d'une journée.
 */
export async function updateDayStatus(
  dayId: string,
  status: DayStatus,
): Promise<Day> {
  const { data, error } = await supabase.rpc(
    'update_day_status',
    {
      target_day_id: dayId,
      new_status: status,
    },
  )

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/* ============================================================
   PLAYERS
   ============================================================ */

/**
 * Récupère le joueur correspondant à l'utilisateur
 * actuellement connecté dans une salle donnée.
 *
 * IMPORTANT :
 * Cette fonction attend bien un roomId.
 */
export async function getCurrentPlayer(
  roomId: string,
): Promise<Player> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  if (!user) {
    throw new Error(
      'Utilisateur non connecté.',
    )
  }

  const { data, error } = await supabase
    .from('players')
    .select('id, user_id, name')
    .eq('room_id', roomId)
    .eq('user_id', user.id)
    .single()

  if (error) {
    throw new Error(
      'Impossible de retrouver ton joueur dans cette salle.',
    )
  }

  return data
}

/**
 * Récupère le joueur actuellement connecté
 * à partir d'un identifiant de journée.
 *
 * La journée permet d'abord de retrouver la salle,
 * puis le joueur dans cette salle.
 */
export async function getCurrentPlayerForDay(
  dayId: string,
): Promise<Player> {
  const { data: day, error: dayError } =
    await supabase
      .from('days')
      .select('room_id')
      .eq('id', dayId)
      .single()

  if (dayError || !day) {
    throw new Error(
      'Impossible de retrouver la salle de cette journée.',
    )
  }

  return getCurrentPlayer(day.room_id)
}

/* ============================================================
   PHOTOS
   ============================================================ */

export interface Photo {
  id: string
  day_id: string
  player_id: string
  storage_path: string
  photo_number: number
  slideshow_order: number | null
  created_at: string
}

/**
 * Ajoute une photo dans la base de données.
 */
export async function addPhoto(
  dayId: string,
  playerId: string,
  storagePath: string,
  photoNumber: number,
) {
  const { data, error } =
    await supabase.rpc(
      'add_photo',
      {
        p_day_id: dayId,
        p_player_id: playerId,
        p_storage_path: storagePath,
        p_photo_number: photoNumber,
      },
    )

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Récupère les photos d'un joueur pour une journée.
 */
export async function getPlayerPhotos(
  dayId: string,
  playerId: string,
): Promise<Photo[]> {
  const { data, error } = await supabase
    .from('photos')
    .select(`
      id,
      day_id,
      player_id,
      storage_path,
      photo_number,
      slideshow_order,
      created_at
    `)
    .eq('day_id', dayId)
    .eq('player_id', playerId)
    .order('photo_number', {
      ascending: true,
    })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

/**
 * Génère une URL signée pour une photo.
 */
export async function getPhotoUrl(
  storagePath: string,
): Promise<string> {
  const {
    data,
    error,
  } = await supabase.storage
    .from('tripix-photos')
    .createSignedUrl(
      storagePath,
      60 * 60,
    )

  if (error) {
    throw new Error(error.message)
  }

  return data.signedUrl
}

/* ============================================================
   SLIDESHOW
   ============================================================ */

export interface SlideshowPhoto extends Photo {
  player_name?: string
  day_number?: number
  day_theme?: string | null
}

export async function prepareRoomSlideshow(
  roomId: string,
) {
  const { data, error } =
    await supabase.rpc(
      'prepare_room_slideshow',
      {
        target_room_id: roomId,
      },
    )

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function getRoomSlideshowPhotos(
  roomId: string,
): Promise<Photo[]> {
  const { data, error } =
    await supabase.rpc(
      'get_room_slideshow_photos',
      {
        target_room_id: roomId,
      },
    )

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

/**
 * Récupère les photos du diaporama d'une journée.
 */
export async function getDaySlideshowPhotos(
  dayId: string,
): Promise<Photo[]> {
  const { data: day, error: dayError } =
    await supabase
      .from('days')
      .select('room_id')
      .eq('id', dayId)
      .single()

  if (dayError || !day) {
    throw new Error(
      'Impossible de retrouver la salle de cette journée.',
    )
  }

  return getRoomSlideshowPhotos(
    day.room_id,
  )
}

/**
 * Passe toutes les journées de la salle
 * en phase de vote.
 */
export async function startDayVoting(
  dayId: string,
) {
  const { data, error } =
    await supabase.rpc(
      'start_day_voting',
      {
        target_day_id: dayId,
      },
    )

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/* ============================================================
   VOTING
   ============================================================ */

export interface VotingPhoto extends Photo {
  player_name: string
}

export interface VoteInput {
  photo_id: string
  points: number
}

export interface Vote {
  photo_id: string
  points: number
}

/**
 * Récupère toutes les photos d'une journée
 * pendant la phase de vote.
 *
 * La fonction SQL retourne également les propres
 * photos du joueur connecté.
 */
export async function getDayVotingPhotos(
  dayId: string,
): Promise<VotingPhoto[]> {
  const { data, error } =
    await supabase.rpc(
      'get_day_voting_photos',
      {
        target_day_id: dayId,
      },
    )

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

/**
 * Récupère les votes déjà enregistrés
 * par le joueur actuellement connecté.
 */
export async function getMyVotes(
  dayId: string,
): Promise<Vote[]> {
  const { data, error } =
    await supabase.rpc(
      'get_my_votes',
      {
        target_day_id: dayId,
      },
    )

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

/**
 * Enregistre ou modifie un vote.
 *
 * IMPORTANT :
 * La fonction SQL s'appelle submit_photo_vote.
 */
export async function submitVote(
  photoId: string,
  points: number,
): Promise<Vote> {
  const { data, error } =
    await supabase.rpc(
      'submit_photo_vote',
      {
        target_photo_id: photoId,
        target_points: points,
      },
    )

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error(
      'Aucun vote n’a été retourné par le serveur.',
    )
  }

  return {
    photo_id: data.photo_id,
    points: data.points,
  }
}