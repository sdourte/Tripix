import { BrowserRouter, Route, Routes } from 'react-router-dom'

import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import CreateRoomPage from './pages/CreateRoomPage'
import JoinRoomPage from './pages/JoinRoomPage'
import RoomPage from './pages/RoomPage'
import DayPage from './pages/DayPage'
import SlideshowPage from './pages/SlideshowPage'
import VotingPage from './pages/VotingPage'

import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Point d'entrée */}
        <Route
          path="/"
          element={<HomePage />}
        />

        {/* Authentification */}
        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/register"
          element={<RegisterPage />}
        />

        {/* Application */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/create-room"
          element={
            <ProtectedRoute>
              <CreateRoomPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/join-room"
          element={
            <ProtectedRoute>
              <JoinRoomPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/room/:code"
          element={
            <ProtectedRoute>
              <RoomPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/room/:code/day/:dayId"
          element={<DayPage />}
        />

        <Route
          path="/room/:code/day/:dayId/slideshow"
          element={<SlideshowPage />}
        />

        <Route
          path="/day/:dayId/voting"
          element={<VotingPage />}
        />

      </Routes>
    </BrowserRouter>
  )
}