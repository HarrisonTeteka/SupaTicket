// src/app/layout/AppShell.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import PageContent from "./PageContent";

export default function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <PageContent>
          <Outlet />
        </PageContent>
      </div>
    </div>
  );
}