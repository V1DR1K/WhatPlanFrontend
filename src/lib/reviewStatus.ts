export type ReviewStatusFilter = "ALL" | "REVIEWED" | "UNREVIEWED";

export const reviewStatusFromQuery = (value: string | null): ReviewStatusFilter =>
  value === "REVIEWED" || value === "UNREVIEWED" ? value : "ALL";
