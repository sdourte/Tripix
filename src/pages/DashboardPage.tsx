import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'

import {
  getUserRooms,
  type UserRoom,
} from '../services/roomService'

import {
  getCurrentUser,
  signOut,
} from '../services/authService'

export default function DashboardPage() {
  const navigate = useNavigate()

  const [rooms, setRooms] = useState<UserRoom[]>([])
  const [userId, setUserId] = useState<string | null>(
    null,
  )

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadRooms() {
    try {
      setLoading(true)
      setError('')

      const user = await getCurrentUser()

      if (!user) {
        navigate('/login', {
          replace: true,
        })

        return
      }

      setUserId(user.id)

      const data = await getUserRooms()

      setRooms(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de récupérer tes salles.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRooms()
  }, [])

  async function handleSignOut() {
    try {
      await signOut()

      navigate('/login', {
        replace: true,
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de se déconnecter.',
      )
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 5 }}>
      <Stack spacing={4}>

        {/* En-tête */}
        <Stack spacing={1}>
          <Typography
            variant="h4"
            fontWeight={700}
          >
            Mes salles
          </Typography>

          <Typography color="text.secondary">
            Retrouve ici toutes les salles auxquelles
            tu participes.
          </Typography>
        </Stack>

        {/* Erreur */}
        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        {/* Chargement */}
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              py: 5,
            }}
          >
            <CircularProgress />
          </Box>
        ) : rooms.length === 0 ? (

          /* Aucune salle */
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: 'center',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Stack spacing={2}>
              <Typography
                variant="h6"
                fontWeight={700}
              >
                Aucune salle
              </Typography>

              <Typography color="text.secondary">
                Tu ne participes encore à aucune salle.
              </Typography>

              <Stack spacing={1}>
                <Button
                  variant="contained"
                  onClick={() =>
                    navigate('/create-room')
                  }
                >
                  Créer une salle
                </Button>

                <Button
                  variant="outlined"
                  onClick={() =>
                    navigate('/join-room')
                  }
                >
                  Rejoindre une salle
                </Button>
              </Stack>
            </Stack>
          </Paper>

        ) : (

          /* Liste des salles */
          <>
            <Stack spacing={2}>
              {rooms.map((room) => {
                const isAdmin =
                  room.admin_id === userId

                return (
                  <Paper
                    key={room.id}
                    elevation={0}
                    sx={{
                      p: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Stack spacing={2}>

                      {/* Nom + statut */}
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        spacing={2}
                      >
                        <Stack spacing={0.5}>
                          <Typography
                            variant="h6"
                            fontWeight={700}
                          >
                            {room.name}
                          </Typography>

                          <Typography
                            variant="body2"
                            color="text.secondary"
                          >
                            Code : {room.code}
                          </Typography>
                        </Stack>

                        <Typography
                          variant="body2"
                          color={
                            isAdmin
                              ? 'primary'
                              : 'text.secondary'
                          }
                          fontWeight={600}
                        >
                          {isAdmin
                            ? 'ADMIN'
                            : 'JOUEUR'}
                        </Typography>
                      </Stack>

                      {/* Pseudo */}
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Tu joues sous le nom :{' '}
                        <strong>
                          {room.player_name}
                        </strong>
                      </Typography>

                      {/* Bouton */}
                      <Button
                        variant="contained"
                        onClick={() =>
                          navigate(
                            `/room/${room.code}`,
                          )
                        }
                      >
                        Ouvrir la salle
                      </Button>
                    </Stack>
                  </Paper>
                )
              })}
            </Stack>

            {/* Actions */}
            <Stack spacing={1}>
              <Button
                variant="contained"
                onClick={() =>
                  navigate('/create-room')
                }
              >
                Créer une salle
              </Button>

              <Button
                variant="outlined"
                onClick={() =>
                  navigate('/join-room')
                }
              >
                Rejoindre une salle
              </Button>
            </Stack>
          </>
        )}

        {/* Déconnexion */}
        <Button
          variant="text"
          color="inherit"
          onClick={handleSignOut}
        >
          Se déconnecter
        </Button>
      </Stack>
    </Container>
  )
}