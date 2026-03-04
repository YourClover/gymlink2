# Gymlink — Detailed Feature Designs

## 1. XP & Leveling System

### Concept

Every action in the gym earns XP. As XP accumulates, users level up through a progression of titles. This adds a persistent sense of progress beyond just lifting numbers — even on a bad day, you still earn XP for showing up.

### XP Sources

| Action                      | XP  | Notes                                    |
| --------------------------- | --- | ---------------------------------------- |
| Complete a workout          | 100 | Base reward for any session              |
| Per set logged              | 5   | Encourages volume                        |
| Hit a PR                    | 50  | Any PR type (weight, reps, volume, time) |
| Log RPE on a set            | 2   | Encourages tracking effort               |
| Maintain a streak (per day) | 20  | Bonus for consecutive training days      |
| Complete a challenge        | 150 | Ties into existing challenge system      |
| Earn an achievement         | 75  | Ties into existing achievement system    |
| First workout of the week   | 50  | Bonus for getting started                |
| Try a new exercise          | 25  | Encourages variety                       |

### Level Progression

| Level | Title     | XP Required | Cumulative XP |
| ----- | --------- | ----------- | ------------- |
| 1     | Newcomer  | 0           | 0             |
| 2     | Beginner  | 500         | 500           |
| 3     | Regular   | 1,500       | 2,000         |
| 4     | Dedicated | 3,000       | 5,000         |
| 5     | Athlete   | 5,000       | 10,000        |
| 6     | Warrior   | 10,000      | 20,000        |
| 7     | Veteran   | 15,000      | 35,000        |
| 8     | Elite     | 25,000      | 60,000        |
| 9     | Champion  | 40,000      | 100,000       |
| 10    | Titan     | 50,000      | 150,000       |
| 11    | Legend    | 100,000     | 250,000       |
| 12    | Mythic    | 250,000     | 500,000       |

### UI Touchpoints

- **Profile page**: Level badge + title next to username, XP progress bar to next level
- **Dashboard**: Small XP summary card showing current level, XP earned today/this week
- **Post-workout summary**: "+320 XP" breakdown showing what earned XP that session
- **Leaderboard**: Optional XP-based leaderboard tab (friends / global)
- **Activity feed**: "User leveled up to Warrior!" events
- **Level-up modal**: Celebration screen with confetti (reuse existing confetti from PR detection) when hitting a new level

### Backfill

On first release, calculate XP retroactively from existing workout history so long-time users start at a meaningful level.

---

## 2. Badge Collections

### Concept

Themed sets of badges that tell a story about a user's training journey. Unlike individual achievements, collections group related badges together — completing an entire collection unlocks a special collector badge. Badges are visual, collectible, and displayable on profiles.

### Collection Ideas

#### The Iron Foundation

Earn a PR on each of the big compound lifts.

| Badge                 | Requirement                                 |
| --------------------- | ------------------------------------------- |
| Bench Baron           | PR on Bench Press                           |
| Squat Sovereign       | PR on Barbell Squat                         |
| Deadlift Duke         | PR on Deadlift                              |
| Press Prince          | PR on Overhead Press                        |
| Row Ruler             | PR on Barbell Row                           |
| **Collection Reward** | **"Iron Foundation" title + special badge** |

#### Consistency Crown

Hit workout streaks of increasing length.

| Badge                 | Requirement                             |
| --------------------- | --------------------------------------- |
| Spark                 | 7-day streak                            |
| Flame                 | 30-day streak                           |
| Blaze                 | 60-day streak                           |
| Inferno               | 90-day streak                           |
| Eternal Fire          | 365-day streak                          |
| **Collection Reward** | **"Unstoppable" title + special badge** |

#### Volume Vault

Accumulate total lifetime volume milestones.

| Badge                 | Requirement                             |
| --------------------- | --------------------------------------- |
| Ton Club              | 1,000 kg total volume                   |
| Iron Stacker          | 10,000 kg                               |
| Steel Mountain        | 100,000 kg                              |
| Titanium Titan        | 500,000 kg                              |
| Platinum Presser      | 1,000,000 kg                            |
| **Collection Reward** | **"Volume King" title + special badge** |

#### Muscle Map

Train every major muscle group at least 10 times.

| Badge                 | Requirement                              |
| --------------------- | ---------------------------------------- |
| Chest Checked         | 10 chest sessions                        |
| Back in Action        | 10 back sessions                         |
| Leg Day Legend        | 10 leg sessions                          |
| Shoulder Soldier      | 10 shoulder sessions                     |
| Arms Race             | 10 arms sessions                         |
| Core Crusher          | 10 core sessions                         |
| **Collection Reward** | **"Well-Rounded" title + special badge** |

#### Social Butterfly

Engage with the community.

| Badge                 | Requirement                                  |
| --------------------- | -------------------------------------------- |
| First Friend          | Follow 1 user                                |
| Squad                 | Follow 5 users                               |
| Crew                  | Follow 10 users                              |
| Challenger            | Complete 1 challenge                         |
| Rival                 | Complete 5 challenges                        |
| **Collection Reward** | **"Community Pillar" title + special badge** |

