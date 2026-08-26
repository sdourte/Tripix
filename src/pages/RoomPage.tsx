import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useParams } from 'react-router-dom'

import { supabase } from '../lib/supabase'

import {
  createDay,
  getRoomByCode,
  getRoomDays,
  getRoomPlayers,
  type Day,
  type Player,
  type Room,
} from '../services/roomService'

import { getCurrentUser } from '../services/authService'

export default function RoomPage() {
  const { code } = useParams<{ code: string }>()

  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [days, setDays] = useState<Day[]>([])
  const [userId, setUserId] = useState<string | null>(
    null,
  )

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  /**
   * Charge les données initiales de la salle.
   */
  useEffect(() => {
    async function loadRoom() {
      if (!code) {
        setError('Code de salle invalide.')
        setLoading(false)
        return
      }

      try {
        const user = await getCurrentUser()

        if (!user) {
          setError(
            'Tu dois être connecté pour accéder à cette salle.',
          )
          setLoading(false)
          return
        }

        setUserId(user.id)

        const roomData = await getRoomByCode(code)

        const [
          playersData,
          daysData,
        ] = await Promise.all([
          getRoomPlayers(roomData.id),
          getRoomDays(roomData.id),
        ])

        setRoom(roomData)
        setPlayers(playersData)
        setDays(daysData)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Impossible de charger la salle.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadRoom()
  }, [code])

  /**
   * Realtime pour les joueurs et les journées.
   */
  useEffect(() => {
    if (!room) {
      return
    }

    /**
     * Realtime — joueurs
     */
    const playersChannel = supabase
      .channel(`room-${room.id}-players`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${room.id}`,
        },
        async () => {
          try {
            const updatedPlayers =
              await getRoomPlayers(room.id)

            setPlayers(updatedPlayers)
          } catch (err) {
            console.error(
              'Erreur lors de la mise à jour des joueurs :',
              err,
            )
          }
        },
      )
      .subscribe()

    /**
     * Realtime — journées
     */
    const daysChannel = supabase
      .channel(`room-${room.id}-days`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'days',
          filter: `room_id=eq.${room.id}`,
        },
        async () => {
          try {
            const updatedDays =
              await getRoomDays(room.id)

            setDays(updatedDays)
          } catch (err) {
            console.error(
              'Erreur lors de la mise à jour des journées :',
              err,
            )
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(playersChannel)
      supabase.removeChannel(daysChannel)
    }
  }, [room])

  /**
   * Création d'une journée.
   *
   * Pour le moment on utilise prompt()
   * afin de tester rapidement toute la logique.
   */
  async function handleCreateDay() {
    if (!room) {
      return
    }

    const title = window.prompt(
      'Nom de la journée :',
    )

    if (!title) {
      return
    }

    const theme = window.prompt(
      'Thème de la journée :',
    )

    if (!theme) {
      return
    }

    try {
      setError('')

      const newDay = await createDay(
        room.id,
        title,
        theme,
      )

      setDays((currentDays) => [
        ...currentDays,
        newDay,
      ])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de créer la journée.',
      )
    }
  }

  /**
   * Chargement initial.
   */
  if (loading) {
    return (
      <Container
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Container>
    )
  }

  /**
   * Erreur ou salle inexistante.
   */
  if (error && !room) {
    return (
      <Container
        maxWidth="sm"
        sx={{ py: 5 }}
      >
        <Alert severity="error">
          {error || 'Salle introuvable.'}
        </Alert>
      </Container>
    )
  }

  if (!room) {
    return (
      <Container
        maxWidth="sm"
        sx={{ py: 5 }}
      >
        <Alert severity="error">
          Salle introuvable.
        </Alert>
      </Container>
    )
  }

  const isAdmin = room.admin_id === userId

  return (
    <Container
      maxWidth="sm"
      sx={{ py: 5 }}
    >
      <Stack spacing={3}>

        {/* Informations générales */}
        <Box>
          <Typography
            variant="h4"
            fontWeight={700}
          >
            {room.name}
          </Typography>

          <Typography color="text.secondary">
            Salle Tripix
          </Typography>
        </Box>

        {/* Erreur */}
        {error && (
          <Alert
            severity="error"
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}

        {/* Code de la salle */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            textAlign: 'center',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
          >
            CODE DE LA SALLE
          </Typography>

          <Typography
            variant="h3"
            fontWeight={800}
            letterSpacing={4}
            sx={{ mt: 1 }}
          >
            {room.code}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            Donne ce code aux autres joueurs.
          </Typography>
        </Paper>

        {/* Joueurs */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack spacing={2}>
            <Typography
              variant="h6"
              fontWeight={700}
            >
              Joueurs ({players.length})
            </Typography>

            <Divider />

            <Stack spacing={1.5}>
              {players.map((player) => (
                <Box
                  key={player.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography>
                    {player.name}
                  </Typography>

                  {player.user_id ===
                    room.admin_id && (
                    <Typography
                      variant="body2"
                      color="primary"
                      fontWeight={600}
                    >
                      ADMIN
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
          </Stack>
        </Paper>

        {/* Journées */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack spacing={2}>

            {/* Titre + bouton admin */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={2}
            >
              <Typography
                variant="h6"
                fontWeight={700}
              >
                Journées
              </Typography>

              {isAdmin && (
                <Button
                  variant="contained"
                  onClick={handleCreateDay}
                >
                  Ajouter
                </Button>
              )}
            </Stack>

            <Divider />

            {/* Aucune journée */}
            {days.length === 0 ? (
              <Typography color="text.secondary">
                Aucune journée n'a encore été créée.
              </Typography>
            ) : (
              <Stack spacing={2}>

                {days.map((day) => (
                  <Paper
                    key={day.id}
                    elevation={0}
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Stack spacing={0.5}>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        fontWeight={600}
                      >
                        JOUR {day.day_number}
                      </Typography>

                      <Typography
                        variant="h6"
                        fontWeight={700}
                      >
                        {day.title}
                      </Typography>

                      <Typography>
                        Thème : {day.theme}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Statut : {day.status}
                      </Typography>

                    </Stack>
                  </Paper>
                ))}

              </Stack>
            )}

          </Stack>
        </Paper>

      </Stack>
    </Container>
  )
}