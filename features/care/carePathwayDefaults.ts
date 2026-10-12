export type CarePathwaySeed = {
  category: "wellbeing" | "finance" | "settling" | "academic";
  title: string;
  shortDescription: string;
  sortOrder: number;
  subsections: { title: string; detail: string; linkUrl: string }[];
};

export const defaultCarePathways: CarePathwaySeed[] = [
  {
    category: "wellbeing",
    title: "Wellbeing",
    shortDescription: "Make space for your wellbeing and find a supportive next step.",
    sortOrder: 1,
    subsections: [
      { title: "Healthcare", detail: "Find a GP, doctor, hospital or other health service.", linkUrl: "/care/healthcare" },
      { title: "Mental Health", detail: "Explore counselling, wellbeing support and professional care.", linkUrl: "" },
      { title: "Personal Safety", detail: "Find support for safety concerns and unsafe situations.", linkUrl: "" },
    ],
  },
  {
    category: "finance",
    title: "Finance",
    shortDescription: "Get a clearer view of costs, options, and practical support.",
    sortOrder: 2,
    subsections: [
      { title: "Budgeting", detail: "Make your money go further", linkUrl: "" },
      { title: "Work and income", detail: "Explore practical options", linkUrl: "" },
      { title: "Financial support", detail: "Find a place to begin", linkUrl: "" },
    ],
  },
  {
    category: "settling",
    title: "Settling in",
    shortDescription: "Just landed in Australia? Get the essentials you need to settle in, find your feet, and survive those first few weeks away from home.",
    sortOrder: 3,
    subsections: [
      { title: "Accommodation", detail: "Find a safer next step", linkUrl: "" },
      { title: "Local support", detail: "Connect with your state", linkUrl: "" },
      { title: "Community", detail: "Meet people who understand", linkUrl: "" },
    ],
  },
  {
    category: "academic",
    title: "Academic",
    shortDescription: "Find support that helps you stay connected to your study goals.",
    sortOrder: 4,
    subsections: [
      { title: "Study support", detail: "Get back into your rhythm", linkUrl: "" },
      { title: "Your options", detail: "Understand the next step", linkUrl: "" },
      { title: "Campus connection", detail: "Find help close to you", linkUrl: "" },
    ],
  },
];
