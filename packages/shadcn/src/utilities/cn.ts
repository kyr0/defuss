import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
    .trim()
    .split(/\s+/) // handles multiple spaces/newlines
    .filter((className: string, index: number, array: string[]) => index === 0 || className !== array[index - 1])
    .join(" ");
