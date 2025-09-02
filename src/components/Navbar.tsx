import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav style={{ padding: '10px', backgroundColor: '#f0f0f0', marginBottom: '20px' }}>
      <Link to="/" style={{ margin: '0 10px' }}>Login</Link>
      <Link to="/upload" style={{ margin: '0 10px' }}>Upload</Link>
      <Link to="/gallery" style={{ margin: '0 10px' }}>Gallery</Link>
      <Link to="/leaderboard" style={{ margin: '0 10px' }}>Leaderboard</Link>
    </nav>
  );
}
