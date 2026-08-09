export type CvContent = {
  headline: string;
  summary: string;
  skills: { category: string; items: string[] }[];
  experience: { title: string; context: string; period: string; bullets: string[] }[];
  projects: { name: string; description: string; bullets: string[]; url?: string }[];
};
