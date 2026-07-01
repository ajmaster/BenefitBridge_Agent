# BenefitBridge CA Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace BenefitBridge CA's single cluttered all-in-one-page dashboard
with (a) a minimal, motion-driven marketing landing page featuring a
purpose-built Remotion hero animation, and (b) a chat-centric workspace with
real per-section routes and a persistent conversation panel, built on
Tailwind + shadcn/ui + Motion.

**Architecture:** Two Next.js App Router route groups: `(marketing)` for the
new landing page at `/`, and `(workspace)` for `/app/*` section routes sharing
one layout that mounts a `BenefitBridgeProvider` (context wrapper around the
existing, unchanged `useBenefitBridgeController` hook) plus a persistent
`ConversationPanel` and `WorkspaceSidebarNav`, so chat state survives
navigation between sections without remounting. A new abstract Remotion
composition (`HeroLoop`) renders once to an MP4 and is embedded as a plain
looping `<video>` in the landing hero — no live player, to keep the static
export lightweight.

**Tech Stack:** Next.js 16 (App Router, static export), React 19, TypeScript,
Tailwind CSS, shadcn/ui, Motion (`motion/react`, formerly Framer Motion),
Remotion 4 (existing standalone project under `demo-videos/benefitbridge-remotion/`).

## Global Constraints

- Frontend-only change. Do not modify `app/fast_api_app.py` or any backend Python code, and do not change the `lib/api.ts` request/response contract (`POST /api/prepare`, `POST /api/chat`, `POST /api/export`, `POST /api/translate`, `GET /api/eval/readiness`, `GET /api/resources`).
- `next.config.mjs` keeps `output: "export"` and `trailingSlash: true` — every new route must be a real page file (`page.tsx`) that exports statically. No dynamic route segments.
- Preserve bilingual EN/ES support end-to-end (nav, forms, chat, packet, boundary copy) using the existing `Locale` type and `copyFor(locale)` pattern from `frontend/components/conversation-atlas/i18n.ts`.
- Never remove or reword the 4 boundary/safety disclaimer strings in `i18n.ts`'s `copy.boundary` — reuse the import verbatim wherever they must appear (workspace sidebar, landing trust strip). These encode safety-compliance requirements from `docs/design/DESIGN_SPEC.md` (no eligibility determination, no benefit amounts, no application submission, no credential handling).
- Visual tone: light background (`#fbfcfe` base), Apple/Google-clean — generous whitespace, oversized confident typography, soft shadows. NOT a dark theme. Reuse and extend the existing `--atlas-*` color tokens (ink `#07183f`, blue `#0756d9`, green `#008260`, orange `#ffa800`, red `#e55343`, surface `#ffffff`) rather than inventing a new palette. Font: Inter (via `next/font/google`, self-hosted — the backend CSP blocks external font CDN requests when Maps embed is off).
- Every scroll-triggered or auto-playing animation must have a `prefers-reduced-motion: reduce` fallback (opacity-only motion variants; static poster image instead of autoplaying video). Build one shared hook for this, used everywhere motion is added — do not implement the check ad hoc per component.
- `data-testid` attributes that already exist and are asserted on in `frontend/tests/e2e/dashboard.spec.ts` must be preserved on their corresponding new component unless a task explicitly says to rename them: `chat-input`, `language-select`, `a2ui-card`, `packet-panel`, `map-panel`, `map-fallback`, `demo-video`, `prepare-button`, `workspace-status`. (Task 11 lists the authoritative new-vs-old testid mapping.)
- No new backend env vars. `NEXT_PUBLIC_ENABLE_GOOGLE_MAPS_EMBED` / `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` behavior in `frontend/components/conversation-atlas/maps.ts` is unchanged.
- Run `npm run typecheck && npm run lint && npm run build` after every task, from `frontend/`, and confirm all three succeed before committing.
- Commit after each task with a descriptive message; do not squash multiple tasks into one commit.

---

### Task 1: Tailwind + shadcn/ui tooling foundation

