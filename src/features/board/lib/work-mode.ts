import { type Application } from "../types";

const WORK_MODE_LABELS = {
  remote: "zdalnie",
  hybrid: "hybrydowo",
  office: "stacjonarnie",
} as const;

/** "zdalnie", or the city for hybrid/office roles ("Gdańsk"). */
export function formatWorkMode({ workMode, city }: Pick<Application, "workMode" | "city">) {
  if (workMode === "remote" || !city) return WORK_MODE_LABELS[workMode];
  return city;
}
