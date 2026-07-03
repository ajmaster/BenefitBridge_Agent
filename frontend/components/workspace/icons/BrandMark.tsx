import { cn } from "@/lib/utils";

export default function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex h-11 w-11 shrink-0 items-center justify-center", className)}
      aria-hidden="true"
    >
      <svg viewBox="0 0 512 512" className="h-full w-full">
        <circle cx="256" cy="256" r="184" fill="#eaf5ff" stroke="#07183f" strokeWidth="22" />
        <path d="M256 28l20 64h-40l20-64Z" fill="#0756d9" />
        <path d="M484 256l-64 20v-40l64 20Z" fill="#0756d9" />
        <path d="M256 484l-20-64h40l-20 64Z" fill="#008260" />
        <path d="M28 256l64-20v40l-64-20Z" fill="#0756d9" />
        <path
          d="M174 98c70-40 173-12 218 56"
          fill="none"
          stroke="#bcc8db"
          strokeLinecap="round"
          strokeWidth="18"
        />
        <path
          d="M119 345c-34-60-27-134 16-187"
          fill="none"
          stroke="#bcc8db"
          strokeLinecap="round"
          strokeWidth="18"
        />
        <path
          d="M228 86c-18 22-31 44-38 66-11 35 16 54 10 81-6 28-46 42-44 72 2 31 52 38 67 74 11 25 22 43 56 38 46-7 24-63 55-91 32-29 41-49 27-74-14-26-52-22-72-46-21-24-20-54-61-120Z"
          fill="#008260"
        />
        <path
          d="M190 155c34 25 38 69 72 90 24 15 64 1 85 28"
          fill="none"
          stroke="#fff"
          strokeDasharray="2 34"
          strokeLinecap="round"
          strokeWidth="22"
        />
        <path
          d="M334 91c47 0 86 38 86 85 0 63-86 116-86 116s-86-53-86-116c0-47 39-85 86-85Z"
          fill="#e55343"
        />
        <circle cx="334" cy="176" r="31" fill="#fff" />
        <path
          d="M352 285c36 0 65 29 65 65v38h-94c-25 0-45-20-45-45v-58h74Z"
          fill="#0756d9"
        />
        <rect x="303" y="316" width="90" height="48" rx="24" fill="#fff" />
        <rect x="318" y="329" width="60" height="22" rx="11" fill="#07183f" />
        <circle cx="337" cy="340" r="5" fill="#eaf5ff" />
        <circle cx="360" cy="340" r="5" fill="#eaf5ff" />
      </svg>
    </span>
  );
}
