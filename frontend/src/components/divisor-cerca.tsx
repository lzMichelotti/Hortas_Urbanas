import { cn } from "@/lib/utils"

export function DivisorCerca({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("h-3.5 w-full [image-rendering:pixelated]", className)}
      style={{ backgroundImage: "url(/cerca-meio.png)", backgroundRepeat: "repeat-x", backgroundSize: "auto 100%" }}
    />
  )
}