### UI Touchpoints

- **Dedicated badges page**: Grid of all collections, each expandable to show individual badges (earned = color, unearned = greyed/locked)
- **Profile page**: Badge showcase section — user picks up to 3-5 badges to display
- **Post-workout summary**: Show any newly earned badges
- **Collection completion**: Special celebration modal when all badges in a collection are earned
- **Badge detail modal**: Tap a badge to see its name, description, rarity, and date earned

### Relationship to Existing Achievements

Badges and achievements coexist. Achievements are one-off milestones. Badge collections are themed groups that reward completing a full set. Some badges may share requirements with existing achievements — that's fine, they serve different purposes (individual recognition vs. collection completion).

---

## 3. Body Measurements Tracker

### Concept

Track body composition and measurements over time alongside training data. This gives users a fuller picture of progress — the scale and tape measure tell a different story than the barbell.

### Tracked Measurements

#### Weight & Composition

- Body weight (kg / lbs)
- Body fat % (optional, manual entry)

#### Circumference Measurements (all optional)

- Neck
- Chest
- Shoulders
- Left bicep / Right bicep
- Waist
- Hips
- Left thigh / Right thigh
- Left calf / Right calf
- Left forearm / Right forearm

### Data Entry

- **Quick log**: Tap "Log Measurements" — shows a form with fields for each measurement. Only fill in what you measured that day (all optional except at least one field).
- **Unit preference**: Respect user's existing weight unit preference (kg/lbs). Circumference measurements in cm or inches.
- **Date**: Defaults to today, but allow backdating.
- **Notes**: Optional text field for context ("morning, fasted", "post-workout", etc.).

### Visualizations

- **Weight chart**: Line chart of body weight over time with selectable time ranges (1 month, 3 months, 6 months, 1 year, all-time). Reuse existing chart patterns from the volume chart.
- **Body fat % chart**: Separate line chart if data is available.
- **Circumference charts**: One chart per measurement or a combined multi-line chart for selected measurements.
- **Summary cards**: Current value, change over selected period, min/max values.
- **Before/after comparison**: Select two dates and see a side-by-side comparison of all measurements taken on those dates with deltas highlighted (green for improvement, red for regression — direction depends on the metric).

### UI Touchpoints

- **New route**: `/measurements` — main measurements page with charts and history
- **Log entry modal**: Quick-access form to log new measurements
- **Dashboard integration**: Optional weight trend card on the dashboard
- **Stats page**: Body weight trend could appear alongside training volume trends
- **Profile**: Option to display current body weight (privacy-controlled)

### Progress Photos (Future Extension)

Photo upload support could be added later — store photos tagged with dates for visual before/after comparisons. Keep this out of v1 to keep scope manageable.

---

## 4. Timer Modes

### Concept

Built-in interval timers for popular training protocols. These live alongside the existing rest timer but serve different purposes — structuring entire workout segments rather than just rest between sets.

### Timer Types

#### AMRAP (As Many Reps/Rounds As Possible)

- User sets a duration (e.g., 10 minutes)
- Timer counts down
- Optional round counter — tap to increment rounds completed
- Audio alert at 1 minute remaining, 30 seconds, 10 seconds, and done
- Summary at end: total time, rounds completed

#### EMOM (Every Minute On the Minute)

- User sets total duration (e.g., 10 minutes) and interval (default 1 minute, configurable)
- Timer counts down each interval
- Audio beep at start of each new interval
- Visual indicator of current interval number (e.g., "Round 4 of 10")
- Optional alternating exercises display (e.g., odd minutes: cleans, even minutes: burpees)

#### Tabata

- Fixed structure: 20 seconds work / 10 seconds rest × 8 rounds (classic Tabata)
- Allow customization: work time, rest time, number of rounds, number of sets, rest between sets
- Distinct audio/visual cues for work vs. rest phases
- Color coding: green during work, red during rest
- Summary: total work time, total rest time, rounds completed

#### Countdown Timer

- Simple configurable countdown (user sets duration)
- Useful for planks, wall sits, stretching, or any timed hold
- Audio alert at completion
- Optional "halfway" alert

### Shared Timer Features

- **Large, glanceable display**: Big numbers visible from across the gym, high contrast
- **Audio cues**: Configurable beeps/alerts at key moments (can be muted)
- **Keep screen awake**: Prevent screen from sleeping while a timer is active
- **Background operation**: Timer continues if user navigates to log a set
- **Pause / resume / reset controls**
- **Haptic feedback** on mobile (vibration at interval changes)

### UI Touchpoints

- **Timer button in workout screen**: Quick access alongside the existing rest timer. Tap to open timer mode selector.
- **Standalone timer page**: Accessible from quick actions on the dashboard for users who want to time something without starting a formal workout.
- **Timer presets**: Save custom timer configurations (e.g., "My Tabata: 30s/15s × 6 rounds") for quick reuse.
- **Workout integration**: When a timer completes, optionally prompt to log the exercise/sets performed during that interval.
