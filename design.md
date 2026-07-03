# AidAtlasCA Landing Redesign Design Brief

## Clear Answer

Create a prompt-led visual direction for a cleaner, more vibrant AidAtlasCA
landing page. The direction should feel inspired by Inngest's product-led,
motion-forward landing page patterns, but it must remain AidAtlasCA-native:
civic, accessible, privacy-preserving, and clear that official agencies decide
eligibility and amounts.

Reference: https://www.inngest.com/, verified July 2, 2026.

## Product Intent

AidAtlasCA helps people prepare for official benefits conversations. The
product should make a simple promise: chat through a situation, see source-backed
paths worth checking, find local handoffs, and leave with a packet for an
appointment.

The landing page should not try to explain the entire policy landscape. It
should show the core loop quickly:

1. A person describes their situation in plain language.
2. The assistant screens for privacy and asks only broad facts.
3. Official sources and local handoffs appear with citations.
4. A preparation packet assembles from the conversation.
5. The user moves into the persistent chat workspace.

## Safety Boundaries

Every design, prompt, animation, and copy pass must preserve these boundaries:

- Do not claim eligibility decisions.
- Do not estimate benefit amounts.
- Do not imply application submission.
- Do not imply credential handling, case-status access, or document upload.
- Do not request or show SSNs, EBT/PINs, case numbers, birthdates, credentials,
  real IDs, immigration documents, or exact safety-sensitive locations.
- Do not claim live shelter, food, legal-aid, WIC, office, route, distance, or
  open-now availability.
- Keep local resource output source-backed.
- Include: "Call before going to confirm current availability."

Preferred status language:

- `worth checking`
- `needs more information`
- `local handoff recommended`
- `source-backed`
- `official agencies decide`

Avoid:

- `you qualify`
- `approved`
- `guaranteed`
- `estimated amount`
- `apply now through AidAtlasCA`
- `upload documents`
- `near me`
- exact-address language

## Visual Positioning

### Design Thesis

AidAtlasCA should feel like a modern conversation atlas: one calm agent
conversation controls a connected workflow of privacy screening, source review,
local handoffs, and packet assembly.

### Inngest-Inspired Translation

Borrow these patterns:

- Terse hero copy with one strong product claim.
- Product proof as the main visual, not decorative illustration.
- Connected workflow rails and step activation.
- Before/after transformation that shows complexity becoming simple.
- Scroll-revealed sections with line drawing, pulses, and card lifts.
- Dense but readable product modules.

Do not borrow:

- Developer-infrastructure language.
- Inngest brand colors, typography, or exact layout.
- Code blocks as the main metaphor.
- Enterprise security claims that AidAtlasCA does not support.
- Any visual treatment that suggests official agency status.

## Visual Principles

- Chat first: the agent conversation is the hero object and the persistent app
  anchor.
- Motion explains state: animation should show progress through the workflow,
  not decorate the page.
- Fewer words, more visible system state: use labels, statuses, and connected
  modules instead of paragraphs.
- Civic trust, product polish: modern software precision with clear public
  service boundaries.
- Bay Area clarity: show county-level coverage and city/county/ZIP routing, not
  exact-address precision.
- Source-backed confidence: official source cards and citations should feel
  integral, not buried.
- Accessible by default: strong focus states, readable contrast, reduced-motion
  alternatives, and no text overflow.

## Design Tokens

### Color

Use the current AidAtlasCA palette as the base, then make it feel more
intentional and vibrant.

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Ink | `--atlas-ink` | `#07183f` | Primary text, workflow lines |
| Ink soft | `--atlas-ink-soft` | `#233252` | Secondary text |
| Muted | `--atlas-muted` | `#64708a` | Labels, captions |
| Surface | `--atlas-surface` | `#ffffff` | Product cards, panels |
| Line | `--atlas-line` | `#d8deea` | Dividers, outlines |
| Blue | `--atlas-blue` | `#0756d9` | Primary action, active chat state |
| Emerald | `--atlas-green` | `#008260` | Source-backed, completed states |
| Amber | `--atlas-orange` | `#ffa800` | Needs-info, caution |
| Coral | `--atlas-red` | `#e55343` | Privacy warnings, blocked claims |
| Sky | `--atlas-sky` | `#eaf5ff` | Soft agent and workflow backgrounds |

