import { useEffect } from 'react'
import {
  CircularProgress,
  Container,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function HomePage() {
  const navigate = useNavigate()

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        navigate('/dashboard', {
          replace: true,
        })
      } else {
        navigate('/login', {
          replace: true,
        })
      }
    }

    checkSession()
  }, [navigate])

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