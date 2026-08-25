import { BrowserRouter, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import CreateRoomPage from './pages/CreateRoomPage'
import RoomPage from './pages/RoomPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/create-room"
          element={<CreateRoomPage />}
        />

        <Route
          path="/room/:code"
          element={<RoomPage />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App