Avoid a one-note blue/purple theme. Coral and amber should appear as purposeful
state colors, not decorative confetti.

### Type

- Font stack: keep Inter/system UI.
- H1: short and direct, 52-72px desktop, 40-48px mobile.
- Section headings: 32-44px desktop, 28-34px mobile.
- Body: 16-18px with generous line height.
- Product UI labels: 12-14px, medium weight, no negative letter spacing.
- Do not use viewport-width font scaling.

### Shape And Elevation

- Default radius: 8px.
- Larger media or demo frames may use 12px only when needed.
- Avoid rounded pill-heavy UI except for small status chips.
- Use shadows sparingly: product cards can lift, page sections should not float
  inside card shells.

### Motion

- Page motion: CSS/React/motion primitives only.
- Remotion: exported MP4/poster assets only, never imported into the frontend
  runtime.
- Duration: 180-420ms for UI transitions, 600-900ms for scroll-staged reveals.
- Easing: soft ease-out, no bounce for civic trust surfaces.
- Always honor `prefers-reduced-motion`.

## Landing Page Blueprint

### 1. Hero: Conversation Atlas

Goal: make the first viewport explain the product without a text wall.

Composition:

- Minimal header with brand, section links, language selector, and primary CTA.
- No decorative eyebrow/kicker.
- H1: "Benefits prep, made clear."
- Supporting line: "Chat through your situation, see official sources, and build
  a packet for your appointment."
- Primary CTA: "Start the conversation"
- Secondary CTA: "Watch demo"
- Main visual: large live-feeling chat panel connected to workflow modules:
  privacy screen, sources, local resources, packet.
- Ensure a hint of the next workflow section is visible on desktop and mobile.

Hero product scene states:

- User: "I need help with food and health coverage in San Jose."
- Assistant: "I can help you prepare. Use city/county/ZIP only, not exact
  addresses."
- Privacy state: "Sensitive details redacted"
- Sources state: "Official pages linked"
- Packet state: "Prep packet ready"

### 2. Connected Workflow Rail

Use a horizontal desktop rail and vertical mobile rail. Each step should activate
as the user scrolls:

1. Ask
2. Privacy Screen
3. Sources
4. Local Handoffs
5. Prepare Packet

Each step needs a compact product card, icon, status, and one short sentence.
The connecting line should animate from left to right or top to bottom.

### 3. Agent Behavior Demo

Embed the Remotion-generated demo through native `<video>`.

Storyboard:

1. Chat message arrives.
2. Privacy screen redacts sensitive patterns.
3. Source-backed paths fan out.
4. Bay Area local handoffs appear with call-before-going boundary.
5. Packet assembles.
6. Language switches to Spanish.

Keep Remotion outside the frontend runtime.

### 4. Bay Area Coverage

Show all nine Bay Area counties:

- Alameda
- Contra Costa
- Marin
- Napa
- San Francisco
- San Mateo
- Santa Clara
- Solano
- Sonoma

Use an elegant map/resource panel that supports Google Maps Embed when configured
and a safe static fallback otherwise. The map copy must use curated organization
plus city/county queries only, never a user's exact address.

### 5. Trust And Boundaries

Use a compact trust band with visible boundary statements:

- Official agencies decide eligibility and amounts.
- AidAtlasCA prepares, but does not submit applications.
- Use city/county/ZIP only, not exact addresses.
- Local details can change. Call before going to confirm current availability.

### 6. Final CTA

Return users to the persistent chat workspace:

- Heading: "Ready to build your prep packet?"
- CTA: "Open the chat workspace"
- Support line: "Start with broad facts. AidAtlasCA keeps the conversation
  focused on preparation and official sources."

## Component Guidance

### Hero Conversation

- Treat the chat as the core product object.
- Show assistant and user turns, but avoid long message bodies.
- Include small A2UI cards for source, privacy, and packet states.
- Use accessible labels and keyboard-reachable controls.
- Keep buttons code-native, not baked into images.

### Workflow Rail

