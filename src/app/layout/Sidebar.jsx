// src/app/layout/Sidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Layers,
  Users,
  Settings,
  Plus,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/tickets", icon: Layers, label: "Tickets" },
  { to: "/users", icon: Users, label: "Users" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  return (
    <aside className="w-20 shrink-0 bg-[#12344d] py-6 shadow-xl">
      <div className="flex h-full flex-col items-center gap-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white">
          ST
        </div>

        <nav className="flex flex-col gap-4">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) =>
                `rounded-xl p-3 transition-all ${
                  isActive
                    ? "bg-[#2d4e68] text-white"
                    : "text-white/60 hover:text-white"
                }`
              }
            >
              <Icon size={22} />
            </NavLink>
          ))}

          <button
            type="button"
            title="Raise Ticket"
            className="rounded-xl p-3 text-white/60 transition-all hover:text-white"
          >
            <Plus size={22} />
          </button>
        </nav>
      </div>
    </aside>
  );
}