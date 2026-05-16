export type IndustrialPloRubricKey =
  | "problemAnalysis"
  | "investigation"
  | "modernToolUsage"
  | "ethics"
  | "individualTeamwork"
  | "communication"
  | "projectManagement"
  | "lifeLongLearning";

export type RubricLevel = {
  grade: string;
  scoreLabel: string;
  description: string;
};

export type IndustrialPloRubric = {
  key: IndustrialPloRubricKey;
  label: string;
  plo: string;
  levels: RubricLevel[];
};

const level = (grade: string, scoreLabel: string, description: string): RubricLevel => ({
  grade,
  scoreLabel,
  description,
});

export const INDUSTRIAL_PLO_RUBRICS: Record<IndustrialPloRubricKey, IndustrialPloRubric> = {
  lifeLongLearning: {
    key: "lifeLongLearning",
    label: "Lifelong Learning",
    plo: "PLO12",
    levels: [
      level(
        "Excellent",
        "10-A",
        "Demonstrates ability and motivation to quickly learn new technologies and develop skills to work with little or no assistance from supervisor."
      ),
      level(
        "Good",
        "7-B",
        "Demonstrates motivation to learning new technologies and developing new skills but needs some support from supervisor."
      ),
      level(
        "Adequate",
        "4-C",
        "Demonstrates interest and capacity to learn but needs time to grasp new technologies."
      ),
      level("Inadequate", "0-F", "Has a little or no interest in developing new skills."),
    ],
  },
  ethics: {
    key: "ethics",
    label: "Ethics",
    plo: "PLO8",
    levels: [
      level(
        "Excellent",
        "10-A",
        "Demonstrates strong professional and ethical conduct in the workplace. Completes assigned tasks on time and consistently respects organizational values, policies, and workplace discipline."
      ),
      level(
        "Good",
        "7-B",
        "Demonstrates good professional and ethical conduct in the workplace. Completes most assigned tasks on time and generally follows organizational values and policies."
      ),
      level(
        "Adequate",
        "4-C",
        "Demonstrates basic professional and ethical conduct in the workplace. Completes assigned tasks with delays and requires reminders to follow organizational values and policies."
      ),
      level(
        "Inadequate",
        "0-F",
        "Demonstrates limited professional and ethical conduct in the workplace. Fails to complete assigned tasks on time and does not follow organizational values and workplace discipline."
      ),
    ],
  },
  individualTeamwork: {
    key: "individualTeamwork",
    label: "Individual and Teamwork",
    plo: "PLO9",
    levels: [
      level(
        "Excellent",
        "10-A",
        "Student demonstrated an effective individual technical contribution towards task completion. Student helped fellow team members in discussion and implementing alternative solutions to their tasks. Values constructive peer criticism."
      ),
      level(
        "Good",
        "7-B",
        "Student demonstrated an effective individual technical contribution towards task completion. He/she helped fellow team members only by suggesting alternative solutions to them. Values some peer criticism."
      ),
      level(
        "Adequate",
        "4-C",
        "Students demonstrated some individual contribution towards task completion. Student was unable to demonstrate the capacity to help fellow team members. Not readily willing to value constructive peer criticism."
      ),
      level(
        "Inadequate",
        "0-F",
        "Student was unable to demonstrate significant individual contribution towards task completion. Student demonstrates behavior contrary to team spirit."
      ),
    ],
  },
  problemAnalysis: {
    key: "problemAnalysis",
    label: "Problem Analysis",
    plo: "PLO2",
    levels: [
      level("Excellent", "10-A", "Excellent problem analysis skills."),
      level(
        "Good",
        "7-B",
        "Existing problem have been stated. Additional discussion may be warranted in places. For solution."
      ),
      level(
        "Adequate",
        "4-C",
        "A complete understanding of the problem is not clear and solutions to the related problem are not clear."
      ),
      level("Inadequate", "0-F", "Connection between problem and solution is not clear."),
    ],
  },
  communication: {
    key: "communication",
    label: "Communication",
    plo: "PLO10",
    levels: [
      level(
        "Excellent",
        "10-A",
        "Excellent ability to communicate effectively, orally as well as in writing on technical activities and write effective reports regarding the tasked assigned by the industrial supervisor and how the task was performed."
      ),
      level(
        "Good",
        "7-B",
        "Good ability to communicate effectively, orally as well as in writing on technical activities and but write ineffective reports regarding the tasked assigned by the industrial supervisor and how the task was performed."
      ),
      level(
        "Adequate",
        "4-C",
        "Adequate to communicate effectively, orally as well as in writing on technical activities and write adequate reports regarding the tasked assigned by the industrial supervisor and how the task was performed."
      ),
      level(
        "Inadequate",
        "0-F",
        "Inadequate to communicate effectively, orally as well as in writing on technical activities and do not reports regarding the tasked assigned by the industrial supervisor and how the task was performed."
      ),
    ],
  },
  investigation: {
    key: "investigation",
    label: "Investigation",
    plo: "PLO4",
    levels: [
      level(
        "Excellent",
        "10-A",
        "Student demonstrated an exemplary ability in investigation and troubleshooting the technical fault. Component selection was excellent in rectifying the fault."
      ),
      level(
        "Good",
        "7-B",
        "Student investigation and troubleshooting the technical fault with little help from the supervisor. Component selection was good in rectifying the fault."
      ),
      level(
        "Adequate",
        "4-C",
        "Student investigation and troubleshooting the technical fault with proper guidance from the supervisor. Component selection was good in rectifying the fault."
      ),
      level(
        "Inadequate",
        "0-F",
        "Student was not able to identify and troubleshoot the technical fault even with the supervisor guidance."
      ),
    ],
  },
  projectManagement: {
    key: "projectManagement",
    label: "Project Management",
    plo: "PLO11",
    levels: [
      level(
        "Excellent",
        "10-A",
        "Well-defined technical task-plan listing timelines and resources. Feedback was regularly sought and incorporated. Technical task deliverable was timely completed."
      ),
      level(
        "Good",
        "7-B",
        "Well defined technical task plan listing timelines and resources. Some deliverable required extra time."
      ),
      level(
        "Adequate",
        "4-C",
        "Technical task planning has some deficiencies in stated timelines. Some sub tasks were partially completed."
      ),
      level(
        "Inadequate",
        "0-F",
        "Lack of planning is evident. Key deliverable could not be completed, technical task was not achieved."
      ),
    ],
  },
  modernToolUsage: {
    key: "modernToolUsage",
    label: "Modern Tool Usage",
    plo: "PLO5",
    levels: [
      level(
        "Excellent",
        "10-A",
        "Student demonstrated an exemplary ability and knowledge regarding the devices and able to apply appropriate technical tools and skills achieve the desired task."
      ),
      level(
        "Good",
        "7-B",
        "Student demonstrated a good ability and knowledge regarding the devices and able to apply appropriate technical tools and skills achieve the desired task."
      ),
      level(
        "Adequate",
        "4-C",
        "Student has slight knowledge about the devices and is able to apply appropriate technical tools with supervisor guidance can achieve the desired task."
      ),
      level(
        "Inadequate",
        "0-F",
        "Student doesn't have the desired knowledge about the devices and is unable to apply appropriate technical tools even with supervisor guidance cannot achieve the desired task."
      ),
    ],
  },
};

export const INDUSTRIAL_PLO_RUBRIC_ORDER: IndustrialPloRubricKey[] = [
  "problemAnalysis",
  "investigation",
  "modernToolUsage",
  "ethics",
  "individualTeamwork",
  "communication",
  "projectManagement",
  "lifeLongLearning",
];
