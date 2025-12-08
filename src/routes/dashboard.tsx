import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Dumbbell, TrendingUp, Calendar, Trophy } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <div className="px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white">
            Hey, {user?.name?.split(" ")[0]}!
          </h1>
          <p className="text-zinc-400">Ready to crush your workout?</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/workout"
            className="p-4 rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Dumbbell className="w-8 h-8 text-white mb-2" />
            <h3 className="font-semibold text-white">Start Workout</h3>
            <p className="text-sm text-blue-200">Begin a new session</p>
          </Link>

          <Link
            to="/plans"
            className="p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700"
          >
            <Calendar className="w-8 h-8 text-zinc-300 mb-2" />
            <h3 className="font-semibold text-white">View Plans</h3>
            <p className="text-sm text-zinc-400">Manage workouts</p>
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">This Week</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Dumbbell className="w-5 h-5" />}
              label="Workouts"
              value="0"
              subtext="sessions"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Volume"
              value="0"
              subtext="kg lifted"
            />
            <StatCard
              icon={<Calendar className="w-5 h-5" />}
              label="Streak"
              value="0"
              subtext="days"
            />
            <StatCard
              icon={<Trophy className="w-5 h-5" />}
              label="PRs"
              value="0"
              subtext="this week"
            />
          </div>
        </div>

        {/* Recent Workouts Placeholder */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Recent Workouts</h2>
          <div className="p-6 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-center">
            <Dumbbell className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">No workouts yet</p>
            <p className="text-sm text-zinc-500 mt-1">
              Start your first workout to track your progress
            </p>
            <Link
              to="/workout"
              className="inline-block mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              Start Workout
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
      <div className="flex items-center gap-2 text-zinc-400 mb-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-zinc-500">{subtext}</div>
    </div>
  );
}
