import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import JoinRoom from "./pages/JoinRoom";
import Today from "./pages/Today";
import Upload from "./pages/Upload";
//import Vote from "./pages/Vote";
//import Board from "./pages/Board";
import "./index.css";

const qc = new QueryClient();
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<JoinRoom />} />
          <Route path="/today" element={<Today />} />
          <Route path="/upload" element={<Upload/>}/>
          {/* <Route path="/vote" element={<Vote/>}/> */}
          {/* <Route path="/board" element={<Board/>}/> */}
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
