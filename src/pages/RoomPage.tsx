import { Container, Typography } from '@mui/material'
import { useParams } from 'react-router-dom'

export default function RoomPage() {
  const { code } = useParams()

  return (
    <Container sx={{ py: 5 }}>
      <Typography variant="h4">
        Salle {code}
      </Typography>

      <Typography color="text.secondary" sx={{ mt: 1 }}>
        La salle est créée !
      </Typography>
    </Container>
  )
}