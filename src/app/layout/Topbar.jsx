// src/app/layout/Topbar.jsx
import React from "react";
import { useLocation } from "react-router-dom";
import { Search } from "lucide-react";

const titles = {
  "/dashboard": "Dashboard",
  "/tickets": "Tickets",
  "/users": "Users",
  "/settings": "System Settings",
};

export default function Topbar() {
  const { pathname } = useLocation();

  const pageTitle =
    Object.entries(titles).find(([path]) => pathname.startsWith(path))?.[1] ||
    "Workspace";

  return (
    <header className="h-16 shrink-0 border-b border-gray-200 bg-white px-8 shadow-sm">
      <div className="flex h-full items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight">{pageTitle}</h1>
        </div>

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search ticket ID or keyword..."
            className="w-64 rounded-lg bg-gray-100 py-2 pl-10 pr-4 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
    </header>
  );
}