// src/app/router.jsx
import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import AppShell from "./layout/AppShell";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import TicketsPage from "../features/tickets/pages/TicketsPage";
import UsersPage from "../features/users/pages/UsersPage";
import SettingsPage from "../features/settings/pages/SettingsPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "tickets", element: <TicketsPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "settings/*", element: <SettingsPage /> },
    ],
  },
]);

export default router;