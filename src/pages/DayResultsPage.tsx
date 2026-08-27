import {
  useEffect,
  useState,
} from 'react'

import {
  Alert,
  Box,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Container,
  Divider,
  Stack,
  Typography,
} from '@mui/material'

import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'

import {
  useNavigate,
  useParams,
} from 'react-router-dom'

import {
  getDay,
  getDayPhotoRanking,
  getDayPlayerRanking,
  getPhotoUrl,
  type Day,
  type DayPhotoRanking,
  type DayPlayerRanking,
} from '../services/roomService'

interface DisplayPhoto
  extends DayPhotoRanking {
  url: string
}

export default function DayResultsPage() {
  const { dayId } = useParams<{
    dayId: string
  }>()

  const navigate = useNavigate()

  const [day, setDay] =
    useState<Day | null>(null)

  const [players, setPlayers] =
    useState<DayPlayerRanking[]>([])

  const [photos, setPhotos] =
    useState<DisplayPhoto[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  /* ==========================================================
     CHARGEMENT DES RÉSULTATS
     ========================================================== */

  useEffect(() => {
    async function loadResults() {
      if (!dayId) {
        setError(
          'Journée invalide.',
        )
        setLoading(false)
        return
      }

      try {
        const [
          dayData,
          playerRanking,
          photoRanking,
        ] = await Promise.all([
          getDay(dayId),
          getDayPlayerRanking(dayId),
          getDayPhotoRanking(dayId),
        ])

        setDay(dayData)
        setPlayers(playerRanking)

        const photosWithUrls =
          await Promise.all(
            photoRanking.map(
              async (photo) => ({
                ...photo,
                url: await getPhotoUrl(
                  photo.storage_path,
                ),
              }),
            ),
          )

        setPhotos(
          photosWithUrls,
        )
      } catch (err) {
        console.error(
          'Erreur chargement résultats:',
          err,
        )

        setError(
          err instanceof Error
            ? err.message
            : 'Impossible de charger les résultats.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadResults()
  }, [dayId])

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

  if (error || !day) {
    return (
      <Container
        maxWidth="md"
        sx={{
          py: 5,
        }}
      >
        <Alert severity="error">
          {error ||
            'Impossible de charger les résultats.'}
        </Alert>
      </Container>
    )
  }

  /* ==========================================================
     PAGE
     ========================================================== */

  return (
    <Container
      maxWidth="lg"
      sx={{
        py: {
          xs: 3,
          md: 5,
        },
      }}
    >
      <Stack spacing={4}>

        {/* ==================================================
            HEADER
            ================================================== */}

        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
          >
            Résultats
          </Typography>

          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
            }}
          >
            Jour {day.day_number}
          </Typography>

          {day.theme && (
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{
                mt: 1,
              }}
            >
              {day.theme}
            </Typography>
          )}
        </Box>

        {/* ==================================================
            CLASSEMENT JOUEURS
            ================================================== */}

        <Card>
          <CardContent>
            <Stack spacing={3}>

              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: 'center',
                }}
              >
                <EmojiEventsIcon />

                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                  }}
                >
                  Classement de la journée
                </Typography>
              </Stack>

              {players.length === 0 ? (
                <Typography
                  color="text.secondary"
                >
                  Aucun résultat disponible.
                </Typography>
              ) : (
                players.map(
                  (
                    player,
                    index,
                  ) => (
                    <Box
                      key={
                        player.player_id
                      }
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent:
                          'space-between',
                        gap: 2,
                      }}
                    >
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
                          sx={{
                            fontWeight: 800,
                            minWidth: 35,
                          }}
                        >
                          {index === 0
                            ? '🥇'
                            : index === 1
                              ? '🥈'
                              : index === 2
                                ? '🥉'
                                : `${index + 1}.`}
                        </Typography>

                        <Typography
                          sx={{
                            fontWeight: 600,
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

                      <Typography
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
            CLASSEMENT PHOTOS
            ================================================== */}

        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              mb: 1,
            }}
          >
            Classement des photos
          </Typography>

          <Typography
            color="text.secondary"
            sx={{
              mb: 3,
            }}
          >
            Les photos sont classées
            selon les points reçus
            pendant les votes.
          </Typography>

          {photos.length === 0 ? (
            <Alert severity="info">
              Aucun résultat photo
              disponible.
            </Alert>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                },
                gap: 3,
              }}
            >
              {photos.map(
                (
                  photo,
                  index,
                ) => (
                  <Card
                    key={
                      photo.photo_id
                    }
                    sx={{
                      overflow:
                        'hidden',
                    }}
                  >
                    <CardMedia
                      component="img"
                      image={photo.url}
                      alt=""
                      sx={{
                        height: {
                          xs: 280,
                          sm: 240,
                          md: 280,
                        },
                        objectFit:
                          'cover',
                      }}
                    />

                    <CardContent>
                      <Stack spacing={1}>

                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 800,
                          }}
                        >
                          {index + 1}.{' '}
                          {
                            photo.player_name
                          }
                        </Typography>

                        <Typography
                          color="text.secondary"
                        >
                          Photo{' '}
                          {
                            photo.photo_number
                          }
                        </Typography>

                        <Divider />

                        <Typography
                          variant="h5"
                          sx={{
                            fontWeight: 800,
                          }}
                        >
                          {
                            photo.total_points
                          }{' '}
                          points
                        </Typography>

                      </Stack>
                    </CardContent>
                  </Card>
                ),
              )}
            </Box>
          )}
        </Box>

        {/* ==================================================
            RETOUR
            ================================================== */}

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
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
              color: 'text.secondary',
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