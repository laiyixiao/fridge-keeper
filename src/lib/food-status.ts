export type Tone = "expired" | "urgent" | "soon" | "fresh";

export interface FoodStatus {
  label: string;
  tone: Tone;
}

// 根据"距到期天数"给出状态标签与语气
export function foodStatus(daysLeft: number): FoodStatus {
  if (daysLeft < 0) return { label: "已过期", tone: "expired" };
  if (daysLeft === 0) return { label: "今天到期", tone: "urgent" };
  if (daysLeft <= 3) return { label: `还有 ${daysLeft} 天`, tone: "urgent" };
  if (daysLeft <= 7) return { label: `还有 ${daysLeft} 天`, tone: "soon" };
  return { label: `还有 ${daysLeft} 天`, tone: "fresh" };
}

export const toneChip: Record<Tone, string> = {
  expired: "bg-stone-100 text-stone-500",
  urgent: "bg-rose-100 text-rose-700",
  soon: "bg-amber-100 text-amber-800",
  fresh: "bg-teal-50 text-teal-700",
};

export const toneDot: Record<Tone, string> = {
  expired: "bg-stone-300",
  urgent: "bg-rose-500",
  soon: "bg-amber-500",
  fresh: "bg-teal-500",
};