**Files:**
- Modify: `frontend/package.json` (add dependencies)
- Modify: `frontend/tsconfig.json` (add `paths` alias)
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.mjs`
- Create: `frontend/components.json` (via shadcn CLI)
- Create: `frontend/lib/utils.ts` (shadcn `cn()` helper, via shadcn CLI)
- Modify: `frontend/app/globals.css` (promote `--atlas-*` tokens to `:root`, add Tailwind directives)

**Interfaces:**
- Produces: Tailwind color utilities (`bg-ink`, `text-blue`, `bg-surface`, etc.) mapped 1:1 to the existing `--atlas-*` CSS variables, so later tasks can use `className="bg-blue text-surface"` instead of CSS Modules.
- Produces: `cn(...)` utility from `frontend/lib/utils.ts`, imported as `import { cn } from "@/lib/utils"` — the `@/*` alias must resolve to `frontend/*`.

- [ ] **Step 1: Read the existing token source**

Read `frontend/components/conversation-atlas/ConversationAtlas.module.css` lines 1-30 (the `.shell` selector block) to get the exact current hex values for every `--atlas-*` variable. Do not guess values — copy them exactly.

- [ ] **Step 2: Add `paths` alias to tsconfig**

In `frontend/tsconfig.json`, inside `compilerOptions`, add:
```json
"baseUrl": ".",
"paths": {
  "@/*": ["./*"]
}
```

- [ ] **Step 3: Install dependencies**

Run from `frontend/`:
```bash
npm install tailwindcss postcss autoprefixer class-variance-authority clsx tailwind-merge lucide-react
```
Do NOT install `motion` in this task (Task 2 owns that, to keep this task's diff scoped to styling tooling only).

- [ ] **Step 4: Create PostCSS config**

Create `frontend/postcss.config.mjs`:
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 5: Promote design tokens to `:root` and add Tailwind directives in `globals.css`**

Rewrite `frontend/app/globals.css` so that:
1. A `:root { ... }` block at the top defines every `--atlas-*` variable found in Step 1, using the exact same hex values (do not rename the variables — keep `--atlas-ink`, `--atlas-blue`, etc. so the not-yet-migrated `ConversationAtlas.module.css` keeps working unchanged during the transition).
2. Immediately after, add Tailwind's three directives: `@tailwind base;`, `@tailwind components;`, `@tailwind utilities;`.
3. Keep the existing `html`, `button/input/select/textarea`, and focus-visible rules from the current file — do not delete them.

- [ ] **Step 6: Create `tailwind.config.ts`**

Create `frontend/tailwind.config.ts` with `theme.extend.colors` mapping every token from Step 1 to a Tailwind color name via CSS variable reference, e.g.:
```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--atlas-ink)",
        "ink-soft": "var(--atlas-ink-soft)",
        muted: "var(--atlas-muted)",
        line: "var(--atlas-line)",
        "line-strong": "var(--atlas-line-strong)",
        blue: "var(--atlas-blue)",
        "blue-dark": "var(--atlas-blue-dark)",
        sky: "var(--atlas-sky)",
        green: "var(--atlas-green)",
        "green-dark": "var(--atlas-green-dark)",
        "green-soft": "var(--atlas-green-soft)",
        orange: "var(--atlas-orange)",
        "orange-soft": "var(--atlas-orange-soft)",
        red: "var(--atlas-red)",
        "red-soft": "var(--atlas-red-soft)",
        surface: "var(--atlas-surface)",
      },
      boxShadow: {
        atlas: "var(--atlas-shadow)",
        "atlas-soft": "var(--atlas-shadow-soft)",
      },
    },
  },
  plugins: [],
};

export default config;
```
Confirm the exact shadow variable names/values against what Step 1 found in the CSS file (the example above uses placeholder names `--atlas-shadow`/`--atlas-shadow-soft` — verify these match, adjust if the real variable names differ).

- [ ] **Step 7: Run shadcn init**

Run from `frontend/`:
```bash
npx shadcn@latest init -d
```
If prompted interactively despite `-d`, choose: style `new-york`, base color `slate`, CSS variables `yes`, tailwind config `tailwind.config.ts`, CSS file `app/globals.css`, import alias `@/components`, `@/lib`, `@/hooks`, `@/ui`. This generates `frontend/components.json` and `frontend/lib/utils.ts`.

- [ ] **Step 8: Verify**

Run:
```bash
npm run typecheck && npm run lint && npm run build
```
Expected: all three succeed with no errors. The app's rendered output should be visually unchanged (Tailwind is installed but nothing yet uses it besides shadcn's own base styles).

- [ ] **Step 9: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/tsconfig.json frontend/tailwind.config.ts frontend/postcss.config.mjs frontend/components.json frontend/lib/utils.ts frontend/app/globals.css
git commit -m "chore(frontend): add Tailwind + shadcn/ui tooling foundation"
```

---

### Task 2: Motion, reduced-motion hook, and marketing copy/locale-sync utilities

**Files:**
- Modify: `frontend/package.json` (add `motion` dependency)
- Create: `frontend/lib/useReducedMotion.ts`
- Create: `frontend/lib/locale-storage.ts`
- Create: `frontend/components/marketing/marketingCopy.ts`

**Interfaces:**
- Produces: `useReducedMotion(): boolean` from `frontend/lib/useReducedMotion.ts` — a client hook reading `window.matchMedia("(prefers-reduced-motion: reduce)")`, reactive to changes, SSR-safe (returns `false` on server/first render, updates on mount).
- Produces: `getStoredLocale(): Locale | null` and `setStoredLocale(locale: Locale): void` from `frontend/lib/locale-storage.ts`, using `localStorage` key `"bb-locale"`. Import `Locale` type from `frontend/components/conversation-atlas/i18n.ts`.
- Produces: `marketingCopyFor(locale: Locale): MarketingCopy` from `frontend/components/marketing/marketingCopy.ts`, where `MarketingCopy` is a new exported type with fields: `heroKicker`, `heroHeadline`, `heroSubhead` (must be under 20 words in English), `heroCtaPrimary`, `heroCtaSecondary`, `howItWorksTitle`, `howItWorksSteps: { icon: string; title: string; body: string }[]` (3-4 entries: Ask, Sources, Packet, Local resources), `demoGalleryTitle`, `demoGallerySubtitle`, `footerTagline`. Provide both `"en"` and `"es"` copy for every field (this file's shape mirrors the existing `copyFor()` pattern in `i18n.ts` — read that file first to match its structure/conventions).

- [ ] **Step 1: Install Motion**

Run from `frontend/`:
```bash
npm install motion
```

- [ ] **Step 2: Write `useReducedMotion` hook**

Create `frontend/lib/useReducedMotion.ts`:
```ts
"use client";

import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  return reduced;
}
```

- [ ] **Step 3: Write locale-storage helpers**

Read `frontend/components/conversation-atlas/i18n.ts` first to find the exact exported `Locale` type name and its union values (expected `"en" | "es"` but confirm). Then create `frontend/lib/locale-storage.ts`:
```ts
import type { Locale } from "@/components/conversation-atlas/i18n";

const STORAGE_KEY = "bb-locale";

export function getStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "en" || value === "es" ? value : null;
}

export function setStoredLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, locale);
}
```
Adjust the type guard if `Locale` has more than two values — check the actual union in `i18n.ts`.

- [ ] **Step 4: Write marketing copy file**

Read `frontend/components/conversation-atlas/i18n.ts` in full first to match its `copyFor(locale)` pattern and see what `copy.boundary` looks like (Task 5's TrustStrip will import `copy.boundary` from this same `i18n.ts` file directly — do not duplicate boundary copy into `marketingCopy.ts`).

Create `frontend/components/marketing/marketingCopy.ts` exporting a `MarketingCopy` type and a `marketingCopyFor(locale: Locale): MarketingCopy` function, following the exact field list in this task's Interfaces section above. Write real English and Spanish copy for every field (not placeholder text) — for example:
- `heroHeadline` (en): "Benefits prep, made clear." / (es): "Preparación de beneficios, más clara."
- `heroSubhead` (en, <20 words): "Chat through your situation. Get sources, next steps, and a packet ready for your appointment." (es equivalent, also concise)
- `howItWorksSteps` (en): `[{icon: "chat", title: "Ask", body: "Describe your situation in your own words."}, {icon: "source", title: "Sources", body: "See official programs that may apply, with citations."}, {icon: "document", title: "Packet", body: "Leave with a printable packet for your conversation."}]` (plus es equivalents). Use icon name strings that match existing `AtlasIcon` names found in `frontend/components/BenefitBridgeDashboard.tsx` (read its `AtlasIcon` switch statement to reuse existing icon name strings like `"chat"`, `"source"`, `"document"`, `"map"`, `"shield"` rather than inventing new ones).

- [ ] **Step 5: Verify**

```bash
npm run typecheck && npm run lint && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/lib/useReducedMotion.ts frontend/lib/locale-storage.ts frontend/components/marketing/marketingCopy.ts
git commit -m "feat(frontend): add Motion, reduced-motion hook, and marketing copy"
```

---

### Task 3: Marketing header and hero components

**Files:**
- Create: `frontend/components/marketing/MarketingHeader.tsx`
- Create: `frontend/components/marketing/Hero.tsx`
- Create: `frontend/components/marketing/HeroDemoLoop.tsx`
- Create: `frontend/components/workspace/icons/BrandMark.tsx` (ported)
- Create: `frontend/components/workspace/icons/AtlasIcon.tsx` (ported, subset needed for marketing: at minimum the icon names referenced by Task 2's `howItWorksSteps` and any header/hero icons)

**Interfaces:**
- Consumes: `marketingCopyFor` from Task 2 (`frontend/components/marketing/marketingCopy.ts`), `useReducedMotion` from Task 2, `getStoredLocale`/`setStoredLocale` from Task 2.
- Produces: `<MarketingHeader locale={locale} onLocaleChange={(l) => void} />`, `<Hero locale={locale} />`. Both are client components (`"use client"`).
- Produces: `<HeroDemoLoop />` — a self-contained client component that renders a `<video>` pointed at `/demo-videos/hero-loop.mp4` with `poster="/demo-videos/hero-loop-poster.png"`. **These asset files do not exist yet** (Task 6 creates them) — build this component now assuming the paths, so it silently shows a broken-video state until Task 6 lands; do not block this task on the asset existing. Must render a static `<img src="/demo-videos/hero-loop-poster.png">` fallback instead of `<video autoPlay>` when `useReducedMotion()` returns true.
- Produces: `BrandMark` (default export, no props) and `AtlasIcon({ name, className }: { name: string; className?: string })` ported verbatim in logic from `frontend/components/BenefitBridgeDashboard.tsx` (read that file's `BrandMark` and `AtlasIcon` implementations first, copy their SVG markup/logic exactly — do not redesign the icons in this task, only relocate them to make them importable independently of the monolith component, which still exists and is unaffected by this task).

- [ ] **Step 1: Read source components to port**

Read `frontend/components/BenefitBridgeDashboard.tsx` in full. Locate the `BrandMark` and `AtlasIcon` function definitions (they are standalone functions in that file, not exported — note their line ranges).

- [ ] **Step 2: Port `BrandMark` and `AtlasIcon`**

Create `frontend/components/workspace/icons/BrandMark.tsx` and `frontend/components/workspace/icons/AtlasIcon.tsx`, each `export default function ...` (or named export — match whatever calling convention is simplest given the copied JSX), preserving the exact SVG paths/props from the source. Do not modify visual output — this is a pure relocation so both the still-untouched `BenefitBridgeDashboard.tsx` and new marketing components can each have their own copy without cross-importing from the monolith (the monolith keeps its own inline copies for now; these new files are for net-new components only, avoiding a dependency from new code back into the file that Task 12 will delete).

- [ ] **Step 3: Build `MarketingHeader`**

Create `frontend/components/marketing/MarketingHeader.tsx`. Renders: `BrandMark` + wordmark text "BenefitBridge CA", a language toggle (two buttons or a `<select>`, EN/ES, calling `onLocaleChange`), and one primary CTA button (shadcn `Button`, `asChild` wrapping a Next `<Link href="/app/chat/">`) with the label from `marketingCopyFor(locale).heroCtaPrimary`. Fixed/sticky header, Tailwind classes only (no CSS Module) — e.g. `className="sticky top-0 z-50 flex items-center justify-between border-b border-line bg-surface/90 px-6 py-4 backdrop-blur"`.

- [ ] **Step 4: Build `Hero`**

Create `frontend/components/marketing/Hero.tsx`. Two-column layout on desktop (copy left, `HeroDemoLoop` right), stacked on mobile. Left column: kicker text, `<h1>` with `marketingCopyFor(locale).heroHeadline` at oversized size (Tailwind `text-6xl md:text-7xl font-extrabold tracking-tight text-ink`), subhead paragraph, primary CTA (`Link href="/app/chat/"`, shadcn `Button`) + secondary ghost CTA anchor-linking to `#how-it-works`. Use `motion.h1`/`motion.p`/`motion.div` from `"motion/react"` with `initial={{opacity: 0, y: 16}} animate={{opacity: 1, y: 0}} transition={{duration: 0.5, delay: N}}` staggered per element (0, 0.08, 0.16, 0.24). Call `useReducedMotion()` and when `true`, pass `initial={{opacity: 0}} animate={{opacity: 1}}` instead (no `y` offset) to every motion element in this component.

- [ ] **Step 5: Build `HeroDemoLoop`**

Create `frontend/components/marketing/HeroDemoLoop.tsx`:
```tsx
"use client";

import { useReducedMotion } from "@/lib/useReducedMotion";

export function HeroDemoLoop() {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <img
        src="/demo-videos/hero-loop-poster.png"
        alt=""
        aria-hidden="true"
        className="w-full rounded-2xl shadow-atlas"
      />
    );
  }

  return (
    <video
      className="w-full rounded-2xl shadow-atlas"
      src="/demo-videos/hero-loop.mp4"
      poster="/demo-videos/hero-loop-poster.png"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
    />
  );
}
```

- [ ] **Step 6: Verify**

```bash
npm run typecheck && npm run lint && npm run build
```
These components aren't mounted by any route yet, so `build` succeeding (with no import errors) is the bar — they won't be visible until Task 4 wires the landing page route.

- [ ] **Step 7: Commit**

```bash
git add frontend/components/marketing/MarketingHeader.tsx frontend/components/marketing/Hero.tsx frontend/components/marketing/HeroDemoLoop.tsx frontend/components/workspace/icons/BrandMark.tsx frontend/components/workspace/icons/AtlasIcon.tsx
git commit -m "feat(frontend): add marketing header and hero components"
```

---

### Task 4: How-it-works, demo gallery, trust strip, footer, and landing page route

**Files:**
- Create: `frontend/components/marketing/HowItWorks.tsx`
- Create: `frontend/components/marketing/DemoGallery.tsx`
- Create: `frontend/components/marketing/TrustStrip.tsx`
- Create: `frontend/components/marketing/MarketingFooter.tsx`
- Create: `frontend/app/(marketing)/layout.tsx`
- Modify: `frontend/app/page.tsx` (or create `frontend/app/(marketing)/page.tsx` and empty out `frontend/app/page.tsx` — see Step 5)

**Interfaces:**
- Consumes: `marketingCopyFor` (Task 2), `copy.boundary` from `frontend/components/conversation-atlas/i18n.ts` (existing), `MarketingHeader`/`Hero` (Task 3), shadcn `Dialog` (Task 1's shadcn setup — run `npx shadcn@latest add dialog` if not already present).
- Produces: the full landing page tree assembled and mounted at `/`.

- [ ] **Step 1: Add shadcn Dialog component**

Run from `frontend/`:
```bash
npx shadcn@latest add dialog button
```
This vendors `frontend/components/ui/dialog.tsx` and `frontend/components/ui/button.tsx`.

- [ ] **Step 2: Build `HowItWorks`**

Create `frontend/components/marketing/HowItWorks.tsx` with `id="how-it-works"`. Renders `marketingCopyFor(locale).howItWorksSteps` as a horizontal grid on desktop (`grid-cols-3` or `grid-cols-4` matching the array length), stacked on mobile, each step showing an `AtlasIcon`, title, body. Wrap each step in `motion.div` with `whileInView={{opacity: 1, y: 0}} initial={{opacity: 0, y: 24}} viewport={{once: true, amount: 0.4}}`, staggered via `transition={{delay: index * 0.1}}`. Apply the same reduced-motion collapse as Task 3 Step 4.

- [ ] **Step 3: Build `DemoGallery`**

Read `demo-videos/benefitbridge-remotion/src/flows.ts` to get the exact `title`/`subtitle`/`audience` copy and accent colors for the 4 existing flows (`SanJoseFamilyNavigator` #1f8a5b, `SfFoodShelterHandoff` #2563eb, `SpanishWicPrep` #7c3aed, `ConversationAtlasDemo` #0f766e). Create `frontend/components/marketing/DemoGallery.tsx`: a 2x2 grid (stacked on mobile) of cards, each showing the poster image (`/demo-videos/<slug>-still.png` or `/demo-videos/conversation-atlas-poster.png` — confirm exact filenames by listing `frontend/public/demo-videos/`, since only `conversation-atlas` assets are confirmed to already be copied there; note any of the other 3 posters/videos not yet present under `frontend/public/demo-videos/` as a gap for a follow-up asset-sync task, and skip rendering a card for any flow whose asset file is confirmed missing rather than link to a 404), title, subtitle, and a play-button overlay. Clicking a card opens a shadcn `Dialog` containing `<video controls src={...} poster={...}>`. Card entrance: `whileInView` stagger; hover: `whileHover={{scale: 1.02}}`.

- [ ] **Step 4: Build `TrustStrip` and `MarketingFooter`**

Create `frontend/components/marketing/TrustStrip.tsx`: import `copy.boundary` (or equivalent named export — check `i18n.ts`'s exact export name for the 4-item boundary list) from `frontend/components/conversation-atlas/i18n.ts` directly, render as a calm horizontal wrapped strip with a shield `AtlasIcon`, muted text color (`text-muted text-sm`), no motion (this content should feel stable/non-flashy, not part of the marketing animation choreography).

Create `frontend/components/marketing/MarketingFooter.tsx`: repeat the primary CTA, a one-line non-goals statement (source this from `docs/design/DESIGN_SPEC.md`'s Non-goals section, phrased as a single user-facing sentence, e.g. "BenefitBridge does not determine eligibility, calculate benefit amounts, or submit applications."), language toggle mirror, copyright line.

- [ ] **Step 5: Wire the landing page route**

Create `frontend/app/(marketing)/layout.tsx` as a minimal pass-through layout (no extra chrome beyond what `MarketingHeader`/`MarketingFooter` provide inside the page itself — this layout mainly exists to scope the route group; it can just render `{children}` directly, or add a shared `<main>` wrapper).

Move the page content: since `frontend/app/page.tsx` currently renders `<BenefitBridgeDashboard />`, and Next.js route groups don't add a URL segment, create `frontend/app/(marketing)/page.tsx` as the new `/` route:
```tsx
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { DemoGallery } from "@/components/marketing/DemoGallery";
import { TrustStrip } from "@/components/marketing/TrustStrip";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
// client-side locale state lifted here, initialized from getStoredLocale() ?? "en"
```
Compose all 6 components in order: Header, Hero, HowItWorks, DemoGallery, TrustStrip, Footer. Manage `locale` state in this page component (client component, `"use client"`), calling `setStoredLocale` on change, passing `locale`/`onLocaleChange` down to `MarketingHeader`.

Leave the **existing** `frontend/app/page.tsx` (the one rendering `<BenefitBridgeDashboard />`) in place for now but rename/move it out of the way so Next doesn't see two components claiming `/`: since a route group page and a non-grouped page at the same URL will conflict, delete `frontend/app/page.tsx` in this task (not `BenefitBridgeDashboard.tsx` itself, which stays unrouted-but-still-compiling per the plan's migration approach — only its route-mounting file goes). Confirm via `frontend/app/` directory listing after this change that there is exactly one `page.tsx` resolving to `/`.

- [ ] **Step 6: Verify**

```bash
npm run typecheck && npm run lint && npm run build
```
Then manually inspect: `npm run dev` (from `frontend/`), open `http://127.0.0.1:3000/`, confirm the new landing page renders (hero, how-it-works, demo gallery dialog opens, trust strip visible, footer present), confirm no console errors. Stop the dev server after checking.

- [ ] **Step 7: Commit**

```bash
git add -A frontend/components/marketing frontend/app
git commit -m "feat(frontend): assemble and mount new marketing landing page at /"
```

---

### Task 5: Remotion HeroLoop composition

**Files:**
- Create: `demo-videos/benefitbridge-remotion/src/HeroLoop.tsx`
- Create: `demo-videos/benefitbridge-remotion/src/heroLoop.config.ts`
- Modify: `demo-videos/benefitbridge-remotion/src/Root.tsx`
- Modify: `demo-videos/benefitbridge-remotion/package.json` (add `still:hero`, `render:hero` scripts)

**Interfaces:**
- Produces: a Remotion composition registered with id `"HeroLoop"` in `Root.tsx`, renderable via `npx remotion render src/index.ts HeroLoop out/hero-loop.mp4 --codec=h264` and `npx remotion still src/index.ts HeroLoop out/hero-loop-poster.png --frame=<mid-frame>`.

This task does not depend on the frontend work in Tasks 1-4 and can be done independently; it produces the two asset files (`out/hero-loop.mp4`, `out/hero-loop-poster.png`) that Task 6 copies into the frontend.

- [ ] **Step 1: Read existing project conventions**

Read `demo-videos/benefitbridge-remotion/src/Root.tsx`, `src/flows.ts`, and `src/DemoVideo.tsx` in full to match existing code style (how `<Composition>` is registered, how colors/spacing are structured, TypeScript conventions used).

- [ ] **Step 2: Write `heroLoop.config.ts`**

Create `demo-videos/benefitbridge-remotion/src/heroLoop.config.ts`:
```ts
export const HERO_LOOP_WIDTH = 1600;
export const HERO_LOOP_HEIGHT = 1000;
export const HERO_LOOP_FPS = 30;
export const HERO_LOOP_DURATION_SECONDS = 10;
export const HERO_LOOP_DURATION_FRAMES = HERO_LOOP_FPS * HERO_LOOP_DURATION_SECONDS;

export const HERO_LOOP_COLORS = {
  ink: "#07183f",
  blue: "#0756d9",
  green: "#008260",
  surface: "#ffffff",
  background: "#fbfcfe",
};
```
(Confirm these hex values match Task 1 Step 1's read of the actual `--atlas-*` tokens — use the real values, the ones above are the values already confirmed via prior research in this project; if Task 1 finds different exact values, prefer whatever Task 1 actually read from the CSS file, since that is ground truth.)

- [ ] **Step 3: Write `HeroLoop.tsx`**

Create `demo-videos/benefitbridge-remotion/src/HeroLoop.tsx` implementing the 5-beat structure below using `AbsoluteFill`, `Sequence`, `spring`, and `interpolate` from `"remotion"`, at 300 frames total (10s @ 30fps):

| Beat | Frames | Content |
|---|---|---|
| 1. Message | 0–60 | A rounded chat-bubble rectangle (fill `HERO_LOOP_COLORS.blue`, `borderRadius: 24`) containing 2-3 short redacted-text-line placeholders (plain light rectangles, not real words), sliding in from the left with fading opacity |
| 2. Reasoning | 60–150 | 3-4 small circles (`r: 18-24px`) positioned around a central point, each scaling in with a staggered `spring()` (offset each node's start frame by ~10 frames), connected to the center by thin animated lines using `strokeDasharray`/`strokeDashoffset` driven by `interpolate(frame, [beatStart, beatStart + 30], [lineLength, 0])` |
| 3. Sources fan out | 150–210 | 2-3 small rounded-rect cards (fill `HERO_LOOP_COLORS.green`, small shield glyph or checkmark, one line of placeholder text) translating/rotating out from the hub position, staggered entrance |
| 4. Packet assembles | 210–280 | The source cards animate (translate + scale) converging into one larger rounded-rect "packet" card (border `HERO_LOOP_COLORS.blue`, background `HERO_LOOP_COLORS.surface`), with 3 short checklist lines fading in sequentially (each ~15 frames apart) |
| 5. Loop tie-back | 280–300 | Packet card fades out (`opacity` interpolate to 0), beat-1 chat bubble fades back in, so frame 300 visually approximates frame 0 for a clean loop when rendered with `--codec=h264` and played with `loop` |

Each beat is its own `<Sequence from={beatStart} durationInFrames={beatLength} premountFor={30}>`. Background: `HERO_LOOP_COLORS.background`, filling the full `AbsoluteFill`. Add a tiny caption under beats 1/3/4 (2-4 words max, e.g. "Ask", "Sources", "Packet") in Inter, `fontSize: 22`, `color: HERO_LOOP_COLORS.ink`, `fontWeight: 700` — no other text/copy anywhere in this composition.

- [ ] **Step 4: Register the composition in `Root.tsx`**

Add a `<Folder name="Hero">` containing a `<Composition id="HeroLoop" component={HeroLoop} durationInFrames={HERO_LOOP_DURATION_FRAMES} fps={HERO_LOOP_FPS} width={HERO_LOOP_WIDTH} height={HERO_LOOP_HEIGHT} />` inside the existing `RemotionRoot` component, alongside (not replacing) the existing `<Folder name="BenefitBridge">` block.

- [ ] **Step 5: Add render/still scripts**

In `demo-videos/benefitbridge-remotion/package.json`, add to `scripts`:
```json
"still:hero": "remotion still src/index.ts HeroLoop out/hero-loop-poster.png --frame=150 --overwrite",
"render:hero": "remotion render src/index.ts HeroLoop out/hero-loop.mp4 --codec=h264 --overwrite"
```
Match the exact flag style already used by the existing `still:all`/`render:all` scripts in this file (read them first) rather than inventing new flag conventions.

- [ ] **Step 6: Typecheck**

Run from `demo-videos/benefitbridge-remotion/`:
```bash
npm run typecheck
```

- [ ] **Step 7: Preview in Remotion Studio**

Run `npm run preview` (or the existing equivalent script name — check `package.json`), open the Studio, select the `HeroLoop` composition under the `Hero` folder, scrub through all 300 frames, confirm: no visual glitches, no console errors, the loop point (frame 300 vs frame 0) looks reasonably continuous. Close the Studio process when done.

- [ ] **Step 8: Commit**

```bash
git add demo-videos/benefitbridge-remotion/src/HeroLoop.tsx demo-videos/benefitbridge-remotion/src/heroLoop.config.ts demo-videos/benefitbridge-remotion/src/Root.tsx demo-videos/benefitbridge-remotion/package.json
git commit -m "feat(remotion): add abstract HeroLoop composition for landing hero"
```

---

### Task 6: Render hero assets and wire into the landing hero

**Files:**
- Create: `demo-videos/benefitbridge-remotion/out/hero-loop.mp4` (generated, not hand-written)
- Create: `demo-videos/benefitbridge-remotion/out/hero-loop-poster.png` (generated)
- Create: `frontend/public/demo-videos/hero-loop.mp4` (copied)
- Create: `frontend/public/demo-videos/hero-loop-poster.png` (copied)
- Create: `demo-videos/benefitbridge-remotion/scripts/sync-to-frontend.cjs`
- Modify: `demo-videos/benefitbridge-remotion/package.json` (add `sync:frontend` script)
- Modify: `frontend/components/marketing/Hero.tsx` (mount `HeroDemoLoop`, from Task 3, into the layout if not already wired)

**Interfaces:**
- Consumes: the `HeroLoop` composition from Task 5.
- Produces: the two static asset files at their final frontend-served path `frontend/public/demo-videos/hero-loop*`, matching exactly what Task 3's `HeroDemoLoop.tsx` already expects.

- [ ] **Step 1: Render the assets**

Run from `demo-videos/benefitbridge-remotion/`:
```bash
npm run render:hero
npm run still:hero
```
Confirm `out/hero-loop.mp4` and `out/hero-loop-poster.png` exist and are non-trivial file sizes (mp4 > 500KB, png > 50KB) — if either is suspiciously small or the commands error, stop and report rather than proceeding with a broken asset.

- [ ] **Step 2: Write the sync script**

Create `demo-videos/benefitbridge-remotion/scripts/sync-to-frontend.cjs`:
```js
#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const demoRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(demoRoot, "../..");
const outDir = path.join(demoRoot, "out");
const targetDir = path.join(repoRoot, "frontend", "public", "demo-videos");

const filesToSync = [
  "hero-loop.mp4",
  "hero-loop-poster.png",
];

fs.mkdirSync(targetDir, { recursive: true });

for (const file of filesToSync) {
  const source = path.join(outDir, file);
  const target = path.join(targetDir, file);
  fs.copyFileSync(source, target);
  console.log(`synced ${file}`);
}
```

- [ ] **Step 3: Add the sync script to package.json**

Add to `demo-videos/benefitbridge-remotion/package.json` `scripts`:
```json
"sync:frontend": "node scripts/sync-to-frontend.cjs"
```

- [ ] **Step 4: Run the sync**

```bash
npm run sync:frontend
```
Confirm `frontend/public/demo-videos/hero-loop.mp4` and `frontend/public/demo-videos/hero-loop-poster.png` now exist.

- [ ] **Step 5: Wire into `Hero.tsx`**

Open `frontend/components/marketing/Hero.tsx` (from Task 3). Confirm `<HeroDemoLoop />` is mounted in the right column of the hero layout — if Task 3 already placed it there, no code change is needed in this step; if it was deferred, add `import { HeroDemoLoop } from "./HeroDemoLoop";` and render `<HeroDemoLoop />` in the appropriate layout slot now that real assets back it.

- [ ] **Step 6: Verify**

```bash
cd frontend && npm run build
```
Then `npm run dev`, open `http://127.0.0.1:3000/`, confirm the hero shows the looping video (or the poster image if reduced-motion is emulated in devtools), confirm it loops seamlessly enough to not be jarring, confirm no layout shift/overflow. Stop the dev server after checking.

- [ ] **Step 7: Commit**

```bash
git add demo-videos/benefitbridge-remotion/out/hero-loop.mp4 demo-videos/benefitbridge-remotion/out/hero-loop-poster.png demo-videos/benefitbridge-remotion/scripts/sync-to-frontend.cjs demo-videos/benefitbridge-remotion/package.json frontend/public/demo-videos/hero-loop.mp4 frontend/public/demo-videos/hero-loop-poster.png frontend/components/marketing/Hero.tsx
git commit -m "feat(frontend): render and embed HeroLoop demo video in landing hero"
```

---

### Task 7: Workspace context, provider, shell, sidebar nav, and persistent conversation panel

**Files:**
- Create: `frontend/components/workspace/BenefitBridgeContext.ts`
- Create: `frontend/components/workspace/BenefitBridgeProvider.tsx`
- Create: `frontend/components/workspace/WorkspaceShell.tsx`
- Create: `frontend/components/workspace/WorkspaceSidebarNav.tsx`
- Create: `frontend/components/workspace/ConversationPanel.tsx`

**Interfaces:**
- Consumes: `useBenefitBridgeController` from `frontend/components/conversation-atlas/useBenefitBridgeController.ts` (existing, unchanged — read it first to get its exact return type shape).
- Produces: `useBenefitBridgeContext()` — a hook throwing if called outside `<BenefitBridgeProvider>`, returning exactly `ReturnType<typeof useBenefitBridgeController>`.
- Produces: `<BenefitBridgeProvider>{children}</BenefitBridgeProvider>` — calls the controller hook exactly once and provides it via context.
- Produces: `<WorkspaceShell>{children}</WorkspaceShell>` — renders `<WorkspaceSidebarNav />` + `<ConversationPanel />` + `<main>{children}</main>` in a 3-region CSS grid/flex layout (sidebar left, main center, conversation right on desktop; collapses to a single column with the conversation reachable via a shadcn `Sheet` trigger button on narrow viewports — implement the mobile collapse using a Tailwind responsive breakpoint, e.g. `lg:grid lg:grid-cols-[240px_1fr_380px]` with a `hidden lg:block` sidebar and a `Sheet` for mobile).
- Produces: `<WorkspaceSidebarNav />` — 6 `<Link>`s to `/app/chat/`, `/app/prepare/`, `/app/sources/`, `/app/resources/`, `/app/packet/`, `/app/bay-area/`, using `usePathname()` from `next/navigation` to apply active styling (no `activeSection` state).
- Produces: `<ConversationPanel />` — the persistent chat UI, ported from the existing `ConversationCard` component inside `frontend/components/BenefitBridgeDashboard.tsx` (read that component's implementation first — locate it by name in the file — and port its JSX/logic, converting its prop-based state access to `useBenefitBridgeContext()` calls instead). Preserve the `data-testid="chat-input"` attribute on the message input element (must exist for Task 11's e2e tests).

- [ ] **Step 1: Read the controller hook and the source `ConversationCard`**

Read `frontend/components/conversation-atlas/useBenefitBridgeController.ts` in full — note its exact return object's field names and function signatures (e.g. `chatMessages`, `runChat`, `userText`, `setUserText`, etc. — use the real names, do not invent). Read `frontend/components/BenefitBridgeDashboard.tsx` and find the `ConversationCard` function — note every prop it currently receives and where each one currently comes from in the parent's controller state, since in the new version these become direct `useBenefitBridgeContext()` field reads instead of props.

- [ ] **Step 2: Write the context**

Create `frontend/components/workspace/BenefitBridgeContext.ts`:
```ts
"use client";

import { createContext, useContext } from "react";
import type { useBenefitBridgeController } from "@/components/conversation-atlas/useBenefitBridgeController";

type BenefitBridgeContextValue = ReturnType<typeof useBenefitBridgeController>;

export const BenefitBridgeContext = createContext<BenefitBridgeContextValue | null>(null);

export function useBenefitBridgeContext(): BenefitBridgeContextValue {
  const value = useContext(BenefitBridgeContext);
  if (!value) {
    throw new Error("useBenefitBridgeContext must be used within BenefitBridgeProvider");
  }
  return value;
}
```

- [ ] **Step 3: Write the provider**

Create `frontend/components/workspace/BenefitBridgeProvider.tsx`:
```tsx
"use client";

import type { ReactNode } from "react";
import { useBenefitBridgeController } from "@/components/conversation-atlas/useBenefitBridgeController";
import { BenefitBridgeContext } from "./BenefitBridgeContext";

export function BenefitBridgeProvider({ children }: { children: ReactNode }) {
  const controller = useBenefitBridgeController();
  return (
    <BenefitBridgeContext.Provider value={controller}>
      {children}
    </BenefitBridgeContext.Provider>
  );
}
```
If `useBenefitBridgeController` requires arguments (check Step 1's reading — the existing call site in `BenefitBridgeDashboard.tsx` shows whether it's called with no args or with initial config), match the exact existing call signature.

- [ ] **Step 4: Write `WorkspaceSidebarNav`**

Create `frontend/components/workspace/WorkspaceSidebarNav.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AtlasIcon } from "@/components/workspace/icons/AtlasIcon";
import { useBenefitBridgeContext } from "./BenefitBridgeContext";

const sections = [
  { href: "/app/chat/", icon: "chat", label: { en: "Chat", es: "Chat" } },
  { href: "/app/prepare/", icon: "prepare", label: { en: "Prepare", es: "Preparar" } },
  { href: "/app/sources/", icon: "source", label: { en: "Sources", es: "Fuentes" } },
  { href: "/app/resources/", icon: "map", label: { en: "Resources", es: "Recursos" } },
  { href: "/app/packet/", icon: "document", label: { en: "Packet", es: "Paquete" } },
  { href: "/app/bay-area/", icon: "bay", label: { en: "Bay Area", es: "Área de la Bahía" } },
] as const;

export function WorkspaceSidebarNav() {
  const pathname = usePathname();
  const { snapshot } = useBenefitBridgeContext();
  const locale = snapshot.language;

  return (
    <nav className="flex flex-col gap-1 p-4" aria-label="Workspace sections">
      {sections.map((section) => {
        const active = pathname === section.href || pathname === section.href.replace(/\/$/, "");
        return (
          <Link
            key={section.href}
            href={section.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-sky text-blue-dark" : "text-ink-soft hover:bg-sky/50",
            )}
          >
            <AtlasIcon name={section.icon} className="h-5 w-5" />
            <span>{section.label[locale]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```
Verify against Step 1's reading that `snapshot.language` is the correct field path for the current locale (adjust if the controller's actual field name differs — do not guess, use what Step 1 found) and that icon names `"chat"`, `"prepare"`, `"source"`, `"map"`, `"document"`, `"bay"` exist in the ported `AtlasIcon` (from Task 3) — adjust names to whatever the actual ported switch statement supports.

- [ ] **Step 5: Port `ConversationPanel`**

Create `frontend/components/workspace/ConversationPanel.tsx` by porting the `ConversationCard` component's JSX and logic from `frontend/components/BenefitBridgeDashboard.tsx` (found in Step 1), changing every prop read (e.g. `props.chatMessages`) to a `useBenefitBridgeContext()` destructure (e.g. `const { chatMessages, runChat, userText, setUserText } = useBenefitBridgeContext();`). Preserve the `data-testid="chat-input"` on the input/textarea element and any other existing `data-testid`s inside this component (e.g. quick-prompt buttons) exactly as found in the source. Do not change any visual behavior — this is a relocation, not a redesign, of the chat UI logic (Task 8-9 will restyle with Tailwind; this task can keep using Tailwind utility classes matching the existing look, or temporarily import the existing CSS Module class names if that's faster — either is acceptable here as long as it visually matches, since the styling pass happens per Task granularity described in the plan's migration approach, but prefer Tailwind now since the CSS Module will be deleted in Task 12).

- [ ] **Step 6: Write `WorkspaceShell`**

Create `frontend/components/workspace/WorkspaceShell.tsx`:
```tsx
import type { ReactNode } from "react";
import { WorkspaceSidebarNav } from "./WorkspaceSidebarNav";
import { ConversationPanel } from "./ConversationPanel";

export function WorkspaceShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[240px_1fr_380px]">
      <aside className="hidden border-r border-line bg-surface lg:block">
        <WorkspaceSidebarNav />
      </aside>
      <main className="min-w-0 overflow-y-auto p-6">{children}</main>
      <aside className="hidden border-l border-line bg-surface lg:block">
        <ConversationPanel />
      </aside>
    </div>
  );
}
```
Note: mobile/narrow-viewport handling (showing sidebar nav and conversation panel via a `Sheet` when the grid collapses to `grid-cols-1`) is intentionally left as a visible gap in this specific step — add a simple always-visible mobile affordance now (e.g., render `WorkspaceSidebarNav` and `ConversationPanel` unconditionally stacked above `main` when below the `lg` breakpoint, without a `Sheet`, using `className="lg:hidden border-b border-line"` wrappers) rather than leaving mobile fully broken. A polished mobile `Sheet`-based interaction can be a fast-follow; this task's bar is "usable on mobile without horizontal overflow," matching the existing app's current mobile-safety guarantee (see `frontend/tests/e2e/dashboard.spec.ts`'s "supports mobile Conversation Atlas layout without horizontal overflow" test, which Task 11 must keep passing in some form for the workspace).

- [ ] **Step 7: Verify**

```bash
npm run typecheck && npm run lint && npm run build
```
These components aren't mounted by a route yet (Task 9 wires the actual `/app/*` pages) — verify only that they compile cleanly with no type errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/components/workspace/BenefitBridgeContext.ts frontend/components/workspace/BenefitBridgeProvider.tsx frontend/components/workspace/WorkspaceShell.tsx frontend/components/workspace/WorkspaceSidebarNav.tsx frontend/components/workspace/ConversationPanel.tsx
git commit -m "feat(frontend): add workspace context, provider, shell, sidebar nav, and conversation panel"
```

---

### Task 8: Shared workspace sub-components

**Files:**
- Create: `frontend/components/workspace/shared/SourceCitationCard.tsx`
- Create: `frontend/components/workspace/shared/ResourceCard.tsx`
- Create: `frontend/components/workspace/shared/MapEmbedPanel.tsx`
- Create: `frontend/components/workspace/shared/PacketPreview.tsx`
- Create: `frontend/components/workspace/shared/ReadinessPanel.tsx`
- Create: `frontend/components/workspace/shared/BoundaryList.tsx`
- Create: `frontend/components/workspace/shared/BayAreaPins.tsx`
- Create: `frontend/components/workspace/shared/ResultStackPreview.tsx`

**Interfaces:**
- Consumes: `useBenefitBridgeContext` (Task 7) where a component needs live state; otherwise takes explicit props matching the source component's existing prop shape.
- Produces: each named component as an independent, importable module for Task 9's section components to compose.

- [ ] **Step 1: Read all source components**

Read `frontend/components/BenefitBridgeDashboard.tsx` in full (again, if not already fresh from Task 7) and locate each of: `SourceCitationCard`, `ResourceCard`, `MapEmbedPanel`, `PacketPanel` (note: only its paper-preview portion is `PacketPreview` here — the export/translate action buttons move to `PacketSection` in Task 9, not here), `ReadinessPanel`, `BoundaryList`, `BayAreaPins`, `AtlasResultStack` (becomes `ResultStackPreview`). Note each one's current props exactly. Also read `frontend/components/conversation-atlas/maps.ts` in full — `MapEmbedPanel` depends on `canRenderMapsEmbed`, `googleMapsEmbedUrl`, `googleMapsSearchUrl`, `resourceMapQuery` from this file; import them unchanged.

- [ ] **Step 2: Port each component**

For each of the 8 files listed above, create the new file under `frontend/components/workspace/shared/`, porting the source component's JSX/logic:
- Keep exact `data-testid` attributes found in the source (`map-panel`, `map-fallback`, `packet-panel` — confirm the precise element each one is on).
- Replace CSS Module class references with equivalent Tailwind utility classes reproducing the same visual layout (spacing, borders, shadows using the Task 1 token-backed Tailwind colors, e.g. `border-line`, `shadow-atlas-soft`, `text-muted`).
- Where a component currently receives data via props from the monolith's controller destructuring, keep it prop-based here too (do not force every shared component to call `useBenefitBridgeContext()` directly — only components that today read directly from the controller inside the monolith should do so; components that are purely presentational and receive data as props today should remain prop-based, preserving the existing separation of concerns). Consult Step 1's notes to decide per-component.

- [ ] **Step 3: Verify**

```bash
npm run typecheck && npm run lint && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components/workspace/shared
git commit -m "feat(frontend): port shared workspace sub-components to Tailwind"
```

---

### Task 9: Section components and workspace routes

**Files:**
- Create: `frontend/components/workspace/sections/ChatSection.tsx`
- Create: `frontend/components/workspace/sections/PrepareSection.tsx`
- Create: `frontend/components/workspace/sections/SourcesSection.tsx`
- Create: `frontend/components/workspace/sections/ResourcesSection.tsx`
- Create: `frontend/components/workspace/sections/PacketSection.tsx`
- Create: `frontend/components/workspace/sections/BayAreaSection.tsx`
- Create: `frontend/app/(workspace)/layout.tsx`
- Create: `frontend/app/(workspace)/app/page.tsx`
- Create: `frontend/app/(workspace)/app/chat/page.tsx`
- Create: `frontend/app/(workspace)/app/prepare/page.tsx`
- Create: `frontend/app/(workspace)/app/sources/page.tsx`
- Create: `frontend/app/(workspace)/app/resources/page.tsx`
- Create: `frontend/app/(workspace)/app/packet/page.tsx`
- Create: `frontend/app/(workspace)/app/bay-area/page.tsx`

**Interfaces:**
- Consumes: `useBenefitBridgeContext` (Task 7), all shared components (Task 8), `BenefitBridgeProvider`/`WorkspaceShell` (Task 7).
- Produces: the 7 live `/app*` routes.

- [ ] **Step 1: Read remaining monolith section markup**

Read `frontend/components/BenefitBridgeDashboard.tsx`'s six section bodies (Chat, Prepare, Sources, Resources, Packet, Bay Area — the content inside each `SectionFrame`, minus the parts already ported to Task 8's shared components) and the `PreparePanel` component in full (the 8-field household form — profile select, language, location, household size, adults, income, housing status, needs checkboxes, context textarea). Note the `data-testid="prepare-button"` element and every form field's current name/id.

- [ ] **Step 2: Build `ChatSection`**

Create `frontend/components/workspace/sections/ChatSection.tsx`: renders quick-prompt suggestion chips (buttons that call the controller's chat-send function with a preset string — read Step 1's source for the exact 3 quick-prompt strings currently used), a `<ResultStackPreview />` (from Task 8), and a compact `<BoundaryList />` (from Task 8). Does NOT render its own chat input — that lives permanently in `ConversationPanel` (Task 7).

- [ ] **Step 3: Build `PrepareSection`**

Create `frontend/components/workspace/sections/PrepareSection.tsx`: the household snapshot form (all 8 fields from Step 1, using shadcn `Select`/`Input`/`Textarea`/`Checkbox`/`Label` components — run `npx shadcn@latest add select input textarea checkbox label card` first if not already vendored) plus `<ReadinessPanel />` (Task 8). Preserve `data-testid="prepare-button"` on the submit button. On successful prepare, call `router.push("/app/packet/")` using `useRouter()` from `next/navigation` (this replaces the old `moveToSection("packet")` behavior — confirm from Step 1 exactly which controller function currently triggers that navigation-after-prepare behavior, and move that `router.push` call to whichever callback fires after a successful `runPrepare()` resolves, keeping the controller itself free of routing concerns per this plan's Global Constraints).

- [ ] **Step 4: Build `SourcesSection`, `ResourcesSection`, `PacketSection`, `BayAreaSection`**

Create each, composing the relevant Task 8 shared components (`SourcesSection` → grid of `SourceCitationCard`; `ResourcesSection` → `MapEmbedPanel` + grid of `ResourceCard`; `PacketSection` → `PacketPreview` + export/translate action buttons calling `runExport`/`runTranslate` from `useBenefitBridgeContext()`; `BayAreaSection` → `MapEmbedPanel` (large variant) + `BayAreaPins` + summary stats). Match each section's current intro-copy pattern from Step 1's reading (short 1-2 sentence intro per section, from `i18n.ts`).

- [ ] **Step 5: Build the workspace layout**

Create `frontend/app/(workspace)/layout.tsx`:
```tsx
import type { ReactNode } from "react";
import { BenefitBridgeProvider } from "@/components/workspace/BenefitBridgeProvider";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <BenefitBridgeProvider>
      <WorkspaceShell>{children}</WorkspaceShell>
    </BenefitBridgeProvider>
  );
}
```

- [ ] **Step 6: Build the 7 route pages**

Each of `frontend/app/(workspace)/app/page.tsx`, `.../app/chat/page.tsx`, `.../app/prepare/page.tsx`, `.../app/sources/page.tsx`, `.../app/resources/page.tsx`, `.../app/packet/page.tsx`, `.../app/bay-area/page.tsx` is a thin wrapper. Example (`prepare/page.tsx`):
```tsx
import { PrepareSection } from "@/components/workspace/sections/PrepareSection";

export default function PreparePage() {
  return <PrepareSection />;
}
```
Both `frontend/app/(workspace)/app/page.tsx` and `.../app/chat/page.tsx` render `<ChatSection />` (per this plan's IA — the workspace default and `/app/chat/` show the same content, since the actual chat UI is the persistent panel, not page content).

- [ ] **Step 7: Verify**

```bash
npm run typecheck && npm run lint && npm run build
```
Then `npm run dev`, manually click through `/app/`, `/app/prepare/`, `/app/sources/`, `/app/resources/`, `/app/packet/`, `/app/bay-area/`: confirm the sidebar highlights the active route, confirm the conversation panel is visible and functional on every route, type a message on `/app/chat/`, navigate to `/app/prepare/` and back, confirm the message is still present (chat did not remount). Stop the dev server after checking.

- [ ] **Step 8: Commit**

```bash
git add frontend/components/workspace/sections frontend/app/\(workspace\)
git commit -m "feat(frontend): add workspace section components and per-section routes"
```

---

### Task 10: Locale carry-over between landing and workspace

**Files:**
- Modify: `frontend/components/conversation-atlas/useBenefitBridgeController.ts` (read its initial state setup)
- Modify: `frontend/components/workspace/BenefitBridgeProvider.tsx` or the controller hook itself, whichever owns `snapshot.language`'s initial value

**Interfaces:**
- Consumes: `getStoredLocale` from `frontend/lib/locale-storage.ts` (Task 2).
- Produces: the workspace's initial language state reads from `localStorage`'s `"bb-locale"` key (set by the marketing page's language toggle) instead of always defaulting to `"en"`.

- [ ] **Step 1: Locate the controller's initial locale state**

Read `frontend/components/conversation-atlas/useBenefitBridgeController.ts` and find exactly where `snapshot.language` (or equivalent field) is initialized (likely a `useState` default value or an initial object literal).

- [ ] **Step 2: Read from storage on mount**

Modify the initializer to call `getStoredLocale() ?? "en"` instead of a hardcoded `"en"`. If the hook uses `useState(initialValue)` with a plain literal, change it to `useState(() => getStoredLocale() ?? "en")` (lazy initializer, so `localStorage` is only read once on mount, client-side). Import `getStoredLocale` from `@/lib/locale-storage`.

- [ ] **Step 3: Confirm the marketing page writes to the same key**

Re-check `frontend/app/(marketing)/page.tsx` (Task 4) already calls `setStoredLocale(locale)` whenever its language toggle changes — if it doesn't yet, add that call now in the `onLocaleChange` handler.

- [ ] **Step 4: Verify**

```bash
npm run typecheck && npm run lint && npm run build
```
Then `npm run dev`: on `/`, switch language to Spanish, click the primary CTA to `/app/chat/`, confirm the workspace UI (nav labels, chat placeholder, section copy) renders in Spanish. Stop the dev server after checking.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/conversation-atlas/useBenefitBridgeController.ts frontend/app/\(marketing\)/page.tsx
git commit -m "fix(frontend): carry language selection from landing page into workspace"
```

---

### Task 11: Retire the old monolith and update the e2e test suite

**Files:**
- Delete: `frontend/components/BenefitBridgeDashboard.tsx`
- Delete: `frontend/components/conversation-atlas/ConversationAtlas.module.css`
- Delete: `frontend/tests/e2e/dashboard.spec.ts`
- Create: `frontend/tests/e2e/landing.spec.ts`
- Create: `frontend/tests/e2e/workspace.spec.ts`

**Interfaces:**
- N/A — this task is cleanup + test coverage, not new product surface.

- [ ] **Step 1: Confirm nothing still imports the monolith or its CSS module**

Run:
```bash
grep -rn "BenefitBridgeDashboard" frontend/app frontend/components --include="*.tsx" --include="*.ts"
grep -rn "ConversationAtlas.module.css" frontend --include="*.tsx" --include="*.ts"
```
Expected: no results (Tasks 3-9 already relocated everything needed into `components/marketing/` and `components/workspace/`). If any result appears, port that remaining usage first before deleting — do not delete a file that's still imported.

- [ ] **Step 2: Delete the monolith and old CSS module**

```bash
git rm frontend/components/BenefitBridgeDashboard.tsx frontend/components/conversation-atlas/ConversationAtlas.module.css
```

- [ ] **Step 3: Read the old test file for coverage parity**

Read `frontend/tests/e2e/dashboard.spec.ts` in full (before deleting it) to enumerate every assertion it makes, so the replacement files don't silently drop coverage: shell/boundary rendering, prepare→packet transition, language selector behavior, map fallback without an embed key, mobile layout without horizontal overflow.

- [ ] **Step 4: Write `landing.spec.ts`**

Create `frontend/tests/e2e/landing.spec.ts` covering: the hero renders its headline text, the primary CTA navigates to `/app/chat/`, the demo gallery dialog opens on card click and contains a `<video>`, the trust strip contains the same 4 boundary strings the old test asserted on (reuse those exact strings from Step 3's notes), no horizontal overflow on mobile viewport (reuse the existing mobile-overflow-check pattern from the old test).

- [ ] **Step 5: Write `workspace.spec.ts`**

Create `frontend/tests/e2e/workspace.spec.ts` covering, at minimum, every behavior the old `dashboard.spec.ts` verified (per Step 3) reattributed to the new routes/testids, PLUS one new explicit test:
```ts
test("chat history persists across section navigation", async ({ page }) => {
  await page.goto("/app/chat/");
  const message = "I need help with food assistance";
  await page.getByTestId("chat-input").fill(message);
  await page.getByRole("button", { name: /send|enviar/i }).click();
  await page.waitForSelector('[data-testid="a2ui-card"]', { timeout: 15000 });

  await page.getByRole("link", { name: /prepare|preparar/i }).click();
  await page.waitForURL(/\/app\/prepare\/?$/);

  await page.getByRole("link", { name: /^chat$/i }).click();
  await page.waitForURL(/\/app\/(chat\/)?$/);

  await expect(page.locator("body")).toContainText(message);
});
```
Adjust selectors to whatever Task 7/9 actually named the nav links and buttons (read the just-built `WorkspaceSidebarNav.tsx` and `ConversationPanel.tsx` to confirm exact accessible names before finalizing this test).

- [ ] **Step 6: Run the full suite**

```bash
npm run typecheck && npm run lint && npm run build && npm run test:e2e
```
All must pass. If `test:e2e` fails, fix the failing assertion/selector (do not delete or skip the test) and re-run until green.

- [ ] **Step 7: Commit**

```bash
git add -A frontend/tests/e2e
git commit -m "test(frontend): replace dashboard e2e spec with landing/workspace specs; retire monolith"
```

---

### Task 12: Update the Remotion capture pipeline for the new routes

**Files:**
- Modify: `demo-videos/benefitbridge-remotion/scripts/capture-flows.cjs`

**Interfaces:**
- N/A — internal tooling update.

- [ ] **Step 1: Re-read the current script**

Read `demo-videos/benefitbridge-remotion/scripts/capture-flows.cjs` in full (already read once during planning — re-confirm current line numbers/selectors since they're the source of truth for this edit).

- [ ] **Step 2: Update navigation calls**

Replace the in-page click-through navigation with direct route navigation:
- `page.getByTestId("nav-resources").click()` → `await page.goto(\`${baseUrl}/app/resources/\`)`
- `page.getByTestId("nav-sources").click()` → `await page.goto(\`${baseUrl}/app/sources/\`)`
- `page.getByTestId("nav-packet").click()` → `await page.goto(\`${baseUrl}/app/packet/\`)`

Keep the initial `page.goto(baseUrl, ...)` for the `-initial.png`/`-chat.png` captures pointed at `/app/chat/` instead of bare `baseUrl` (i.e., `await page.goto(\`${baseUrl}/app/chat/\`, { waitUntil: "networkidle" })`), since chat now lives under `/app/chat/`, not `/`.

Update the Spanish-language capture step (`language-select` interaction) to use whatever the new `WorkspaceSidebarNav`/`ConversationPanel` exposes for language switching — confirm the current `data-testid="language-select"` still exists somewhere in the new workspace UI (Task 7-9 should have preserved it per this plan's Global Constraints; if it was renamed, update the selector here to match).

- [ ] **Step 3: Update text assertions if needed**

Re-run the script once (Step 4) and see if any `requiredText` assertions in the `flows` array fail due to copy changes from the redesign. If so, update the specific strings in the `requiredText` arrays to match current copy — do not weaken the assertions by removing checks, only update the literal expected strings.

- [ ] **Step 4: Run the capture pipeline**

```bash
cd demo-videos/benefitbridge-remotion
npm run capture
```
This builds the frontend and starts a local FastAPI server per the script's existing logic — expect this to take a few minutes. Confirm it completes without error and `public/captures/capture-manifest.json` is updated with a fresh `capturedAt` timestamp.

- [ ] **Step 5: Re-render the explainer videos**

```bash
npm run render:all
npm run still:all
npm run verify:outputs
```
Confirm all succeed. Since the visual redesign changes the composited DOM these videos screenshot, expect (and accept) that the 4 rendered `out/*.mp4` files now reflect the new Tailwind-based visual design rather than the old CSS-module look — this is the intended outcome (the explainer videos should look consistent with the redesigned app), not a regression.

- [ ] **Step 6: Commit**

```bash
git add demo-videos/benefitbridge-remotion/scripts/capture-flows.cjs demo-videos/benefitbridge-remotion/out demo-videos/benefitbridge-remotion/public/captures
git commit -m "chore(remotion): update capture pipeline for restructured app routes"
```

---

## Final Verification (after all tasks complete)

- [ ] `cd frontend && npm run typecheck && npm run lint && npm run build && npm run test:e2e` — all green.
- [ ] `uv run uvicorn app.fast_api_app:app --host 127.0.0.1 --port 8080` (from repo root) serving the built static export — manually click through `/`, `/app/chat/`, `/app/prepare/`, `/app/sources/`, `/app/resources/`, `/app/packet/`, `/app/bay-area/` against the real FastAPI server (not just `next dev`), confirming no CSP violations in the browser console and Maps fallback still works without an embed key.
- [ ] Emulate `prefers-reduced-motion: reduce` in browser devtools and confirm the landing hero shows the static poster (no autoplay) and scroll reveals appear without animation.
- [ ] `cd demo-videos/benefitbridge-remotion && npm run capture && npm run render:all && npm run verify:outputs` — confirms the full explainer-video pipeline still works end to end against the final app.
