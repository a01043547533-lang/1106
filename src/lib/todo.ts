import data from "@/data/todo.json";
import { addDays, type YMD } from "./date";
import type { Source } from "@/rules/types";

export interface TodoItem {
  id: string;
  title: string;
  tip: string;
  link?: { label: string; url: string };
}

export interface TodoGroup {
  offset: number; // 입영일 기준 며칠 전(음수) / 뒤(양수)
  label: string; // "D-30"
  title: string;
  items: TodoItem[];
}

interface TodoFile {
  updated: string;
  groups: TodoGroup[];
  sources: Source[];
}

const file = data as TodoFile;

export const TODO_UPDATED = file.updated;
export const TODO_SOURCES = file.sources;

export function todoGroups(): TodoGroup[] {
  return file.groups;
}

export function todoFor(enlist?: YMD) {
  return file.groups.map((g) => ({
    ...g,
    date: enlist ? addDays(enlist, g.offset) : null,
  }));
}
