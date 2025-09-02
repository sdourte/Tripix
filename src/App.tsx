import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Upload from "./pages/Upload";
import Gallery from "./pages/Gallery";
import Leaderboard from "./pages/Leaderboard";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
    </Router>
  );
}

export default App;
