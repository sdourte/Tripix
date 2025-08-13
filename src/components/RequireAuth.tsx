// src/components/RequireAuth.tsx
import { useEffect, useState } from "react";
import { supabase } from "../app/supabase";
import { Outlet, useNavigate } from "react-router-dom";

export default function RequireAuth(){
  const nav = useNavigate();
  const [ok,setOk]=useState<boolean|null>(null);
  useEffect(()=>{(async()=>{
    const { data:{ user } } = await supabase.auth.getUser();
    if (!user) nav("/login"); else setOk(true);
  })();},[]);
  if (ok===null) return <div className="p-4">Chargement…</div>;
  return <Outlet/>;
}
