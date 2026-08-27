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
import { useNavigate, useParams } from 'react-router-dom'

import { supabase } from '../lib/supabase'

import {
  createDay,
  getRoomByCode,
  getRoomDays,
  getRoomPlayers,
  updateDayStatus,
  type Day,
  type Player,
  type Room,
} from '../services/roomService'

import { getCurrentUser } from '../services/authService'

export default function RoomPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()

  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [days, setDays] = useState<Day[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  /*
   * ============================================================
   * Chargement initial de la salle
   * ============================================================
   */

  useEffect(() => {
    async function loadRoom() {
      if (!code) {
        setError('Code de salle invalide.')
        setLoading(false)
        return
      }

      try {
        setError('')

        // Utilisateur connecté
        const user = await getCurrentUser()

        if (!user) {
          setError(
            'Tu dois être connecté pour accéder à cette salle.',
          )
          setLoading(false)
          return
        }

        setUserId(user.id)

        // Récupérer la salle
        const roomData = await getRoomByCode(code)

        // Récupérer les joueurs et les journées
        const [playersData, daysData] =
          await Promise.all([
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

  /*
   * ============================================================
   * Realtime — Joueurs
   * ============================================================
   */

  useEffect(() => {
    if (!room) {
      return
    }

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

    return () => {
      supabase.removeChannel(playersChannel)
    }
  }, [room])

  /*
   * ============================================================
   * Realtime — Journées
   * ============================================================
   */

  useEffect(() => {
    if (!room) {
      return
    }

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
      supabase.removeChannel(daysChannel)
    }
  }, [room])

  /*
   * ============================================================
   * Création d'une journée
   * ============================================================
   */

  async function handleCreateDay() {
    if (!room) {
      return
    }

    const title = window.prompt(
      'Nom de la journée :',
    )

    if (!title?.trim()) {
      return
    }

    const theme = window.prompt(
      'Thème de la journée :',
    )

    if (!theme?.trim()) {
      return
    }

    try {
      setError('')

      await createDay(
        room.id,
        title.trim(),
        theme.trim(),
      )

      /*
       * Le Realtime va automatiquement
       * mettre la liste à jour.
       */
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de créer la journée.',
      )
    }
  }

  /*
   * ============================================================
   * Changement du statut d'une journée
   * ============================================================
   */

  async function handleUpdateDayStatus(
    dayId: string,
    status: Day['status'],
  ) {
    try {
      setError('')

      await updateDayStatus(
        dayId,
        status,
      )

      /*
       * Le Realtime mettra automatiquement
       * l'interface à jour.
       */
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de modifier la journée.',
      )
    }
  }

  /*
   * ============================================================
   * Ouvrir une journée
   * ============================================================
   */

  function handleOpenDay(dayId: string) {
    if (!room) {
      return
    }

    navigate(
      `/room/${room.code}/day/${dayId}`,
    )
  }

  /*
   * ============================================================
   * Loading
   * ============================================================
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

  /*
   * ============================================================
   * Erreur de chargement
   * ============================================================
   */

  if (error && !room) {
    return (
      <Container
        maxWidth="sm"
        sx={{ py: 5 }}
      >
        <Alert severity="error">
          {error}
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

  /*
   * ============================================================
   * Vérifier si l'utilisateur est admin
   * ============================================================
   */

  const isAdmin = room.admin_id === userId

  /*
   * ============================================================
   * Interface
   * ============================================================
   */

  return (
    <Container
      maxWidth="sm"
      sx={{ py: 5 }}
    >
      <Stack spacing={3}>

        {/* =====================================================
            En-tête
            ===================================================== */}

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

        {/* =====================================================
            Erreur
            ===================================================== */}

        {error && (
          <Alert
            severity="error"
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}

        {/* =====================================================
            Code de la salle
            ===================================================== */}

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

        {/* =====================================================
            Joueurs
            ===================================================== */}

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

        <Button
          variant="contained"
          size="large"
          onClick={() =>
            navigate(`/room/${room.code}/ranking`)
          }
        >
          Classement final
        </Button>

        {/* =====================================================
            Journées
            ===================================================== */}

        <Paper
          elevation={0}
          sx={{
            p: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack spacing={2}>

            {/* -------------------------------------------------
                Titre + bouton
                ------------------------------------------------- */}

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

            {/* -------------------------------------------------
                Aucune journée
                ------------------------------------------------- */}

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
                    onClick={() =>
                      handleOpenDay(day.id)
                    }
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      transition:
                        'border-color 0.2s, background-color 0.2s',

                      '&:hover': {
                        borderColor:
                          'primary.main',
                        backgroundColor:
                          'action.hover',
                      },
                    }}
                  >

                    <Stack spacing={1.5}>

                      {/* -------------------------------------------------
                          Informations journée
                          ------------------------------------------------- */}

                      <Box>

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

                      </Box>

                      {/* -------------------------------------------------
                          Statut
                          ------------------------------------------------- */}

                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Statut : {getStatusLabel(
                          day.status,
                        )}
                      </Typography>

                      {/* -------------------------------------------------
                          Boutons admin
                          ------------------------------------------------- */}

                      {isAdmin && (
                        <Stack
                          direction="row"
                          spacing={1}
                          flexWrap="wrap"
                          useFlexGap
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >

                          {/* upcoming → active */}

                          {day.status ===
                            'upcoming' && (
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() =>
                                handleUpdateDayStatus(
                                  day.id,
                                  'active',
                                )
                              }
                            >
                              Démarrer
                            </Button>
                          )}

                          {/* active → submission */}

                          {day.status ===
                            'active' && (
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() =>
                                handleUpdateDayStatus(
                                  day.id,
                                  'submission',
                                )
                              }
                            >
                              Ouvrir les soumissions
                            </Button>
                          )}

                          {/* submission → voting */}

                          {day.status ===
                            'submission' && (
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() =>
                                handleUpdateDayStatus(
                                  day.id,
                                  'voting',
                                )
                              }
                            >
                              Commencer les votes
                            </Button>
                          )}

                          {/* voting → finished */}

                          {day.status ===
                            'voting' && (
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() =>
                                handleUpdateDayStatus(
                                  day.id,
                                  'finished',
                                )
                              }
                            >
                              Terminer la journée
                            </Button>
                          )}

                        </Stack>
                      )}

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

/*
 * ================================================================
 * Traduction des statuts
 * ================================================================
 */

function getStatusLabel(
  status: Day['status'],
): string {
  switch (status) {
    case 'upcoming':
      return 'À venir'

    case 'active':
      return 'En cours'

    case 'submission':
      return 'Soumissions'

    case 'voting':
      return 'Votes'

    case 'finished':
      return 'Terminée'

    default:
      return status
  }
}