import {
  useEffect,
  useState,
} from 'react'

import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material'

import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'

import {
  useNavigate,
  useParams,
} from 'react-router-dom'

import {
  getFinalRoomRanking,
  getRoomByCode,
  type FinalPlayerRanking,
  type Room,
} from '../services/roomService'

export default function FinalRankingPage() {
  const { code } = useParams<{
    code: string
  }>()

  const navigate = useNavigate()

  const [room, setRoom] =
    useState<Room | null>(null)

  const [ranking, setRanking] =
    useState<FinalPlayerRanking[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  /* ==========================================================
     CHARGEMENT DU CLASSEMENT
     ========================================================== */

  useEffect(() => {
    async function loadRanking() {
      if (!code) {
        setError('Salle invalide.')
        setLoading(false)
        return
      }

      try {
        const roomData =
          await getRoomByCode(code)

        const rankingData =
          await getFinalRoomRanking(
            roomData.id,
          )

        setRoom(roomData)
        setRanking(rankingData)
      } catch (err) {
        console.error(
          'Erreur classement final:',
          err,
        )

        setError(
          err instanceof Error
            ? err.message
            : 'Impossible de charger le classement.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadRanking()
  }, [code])

  /* ==========================================================
     ACTUALISATION AUTOMATIQUE
     ========================================================== */

  useEffect(() => {
    if (!room) {
      return
    }

    const interval =
      window.setInterval(
        async () => {
          try {
            const rankingData =
              await getFinalRoomRanking(
                room.id,
              )

            setRanking(
              rankingData,
            )
          } catch (err) {
            console.error(
              'Erreur actualisation classement:',
              err,
            )
          }
        },
        3000,
      )

    return () => {
      window.clearInterval(
        interval,
      )
    }
  }, [room?.id])

  /* ==========================================================
     LOADING
     ========================================================== */

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  /* ==========================================================
     ERROR
     ========================================================== */

  if (error || !room) {
    return (
      <Container
        maxWidth="md"
        sx={{
          py: 5,
        }}
      >
        <Alert severity="error">
          {error ||
            'Impossible de charger la salle.'}
        </Alert>
      </Container>
    )
  }

  /* ==========================================================
     PAGE
     ========================================================== */

  return (
    <Container
      maxWidth="md"
      sx={{
        py: {
          xs: 3,
          md: 6,
        },
      }}
    >
      <Stack spacing={4}>

        {/* ==================================================
            HEADER
            ================================================== */}

        <Box
          sx={{
            textAlign: 'center',
          }}
        >
          <EmojiEventsIcon
            sx={{
              fontSize: 60,
            }}
          />

          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
            }}
          >
            Classement final
          </Typography>

          <Typography
            color="text.secondary"
            sx={{
              mt: 1,
            }}
          >
            {room.name}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1,
            }}
          >
            Seules les journées
            terminées sont
            comptabilisées.
          </Typography>
        </Box>

        {/* ==================================================
            CLASSEMENT
            ================================================== */}

        <Card>
          <CardContent>
            <Stack spacing={2}>

              {ranking.length === 0 ? (
                <Typography
                  color="text.secondary"
                  sx={{
                    textAlign: 'center',
                    py: 2,
                  }}
                >
                  Aucun classement
                  disponible pour
                  le moment.
                </Typography>
              ) : (
                ranking.map(
                  (
                    player,
                    index,
                  ) => (
                    <Box
                      key={
                        player.player_id
                      }
                      sx={{
                        display:
                          'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'space-between',
                        gap: 2,
                        p: 2,
                        borderRadius: 2,
                        backgroundColor:
                          index < 3
                            ? 'action.hover'
                            : 'transparent',
                      }}
                    >

                      {/* JOUEUR */}

                      <Stack
                        direction="row"
                        spacing={2}
                        sx={{
                          alignItems:
                            'center',
                          minWidth: 0,
                        }}
                      >
                        <Typography
                          variant="h5"
                          sx={{
                            fontWeight: 800,
                            minWidth: 45,
                          }}
                        >
                          {index ===
                          0
                            ? '🥇'
                            : index ===
                                1
                              ? '🥈'
                              : index ===
                                  2
                                ? '🥉'
                                : index +
                                  1}
                        </Typography>

                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight:
                              index < 3
                                ? 800
                                : 600,
                            overflow:
                              'hidden',
                            textOverflow:
                              'ellipsis',
                            whiteSpace:
                              'nowrap',
                          }}
                        >
                          {
                            player.player_name
                          }
                        </Typography>
                      </Stack>

                      {/* POINTS */}

                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 800,
                          whiteSpace:
                            'nowrap',
                        }}
                      >
                        {
                          player.total_points
                        }{' '}
                        pts
                      </Typography>

                    </Box>
                  ),
                )
              )}

            </Stack>
          </CardContent>
        </Card>

        {/* ==================================================
            RETOUR
            ================================================== */}

        <Box
          sx={{
            display: 'flex',
            justifyContent:
              'center',
          }}
        >
          <Typography
            component="button"
            onClick={() =>
              navigate(-1)
            }
            sx={{
              border: 0,
              background: 'none',
              cursor: 'pointer',
              color:
                'text.secondary',
              font: 'inherit',
              p: 1,
            }}
          >
            Retour
          </Typography>
        </Box>

      </Stack>
    </Container>
  )
}