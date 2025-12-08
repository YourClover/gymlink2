import { createFileRoute, Link } from "@tanstack/react-router";
import AppLayout from "@/components/AppLayout";
import { Plus, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/plans/")({
  component: PlansPage,
});

function PlansPage() {
  return (
    <AppLayout title="Workout Plans">
      <div className="px-4 py-6 space-y-6">
        {/* Empty State */}
        <div className="p-8 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-center">
          <ClipboardList className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            No workout plans yet
          </h2>
          <p className="text-zinc-400 mb-6 max-w-sm mx-auto">
            Create your first workout plan to organize your training and track
            progress
          </p>
          <Link
            to="/plans/new"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Plan
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
