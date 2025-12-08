import { Star } from 'lucide-react'

interface MoodRatingProps {
  value?: number
  onChange: (rating: number) => void
}

export default function MoodRating({ value, onChange }: MoodRatingProps) {
  return (
    <div className="flex gap-2 justify-center">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          onClick={() => onChange(rating)}
          className="p-2 transition-transform hover:scale-110 active:scale-95"
          aria-label={`Rate ${rating} out of 5`}
        >
          <Star
            className={`w-10 h-10 transition-colors ${
              value && rating <= value
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-zinc-600'
            }`}
          />
        </button>
      ))}
    </div>
  )
}
