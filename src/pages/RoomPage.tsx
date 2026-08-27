import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  TextField,
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
   * ÉDITION D'UNE JOURNÉE
   * ============================================================
   */

  const [editingDay, setEditingDay] =
    useState<Day | null>(null)

  const [editTitle, setEditTitle] =
    useState('')

  const [editTheme, setEditTheme] =
    useState('')

  const [savingEdit, setSavingEdit] =
    useState(false)

  /*
   * ============================================================
   * MODIFICATION DU STATUT
   * ============================================================
   */

  const [statusEditingDay, setStatusEditingDay] =
    useState<Day | null>(null)

  const [selectedStatus, setSelectedStatus] =
    useState<Day['status']>('upcoming')

  const [savingStatus, setSavingStatus] =
    useState(false)

  /*
   * ============================================================
   * SUPPRESSION D'UNE JOURNÉE
   * ============================================================
   */

  const [deletingDay, setDeletingDay] =
    useState<Day | null>(null)

  const [deleting, setDeleting] =
    useState(false)

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

        /*
         * Utilisateur connecté
         */

        const user = await getCurrentUser()

        if (!user) {
          setError(
            'Tu dois être connecté pour accéder à cette salle.',
          )
          setLoading(false)
          return
        }

        setUserId(user.id)

        /*
         * Récupérer la salle
         */

        const roomData =
          await getRoomByCode(code)

        /*
         * Récupérer les joueurs et les journées
         */

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

  /*
   * ============================================================
   * Realtime — Joueurs
   * ============================================================
   *
   * Lorsqu'un participant rejoint ou quitte la salle,
   * tous les utilisateurs présents voient la liste
   * mise à jour automatiquement.
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
      supabase.removeChannel(
        playersChannel,
      )
    }
  }, [room?.id])

  /*
   * ============================================================
   * Realtime — Journées
   * ============================================================
   *
   * Toute création, modification ou suppression d'une journée
   * est automatiquement répercutée chez tous les utilisateurs.
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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(
            'Realtime journées connecté pour la salle',
            room.id,
          )
        }

        if (status === 'CHANNEL_ERROR') {
          console.error(
            'Erreur Realtime sur les journées.',
          )
        }

        if (status === 'TIMED_OUT') {
          console.error(
            'Timeout de la connexion Realtime aux journées.',
          )
        }
      })

    return () => {
      supabase.removeChannel(daysChannel)
    }
  }, [room?.id])

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

      const newDay = await createDay(
        room.id,
        title.trim(),
        theme.trim(),
      )

      /*
       * Mise à jour locale immédiate.
       *
       * Le Realtime recevra également l'INSERT.
       * On vérifie donc que la journée n'existe pas déjà.
       */

      setDays((currentDays) => {
        const alreadyExists =
          currentDays.some(
            (day) => day.id === newDay.id,
          )

        if (alreadyExists) {
          return currentDays
        }

        return [
          ...currentDays,
          newDay,
        ].sort(
          (a, b) =>
            a.day_number -
            b.day_number,
        )
      })
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

      const updatedDay =
        await updateDayStatus(
          dayId,
          status,
        )

      /*
       * Mise à jour locale immédiate.
       */

      setDays((currentDays) =>
        currentDays.map((day) =>
          day.id === updatedDay.id
            ? updatedDay
            : day,
        ),
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de modifier le statut de la journée.',
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
   * Ouvrir la fenêtre de modification
   * ============================================================
   */

  function handleOpenEditDay(day: Day) {
    setEditingDay(day)
    setEditTitle(day.title)
    setEditTheme(day.theme)
    setError('')
  }

  /*
   * ============================================================
   * Fermer la fenêtre de modification
   * ============================================================
   */

  function handleCloseEditDay() {
    if (savingEdit) {
      return
    }

    setEditingDay(null)
    setEditTitle('')
    setEditTheme('')
  }

  /*
   * ============================================================
   * Enregistrer les modifications d'une journée
   * ============================================================
   */

  async function handleSaveEditDay() {
    if (!editingDay) {
      return
    }

    const title = editTitle.trim()
    const theme = editTheme.trim()

    if (!title) {
      setError(
        'Le nom de la journée est obligatoire.',
      )
      return
    }

    if (!theme) {
      setError(
        'Le thème de la journée est obligatoire.',
      )
      return
    }

    try {
      setSavingEdit(true)
      setError('')

      /*
       * UPDATE direct sur la table days.
       *
       * La policy RLS :
       *
       * "Admins can update days in their rooms"
       *
       * vérifie côté PostgreSQL que l'utilisateur est
       * bien administrateur de la salle.
       */

      const { data, error: updateError } =
        await supabase
          .from('days')
          .update({
            title,
            theme,
          })
          .eq('id', editingDay.id)
          .select(`
            id,
            room_id,
            day_number,
            title,
            theme,
            status,
            created_at
          `)
          .single()

      if (updateError) {
        throw new Error(
          updateError.message,
        )
      }

      if (!data) {
        throw new Error(
          'La journée modifiée n’a pas été retournée.',
        )
      }

      /*
       * Mise à jour locale immédiate.
       */

      setDays((currentDays) =>
        currentDays.map((day) =>
          day.id === data.id
            ? data
            : day,
        ),
      )

      /*
       * Fermer la fenêtre.
       */

      setEditingDay(null)
      setEditTitle('')
      setEditTheme('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de modifier la journée.',
      )
    } finally {
      setSavingEdit(false)
    }
  }

  /*
   * ============================================================
   * Ouvrir la modification du statut
   * ============================================================
   */

  function handleOpenStatusEdit(day: Day) {
    setStatusEditingDay(day)
    setSelectedStatus(day.status)
    setError('')
  }

  /*
   * ============================================================
   * Fermer la modification du statut
   * ============================================================
   */

  function handleCloseStatusEdit() {
    if (savingStatus) {
      return
    }

    setStatusEditingDay(null)
  }

  /*
   * ============================================================
   * Enregistrer le nouveau statut
   * ============================================================
   */

  async function handleSaveStatusEdit() {
    if (!statusEditingDay) {
      return
    }

    try {
      setSavingStatus(true)
      setError('')

      const updatedDay =
        await updateDayStatus(
          statusEditingDay.id,
          selectedStatus,
        )

      /*
       * Mise à jour locale immédiate.
       */

      setDays((currentDays) =>
        currentDays.map((day) =>
          day.id === updatedDay.id
            ? updatedDay
            : day,
        ),
      )

      /*
       * Fermer la fenêtre.
       */

      setStatusEditingDay(null)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de modifier le statut.',
      )
    } finally {
      setSavingStatus(false)
    }
  }

  /*
   * ============================================================
   * Ouvrir la confirmation de suppression
   * ============================================================
   */

  function handleOpenDeleteDay(day: Day) {
    setDeletingDay(day)
    setError('')
  }

  /*
   * ============================================================
   * Fermer la confirmation de suppression
   * ============================================================
   */

  function handleCloseDeleteDay() {
    if (deleting) {
      return
    }

    setDeletingDay(null)
  }

  /*
   * ============================================================
   * Supprimer une journée
   * ============================================================
   */

  async function handleDeleteDay() {
    if (!deletingDay) {
      return
    }

    try {
      setDeleting(true)
      setError('')

      /*
       * DELETE direct sur la table days.
       *
       * La policy RLS :
       *
       * "Admins can delete days in their rooms"
       *
       * empêche un utilisateur classique de supprimer
       * une journée.
       */

      const { error: deleteError } =
        await supabase
          .from('days')
          .delete()
          .eq('id', deletingDay.id)

      if (deleteError) {
        throw new Error(
          deleteError.message,
        )
      }

      /*
       * Mise à jour locale immédiate.
       */

      setDays((currentDays) =>
        currentDays.filter(
          (day) =>
            day.id !== deletingDay.id,
        ),
      )

      setDeletingDay(null)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de supprimer la journée.',
      )
    } finally {
      setDeleting(false)
    }
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

  const isAdmin =
    room.admin_id === userId

  /*
   * ============================================================
   * Interface
   * ============================================================
   */

  return (
    <>
      <Container
        maxWidth="sm"
        sx={{
          py: {
            xs: 3,
            sm: 5,
          },
          px: {
            xs: 2,
            sm: 3,
          },
        }}
      >
        <Stack spacing={3}>

          {/* =====================================================
              En-tête
              ===================================================== */}

          <Box>
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{
                fontSize: {
                  xs: '1.8rem',
                  sm: '2.125rem',
                },
              }}
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
              p: {
                xs: 2.5,
                sm: 3,
              },
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
              sx={{
                mt: 1,
                fontSize: {
                  xs: '2.5rem',
                  sm: '3rem',
                },
              }}
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
              p: {
                xs: 2.5,
                sm: 3,
              },
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
                      gap: 2,
                    }}
                  >
                    <Typography
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        minWidth: 0,
                      }}
                    >
                      {player.name}
                    </Typography>

                    {player.user_id ===
                      room.admin_id && (
                      <Typography
                        variant="body2"
                        color="primary"
                        fontWeight={600}
                        sx={{
                          flexShrink: 0,
                        }}
                      >
                        ADMIN
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            </Stack>
          </Paper>

          {/* =====================================================
              Classement final
              ===================================================== */}

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() =>
              navigate(
                `/room/${room.code}/ranking`,
              )
            }
            sx={{
              minHeight: 52,
            }}
          >
            Classement final
          </Button>

          {/* =====================================================
              Journées
              ===================================================== */}

          <Paper
            elevation={0}
            sx={{
              p: {
                xs: 2,
                sm: 3,
              },
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Stack spacing={2}>

              {/* -------------------------------------------------
                  Titre + bouton
                  ------------------------------------------------- */}

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                }}
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
                    onClick={
                      handleCreateDay
                    }
                    sx={{
                      flexShrink: 0,
                      minWidth: {
                        xs: 92,
                        sm: 100,
                      },
                    }}
                  >
                    Ajouter
                  </Button>
                )}
              </Box>

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
                        handleOpenDay(
                          day.id,
                        )
                      }
                      sx={{
                        p: {
                          xs: 2,
                          sm: 2.5,
                        },
                        border: '1px solid',
                        borderColor:
                          'divider',
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

                        {/* ---------------------------------------
                            Informations journée
                            --------------------------------------- */}

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
                            sx={{
                              mt: 0.25,
                              wordBreak: 'break-word',
                            }}
                          >
                            {day.title}
                          </Typography>

                          <Typography
                            sx={{
                              wordBreak: 'break-word',
                            }}
                          >
                            Thème : {day.theme}
                          </Typography>
                        </Box>

                        {/* ---------------------------------------
                            Statut
                            --------------------------------------- */}

                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          Statut :{' '}
                          {getStatusLabel(
                            day.status,
                          )}
                        </Typography>

                        {/* ---------------------------------------
                            Boutons admin
                            --------------------------------------- */}

                        {isAdmin && (
                          <Box
                            onClick={(event) =>
                              event.stopPropagation()
                            }
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: {
                                xs: 'repeat(2, minmax(0, 1fr))',
                                sm: 'repeat(4, minmax(0, 1fr))',
                              },
                              gap: 1,
                              width: '100%',
                              pt: 0.5,
                            }}
                          >

                            {/* ===================================
                                Modifier
                                =================================== */}

                            <Button
                              variant="outlined"
                              size="small"
                              fullWidth
                              onClick={() =>
                                handleOpenEditDay(
                                  day,
                                )
                              }
                              sx={{
                                minHeight: {
                                  xs: 52,
                                  sm: 44,
                                },
                                px: 1,
                                whiteSpace: 'normal',
                                lineHeight: 1.2,
                              }}
                            >
                              Modifier
                            </Button>

                            {/* ===================================
                                Modifier le statut
                                =================================== */}

                            <Button
                              variant="outlined"
                              size="small"
                              fullWidth
                              onClick={() =>
                                handleOpenStatusEdit(
                                  day,
                                )
                              }
                              sx={{
                                minHeight: {
                                  xs: 52,
                                  sm: 44,
                                },
                                px: 1,
                                whiteSpace: 'normal',
                                lineHeight: 1.2,
                              }}
                            >
                              <Box
                                component="span"
                                sx={{
                                  display: {
                                    xs: 'inline',
                                    sm: 'none',
                                  },
                                }}
                              >
                                Statut
                              </Box>

                              <Box
                                component="span"
                                sx={{
                                  display: {
                                    xs: 'none',
                                    sm: 'inline',
                                  },
                                }}
                              >
                                Modifier le statut
                              </Box>
                            </Button>

                            {/* ===================================
                                Supprimer
                                =================================== */}

                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              fullWidth
                              onClick={() =>
                                handleOpenDeleteDay(
                                  day,
                                )
                              }
                              sx={{
                                minHeight: {
                                  xs: 52,
                                  sm: 44,
                                },
                                px: 1,
                                whiteSpace: 'normal',
                                lineHeight: 1.2,
                              }}
                            >
                              Supprimer
                            </Button>

                            {/* ===================================
                                upcoming → active
                                =================================== */}

                            {day.status ===
                              'upcoming' && (
                              <Button
                                variant="contained"
                                size="small"
                                fullWidth
                                onClick={() =>
                                  handleUpdateDayStatus(
                                    day.id,
                                    'active',
                                  )
                                }
                                sx={{
                                  minHeight: {
                                    xs: 52,
                                    sm: 44,
                                  },
                                  px: 1,
                                  whiteSpace: 'normal',
                                  lineHeight: 1.2,
                                }}
                              >
                                Démarrer
                              </Button>
                            )}

                            {/* ===================================
                                active → submission
                                =================================== */}

                            {day.status ===
                              'active' && (
                              <Button
                                variant="contained"
                                size="small"
                                fullWidth
                                onClick={() =>
                                  handleUpdateDayStatus(
                                    day.id,
                                    'submission',
                                  )
                                }
                                sx={{
                                  minHeight: {
                                    xs: 52,
                                    sm: 44,
                                  },
                                  px: 1,
                                  whiteSpace: 'normal',
                                  lineHeight: 1.2,
                                }}
                              >
                                <Box
                                  component="span"
                                  sx={{
                                    display: {
                                      xs: 'inline',
                                      sm: 'none',
                                    },
                                  }}
                                >
                                  Soumissions
                                </Box>

                                <Box
                                  component="span"
                                  sx={{
                                    display: {
                                      xs: 'none',
                                      sm: 'inline',
                                    },
                                  }}
                                >
                                  Ouvrir les soumissions
                                </Box>
                              </Button>
                            )}

                            {/* ===================================
                                submission → voting
                                =================================== */}

                            {day.status ===
                              'submission' && (
                              <Button
                                variant="contained"
                                size="small"
                                fullWidth
                                onClick={() =>
                                  handleUpdateDayStatus(
                                    day.id,
                                    'voting',
                                  )
                                }
                                sx={{
                                  minHeight: {
                                    xs: 52,
                                    sm: 44,
                                  },
                                  px: 1,
                                  whiteSpace: 'normal',
                                  lineHeight: 1.2,
                                }}
                              >
                                <Box
                                  component="span"
                                  sx={{
                                    display: {
                                      xs: 'inline',
                                      sm: 'none',
                                    },
                                  }}
                                >
                                  Commencer
                                </Box>

                                <Box
                                  component="span"
                                  sx={{
                                    display: {
                                      xs: 'none',
                                      sm: 'inline',
                                    },
                                  }}
                                >
                                  Commencer les votes
                                </Box>
                              </Button>
                            )}

                            {/* ===================================
                                voting → finished
                                =================================== */}

                            {day.status ===
                              'voting' && (
                              <Button
                                variant="contained"
                                size="small"
                                fullWidth
                                onClick={() =>
                                  handleUpdateDayStatus(
                                    day.id,
                                    'finished',
                                  )
                                }
                                sx={{
                                  minHeight: {
                                    xs: 52,
                                    sm: 44,
                                  },
                                  px: 1,
                                  whiteSpace: 'normal',
                                  lineHeight: 1.2,
                                }}
                              >
                                <Box
                                  component="span"
                                  sx={{
                                    display: {
                                      xs: 'inline',
                                      sm: 'none',
                                    },
                                  }}
                                >
                                  Terminer
                                </Box>

                                <Box
                                  component="span"
                                  sx={{
                                    display: {
                                      xs: 'none',
                                      sm: 'inline',
                                    },
                                  }}
                                >
                                  Terminer la journée
                                </Box>
                              </Button>
                            )}

                          </Box>
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

      {/* =========================================================
          DIALOG — MODIFIER UNE JOURNÉE
          ========================================================= */}

      <Dialog
        open={!!editingDay}
        onClose={handleCloseEditDay}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Modifier la journée
        </DialogTitle>

        <DialogContent>
          <Stack
            spacing={2}
            sx={{ pt: 1 }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
            >
              JOUR{' '}
              {editingDay?.day_number}
            </Typography>

            <TextField
              label="Nom de la journée"
              value={editTitle}
              onChange={(event) =>
                setEditTitle(
                  event.target.value,
                )
              }
              fullWidth
              autoFocus
              disabled={savingEdit}
            />

            <TextField
              label="Thème"
              value={editTheme}
              onChange={(event) =>
                setEditTheme(
                  event.target.value,
                )
              }
              fullWidth
              disabled={savingEdit}
            />
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            gap: 1,
          }}
        >
          <Button
            onClick={
              handleCloseEditDay
            }
            disabled={savingEdit}
          >
            Annuler
          </Button>

          <Button
            variant="contained"
            onClick={
              handleSaveEditDay
            }
            disabled={savingEdit}
          >
            {savingEdit
              ? 'Enregistrement...'
              : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* =========================================================
          DIALOG — MODIFIER LE STATUT
          ========================================================= */}

      <Dialog
        open={!!statusEditingDay}
        onClose={handleCloseStatusEdit}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Modifier le statut
        </DialogTitle>

        <DialogContent>
          <Stack
            spacing={2}
            sx={{ pt: 1 }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
            >
              JOUR{' '}
              {statusEditingDay?.day_number}
            </Typography>

            <Typography
              fontWeight={700}
            >
              {statusEditingDay?.title}
            </Typography>

            <TextField
              select
              label="Statut"
              value={selectedStatus}
              onChange={(event) =>
                setSelectedStatus(
                  event.target.value as Day['status'],
                )
              }
              fullWidth
              disabled={savingStatus}
              slotProps={{
                select: {
                  native: true,
                },
              }}
            >
              <option value="upcoming">
                À venir
              </option>

              <option value="active">
                En cours
              </option>

              <option value="submission">
                Soumissions
              </option>

              <option value="voting">
                Votes
              </option>

              <option value="finished">
                Terminée
              </option>
            </TextField>

            <Alert severity="info">
              Tu peux ici revenir à une étape
              précédente ou avancer manuellement
              la journée.
            </Alert>
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            gap: 1,
          }}
        >
          <Button
            onClick={
              handleCloseStatusEdit
            }
            disabled={savingStatus}
          >
            Annuler
          </Button>

          <Button
            variant="contained"
            onClick={
              handleSaveStatusEdit
            }
            disabled={savingStatus}
          >
            {savingStatus
              ? 'Enregistrement...'
              : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* =========================================================
          DIALOG — SUPPRIMER UNE JOURNÉE
          ========================================================= */}

      <Dialog
        open={!!deletingDay}
        onClose={
          handleCloseDeleteDay
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Supprimer la journée ?
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2}>
            <Typography>
              Tu es sur le point de supprimer :
            </Typography>

            <Typography
              fontWeight={700}
            >
              Jour {deletingDay?.day_number} —{' '}
              {deletingDay?.title}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              Cette action est définitive.
              Si cette journée contient déjà
              des données associées, la base de
              données peut empêcher sa suppression.
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            gap: 1,
          }}
        >
          <Button
            onClick={
              handleCloseDeleteDay
            }
            disabled={deleting}
          >
            Annuler
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={
              handleDeleteDay
            }
            disabled={deleting}
          >
            {deleting
              ? 'Suppression...'
              : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
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

    case 'slideshow':
      return 'Diaporama'

    case 'voting':
      return 'Votes'

    case 'finished':
      return 'Terminée'

    default:
      return status
  }
}