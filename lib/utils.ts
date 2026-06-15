import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { PolicyResult } from "@/lib/db/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const MAX_ERROR_MESSAGE_LENGTH = 300

export function truncateMessage(message: string, maxLength = MAX_ERROR_MESSAGE_LENGTH): string {
  if (message.length <= maxLength) return message
  return `${message.slice(0, maxLength)}...`
}

export function formatRelativeTime(isoDate: string): string {
  const diffSeconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000)

  if (diffSeconds < 60) return "just now"

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

export function policyResultBadgeClass(result: PolicyResult): string {
  switch (result) {
    case "allowed":
      return "border-green-800 bg-green-950/50 text-green-400"
    case "flagged":
      return "border-yellow-800 bg-yellow-950/50 text-yellow-400"
    case "blocked":
      return "border-red-800 bg-red-950/50 text-red-400"
  }
}
