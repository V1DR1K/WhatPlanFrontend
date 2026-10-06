import type { Home } from "../types/domain";

export type HomeLabelMap = Partial<Record<Home, string>>;

export function homeDisplayName(home: Home, labels: HomeLabelMap) {
  return labels[home] ?? (home === "TOMAS" ? "Casa 1" : "Casa 2");
}

export function homeName(home: Home, labels: HomeLabelMap) {
  return `Casa de ${homeDisplayName(home, labels)}`;
}
