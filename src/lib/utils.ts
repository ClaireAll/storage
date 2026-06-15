import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** 合并 tailwind 原子类，参数 inputs 为待合并的 className 片段。 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