- Use one shared line system for page continuity.
- Active step should combine line progress, icon color, and card elevation.
- Reduced motion should show all steps statically.

### Packet Preview

- Show a real-feeling packet summary:
  - "Facts gathered"
  - "Questions to ask"
  - "Documents to bring"
  - "Official source links"
- Do not show real uploaded documents or sensitive IDs.

### Map And Resource Panel

- Show county/city context, organization names, and safe outbound links.
- Do not claim distance, directions, open-now status, or live availability.
- Always include call-before-going language.

### Trust Strip

- Keep it short and visible.
- Do not bury safety copy in a footer-only area.
- Use shield/check icons consistently.

### Demo Gallery

- Feature one primary demo instead of several missing or stale cards.
- Poster and footage should show the current UI.
- Dialog/video controls must be accessible.

## Master Redesign Prompt

```md
Revamp AidAtlasCA's landing page and overall visual system into a vibrant,
clean, motion-forward product experience inspired by Inngest's landing page
structure: terse hero copy, product-led proof, connected workflow rails, staged
scroll reveals, and polished interface motion.

Do not copy Inngest's brand, layout, or developer copy. Translate the feeling
into AidAtlasCA's domain: a public-benefits preparation assistant that helps
users chat through their situation, see official sources, find local handoffs,
and prepare a packet for an appointment.

Primary design goal:
Make the agent conversation the centerpiece. The first viewport should
immediately show a live-feeling AidAtlasCA conversation beside a compact
visual workflow: user facts, privacy screen, source-backed paths, Bay Area
resources, and packet assembly.

Tone:
Calm, direct, trustworthy, modern, and vibrant. Avoid government-form heaviness,
nonprofit clutter, stock-photo sentimentality, and giant blocks of explanatory
text.

Visual language:
Use a clean civic/product palette: deep navy, white, emerald, poppy/coral,
amber, sky, and charcoal. Use 8px radii for most UI. Keep shadows restrained.
Use crisp cards only for real interface objects, not decorative page sections.
Avoid purple-blue gradient dominance, beige-heavy palettes, decorative blobs,
nested cards, and generic hero illustrations.

Landing structure:
1. Hero: short headline, one sentence of support, primary CTA, secondary demo
   CTA, and a large animated product scene centered on chat.
2. Workflow rail: connected steps showing Ask, Privacy Screen, Sources, Local
   Resources, Prepare Packet.
3. Agent behavior demo: Remotion-style storyboard showing the agent turning a
   chat into citations, local handoffs, and a printable packet.
4. Bay Area coverage: elegant map/resource section for all nine Bay Area
   counties without exact-address precision.
5. Trust and boundaries: concise copy that says official agencies decide
   eligibility and amounts, no application submission, no live availability
   claims, and users should call before going.
6. Final CTA: return to the persistent chat workspace.

Motion direction:
Use Inngest-like scroll staging: line drawing, pulse states, card lifts, step
activation, and workflow transitions. Frontend motion should use CSS/React/motion
primitives and honor prefers-reduced-motion. Remotion should stay separate from
the frontend runtime and be used only for exported demo video assets.

Copy rules:
Keep hero and section copy short. Prefer labels, statuses, and visible system
states over paragraphs. Do not use claims about eligibility, benefit amounts,
application submission, live local availability, routes, "near me" precision,
exact addresses, or uploaded documents.

Implementation constraints:
Preserve the existing Next.js frontend architecture, Tailwind/Radix/lucide/motion
setup, existing workspace sidepanel chat, English/Spanish localization, Maps
Embed fallback behavior, and Remotion asset pipeline. Do not introduce shadcn
migration work unless there is a clear component/accessibility gap.
```

## Image Concept Prompts

Use these only for design exploration before coding. Each concept should be a
clean, readable full-page product mockup plus desktop/mobile first-viewport
states. Do not generate policy claims beyond the supplied copy.

### Concept 1: Product Atlas

