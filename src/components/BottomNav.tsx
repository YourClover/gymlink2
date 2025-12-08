import { Link, useLocation } from "@tanstack/react-router";
import {
  Home,
  ClipboardList,
  Dumbbell,
  History,
  User,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/plans", icon: ClipboardList, label: "Plans" },
  { to: "/workout", icon: Dumbbell, label: "Workout" },
  { to: "/history", icon: History, label: "History" },
  { to: "/profile", icon: User, label: "Profile" },
] as const;

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 safe-area-pb">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive =
            location.pathname === to ||
            (to !== "/dashboard" && location.pathname.startsWith(to));

          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center justify-center flex-1 py-2 px-1 min-w-0 transition-colors ${
                isActive
                  ? "text-blue-400"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Icon
                className={`w-6 h-6 ${isActive ? "stroke-[2.5]" : "stroke-[1.5]"}`}
              />
              <span className="text-xs mt-1 truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
