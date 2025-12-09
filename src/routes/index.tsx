import { Link, Navigate, createFileRoute } from '@tanstack/react-router'
import {
  Calendar,
  ChevronRight,
  Dumbbell,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export const Route = createFileRoute('/')({ component: LandingPage })

function LandingPage() {
  const { user } = useAuth()

  // Redirect authenticated users to dashboard
  if (user) {
    return <Navigate to="/dashboard" />
  }

  const features = [
    {
      icon: <Calendar className="w-8 h-8 text-blue-400" />,
      title: 'Custom Workout Plans',
      description:
        'Create and customize your own workout plans with exercises, sets, reps, and rest times.',
    },
    {
      icon: <Dumbbell className="w-8 h-8 text-green-400" />,
      title: 'Track Every Set',
      description:
        'Log weight, reps, and RPE for each set. See your previous performance for reference.',
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-purple-400" />,
      title: 'Progress Analytics',
      description:
        'Visualize your progress with charts showing strength gains and workout frequency.',
    },
    {
      icon: <Trophy className="w-8 h-8 text-yellow-400" />,
      title: 'Personal Records',
      description:
        'Automatically track and celebrate when you hit new personal records.',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      {/* Hero Section */}
      <section className="relative px-4 pt-16 pb-20 text-center">
        <div className="max-w-lg mx-auto">
          <div className="mb-6 flex justify-center">
            <div className="p-4 rounded-2xl bg-blue-600/20 border border-blue-500/30">
              <Dumbbell className="w-12 h-12 text-blue-400" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white mb-4">
            Track Your
            <span className="block text-blue-400">Fitness Journey</span>
          </h1>

          <p className="text-lg text-zinc-400 mb-8 max-w-md mx-auto">
            Create workout plans, track your progress, and crush your fitness
            goals with GymLink.
          </p>

          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <Link
              to="/register"
              className="w-full py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
              Get Started Free
              <ChevronRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="w-full py-3 px-6 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors border border-zinc-700"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 pb-20">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Everything You Need
          </h2>

          <div className="space-y-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-5 rounded-xl bg-zinc-800/50 border border-zinc-700/50"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-zinc-700/50">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-zinc-400">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 pb-16">
        <div className="max-w-lg mx-auto text-center">
          <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20">
            <h2 className="text-2xl font-bold text-white mb-3">
              Ready to Start?
            </h2>
            <p className="text-zinc-400 mb-6">
              Join GymLink and take your training to the next level.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 py-3 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
            >
              Create Free Account
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-6 border-t border-zinc-800">
        <div className="max-w-lg mx-auto text-center text-sm text-zinc-500">
          <p>GymLink - Track Your Fitness Journey</p>
        </div>
      </footer>
    </div>
  )
}
