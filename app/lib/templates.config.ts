export type Plan = "Free" | "Starter" | "Pro";

export interface TemplateConfig {
  id: string;
  name: string;
  minPlan: Plan;
  description: string;
}

export const TEMPLATES: TemplateConfig[] = [
  { id: "modern", name: "Modern", minPlan: "Free", description: "Clean, modern design suitable for most stores." },
  { id: "minimal", name: "Minimal", minPlan: "Starter", description: "A highly stripped back layout focused on data." },
  { id: "premium", name: "Premium", minPlan: "Starter", description: "High-end aesthetic for luxury brands." },
  { id: "dark", name: "Dark", minPlan: "Pro", description: "Sleek dark mode design for electronics or gaming." },
  { id: "enterprise", name: "Enterprise", minPlan: "Pro", description: "Maximum data density for huge catalogs." },
];

const planHierarchy: Record<Plan, number> = {
  Free: 0,
  Starter: 1,
  Pro: 2,
};

export function canAccessTemplate(plan: Plan, templateId: string): boolean {
  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!template) return false;

  const userPlanLevel = planHierarchy[plan];
  const requiredPlanLevel = planHierarchy[template.minPlan];

  return userPlanLevel >= requiredPlanLevel;
}
