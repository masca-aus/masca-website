export type CarePathwaySeed = {
  title: string;
  shortDescription: string;
  detail?: string;
  linkUrl?: string;
  children?: CarePathwaySeed[];
};

export const defaultCarePathways: CarePathwaySeed[] = [
  {
    title: "Wellbeing",
    shortDescription: "Make space for your wellbeing and find a supportive next step.",
    children: [
      { title: "Healthcare", shortDescription: "Find a GP, doctor, hospital or other health service.", linkUrl: "/care/healthcare" },
      { title: "Mental Health", shortDescription: "Explore counselling, wellbeing support and professional care." },
      { title: "Personal Safety", shortDescription: "Find support for safety concerns and unsafe situations." },
    ],
  },
  {
    title: "Finance",
    shortDescription: "Get a clearer view of costs, options, and practical support.",
    children: [
      { title: "Budgeting", shortDescription: "Make your money go further." },
      { title: "Work and income", shortDescription: "Explore practical options." },
      { title: "Financial support", shortDescription: "Find a place to begin." },
    ],
  },
  {
    title: "Settling in",
    shortDescription: "Just landed in Australia? Get the essentials you need to settle in, find your feet, and survive those first few weeks away from home.",
    children: [
      { title: "Accommodation", shortDescription: "Find a safer next step." },
      { title: "Local support", shortDescription: "Connect with your state." },
      { title: "Community", shortDescription: "Meet people who understand." },
    ],
  },
  {
    title: "Academic",
    shortDescription: "Find support that helps you stay connected to your study goals.",
    children: [
      { title: "Study support", shortDescription: "Get back into your rhythm." },
      { title: "Your options", shortDescription: "Understand the next step." },
      { title: "Campus connection", shortDescription: "Find help close to you." },
    ],
  },
];
