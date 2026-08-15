export interface Category {
  id: string;
  label: string;
  emoji: string;
  color: string;
  /** Stars awarded per tap. */
  value: number;
}

export const CATEGORIES: Category[] = [
  { id: "cleaning-up", label: "Cleaning Up Nicely", emoji: "🧹", color: "#2BB3A3", value: 1 },
  { id: "superstar-sitting", label: "Superstar Sitting", emoji: "🧘", color: "#4D9DE0", value: 1 },
  { id: "heggerty-hero", label: "Heggerty Hero", emoji: "🦸", color: "#8D6FD1", value: 1 },
  { id: "following-directions", label: "Following Directions", emoji: "🧭", color: "#F49D37", value: 1 },
  { id: "listening", label: "Listening to the Teacher", emoji: "👂", color: "#EF6461", value: 1 },
  { id: "being-kind", label: "Being Kind", emoji: "💗", color: "#F26D9C", value: 1 },
  { id: "raising-hand", label: "Raising Our Hand", emoji: "🙋", color: "#6C8AE4", value: 1 },
  { id: "good-choices", label: "Making Good Choices", emoji: "👍", color: "#57B87B", value: 1 },
  { id: "working-hard", label: "Working Hard", emoji: "💪", color: "#C98850", value: 1 },
  { id: "star-student", label: "Star Student", emoji: "🌟", color: "#FFC531", value: 2 },
];

export const ADJUST_CATEGORY: Category = {
  id: "adjust",
  label: "Adjustment",
  emoji: "✏️",
  color: "#6B7390",
  value: 1,
};

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string): Category {
  return byId.get(id) ?? ADJUST_CATEGORY;
}
