import { createFileRoute, Link } from "@tanstack/react-router";
import AppLayout from "@/components/AppLayout";
import { Play, ClipboardList, Zap } from "lucide-react";

export const Route = createFileRoute("/workout/")({
  component: WorkoutPage,
});

function WorkoutPage() {
  return (
    <AppLayout title="Start Workout">
      <div className="px-4 py-6 space-y-6">
        {/* Start Options */}
        <div className="space-y-4">
          {/* From Plan */}
          <div className="p-5 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-600/20">
                <ClipboardList className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">From Plan</h3>
                <p className="text-sm text-zinc-400 mb-3">
                  Start a workout from your active plan
                </p>
                <Link
                  to="/plans"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium transition-colors"
                >
                  Select Plan
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Workout */}
          <div className="p-5 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-green-600/20">
                <Zap className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">Quick Workout</h3>
                <p className="text-sm text-zinc-400 mb-3">
                  Start an empty workout and add exercises as you go
                </p>
                <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors">
                  <Play className="w-4 h-4" />
                  Start Empty
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Templates */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">
            Recent Workouts
          </h2>
          <div className="p-6 rounded-xl bg-zinc-800/30 border border-zinc-700/30 text-center">
            <p className="text-zinc-500 text-sm">
              Your recent workouts will appear here for quick access
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
