import { useEffect, useState } from 'react'
import { Box, Button, Container, Stack, Typography } from '@mui/material'
import { supabase } from './lib/supabase'

function App() {
  const [connected, setConnected] = useState<boolean | null>(null)

  useEffect(() => {
    async function testConnection() {
      const { error } = await supabase
        .from('rooms')
        .select('id')
        .limit(1)

      setConnected(!error)
    }

    testConnection()
  }, [])

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
          <Typography variant="h2" fontWeight={700}>
            Tripix
          </Typography>

          <Typography color="text.secondary">
            Le jeu photo de vos voyages
          </Typography>

          <Typography>
            {connected === null && 'Connexion à Supabase...'}
            {connected === true && 'Supabase connecté'}
            {connected === false && 'Erreur de connexion à Supabase'}
          </Typography>

          <Button variant="contained" size="large" fullWidth>
            Créer une salle
          </Button>

          <Button variant="outlined" size="large" fullWidth>
            Rejoindre une salle
          </Button>
        </Stack>
      </Container>
    </Box>
  )
}

export default App