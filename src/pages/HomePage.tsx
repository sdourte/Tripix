import { Button, Container, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Stack
        spacing={4}
        width="100%"
        alignItems="center"
        textAlign="center"
      >
        <Stack spacing={1}>
          <Typography
            variant="h1"
            component="h1"
            fontWeight={800}
          >
            Tripix
          </Typography>

          <Typography
            variant="h6"
            color="text.secondary"
          >
            Le jeu photo de vos voyages
          </Typography>
        </Stack>

        <Stack spacing={2} width="100%">
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/create-room')}
          >
            Créer une salle
          </Button>

          <Button
            variant="outlined"
            size="large"
          >
            Rejoindre une salle
          </Button>
        </Stack>
      </Stack>
    </Container>
  )
}