import { Outlet } from "react-router-dom";
import NavBar from "./navbar";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}
