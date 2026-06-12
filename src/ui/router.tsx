import { createBrowserRouter, Navigate } from "react-router-dom";
import { App } from "@/ui/App";
import { Board } from "@/ui/routes/Board";
import { Players } from "@/ui/routes/Players";
import { History } from "@/ui/routes/History";
import { Odds } from "@/ui/routes/Odds";
import { Last } from "@/ui/routes/Last";
import { Models } from "@/ui/routes/Models";
import { LogGame } from "@/ui/routes/LogGame";
import { Settings } from "@/ui/routes/Settings";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/board" replace /> },
      { path: "board", element: <Board /> },
      { path: "log", element: <LogGame /> },
      { path: "players", element: <Players /> },
      { path: "history", element: <History /> },
      { path: "odds", element: <Odds /> },
      { path: "last", element: <Last /> },
      { path: "models", element: <Models /> },
      { path: "settings", element: <Settings /> },
      { path: "*", element: <Navigate to="/board" replace /> },
    ],
  },
]);
