import "dotenv/config";
import { PrismaClient, MuscleGroup, Equipment, ExerciseType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const exercises = [
  // CHEST
  {
    name: "Bench Press",
    description: "Classic compound chest exercise using a barbell",
    muscleGroup: MuscleGroup.CHEST,
    equipment: Equipment.BARBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Lie on a flat bench, grip the bar slightly wider than shoulder width, lower to chest, press up.",
  },
  {
    name: "Dumbbell Fly",
    description: "Isolation exercise for chest using dumbbells",
    muscleGroup: MuscleGroup.CHEST,
    equipment: Equipment.DUMBBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Lie on bench with dumbbells extended above chest, lower arms in arc motion, squeeze back up.",
  },
  {
    name: "Push-ups",
    description: "Bodyweight chest and triceps exercise",
    muscleGroup: MuscleGroup.CHEST,
    equipment: Equipment.BODYWEIGHT,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Start in plank position, lower chest to ground, push back up keeping core tight.",
  },

  // BACK
  {
    name: "Deadlift",
    description: "Fundamental compound lift for back and posterior chain",
    muscleGroup: MuscleGroup.BACK,
    equipment: Equipment.BARBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Stand with feet hip-width, hinge at hips, grip bar, lift by driving through heels and extending hips.",
  },
  {
    name: "Lat Pulldown",
    description: "Cable machine exercise targeting the latissimus dorsi",
    muscleGroup: MuscleGroup.BACK,
    equipment: Equipment.CABLE,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Grip bar wide, pull down to upper chest while squeezing shoulder blades together.",
  },
  {
    name: "Bent Over Row",
    description: "Compound rowing movement for back thickness",
    muscleGroup: MuscleGroup.BACK,
    equipment: Equipment.BARBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Hinge forward at hips, pull bar to lower chest, squeeze shoulder blades, lower with control.",
  },

  // LEGS
  {
    name: "Barbell Squat",
    description: "King of leg exercises, targets quads, glutes, and hamstrings",
    muscleGroup: MuscleGroup.LEGS,
    equipment: Equipment.BARBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Bar on upper back, feet shoulder-width, squat down until thighs parallel, drive up through heels.",
  },
  {
    name: "Romanian Deadlift",
    description: "Hamstring-focused hip hinge movement",
    muscleGroup: MuscleGroup.LEGS,
    equipment: Equipment.BARBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Hold bar at hips, hinge forward keeping legs slightly bent, feel stretch in hamstrings, return to start.",
  },
  {
    name: "Leg Press",
    description: "Machine-based compound leg exercise",
    muscleGroup: MuscleGroup.LEGS,
    equipment: Equipment.MACHINE,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Sit in machine, feet shoulder-width on platform, lower weight by bending knees, press back up.",
  },
  {
    name: "Lunges",
    description: "Unilateral leg exercise for balance and strength",
    muscleGroup: MuscleGroup.LEGS,
    equipment: Equipment.BODYWEIGHT,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Step forward, lower back knee toward ground, front knee stays over ankle, push back to start.",
  },

  // SHOULDERS
  {
    name: "Overhead Press",
    description: "Standing barbell press for shoulder development",
    muscleGroup: MuscleGroup.SHOULDERS,
    equipment: Equipment.BARBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Bar at shoulders, press overhead in straight line, lower with control back to shoulders.",
  },
  {
    name: "Lateral Raise",
    description: "Isolation exercise for lateral deltoids",
    muscleGroup: MuscleGroup.SHOULDERS,
    equipment: Equipment.DUMBBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Stand with dumbbells at sides, raise arms out to sides until parallel with ground, lower slowly.",
  },

  // ARMS
  {
    name: "Barbell Curl",
    description: "Classic bicep building exercise",
    muscleGroup: MuscleGroup.ARMS,
    equipment: Equipment.BARBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Stand with bar at thighs, curl up keeping elbows stationary, squeeze at top, lower with control.",
  },
  {
    name: "Tricep Dips",
    description: "Bodyweight tricep exercise using parallel bars or bench",
    muscleGroup: MuscleGroup.ARMS,
    equipment: Equipment.BODYWEIGHT,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Support body on bars/bench, lower by bending elbows to 90 degrees, press back up.",
  },
  {
    name: "Hammer Curl",
    description: "Dumbbell curl variation targeting brachialis and forearms",
    muscleGroup: MuscleGroup.ARMS,
    equipment: Equipment.DUMBBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Hold dumbbells with neutral grip, curl up keeping palms facing each other throughout.",
  },

  // CORE
  {
    name: "Plank",
    description: "Isometric core stabilization exercise",
    muscleGroup: MuscleGroup.CORE,
    equipment: Equipment.BODYWEIGHT,
    exerciseType: ExerciseType.STRENGTH,
    isTimed: true,
    instructions: "Forearms and toes on ground, body in straight line, hold position engaging core.",
  },
  {
    name: "Hanging Leg Raise",
    description: "Advanced core exercise targeting lower abs",
    muscleGroup: MuscleGroup.CORE,
    equipment: Equipment.BODYWEIGHT,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Hang from bar, raise legs until parallel with ground (or higher), lower with control.",
  },

  // CARDIO
  {
    name: "Treadmill Run",
    description: "Cardiovascular running on treadmill",
    muscleGroup: MuscleGroup.CARDIO,
    equipment: Equipment.MACHINE,
    exerciseType: ExerciseType.CARDIO,
    isTimed: true,
    instructions: "Set desired speed and incline, maintain steady pace, monitor heart rate.",
  },
  {
    name: "Rowing Machine",
    description: "Full body cardiovascular exercise",
    muscleGroup: MuscleGroup.CARDIO,
    equipment: Equipment.MACHINE,
    exerciseType: ExerciseType.CARDIO,
    isTimed: true,
    instructions: "Drive with legs first, then pull handle to chest, extend arms and slide forward to repeat.",
  },

  // FULL BODY
  {
    name: "Burpees",
    description: "High-intensity full body exercise",
    muscleGroup: MuscleGroup.FULL_BODY,
    equipment: Equipment.BODYWEIGHT,
    exerciseType: ExerciseType.PLYOMETRIC,
    instructions: "Squat down, kick feet back to plank, do push-up, jump feet forward, jump up with arms overhead.",
  },
];

async function main() {
  console.log("Seeding database...");

  // Clear existing exercises that are not custom
  await prisma.exercise.deleteMany({
    where: { isCustom: false },
  });

  // Create exercises
  for (const exercise of exercises) {
    await prisma.exercise.create({
      data: {
        ...exercise,
        isCustom: false,
        isTimed: exercise.isTimed ?? false,
      },
    });
  }

  console.log(`Seeded ${exercises.length} exercises`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
