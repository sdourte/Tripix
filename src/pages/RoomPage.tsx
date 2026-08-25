import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
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
  getRoomByCode,
  getRoomPlayers,
} from '../services/roomService'

interface Room {
  id: string
  name: string
  code: string
  admin_id: string
}

interface Player {
  id: string
  user_id: string
  name: string
}

export default function RoomPage() {
  const { code } = useParams<{ code: string }>()

  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Chargement initial de la salle
  useEffect(() => {
    async function loadRoom() {
      if (!code) {
        setError('Code de salle invalide.')
        setLoading(false)
        return
      }

      try {
        const roomData = await getRoomByCode(code)
        const playersData = await getRoomPlayers(roomData.id)

        setRoom(roomData)
        setPlayers(playersData)
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

  // Synchronisation en temps réel des joueurs
  useEffect(() => {
    if (!room) {
      return
    }

    const channel = supabase
      .channel(`room-${room.id}`)
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
            const updatedPlayers = await getRoomPlayers(room.id)

            setPlayers(updatedPlayers)
          } catch (err) {
            console.error(
              'Impossible de mettre à jour les joueurs :',
              err,
            )
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [room])

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

  if (error || !room) {
    return (
      <Container maxWidth="sm" sx={{ py: 5 }}>
        <Alert severity="error">
          {error || 'Salle introuvable.'}
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm" sx={{ py: 5 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {room.name}
          </Typography>

          <Typography color="text.secondary">
            Salle Tripix
          </Typography>
        </Box>

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

        <Paper
          elevation={0}
          sx={{
            p: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack spacing={2}>
            <Typography variant="h6" fontWeight={700}>
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

                  {player.user_id === room.admin_id && (
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
      </Stack>
    </Container>
  )
}