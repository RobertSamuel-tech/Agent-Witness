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
      return "border-success/30 bg-success/10 text-success"
    case "flagged":
      return "border-warning/30 bg-warning/10 text-warning"
    case "blocked":
      return "border-destructive/30 bg-destructive/10 text-destructive"
  }
}