```md
Use case: ui-mockup
Asset type: landing page visual concept

Create a polished AidAtlasCA landing page concept called Product Atlas.
Make the agent conversation the hero object: a large chat panel connected by
thin animated workflow lines to privacy screening, official sources, local
handoffs, and packet assembly modules. Visual style is Inngest-inspired in
structure but not copied: terse hero, product-led proof, connected rails, crisp
cards, white and navy base, emerald/coral/amber state accents, 8px UI radius,
restrained shadows, and no decorative blobs.

Show these sections: hero, connected workflow rail, agent demo storyboard, Bay
Area coverage, trust boundaries, final CTA. Keep copy short and code-native.
Include English/Spanish language selector and a persistent chat-workspace CTA.
Avoid eligibility, amount, application, upload, exact-address, near-me, live
availability, route, or open-now claims.
```

### Concept 2: Civic Workflow

```md
Use case: ui-mockup
Asset type: landing page visual concept

Create a clean civic-product AidAtlasCA landing page concept called Civic
Workflow. Make the page feel trustworthy, accessible, and modern, with a
conversation-led hero and a vertical scroll story that turns broad user facts
into official sources, local handoffs, and a preparation packet. Use white,
navy, emerald, sky, amber, and coral with generous spacing, 8px radius, clear
focus states, and understated motion cues.

The page should feel less technical than Inngest but borrow the connected
workflow rhythm and product-proof hierarchy. Show all nine Bay Area counties at
county level only. Include visible boundary copy: official agencies decide,
AidAtlasCA prepares only, use city/county/ZIP, and call before going.
```

### Concept 3: Bay Area Signal

```md
Use case: ui-mockup
Asset type: landing page visual concept

Create a vibrant AidAtlasCA landing page concept called Bay Area Signal.
Center the hero on a live-feeling chat panel and a county-level Bay Area
resource map. Use connected signal lines from chat to sources, local handoffs,
and packet preview. Make the UI energetic but elegant: deep navy text, white
surfaces, emerald completion states, amber caution, coral privacy warnings, and
sky-blue support backgrounds.

Do not show exact addresses, routes, open-now status, distance, or live
availability. The product should feel like a safe preparation assistant, not an
official agency or application portal. Include concise English and Spanish-ready
UI labels.
```

## Implementation Prompt

Use this after the design direction is approved:

```md
Implement the AidAtlasCA landing redesign from `design.md` and
`landing-redesign-rationale.html`.

Scope:
- Update only the marketing landing surface and supporting demo assets needed
  for that surface.
- Preserve the current Next.js app architecture, workspace sidepanel chat,
  i18n, Maps Embed fallback behavior, and Remotion separation.
- Do not change backend eligibility, packet, source, maps, auth, or geography
  behavior unless a visible landing-page integration requires a small adapter.

Design requirements:
- Make the conversation the first-viewport centerpiece.
- Replace text-heavy sections with connected workflow visuals and concise
  system states.
- Use Product Atlas as the default visual direction unless a different concept
  is approved.
- Use motion only where it clarifies workflow state and honor
  prefers-reduced-motion.
- Keep all visible copy inside AidAtlasCA safety boundaries.

Verification:
- Run frontend typecheck, lint, build, and available e2e tests.
- Capture desktop and mobile screenshots.
- Confirm no mobile overflow.
- Confirm boundary copy is visible.
- Confirm no Remotion import exists in the frontend runtime.
- Confirm no forbidden claim appears in landing copy.
```

## Acceptance Checklist

- The first viewport explains the product through the chat and workflow scene,
  not paragraphs.
- The page visibly supports English and Spanish as the current product languages.
- The workflow shows privacy, sources, local handoffs, and packet preparation.
- Bay Area coverage names all nine counties and avoids exact-address precision.
- Google Maps Embed is treated as optional enhancement with graceful fallback.
- The demo footage/poster shows the current UI before the implementation ships.
- Boundary copy remains visible above or near the main product story.
- Motion has reduced-motion alternatives.
- No forbidden claims appear in hero, cards, demo captions, map copy, or CTAs.

## Confidence Level

0.88

## Key Caveats

- This document is a design and implementation prompt package, not the final
  frontend implementation.
- Inngest is a live reference and may change; use durable patterns, not exact
  screenshots.
- Any future visual concept generated from these prompts must still be reviewed
  against AidAtlasCA safety boundaries before coding.
