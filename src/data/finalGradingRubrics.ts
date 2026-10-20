export type FinalGradingRubricKey =
  | "content"
  | "visuals"
  | "presentationSkills"
  | "organization"
  | "handlingOfQuestions"
  | "modernToolUsage"
  | "ethics"
  | "reportScore";

export type FinalGradingRubricLevel = {
  grade: string;
  scoreLabel: string;
  description: string;
};

export type FinalGradingRubric = {
  key: FinalGradingRubricKey;
  label: string;
  levels: FinalGradingRubricLevel[];
};

const level = (grade: string, scoreLabel: string, description: string): FinalGradingRubricLevel => ({
  grade,
  scoreLabel,
  description,
});

const pctBands = {
  excellent: "85-100",
  good: "70-84",
  adequate: "55-69",
  inadequate: "0-54",
};

export const FINAL_GRADING_RUBRICS: Record<FinalGradingRubricKey, FinalGradingRubric> = {
  content: {
    key: "content",
    label: "Content",
    levels: [
      level(
        "Excellent",
        pctBands.excellent,
        "Addresses all specified content areas. Material abundantly supports the topic. Use of engineering terms and jargon matches audience knowledge level."
      ),
      level(
        "Good",
        pctBands.good,
        "Addresses most content areas. Material sufficiently supports the topic. Use of engineering terms and jargon mostly matches audience knowledge level."
      ),
      level(
        "Adequate",
        pctBands.adequate,
        "Addresses some of the content areas. Material minimally supports the topic. Use of engineering terms and jargon minimally matches audience knowledge level."
      ),
      level(
        "Inadequate",
        pctBands.inadequate,
        "Addresses few of the content areas. Material does not support the topic. Use of engineering terms and jargon does not match audience knowledge level."
      ),
    ],
  },
  visuals: {
    key: "visuals",
    label: "Visuals",
    levels: [
      level(
        "Excellent",
        pctBands.excellent,
        "Text is easily readable. Graphics use constantly supports the presentation. Slide composition has a professional look that enhances the presentation."
      ),
      level(
        "Good",
        pctBands.good,
        "Text is readable. Graphics use mostly supports the presentation. Slide composition is not visually appealing, but does not detract from the presentation."
      ),
      level(
        "Adequate",
        pctBands.adequate,
        "Text is readable with effort. Graphics use rarely supports the presentation. Slide composition sometimes distracts from the presentation."
      ),
      level(
        "Inadequate",
        pctBands.inadequate,
        "Text is not readable. Graphics use does not support the presentation. Slide composition format is clearly distracting, obscuring the presentation."
      ),
    ],
  },
  presentationSkills: {
    key: "presentationSkills",
    label: "Presentation Skills",
    levels: [
      level(
        "Excellent",
        pctBands.excellent,
        "Clearly heard and polished. Attitude indicates confidence and enthusiasm. Audience attention is constantly maintained."
      ),
      level(
        "Good",
        pctBands.good,
        "Clearly heard but not polished. Attitude indicates confidence but not enthusiasm. Audience attention is mostly maintained."
      ),
      level(
        "Adequate",
        pctBands.adequate,
        "Difficult to hear and/or moments of awkwardness. Attitude indicates some lack of confidence and/or disinterest in subject. Audience attention is minimally maintained."
      ),
      level(
        "Inadequate",
        pctBands.inadequate,
        "Inaudible; several awkward pauses. Attitude indicates lack of confidence and/or disinterest in subject. Audience attention is not maintained."
      ),
    ],
  },
  organization: {
    key: "organization",
    label: "Organization",
    levels: [
      level(
        "Excellent",
        pctBands.excellent,
        "Information presented in logical and interesting sequence. The audience can easily follow the presentation."
      ),
      level(
        "Good",
        pctBands.good,
        "Information presented in a logical sequence. Audience can follow the presentation."
      ),
      level(
        "Adequate",
        pctBands.adequate,
        "Information not always presented in a logical sequence. Audience has difficulty following presentation."
      ),
      level(
        "Inadequate",
        pctBands.inadequate,
        "Information not presented in a logical sequence; audience cannot understand presentation."
      ),
    ],
  },
  handlingOfQuestions: {
    key: "handlingOfQuestions",
    label: "Handling of Questions",
    levels: [
      level(
        "Excellent",
        pctBands.excellent,
        "A significant portion of this project involves technical information outside of the undergraduate curriculum."
      ),
      level(
        "Good",
        pctBands.good,
        "Several technical aspects were new to the students and required research."
      ),
      level(
        "Adequate",
        pctBands.adequate,
        "This project contains some research but mostly involves technical information taught at the junior and senior levels."
      ),
      level(
        "Inadequate",
        pctBands.inadequate,
        "This project did not challenge the student to perform much research, as it relied mainly on information taught within the curriculum."
      ),
    ],
  },
  modernToolUsage: {
    key: "modernToolUsage",
    label: "Modern Tool Usage during SIT",
    levels: [
      level(
        "Excellent",
        pctBands.excellent,
        "Demonstrates strong knowledge and ability to effectively use modern tools and technologies relevant to assigned tasks. Independently learns and applies appropriate tools to achieve the desired task."
      ),
      level(
        "Good",
        pctBands.good,
        "Demonstrates good knowledge and ability to use modern tools and technologies relevant to assigned tasks. Applies appropriate tools with minimal guidance to achieve the desired task."
      ),
      level(
        "Adequate",
        pctBands.adequate,
        "Demonstrates basic knowledge of modern tools and technologies. Requires supervisor guidance to apply appropriate tools to achieve the desired task."
      ),
      level(
        "Inadequate",
        pctBands.inadequate,
        "Demonstrates limited knowledge of modern tools and technologies. Unable to apply appropriate tools to achieve the desired task even with supervisor guidance."
      ),
    ],
  },
  ethics: {
    key: "ethics",
    label: "Ethical Practice during SIT",
    levels: [
      level(
        "Excellent",
        pctBands.excellent,
        "Demonstrates strong professional and ethical responsibility. Maintains regular communication of SIT performance with the academic supervisor and promptly responds to instructions and requirements."
      ),
      level(
        "Good",
        pctBands.good,
        "Demonstrates good professional and ethical responsibility. Communicates SIT performance with the academic supervisor and responds to most instructions and requirements with minimal reminders."
      ),
      level(
        "Adequate",
        pctBands.adequate,
        "Demonstrates basic professional and ethical responsibility. Communicates SIT performance irregularly and requires reminders to respond to instructions and requirements."
      ),
      level(
        "Inadequate",
        pctBands.inadequate,
        "Demonstrates limited professional and ethical responsibility. Fails to communicate SIT performance regularly and does not respond appropriately to instructions and requirements despite reminders."
      ),
    ],
  },
  reportScore: {
    key: "reportScore",
    label: "Visual Format and Organization",
    levels: [
      level(
        "Excellent",
        pctBands.excellent,
        "The document is visually appealing and organized. The final report is properly managed regarding assigned and completed task details."
      ),
      level(
        "Good",
        pctBands.good,
        "The document is well maintained but more information could be added regarding task assigned progress during training."
      ),
      level(
        "Adequate",
        pctBands.adequate,
        "Errors in maintaining final report. Adequate information regarding task detail and training progress."
      ),
      level(
        "Inadequate",
        pctBands.inadequate,
        "The document is not visually appealing and improper information regarding task details and training progress."
      ),
    ],
  },
};
