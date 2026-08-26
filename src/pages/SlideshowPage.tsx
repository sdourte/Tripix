import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getDaySlideshowPhotos,
  getPhotoUrl,
  startDayVoting,
} from '../services/roomService'

interface Slide {
  id: string
  storagePath: string
  url: string
}

const SLIDE_DURATION = 5000
const FADE_DURATION = 900

type DisplayMode = 'window' | 'fullscreen'

export default function SlideshowPage() {
  const { dayId } = useParams<{
    dayId: string
  }>()

  const navigate = useNavigate()

  const [slides, setSlides] = useState<Slide[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  /*
   * États du diaporama
   */
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)

  /*
   * Mode d'affichage choisi sur l'écran de lancement.
   */
  const [displayMode, setDisplayMode] =
    useState<DisplayMode>('fullscreen')

  /*
   * Indique si une transition est actuellement en cours.
   * Cela permet d'éviter certains changements trop rapides
   * lorsque l'utilisateur utilise les flèches.
   */
  const [isTransitioning, setIsTransitioning] =
    useState(false)

  /*
   * État du lancement des votes.
   */
  const [startingVoting, setStartingVoting] =
    useState(false)

  /*
   * Référence vers la zone du diaporama pour
   * pouvoir demander le plein écran.
   */
  const slideshowRef =
    useRef<HTMLDivElement | null>(null)

  /*
   * Timer du diaporama.
   */
  const timerRef =
    useRef<number | null>(null)

  /*
   * ============================================================
   * CHARGEMENT DES PHOTOS
   * ============================================================
   */

  useEffect(() => {
    async function loadSlideshow() {
      if (!dayId) {
        setError('Journée invalide.')
        setLoading(false)
        return
      }

      try {
        const photos =
          await getDaySlideshowPhotos(dayId)

        const loadedSlides: Slide[] = []

        for (const photo of photos) {
          const url = await getPhotoUrl(
            photo.storage_path,
          )

          loadedSlides.push({
            id: photo.id,
            storagePath: photo.storage_path,
            url,
          })
        }

        if (loadedSlides.length === 0) {
          setError(
            'Aucune photo disponible pour le diaporama.',
          )
          setLoading(false)
          return
        }

        setSlides(loadedSlides)
      } catch (err) {
        console.error(
          'Erreur chargement diaporama:',
          err,
        )

        setError(
          err instanceof Error
            ? err.message
            : 'Impossible de charger le diaporama.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadSlideshow()
  }, [dayId])

  /*
   * ============================================================
   * PLEIN ÉCRAN
   * ============================================================
   */

  async function enterFullscreen() {
    if (!slideshowRef.current) {
      return
    }

    try {
      if (
        !document.fullscreenElement &&
        slideshowRef.current.requestFullscreen
      ) {
        await slideshowRef.current.requestFullscreen()
      }
    } catch (err) {
      console.error(
        "Impossible d'activer le plein écran:",
        err,
      )

      /*
       * Si le navigateur refuse le fullscreen,
       * le diaporama continue simplement en mode fenêtre.
       */
    }
  }

  async function exitFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.error(
        'Impossible de quitter le plein écran:',
        err,
      )
    }
  }

  /*
   * ============================================================
   * NETTOYAGE
   * ============================================================
   */

  function clearSlideTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      clearSlideTimer()

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [])

  /*
   * ============================================================
   * LANCER LE DIAPORAMA
   * ============================================================
   */

  async function handleStartSlideshow() {
    if (slides.length === 0) {
      return
    }

    setError('')
    setCurrentIndex(0)
    setFinished(false)
    setIsTransitioning(false)

    /*
     * On passe en mode diaporama avant de demander
     * le plein écran.
     */
    setStarted(true)

    if (displayMode === 'fullscreen') {
      /*
       * Le navigateur n'autorise généralement le fullscreen
       * que dans le contexte direct d'un clic utilisateur.
       *
       * On attend donc que le DOM soit rendu.
       */
      window.setTimeout(() => {
        enterFullscreen()
      }, 50)
    }
  }

  /*
   * ============================================================
   * PASSAGE À LA PHOTO SUIVANTE
   * ============================================================
   */

  function goToNextSlide() {
    if (slides.length === 0) {
      return
    }

    if (isTransitioning) {
      return
    }

    /*
     * Si nous sommes déjà sur la dernière photo,
     * le diaporama est terminé.
     */
    if (currentIndex >= slides.length - 1) {
      clearSlideTimer()
      setFinished(true)
      return
    }

    setIsTransitioning(true)

    /*
     * La nouvelle photo devient visible.
     */
    setCurrentIndex(
      (index) => index + 1,
    )

    /*
     * On laisse le temps au fondu de se terminer
     * avant d'autoriser une nouvelle transition.
     */
    window.setTimeout(() => {
      setIsTransitioning(false)
    }, FADE_DURATION)
  }

  /*
   * ============================================================
   * PHOTO PRÉCÉDENTE
   * ============================================================
   */

  function goToPreviousSlide() {
    if (slides.length === 0) {
      return
    }

    clearSlideTimer()

    setFinished(false)
    setIsTransitioning(true)

    setCurrentIndex(
      (index) => Math.max(0, index - 1),
    )

    window.setTimeout(() => {
      setIsTransitioning(false)
    }, FADE_DURATION)
  }

  /*
   * ============================================================
   * DÉFILEMENT AUTOMATIQUE
   * ============================================================
   */

  useEffect(() => {
    /*
     * Aucun timer avant que le bouton "Lancer"
     * n'ait été pressé.
     */
    if (
      !started ||
      finished ||
      slides.length === 0
    ) {
      return
    }

    clearSlideTimer()

    timerRef.current =
      window.setTimeout(() => {
        goToNextSlide()
      }, SLIDE_DURATION)

    return () => {
      clearSlideTimer()
    }
  }, [
    started,
    finished,
    currentIndex,
    slides.length,
    isTransitioning,
  ])

  /*
   * ============================================================
   * CLAVIER
   * ============================================================
   */

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (!started || slides.length === 0) {
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goToPreviousSlide()
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goToNextSlide()
      }

      if (event.key === 'Escape') {
        /*
         * Si le navigateur est en fullscreen,
         * Escape quitte normalement le fullscreen.
         *
         * On ne navigue pas immédiatement afin de
         * laisser le comportement natif du navigateur.
         */
        if (document.fullscreenElement) {
          exitFullscreen()
        } else {
          handleQuit()
        }
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [
    started,
    slides.length,
    currentIndex,
    isTransitioning,
  ])

  /*
   * ============================================================
   * QUITTER
   * ============================================================
   */

  async function handleQuit() {
    clearSlideTimer()
    await exitFullscreen()
    navigate(-1)
  }

  /*
   * ============================================================
   * REJOUER
   * ============================================================
   */

  async function handleReplay() {
    clearSlideTimer()

    setFinished(false)
    setIsTransitioning(false)
    setCurrentIndex(0)

    /*
     * Si l'utilisateur avait choisi le plein écran,
     * on le remet également en plein écran.
     */
    if (
      displayMode === 'fullscreen' &&
      !document.fullscreenElement
    ) {
      await enterFullscreen()
    }

    /*
     * Le useEffect du timer reprendra automatiquement
     * le défilement.
     */
  }

  /*
   * ============================================================
   * LANCER LES VOTES
   * ============================================================
   */

  async function handleStartVoting() {
    if (!dayId) {
      return
    }

    try {
      setStartingVoting(true)
      setError('')

      clearSlideTimer()

      await exitFullscreen()

      await startDayVoting(dayId)

      navigate(`/day/${dayId}`)
    } catch (err) {
      console.error(
        'Erreur lancement votes:',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de lancer les votes.',
      )
    } finally {
      setStartingVoting(false)
    }
  }

  /*
   * ============================================================
   * CHARGEMENT
   * ============================================================
   */

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'black',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress color="inherit" />
      </Box>
    )
  }

  /*
   * ============================================================
   * ERREUR
   * ============================================================
   */

  if (
    error &&
    slides.length === 0
  ) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'black',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <Alert severity="error">
          {error}
        </Alert>
      </Box>
    )
  }

  /*
   * ============================================================
   * ÉCRAN DE LANCEMENT
   * ============================================================
   */

  if (!started) {
    return (
      <Box
        ref={slideshowRef}
        sx={{
          minHeight: '100vh',
          bgcolor: 'black',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 600,
            p: {
              xs: 3,
              sm: 5,
            },
            bgcolor: '#151515',
            color: 'white',
            border:
              '1px solid rgba(255,255,255,0.12)',
            borderRadius: 3,
          }}
        >
          <Stack spacing={4}>
            <Box>
              <Typography
                variant="h4"
                fontWeight={800}
                gutterBottom
              >
                Diaporama
              </Typography>

              <Typography
                color="grey.400"
              >
                {slides.length}{' '}
                {slides.length === 1
                  ? 'photo'
                  : 'photos'}{' '}
                seront présentées.
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="h6"
                fontWeight={700}
                gutterBottom
              >
                Mode d'affichage
              </Typography>

              <FormControl>
                <RadioGroup
                  value={displayMode}
                  onChange={(event) =>
                    setDisplayMode(
                      event.target
                        .value as DisplayMode,
                    )
                  }
                >
                  <FormControlLabel
                    value="fullscreen"
                    control={
                      <Radio />
                    }
                    label={
                      <Box>
                        <Typography
                          fontWeight={600}
                        >
                          Plein écran
                        </Typography>

                        <Typography
                          variant="body2"
                          color="grey.500"
                        >
                          Idéal pour une
                          projection.
                        </Typography>
                      </Box>
                    }
                  />

                  <FormControlLabel
                    value="window"
                    control={
                      <Radio />
                    }
                    label={
                      <Box>
                        <Typography
                          fontWeight={600}
                        >
                          Fenêtre normale
                        </Typography>

                        <Typography
                          variant="body2"
                          color="grey.500"
                        >
                          Garde la
                          plateforme
                          visible.
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </Box>

            {error && (
              <Alert severity="error">
                {error}
              </Alert>
            )}

            <Stack spacing={1.5}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={
                  handleStartSlideshow
                }
                sx={{
                  py: 1.5,
                  fontSize: '1rem',
                }}
              >
                Lancer le diaporama
              </Button>

              <Button
                variant="text"
                size="large"
                fullWidth
                onClick={handleQuit}
                sx={{
                  color: 'grey.500',
                }}
              >
                Annuler
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    )
  }

  /*
   * ============================================================
   * ÉCRAN DE FIN
   * ============================================================
   */

  if (finished) {
    return (
      <Box
        ref={slideshowRef}
        sx={{
          minHeight: '100vh',
          bgcolor: 'black',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          p: 3,
        }}
      >
        <Stack
          spacing={4}
          alignItems="center"
          sx={{
            maxWidth: 650,
            width: '100%',
          }}
        >
          <Box>
            <Typography
              variant="h2"
              fontWeight={800}
              sx={{
                mb: 2,
                fontSize: {
                  xs: '2.5rem',
                  sm: '3.5rem',
                },
              }}
            >
              Diaporama terminé
            </Typography>

            <Typography
              variant="h5"
              color="grey.400"
            >
              Les {slides.length} photos ont
              été présentées.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          <Stack
            direction={{
              xs: 'column',
              sm: 'row',
            }}
            spacing={2}
            width="100%"
          >
            <Button
              variant="outlined"
              size="large"
              onClick={handleReplay}
              sx={{
                flex: 1,
                py: 1.5,
                color: 'white',
                borderColor: 'grey.600',
              }}
            >
              Rejouer
            </Button>

            <Button
              variant="contained"
              size="large"
              onClick={
                handleStartVoting
              }
              disabled={startingVoting}
              sx={{
                flex: 1,
                py: 1.5,
              }}
            >
              {startingVoting
                ? 'Lancement...'
                : 'Passer aux votes'}
            </Button>
          </Stack>

          <Button
            variant="text"
            onClick={handleQuit}
            sx={{
              color: 'grey.500',
            }}
          >
            Quitter le diaporama
          </Button>
        </Stack>
      </Box>
    )
  }

  /*
   * ============================================================
   * DIAPORAMA
   * ============================================================
   */

  const currentSlide =
    slides[currentIndex]

  return (
    <Box
      ref={slideshowRef}
      sx={{
        minHeight: '100vh',
        width: '100%',
        bgcolor: 'black',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',

        /*
         * Lorsque le navigateur passe réellement
         * en fullscreen, cette règle permet de garantir
         * le fond noir.
         */
        '&:fullscreen': {
          width: '100vw',
          height: '100vh',
          bgcolor: 'black',
        },
      }}
    >
      {/* ======================================================
          PHOTO
          ====================================================== */}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          p: {
            xs: 1,
            sm: 3,
          },
        }}
      >
        {/*
         * Image actuelle.
         *
         * L'opacité est animée par CSS.
         * Cela donne un vrai fondu lorsque currentIndex
         * change.
         */}
        <Box
          component="img"
          src={currentSlide.url}
          alt=""
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            p: {
              xs: 1,
              sm: 3,
            },
            userSelect: 'none',
            pointerEvents: 'none',

            opacity: 1,

            transition: `opacity ${FADE_DURATION}ms ease-in-out`,
          }}
        />

        {/* ==================================================
            BOUTON PRÉCÉDENT
            ================================================== */}

        {currentIndex > 0 && (
          <Button
            onClick={
              goToPreviousSlide
            }
            disabled={isTransitioning}
            aria-label="Photo précédente"
            sx={{
              position: 'absolute',
              left: {
                xs: 8,
                sm: 20,
              },
              top: '50%',
              transform:
                'translateY(-50%)',
              minWidth: {
                xs: 42,
                sm: 52,
              },
              width: {
                xs: 42,
                sm: 52,
              },
              height: {
                xs: 42,
                sm: 52,
              },
              borderRadius: '50%',
              color: 'white',
              bgcolor:
                'rgba(0, 0, 0, 0.45)',
              fontSize: {
                xs: 24,
                sm: 30,
              },
              zIndex: 5,

              '&:hover': {
                bgcolor:
                  'rgba(0, 0, 0, 0.75)',
              },
            }}
          >
            ‹
          </Button>
        )}

        {/* ==================================================
            BOUTON SUIVANT
            ================================================== */}

        {currentIndex <
          slides.length - 1 && (
          <Button
            onClick={goToNextSlide}
            disabled={isTransitioning}
            aria-label="Photo suivante"
            sx={{
              position: 'absolute',
              right: {
                xs: 8,
                sm: 20,
              },
              top: '50%',
              transform:
                'translateY(-50%)',
              minWidth: {
                xs: 42,
                sm: 52,
              },
              width: {
                xs: 42,
                sm: 52,
              },
              height: {
                xs: 42,
                sm: 52,
              },
              borderRadius: '50%',
              color: 'white',
              bgcolor:
                'rgba(0, 0, 0, 0.45)',
              fontSize: {
                xs: 24,
                sm: 30,
              },
              zIndex: 5,

              '&:hover': {
                bgcolor:
                  'rgba(0, 0, 0, 0.75)',
              },
            }}
          >
            ›
          </Button>
        )}

        {/* ==================================================
            COMPTEUR
            ================================================== */}

        <Box
          sx={{
            position: 'absolute',
            bottom: {
              xs: 12,
              sm: 20,
            },
            left: '50%',
            transform:
              'translateX(-50%)',
            px: 2,
            py: 0.75,
            borderRadius: 10,
            bgcolor:
              'rgba(0, 0, 0, 0.55)',
            zIndex: 5,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            {currentIndex + 1} /{' '}
            {slides.length}
          </Typography>
        </Box>
      </Box>

      {/* ======================================================
          BARRE INFÉRIEURE
          ====================================================== */}

      <Box
        sx={{
          px: {
            xs: 1.5,
            sm: 3,
          },
          py: {
            xs: 1,
            sm: 1.5,
          },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          bgcolor: 'black',
        }}
      >
        <Typography
          variant="body2"
          color="grey.600"
          sx={{
            display: {
              xs: 'none',
              sm: 'block',
            },
          }}
        >
          Utilise ← et → pour naviguer
        </Typography>

        <Button
          variant="text"
          onClick={handleQuit}
          sx={{
            color: 'grey.500',
            ml: 'auto',
          }}
        >
          Quitter
        </Button>
      </Box>
    </Box>
  )
}