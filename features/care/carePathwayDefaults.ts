export type CarePathwaySeed = {
  title: string;
  shortDescription: string;
  sortOrder: number;
  detail?: string;
  linkUrl?: string;
  children?: CarePathwaySeed[];
};

export const defaultCarePathways: CarePathwaySeed[] = [
  {
    title: "Wellbeing",
    shortDescription: "Make space for your wellbeing and find a supportive next step.",
    sortOrder: 1,
    children: [
      { title: "Healthcare", shortDescription: "Find a GP, doctor, hospital or other health service.", linkUrl: "/care/healthcare", sortOrder: 1 },
      { title: "Mental Health", shortDescription: "Explore counselling, wellbeing support and professional care.", sortOrder: 2 },
      { title: "Personal Safety", shortDescription: "Find support for safety concerns and unsafe situations.", sortOrder: 3 },
    ],
  },
  {
    title: "Finance",
    shortDescription: "Get a clearer view of costs, options, and practical support.",
    sortOrder: 2,
    children: [
      { title: "Budgeting", shortDescription: "Make your money go further.", sortOrder: 1 },
      { title: "Work and income", shortDescription: "Explore practical options.", sortOrder: 2 },
      { title: "Financial support", shortDescription: "Find a place to begin.", sortOrder: 3 },
    ],
  },
  {
    title: "Settling in",
    shortDescription: "Just landed in Australia? Get the essentials you need to settle in, find your feet, and survive those first few weeks away from home.",
    sortOrder: 3,
    children: [
      { title: "Accommodation", shortDescription: "Find a safer next step.", sortOrder: 1 },
      { title: "Local support", shortDescription: "Connect with your state.", sortOrder: 2 },
      { title: "Community", shortDescription: "Meet people who understand.", sortOrder: 3 },
    ],
  },
  {
    title: "Academic",
    shortDescription: "Find support that helps you stay connected to your study goals.",
    sortOrder: 4,
    children: [
      { title: "Study support", shortDescription: "Get back into your rhythm.", sortOrder: 1 },
      { title: "Your options", shortDescription: "Understand the next step.", sortOrder: 2 },
      { title: "Campus connection", shortDescription: "Find help close to you.", sortOrder: 3 },
    ],
  },
];
