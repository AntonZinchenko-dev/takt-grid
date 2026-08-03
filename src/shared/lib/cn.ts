import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Слияние классов с разрешением конфликтов Tailwind (последний выигрывает). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
