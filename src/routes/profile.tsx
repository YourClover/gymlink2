import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/AppLayout";
import { User, Mail, LogOut, Settings, ChevronRight, Dumbbell } from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, logout, isLoading } = useAuth();

  return (
    <AppLayout title="Profile">
      <div className="px-4 py-6 space-y-6">
        {/* Profile Header */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-white truncate">
              {user?.name}
            </h2>
            <div className="flex items-center gap-1 text-zinc-400 text-sm">
              <Mail className="w-4 h-4" />
              <span className="truncate">{user?.email}</span>
            </div>
          </div>
        </div>

        {/* Settings Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-400 px-1">Settings</h3>
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 divide-y divide-zinc-700/50">
            <Link
              to="/exercises"
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-700/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Dumbbell className="w-5 h-5 text-zinc-400" />
                <span className="text-white">Exercise Library</span>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-500" />
            </Link>
            <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-700/30 transition-colors">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-zinc-400" />
                <span className="text-white">Preferences</span>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Account Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-400 px-1">Account</h3>
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <button
              onClick={logout}
              disabled={isLoading}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-700/30 transition-colors text-red-400 disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-5 h-5" />
                <span>{isLoading ? "Signing out..." : "Sign Out"}</span>
              </div>
            </button>
          </div>
        </div>

        {/* App Info */}
        <div className="text-center text-sm text-zinc-500 pt-4">
          <p>GymLink v1.0.0</p>
        </div>
      </div>
    </AppLayout>
  );
}
