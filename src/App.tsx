import { Box, Button, Container, Stack, Typography } from '@mui/material'

function App() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Container maxWidth="sm">
        <Stack spacing={4} alignItems="center" textAlign="center">
          <Box>
            <Typography variant="h2" component="h1" fontWeight={700}>
              Tripix
            </Typography>

            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              Le jeu photo de vos voyages
            </Typography>
          </Box>

          <Stack spacing={2} width="100%">
            <Button
              variant="contained"
              size="large"
              fullWidth
            >
              Créer une salle
            </Button>

            <Button
              variant="outlined"
              size="large"
              fullWidth
            >
              Rejoindre une salle
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}

export default App