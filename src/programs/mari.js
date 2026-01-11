const program = {
  trainingDays: ['Push A', 'Pull A', 'Mobility', 'Push B', 'Pull B'],
  exerciseLibrary: {
    leg_press: {
      id: 'leg_press',
      name: 'Leg Press',
      description:
        "**SETUP:**\n• Sit in the machine with your back and head pressed firmly against the pad.\n• Place your feet on the platform shoulder-width apart.\n• Position feet high enough so your heels stay flat the entire time.\n\n**ACTION:**\n• Unrack the safety handles.\n• Slowly lower the platform towards you. Control the weight; don't let it drop.\n• Go as deep as possible without your lower back rounding or lifting off the seat.\n• Stop when your knees are near your chest (approx 90 degrees).\n\n**THE PUSH:**\n• Drive the platform back up by pushing through your heels and mid-foot.\n• Exhale as you push up.\n\n**SAFETY:**\n• NEVER fully lock your knees at the top. Keep a tiny micro-bend to protect your joints.",
      incrementKg: 5,
      startWeightKg: 65.0,
      maxWeightKg: 90.0,
      type: 'machine'
    },
    chest_press_machine: {
      id: 'chest_press_machine',
      name: 'Chest Press Machine',
      description:
        "**SETUP:**\n• Adjust the seat height so the handles are in line with the MIDDLE of your chest (not your shoulders).\n• Sit with your feet flat on the floor.\n\n**ACTION:**\n• Grip the handles and push them forward until your arms are extended.\n• Slowly return the weight back towards your chest. Feel a stretch across your chest muscles.\n• Don't let the weights slam down between reps.\n\n**CUES:**\n• Keep your elbows slightly lower than your shoulders (45-degree angle).\n• Keep your back pinned to the seat.",
      incrementKg: 2.5,
      startWeightKg: 25.0,
      type: 'machine'
    },
    ohp_machine: {
      id: 'ohp_machine',
      name: 'Overhead Press (Machine)',
      description:
        "**SETUP:**\n• Adjust seat height so the handles are roughly at chin/mouth level.\n• Grab the front vertical handles (neutral grip) or horizontal handles (wide grip) depending on comfort.\n\n**ACTION:**\n• Press the handles straight up overhead.\n• Lower them slowly back to ear level.\n\n**CUES:**\n• Brace your core (tighten stomach).\n• Do not shrug your shoulders up towards your ears as you press. Keep shoulders down.",
      incrementKg: 2.5,
      startWeightKg: 20.0,
      type: 'machine'
    },
    smith_bench_press: {
      id: 'smith_bench_press',
      name: 'Smith Bench Press',
      description:
        "**SETUP:**\n• Lie flat on the bench. Position yourself so the bar is directly over your chest (nipple line).\n• Grip the bar slightly wider than shoulder-width.\n\n**ACTION:**\n• Unhook the bar by rotating it.\n• Lower the bar slowly to your chest.\n• Touch your chest gently (don't bounce) and press back up.\n\n**CUES:**\n• Keep your wrists straight, not bent back like a waiter holding a tray.\n• Keep your feet planted firmly on the floor.",
      incrementKg: 2.5,
      startWeightKg: 30.0,
      type: 'smith'
    },
    seated_db_shoulder_press: {
      id: 'seated_db_shoulder_press',
      name: 'Seated DB Shoulder Press',
      description:
        "**SETUP:**\n• Sit on a bench with back support. Hold a dumbbell in each hand at shoulder level, palms facing forward.\n\n**ACTION:**\n• Press both weights straight up until they almost touch over your head.\n• Lower them slowly back to ear level.\n\n**CUES:**\n• Exhale as you push up.\n• Don't arch your lower back excessively.",
      incrementKg: 2.0,
      startWeightKg: 10.0,
      type: 'dumbbell'
    },
    dumbbell_lateral_raise: {
      id: 'dumbbell_lateral_raise',
      name: 'Dumbbell Lateral Raise',
      description:
        "**SETUP:**\n• Stand tall with light dumbbells at your sides.\n• Keep a slight bend in your elbows.\n\n**ACTION:**\n• Raise your arms out to the sides until they reach shoulder height.\n• Think about lifting with your elbows, not your hands.\n• Lower slowly back to your sides.\n\n**CUES:**\n• Pretend you are pouring water out of a jug at the top of the movement.\n• Do not swing your body to get the weight up. Use control.",
      incrementKg: 1.0,
      startWeightKg: 6.0,
      type: 'dumbbell'
    },
    cable_triceps_pressdown: {
      id: 'cable_triceps_pressdown',
      name: 'Cable Triceps Pressdown',
      description:
        "**SETUP:**\n• Attach a rope or straight bar to the high cable pulley.\n• Stand close to the machine. Grip the attachment.\n\n**ACTION:**\n• GLUE your elbows to your sides. They should not move forward or backward.\n• Push your hands down until your arms are fully straight.\n• Squeeze the back of your arms (triceps) at the bottom.\n• Slowly let your hands come back up to chest level.\n\n**CUES:**\n• Only your forearms should move.",
      incrementKg: 1.25,
      startWeightKg: 12.0,
      type: 'cable'
    },
    cable_overhead_triceps_extension: {
      id: 'cable_overhead_triceps_extension',
      name: 'Cable Overhead Triceps Extension',
      description:
        "**SETUP:**\n• Use the rope attachment. Face AWAY from the machine.\n• Step forward into a lunge stance for balance.\n• Hold the rope behind your head with elbows bent.\n\n**ACTION:**\n• Extend your arms forward/upward until straight.\n• Keep your elbows close to your head (don't let them flare out excessively).\n• Return slowly until you feel a stretch in your triceps.\n\n**CUES:**\n• Keep your core tight so you don't arch your back.",
      incrementKg: 1.25,
      startWeightKg: 10.0,
      type: 'cable'
    },
    lat_pulldown: {
      id: 'lat_pulldown',
      name: 'Lat Pulldown Machine',
      description:
        "**SETUP:**\n• Adjust the leg pads so they hold your thighs down firmly.\n• Stand up, grab the bar wider than shoulder-width, then sit down.\n\n**ACTION:**\n• Lean back VERY slightly.\n• Pull the bar down towards your upper chest (collarbone).\n• Imagine driving your ELBOWS down into your back pockets.\n• Control the bar on the way up until arms are fully straight.\n\n**CUES:**\n• Keep your chest proud/puffed out to meet the bar.\n• Don't use momentum to swing the weight down.",
      incrementKg: 2.5,
      startWeightKg: 25.0,
      type: 'machine'
    },
    seated_cable_row: {
      id: 'seated_cable_row',
      name: 'Seated Cable Row',
      description:
        "**SETUP:**\n• Sit on the machine with feet on the pads. Knees slightly bent.\n• Grab the V-handle.\n\n**ACTION:**\n• Sit up tall with a straight spine (neutral back).\n• Pull the handle towards your belly button.\n• Squeeze your shoulder blades together at the back.\n• Extend arms forward slowly until you feel a stretch in your back.\n\n**CUES:**\n• Don't round your back forward like a turtle.\n• Keep shoulders down away from ears.",
      incrementKg: 2.5,
      startWeightKg: 30.0,
      type: 'cable'
    },
    dumbbell_rdl: {
      id: 'dumbbell_rdl',
      name: 'Dumbbell RDL (Romanian Deadlift)',
      description:
        "**SETUP:**\n• Stand holding dumbbells in front of your thighs.\n• Feet hip-width apart. Knees slightly bent (soft knees).\n\n**ACTION:**\n• HINGE at the hips: Push your butt backward as if trying to close a car door with it.\n• Slide the dumbbells down the front of your legs.\n• Keep your back perfectly flat.\n• Go down until you feel a strong stretch in your hamstrings (usually just below knees).\n• Stand back up by squeezing your glutes (butt muscles).\n\n**CUES:**\n• Weight on heels.\n• Imagine your spine is a steel rod—it doesn't bend.",
      incrementKg: 2.5,
      startWeightKg: 20.0,
      type: 'dumbbell'
    },
    cable_face_pull: {
      id: 'cable_face_pull',
      name: 'Cable Face Pull',
      description:
        "**SETUP:**\n• Set cable to upper-chest or face height with rope attachment.\n• Grip the rope with thumbs facing you.\n\n**ACTION:**\n• Pull the center of the rope towards your eyes/nose.\n• Pull your hands apart and elbows BACK and OUT.\n• You should end up in a 'double bicep pose' position.\n• Squeeze the rear of your shoulders.\n\n**CUES:**\n• This is for posture and shoulder health. Don't go too heavy.",
      incrementKg: 1.25,
      startWeightKg: 12.0,
      type: 'cable'
    },
    straight_arm_pulldown: {
      id: 'straight_arm_pulldown',
      name: 'Straight-Arm Cable Pulldown',
      description:
        "**SETUP:**\n• Use a straight bar or rope on a high pulley.\n• Step back slightly and lean torso forward (hips hinged).\n\n**ACTION:**\n• Keep arms straight (tiny bend in elbows is OK but lock it there).\n• Pull the bar down in an arc until it touches your thighs.\n• Squeeze your lats (side back muscles).\n• Return slowly to eye level.\n\n**CUES:**\n• Think of your arms as levers. Do not bend the elbows to pull.",
      incrementKg: 1.25,
      startWeightKg: 12.0,
      type: 'cable'
    },
    one_arm_cable_row: {
      id: 'one_arm_cable_row',
      name: 'One-Arm Cable Row',
      description:
        "**SETUP:**\n• Set cable to waist height. Grab single handle with one hand.\n• Step back and adopt a wide stance or perform seated.\n\n**ACTION:**\n• Pull your elbow back past your body.\n• Allow your torso to rotate slightly forward on the stretch, then rotate back as you pull.\n• Squeeze the lat muscle on that side.\n\n**CUES:**\n• Keep shoulder down.",
      incrementKg: 2.5,
      startWeightKg: 20.0,
      type: 'cable'
    },
    smith_rdl: {
      id: 'smith_rdl',
      name: 'Smith Machine RDL',
      description:
        "**SETUP:**\n• Stand inside the Smith machine holding the bar.\n• Feet hip-width, knees soft.\n\n**ACTION:**\n• Unlock the bar.\n• Push hips back (hinge) while sliding the bar down your thighs.\n• Keep back flat.\n• Lower until hamstring stretch, then drive hips forward to stand up.\n\n**CUES:**\n• The bar path is fixed, so move your BODY around the bar. Hips go back!",
      incrementKg: 5,
      startWeightKg: 40.0,
      type: 'smith'
    },
    dumbbell_biceps_curl: {
      id: 'dumbbell_biceps_curl',
      name: 'Dumbbell Biceps Curl',
      description:
        "**SETUP:**\n• Stand tall with dumbbells at sides, palms facing forward.\n\n**ACTION:**\n• Curl the weights up towards your shoulders.\n• Squeeze biceps at the top.\n• Lower slowly (3 seconds down).\n\n**CUES:**\n• Elbows stay by your ribs. Don't let them drift forward.\n• No swinging!",
      incrementKg: 1.0,
      startWeightKg: 8.0,
      type: 'dumbbell'
    },
    smith_squat_box: {
      id: 'smith_squat_box',
      name: 'Smith Squat to Box',
      description:
        "**SETUP:**\n• Place a bench or box behind you in the Smith machine.\n• Position bar on upper back.\n• Step feet slightly forward (unlike a free squat).\n\n**ACTION:**\n• Unlock bar.\n• Sit back and down until your butt lightly touches the box.\n• Don't fully sit/relax—just touch.\n• Stand back up.\n\n**CUES:**\n• Keep chest up.\n• This is great for learning squat depth safely.",
      incrementKg: 5,
      startWeightKg: 30.0,
      type: 'smith'
    },
    cable_chest_fly: {
      id: 'cable_chest_fly',
      name: 'Cable Chest Fly',
      description:
        "**SETUP:**\n• Set pulleys to chest height.\n• Grab handles and step forward into a lunge for stability.\n\n**ACTION:**\n• Bring hands together in front of your chest like you are hugging a big tree.\n• Open arms back out slowly until you feel a chest stretch.\n• Keep a slight bend in elbows—do not press like a bench press.\n\n**CUES:**\n• Hug the tree.\n• Squeeze chest at the center.",
      incrementKg: 1.25,
      startWeightKg: 10.0,
      type: 'cable'
    },
    cable_rear_delt_fly: {
      id: 'cable_rear_delt_fly',
      name: 'Cable Rear-Delt Fly',
      description:
        "**SETUP:**\n• Stand facing the cable machine.\n• Grab the LEFT cable with RIGHT hand and RIGHT cable with LEFT hand (criss-cross).\n\n**ACTION:**\n• Pull your hands apart and back.\n• Arms should be nearly straight.\n• Squeeze the back of your shoulders.\n\n**CUES:**\n• Think about pulling your hands to the opposite walls.",
      incrementKg: 1.25,
      startWeightKg: 8.0,
      type: 'cable'
    },
    leg_press_calf: {
      id: 'leg_press_calf',
      name: 'Leg Press Calf Press',
      description:
        "**SETUP:**\n• Sit in leg press. Push the platform up.\n• Slide your feet down so only the BALLS of your feet are on the edge. Heels hanging off.\n\n**ACTION:**\n• Let your heels drop down below the platform edge (big stretch).\n• Push through your toes to extend ankles fully (tiptoes).\n\n**SAFETY:**\n• Keep safety catches engaged if possible, or be very careful your feet don't slip.",
      incrementKg: 5,
      startWeightKg: 65.0,
      maxWeightKg: 90.0,
      type: 'machine'
    },
    dumbbell_shrug: {
      id: 'dumbbell_shrug',
      name: 'Dumbbell Shrug',
      description:
        "**SETUP:**\n• Hold heavy dumbbells at your sides.\n\n**ACTION:**\n• Shrug your shoulders straight up towards your ears.\n• Hold for 1 second at the top.\n• Lower slowly.\n\n**CUES:**\n• Do not roll your shoulders. Straight up, straight down.",
      incrementKg: 2.5,
      startWeightKg: 16.0,
      type: 'dumbbell'
    },
    hammer_curl: {
      id: 'hammer_curl',
      name: 'Hammer Curl',
      description:
        "**SETUP:**\n• Hold dumbbells like you are holding a hammer (palms facing your body).\n\n**ACTION:**\n• Curl weights up keeping palms facing each other.\n• Targets the side of the arm/forearm.\n\n**CUES:**\n• Keep elbows fixed.",
      incrementKg: 1.0,
      startWeightKg: 10.0,
      type: 'dumbbell'
    },
    mobility_hips: {
      id: 'mobility_hips',
      name: 'Hip Mobility Flow',
      description:
        "**ROUTINE:**\n1. **Deep Squat Hold:** Hold onto a pole/rack, sit in a deep squat for 30s. Shift weight left/right.\n2. **Leg Swings:** Swing one leg forward/back 10 times, then side-to-side 10 times.\n3. **Hip Openers:** Step into a deep lunge, drop back knee, push hips forward.",
      incrementKg: 0,
      startWeightKg: 0,
      type: 'mobility',
      fixedTargetReps: 8
    },
    mobility_shoulders: {
      id: 'mobility_shoulders',
      name: 'Shoulder CARs (Rotations)',
      description:
        "**ACTION:**\n• Stand tall. Move one arm in the biggest circle possible.\n• Go SUPER SLOW.\n• Forward -> Up -> Rotate palm out -> Reach back -> Down.\n• Reverse the direction.\n• Keep your torso still. Only the shoulder moves.",
      incrementKg: 0,
      startWeightKg: 0,
      type: 'mobility',
      fixedTargetReps: 6
    },
    mobility_core: {
      id: 'mobility_core',
      name: 'Dead Bug',
      description:
        "**SETUP:**\n• Lie on back. Arms extended to ceiling. Legs in 'tabletop' position (knees 90 deg).\n\n**ACTION:**\n• Flatten your lower back into the floor. This is crucial.\n• Slowly lower Right Arm back and Left Leg forward.\n• Don't let your back arch!\n• Return to center and switch sides.\n\n**CUES:**\n• Breathe out hard as you extend.",
      incrementKg: 0,
      startWeightKg: 0,
      type: 'mobility',
      fixedTargetReps: 10
    }
  },
  dayTemplates: {
    'Push A': [
      'leg_press',
      'chest_press_machine',
      'ohp_machine',
      'cable_triceps_pressdown',
      'smith_squat_box',
      'leg_press_calf'
    ],
    'Pull A': [
      'lat_pulldown',
      'seated_cable_row',
      'dumbbell_rdl',
      'cable_face_pull',
      'straight_arm_pulldown',
      'dumbbell_shrug'
    ],
    'Push B': [
      'leg_press',
      'smith_bench_press',
      'seated_db_shoulder_press',
      'dumbbell_lateral_raise',
      'cable_chest_fly',
      'cable_overhead_triceps_extension'
    ],
    'Pull B': [
      'lat_pulldown',
      'one_arm_cable_row',
      'smith_rdl',
      'dumbbell_biceps_curl',
      'cable_rear_delt_fly',
      'hammer_curl'
    ],
    Mobility: ['mobility_hips', 'mobility_shoulders', 'mobility_core']
  }
};

export default {
  id: 'mari',
  name: 'Mari',
  program,
  title: 'Full-Body Toning',
  defaultSettings: {
    bodyweightKg: 65,
    restSeconds: 90
  }
};