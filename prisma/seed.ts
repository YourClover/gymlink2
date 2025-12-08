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
    name: "Incline Bench Press",
    description: "Upper chest focused barbell press on incline bench",
    muscleGroup: MuscleGroup.CHEST,
    equipment: Equipment.BARBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Set bench to 30-45 degrees, grip bar slightly wider than shoulders, lower to upper chest, press up.",
  },
  {
    name: "Dumbbell Bench Press",
    description: "Chest press with dumbbells for greater range of motion",
    muscleGroup: MuscleGroup.CHEST,
    equipment: Equipment.DUMBBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Lie on flat bench with dumbbells at chest level, press up until arms extended, lower with control.",
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
    name: "Cable Crossover",
    description: "Cable machine exercise for chest isolation and stretch",
    muscleGroup: MuscleGroup.CHEST,
    equipment: Equipment.CABLE,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Stand between cable towers, arms extended to sides, bring handles together in front of chest.",
  },
  {
    name: "Push-ups",
    description: "Bodyweight chest and triceps exercise",
    muscleGroup: MuscleGroup.CHEST,
    equipment: Equipment.BODYWEIGHT,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Start in plank position, lower chest to ground, push back up keeping core tight.",
  },
  {
    name: "Chest Dip",
    description: "Bodyweight exercise emphasizing lower chest",
    muscleGroup: MuscleGroup.CHEST,
    equipment: Equipment.BODYWEIGHT,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Lean forward on parallel bars, lower body until stretch in chest, press back up.",
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
    name: "Pull-ups",
    description: "Bodyweight back exercise for lats and upper back",
    muscleGroup: MuscleGroup.BACK,
    equipment: Equipment.BODYWEIGHT,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Hang from bar with overhand grip, pull body up until chin over bar, lower with control.",
  },
  {
    name: "Chin-ups",
    description: "Bodyweight exercise targeting lats and biceps",
    muscleGroup: MuscleGroup.BACK,
    equipment: Equipment.BODYWEIGHT,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Hang from bar with underhand grip, pull body up until chin over bar, lower with control.",
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
    name: "Seated Cable Row",
    description: "Cable rowing movement for mid-back thickness",
    muscleGroup: MuscleGroup.BACK,
    equipment: Equipment.CABLE,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Sit with feet on platform, pull handle to lower chest, squeeze shoulder blades, extend arms slowly.",
  },
  {
    name: "Bent Over Row",
    description: "Compound rowing movement for back thickness",
    muscleGroup: MuscleGroup.BACK,
    equipment: Equipment.BARBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Hinge forward at hips, pull bar to lower chest, squeeze shoulder blades, lower with control.",
  },
  {
    name: "Dumbbell Row",
    description: "Single-arm rowing exercise for back development",
    muscleGroup: MuscleGroup.BACK,
    equipment: Equipment.DUMBBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "One hand and knee on bench, row dumbbell to hip, squeeze lat at top, lower with control.",
  },
  {
    name: "T-Bar Row",
    description: "Barbell rowing variation for back thickness",
    muscleGroup: MuscleGroup.BACK,
    equipment: Equipment.BARBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Straddle bar with V-grip handle, hinge forward, row to chest, squeeze back, lower slowly.",
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
    name: "Front Squat",
    description: "Quad-dominant squat variation with bar in front",
    muscleGroup: MuscleGroup.LEGS,
    equipment: Equipment.BARBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Bar on front delts, elbows high, squat down keeping torso upright, drive up through heels.",
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
    name: "Leg Extension",
    description: "Machine isolation exercise for quadriceps",
    muscleGroup: MuscleGroup.LEGS,
    equipment: Equipment.MACHINE,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Sit in machine with pad on shins, extend legs until straight, squeeze quads, lower with control.",
  },
  {
    name: "Leg Curl",
    description: "Machine isolation exercise for hamstrings",
    muscleGroup: MuscleGroup.LEGS,
    equipment: Equipment.MACHINE,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Lie face down or sit in machine, curl weight toward glutes, squeeze hamstrings, lower slowly.",
  },
  {
    name: "Calf Raise",
    description: "Isolation exercise for calf muscles",
    muscleGroup: MuscleGroup.LEGS,
    equipment: Equipment.MACHINE,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Stand on platform with heels hanging off, raise up on toes, squeeze calves, lower with control.",
  },
  {
    name: "Bulgarian Split Squat",
    description: "Single-leg squat with rear foot elevated",
    muscleGroup: MuscleGroup.LEGS,
    equipment: Equipment.DUMBBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Rear foot on bench, lower until front thigh parallel, drive up through front heel.",
  },
  {
    name: "Goblet Squat",
    description: "Front-loaded squat holding dumbbell or kettlebell",
    muscleGroup: MuscleGroup.LEGS,
    equipment: Equipment.DUMBBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Hold weight at chest, feet shoulder-width, squat down keeping chest up, drive up through heels.",
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
    name: "Dumbbell Shoulder Press",
    description: "Seated or standing press with dumbbells",
    muscleGroup: MuscleGroup.SHOULDERS,
    equipment: Equipment.DUMBBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Hold dumbbells at shoulder height, press overhead until arms extended, lower with control.",
  },
  {
    name: "Arnold Press",
    description: "Rotating dumbbell press for complete shoulder development",
    muscleGroup: MuscleGroup.SHOULDERS,
    equipment: Equipment.DUMBBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Start with palms facing you, press up while rotating palms forward, reverse on the way down.",
  },
  {
    name: "Lateral Raise",
    description: "Isolation exercise for lateral deltoids",
    muscleGroup: MuscleGroup.SHOULDERS,
    equipment: Equipment.DUMBBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Stand with dumbbells at sides, raise arms out to sides until parallel with ground, lower slowly.",
  },
  {
    name: "Front Raise",
    description: "Isolation exercise for front deltoids",
    muscleGroup: MuscleGroup.SHOULDERS,
    equipment: Equipment.DUMBBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Stand with dumbbells in front of thighs, raise arms forward to shoulder height, lower slowly.",
  },
  {
    name: "Face Pulls",
    description: "Cable exercise for rear delts and upper back",
    muscleGroup: MuscleGroup.SHOULDERS,
    equipment: Equipment.CABLE,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Set cable at face height, pull rope to face with elbows high, squeeze rear delts, return slowly.",
  },
  {
    name: "Reverse Fly",
    description: "Isolation exercise for rear deltoids",
    muscleGroup: MuscleGroup.SHOULDERS,
    equipment: Equipment.DUMBBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Bend forward at hips, raise dumbbells out to sides squeezing rear delts, lower with control.",
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
    name: "Dumbbell Curl",
    description: "Bicep curl with dumbbells for unilateral development",
    muscleGroup: MuscleGroup.ARMS,
    equipment: Equipment.DUMBBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Stand with dumbbells at sides, curl up alternating or together, squeeze biceps, lower slowly.",
  },
  {
    name: "Hammer Curl",
    description: "Dumbbell curl variation targeting brachialis and forearms",
    muscleGroup: MuscleGroup.ARMS,
    equipment: Equipment.DUMBBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Hold dumbbells with neutral grip, curl up keeping palms facing each other throughout.",
  },
  {
    name: "Preacher Curl",
    description: "Isolation curl with arm support for strict form",
    muscleGroup: MuscleGroup.ARMS,
    equipment: Equipment.BARBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Rest arms on preacher bench pad, curl bar up squeezing biceps, lower with control.",
  },
  {
    name: "Cable Curl",
    description: "Bicep curl with constant cable tension",
    muscleGroup: MuscleGroup.ARMS,
    equipment: Equipment.CABLE,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Stand facing cable with low pulley, curl handle up squeezing biceps, lower with control.",
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
    name: "Tricep Pushdown",
    description: "Cable exercise for tricep isolation",
    muscleGroup: MuscleGroup.ARMS,
    equipment: Equipment.CABLE,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Stand at cable machine, push bar/rope down until arms straight, squeeze triceps, return slowly.",
  },
  {
    name: "Skull Crushers",
    description: "Lying tricep extension with barbell or EZ bar",
    muscleGroup: MuscleGroup.ARMS,
    equipment: Equipment.BARBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Lie on bench, lower bar toward forehead by bending elbows, extend arms back up.",
  },
  {
    name: "Overhead Tricep Extension",
    description: "Tricep exercise with weight overhead",
    muscleGroup: MuscleGroup.ARMS,
    equipment: Equipment.DUMBBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Hold dumbbell overhead with both hands, lower behind head bending elbows, extend back up.",
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
    name: "Side Plank",
    description: "Lateral core stabilization exercise",
    muscleGroup: MuscleGroup.CORE,
    equipment: Equipment.BODYWEIGHT,
    exerciseType: ExerciseType.STRENGTH,
    isTimed: true,
    instructions: "Lie on side, prop up on forearm, lift hips creating straight line, hold position.",
  },
  {
    name: "Hanging Leg Raise",
    description: "Advanced core exercise targeting lower abs",
    muscleGroup: MuscleGroup.CORE,
    equipment: Equipment.BODYWEIGHT,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Hang from bar, raise legs until parallel with ground (or higher), lower with control.",
  },
  {
    name: "Cable Crunch",
    description: "Weighted crunch using cable machine",
    muscleGroup: MuscleGroup.CORE,
    equipment: Equipment.CABLE,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Kneel facing cable, hold rope behind head, crunch down contracting abs, return slowly.",
  },
  {
    name: "Russian Twist",
    description: "Rotational core exercise for obliques",
    muscleGroup: MuscleGroup.CORE,
    equipment: Equipment.BODYWEIGHT,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Sit with knees bent, lean back slightly, rotate torso side to side touching ground each side.",
  },
  {
    name: "Ab Wheel Rollout",
    description: "Advanced core exercise using ab wheel",
    muscleGroup: MuscleGroup.CORE,
    equipment: Equipment.BODYWEIGHT,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Kneel holding ab wheel, roll forward extending body, contract abs to pull back to start.",
  },
  {
    name: "Dead Bug",
    description: "Core stability exercise with arm and leg movement",
    muscleGroup: MuscleGroup.CORE,
    equipment: Equipment.BODYWEIGHT,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Lie on back with arms up and knees at 90 degrees, lower opposite arm and leg, return and alternate.",
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
    name: "Stationary Bike",
    description: "Low-impact cardiovascular cycling",
    muscleGroup: MuscleGroup.CARDIO,
    equipment: Equipment.MACHINE,
    exerciseType: ExerciseType.CARDIO,
    isTimed: true,
    instructions: "Adjust seat height, set resistance, maintain steady cadence, monitor heart rate.",
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
  {
    name: "Elliptical",
    description: "Low-impact full body cardio machine",
    muscleGroup: MuscleGroup.CARDIO,
    equipment: Equipment.MACHINE,
    exerciseType: ExerciseType.CARDIO,
    isTimed: true,
    instructions: "Step on pedals, grip handles, maintain smooth elliptical motion, adjust resistance as needed.",
  },
  {
    name: "Stair Climber",
    description: "Cardio machine simulating stair climbing",
    muscleGroup: MuscleGroup.CARDIO,
    equipment: Equipment.MACHINE,
    exerciseType: ExerciseType.CARDIO,
    isTimed: true,
    instructions: "Step on machine, set pace, climb stairs with proper posture, avoid leaning on handles.",
  },
  {
    name: "Jump Rope",
    description: "High-intensity cardio with jump rope",
    muscleGroup: MuscleGroup.CARDIO,
    equipment: Equipment.BODYWEIGHT,
    exerciseType: ExerciseType.CARDIO,
    isTimed: true,
    instructions: "Hold rope handles, swing rope overhead, jump with both feet as rope passes under.",
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
  {
    name: "Kettlebell Swing",
    description: "Explosive hip hinge movement with kettlebell",
    muscleGroup: MuscleGroup.FULL_BODY,
    equipment: Equipment.KETTLEBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Hinge at hips, swing kettlebell between legs, drive hips forward to swing to chest height.",
  },
  {
    name: "Clean and Press",
    description: "Olympic lift variation for full body power",
    muscleGroup: MuscleGroup.FULL_BODY,
    equipment: Equipment.BARBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Pull bar from floor to shoulders in one motion, then press overhead, lower and repeat.",
  },
  {
    name: "Thrusters",
    description: "Front squat to overhead press combination",
    muscleGroup: MuscleGroup.FULL_BODY,
    equipment: Equipment.BARBELL,
    exerciseType: ExerciseType.STRENGTH,
    instructions: "Hold bar at shoulders, squat down, drive up and press bar overhead in one fluid motion.",
  },
  {
    name: "Mountain Climbers",
    description: "Dynamic plank exercise with running motion",
    muscleGroup: MuscleGroup.FULL_BODY,
    equipment: Equipment.BODYWEIGHT,
    exerciseType: ExerciseType.CARDIO,
    isTimed: true,
    instructions: "Start in plank position, drive knees alternately toward chest in running motion.",
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
