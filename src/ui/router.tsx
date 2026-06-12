import { createBrowserRouter, Navigate } from "react-router-dom";
import { App } from "@/ui/App";
import { Leaderboard } from "@/ui/routes/Leaderboard";
import { AddGame } from "@/ui/routes/AddGame";
import { Odds } from "@/ui/routes/Odds";
import { History } from "@/ui/routes/History";
import { Settings } from "@/ui/routes/Settings";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/leaderboard" replace /> },
      { path: "leaderboard", element: <Leaderboard /> },
      { path: "add", element: <AddGame /> },
      { path: "odds", element: <Odds /> },
      { path: "history", element: <History /> },
      { path: "settings", element: <Settings /> },
      { path: "*", element: <Navigate to="/leaderboard" replace /> },
    ],
  },
]);
