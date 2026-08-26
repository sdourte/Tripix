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

export interface Photo {
  id: string
  day_id: string
  player_id: string
  storage_path: string
  photo_number: number
  created_at: string
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
 *
 * La vérification de l'admin est effectuée
 * côté PostgreSQL dans create_day().
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
 * Met à jour le statut d'une journée.
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

/**
 * Récupère le joueur correspondant
 * à l'utilisateur actuellement connecté
 * dans une salle donnée.
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
    .select('*')
    .eq('room_id', roomId)
    .eq('user_id', user.id)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Ajoute une photo ou remplace une photo existante.
 *
 * La fonction PostgreSQL add_photo() gère le
 * ON CONFLICT sur :
 *
 * day_id + player_id + photo_number
 *
 * Le remplacement n'est autorisé côté SQL
 * que lorsque la journée est en SUBMISSION.
 */
export async function addPhoto(
  dayId: string,
  playerId: string,
  storagePath: string,
  photoNumber: number,
): Promise<Photo> {
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

  return data as Photo
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
    .select('*')
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
 * Génère une URL temporaire permettant
 * d'afficher une photo privée du Storage.
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

/**
 * Remplace directement un fichier dans le Storage.
 *
 * Cette fonction est utilisée uniquement pour
 * remplacer une photo existante.
 *
 * Le contrôle définitif des droits reste effectué
 * côté PostgreSQL par add_photo().
 */
export async function replaceStoragePhoto(
  storagePath: string,
  file: File,
): Promise<void> {
  const { error } =
    await supabase.storage
      .from('tripix-photos')
      .upload(
        storagePath,
        file,
        {
          upsert: true,
          contentType: file.type,
        },
      )

  if (error) {
    throw new Error(error.message)
  }
}