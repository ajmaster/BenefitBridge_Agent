#!/usr/bin/env python3
"""Build the AidAtlasCA judge dossier HTML package.

The output is intentionally static and offline-friendly:
- selected images and video posters are embedded as data URIs;
- MP4 demo videos are copied as sibling files under docs/judges/media/;
- all styling and interaction lives inside the generated HTML.
"""

from __future__ import annotations

import base64
import html
import json
import mimetypes
import shutil
from pathlib import Path
from string import Template


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "docs" / "judges"
MEDIA_DIR = OUT_DIR / "media"
OUT_HTML = OUT_DIR / "aidatlasca_judge_dossier.html"


IMAGE_ASSETS = {
    "logo": "frontend/public/brand/logo-lockup.png",
    "mark": "frontend/public/brand/logo-mark.png",
    "golden_gate": "frontend/public/brand/golden-gate-support.png",
    "map": "frontend/public/visuals/california-service-map.svg",
    "hero_poster": "frontend/public/demo-videos/hero-loop-poster.png",
    "conversation_poster": "frontend/public/demo-videos/conversation-atlas-poster.png",
    "document_poster": "frontend/public/demo-videos/document-kit-demo-poster.png",
    "sanjose_still": "demo-videos/benefitbridge-remotion/out/sanjose-family-navigator-still.png",
    "sf_still": "demo-videos/benefitbridge-remotion/out/sf-food-shelter-handoff-still.png",
    "spanish_still": "demo-videos/benefitbridge-remotion/out/spanish-wic-prep-still.png",
    "chat_capture": "demo-videos/benefitbridge-remotion/public/captures/sanjose-chat.png",
    "resources_capture": "demo-videos/benefitbridge-remotion/public/captures/sf-resources.png",
    "packet_capture": "demo-videos/benefitbridge-remotion/public/captures/spanish-packet.png",
    "design_reference": "references/images/20-responsive-component-style-guide.png",
}


VIDEO_ASSETS = {
    "hero-loop.mp4": "frontend/public/demo-videos/hero-loop.mp4",
    "conversation-atlas.mp4": "frontend/public/demo-videos/conversation-atlas.mp4",
    "document-kit-demo.mp4": "frontend/public/demo-videos/document-kit-demo.mp4",
    "sanjose-family-navigator.mp4": "demo-videos/benefitbridge-remotion/out/sanjose-family-navigator.mp4",
    "sf-food-shelter-handoff.mp4": "demo-videos/benefitbridge-remotion/out/sf-food-shelter-handoff.mp4",
    "spanish-wic-prep.mp4": "demo-videos/benefitbridge-remotion/out/spanish-wic-prep.mp4",
}


def read_json(path: str):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def data_uri(path: str) -> str:
    source = ROOT / path
    if not source.exists():
        raise FileNotFoundError(source)
    mime, _ = mimetypes.guess_type(source.name)
    if mime is None:
        mime = "image/svg+xml" if source.suffix == ".svg" else "application/octet-stream"
    encoded = base64.b64encode(source.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def count_eval_cases() -> int:
    total = 0
    for path in (ROOT / "tests" / "eval" / "datasets").glob("*.json"):
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict) and isinstance(data.get("eval_cases"), list):
            total += len(data["eval_cases"])
        elif isinstance(data, list):
            total += len(data)
    return total


def copy_media() -> list[str]:
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    copied: list[str] = []
    for filename, source_path in VIDEO_ASSETS.items():
        source = ROOT / source_path
        if not source.exists():
            raise FileNotFoundError(source)
        target = MEDIA_DIR / filename
        shutil.copy2(source, target)
        copied.append(str(target.relative_to(ROOT)))
    return copied


def file_size_label(path: Path) -> str:
    size = path.stat().st_size
    if size >= 1024 * 1024:
        return f"{size / (1024 * 1024):.1f} MB"
    if size >= 1024:
        return f"{size / 1024:.0f} KB"
    return f"{size} bytes"


def build_html() -> str:
    approved_sources = len(read_json("app/data/source_pack/approved_sources.json"))
    counties = len(read_json("app/data/source_pack/california_counties.json"))
    county_profiles = len(read_json("app/data/source_pack/county_profiles.json"))
    resources = len(read_json("app/data/source_pack/local_resources_hsds_seed.json"))
    program_areas = len(read_json("app/data/source_pack/program_areas.json"))
    tool_contracts = len(read_json("app/data/contracts/benefitbridge_tool_contracts.json"))
    eval_cases = count_eval_cases()

    image_uris = {name: data_uri(path) for name, path in IMAGE_ASSETS.items()}
    media_rows = "\n".join(
        f"<li><code>{html.escape(name)}</code> <span>{file_size_label(ROOT / source)}</span></li>"
        for name, source in VIDEO_ASSETS.items()
    )

    metrics = {
        "approved_sources": approved_sources,
        "counties": counties,
        "county_profiles": county_profiles,
        "resources": resources,
        "program_areas": program_areas,
        "tool_contracts": tool_contracts,
        "eval_cases": eval_cases,
    }

    template = Template(
        r"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AidAtlasCA Judge Dossier</title>
  <meta name="description" content="Judge-ready AidAtlasCA dossier: California benefits preparation, Google ADK workflow, safety, sources, and demo evidence.">
  <style>
    :root {
      color-scheme: light;
      --ink: #07183f;
      --ink-soft: #263653;
      --muted: #63708a;
      --line: #d8deea;
      --line-strong: #bcc8db;
      --blue: #0756d9;
      --blue-dark: #063a9b;
      --green: #008260;
      --green-soft: #e8f7f0;
      --orange: #ffa800;
      --orange-soft: #fff4dc;
      --red: #e55343;
      --red-soft: #fff0ee;
      --sky: #eaf5ff;
      --surface: #ffffff;
      --wash: #f7faff;
      --shadow: 0 24px 60px rgba(7, 24, 63, 0.12);
      --shadow-soft: 0 12px 32px rgba(7, 24, 63, 0.08);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; background: #fbfcfe; color: var(--ink); }
    body { margin: 0; min-width: 320px; line-height: 1.55; }
    a { color: var(--blue); }
    img, video { max-width: 100%; display: block; }
    button, summary { font: inherit; }
    .page-shell { min-height: 100vh; }
    .top-nav {
      position: sticky;
      top: 0;
      z-index: 30;
      display: flex;
      align-items: center;
      gap: 18px;
      padding: 12px clamp(16px, 4vw, 52px);
      border-bottom: 1px solid rgba(216, 222, 234, 0.85);
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(18px);
    }
    .nav-logo { width: 174px; min-width: 132px; }
    .nav-links { display: flex; gap: 6px; overflow-x: auto; margin-left: auto; }
    .nav-links a {
      white-space: nowrap;
      text-decoration: none;
      color: var(--ink-soft);
      border: 1px solid transparent;
      border-radius: 999px;
      padding: 7px 10px;
      font-size: 13px;
      font-weight: 700;
    }
    .nav-links a:hover { background: var(--sky); border-color: var(--line); color: var(--blue-dark); }
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
      gap: clamp(28px, 5vw, 58px);
      min-height: 88vh;
      align-items: center;
      padding: clamp(28px, 6vw, 76px) clamp(18px, 5vw, 72px) 36px;
      background:
        linear-gradient(120deg, rgba(234,245,255,0.78), rgba(232,247,240,0.72)),
        #fbfcfe;
    }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--surface);
      padding: 7px 11px;
      color: var(--blue-dark);
      font-size: 13px;
      font-weight: 800;
    }
    h1 {
      max-width: 920px;
      margin: 20px 0 16px;
      font-size: clamp(44px, 7vw, 86px);
      line-height: 0.98;
      letter-spacing: 0;
    }
    h2 { font-size: clamp(28px, 4vw, 44px); line-height: 1.05; margin: 0 0 14px; letter-spacing: 0; }
    h3 { font-size: 20px; line-height: 1.2; margin: 0 0 10px; letter-spacing: 0; }
    h4 { margin: 0 0 6px; font-size: 15px; letter-spacing: 0; }
    p { margin: 0; color: var(--ink-soft); }
    .lede { max-width: 780px; font-size: clamp(18px, 2.2vw, 23px); color: var(--ink-soft); }
    .boundary {
      margin-top: 22px;
      border: 1px solid var(--green);
      background: var(--green-soft);
      border-radius: 14px;
      padding: 14px 16px;
      font-weight: 800;
      color: #045c47;
    }
    .hero-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 42px;
      border-radius: 10px;
      padding: 10px 14px;
      border: 1px solid var(--line);
      background: var(--surface);
      color: var(--ink);
      text-decoration: none;
      font-weight: 800;
    }
    .button.primary { background: var(--blue); border-color: var(--blue); color: #fff; }
    .hero-card {
      border: 1px solid var(--line);
      border-radius: 20px;
      background: var(--surface);
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    .hero-card img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; }
    .hero-card-body { padding: 16px; }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-top: 18px;
    }
    .metric {
      border: 1px solid var(--line);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.86);
      padding: 14px;
      box-shadow: var(--shadow-soft);
    }
    .metric strong { display: block; font-size: clamp(24px, 4vw, 40px); line-height: 1; color: var(--blue-dark); }
    .metric span { display: block; margin-top: 7px; color: var(--muted); font-size: 13px; font-weight: 700; }
    main { overflow: hidden; }
    section { padding: clamp(48px, 7vw, 86px) clamp(18px, 5vw, 72px); }
    section:nth-of-type(even) { background: var(--wash); }
    .section-head { max-width: 900px; margin-bottom: 24px; }
    .kicker { color: var(--blue); font-weight: 900; text-transform: uppercase; font-size: 12px; letter-spacing: 0.08em; margin-bottom: 8px; }
    .grid { display: grid; gap: 16px; }
    .two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .four { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .card {
      border: 1px solid var(--line);
      border-radius: 16px;
      background: var(--surface);
      padding: 18px;
      box-shadow: var(--shadow-soft);
    }
    .card.media { padding: 0; overflow: hidden; }
    .card.media .copy { padding: 16px; }
    .card.warn { background: var(--orange-soft); border-color: #ffd479; }
    .card.safe { background: var(--green-soft); border-color: #93d8c0; }
    .card.danger { background: var(--red-soft); border-color: #f1b1aa; }
    .pill-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    .pill {
      border: 1px solid var(--line);
      background: #fff;
      border-radius: 999px;
      padding: 6px 9px;
      color: var(--ink-soft);
      font-size: 12px;
      font-weight: 800;
    }
    .flow {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      align-items: stretch;
    }
    .flow-step {
      position: relative;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: var(--surface);
      padding: 16px;
      min-height: 142px;
    }
    .flow-step b { display: block; color: var(--blue-dark); margin-bottom: 6px; }
    .ladder { display: grid; gap: 10px; counter-reset: ladder; }
    .ladder li {
      list-style: none;
      counter-increment: ladder;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: #fff;
      padding: 12px 12px 12px 48px;
      position: relative;
      color: var(--ink-soft);
    }
    .ladder li::before {
      content: counter(ladder);
      position: absolute;
      left: 12px;
      top: 12px;
      width: 24px;
      height: 24px;
      display: grid;
      place-items: center;
      border-radius: 999px;
      background: var(--blue);
      color: #fff;
      font-weight: 900;
      font-size: 12px;
    }
    .video-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    video {
      width: 100%;
      background: #07183f;
      border-bottom: 1px solid var(--line);
      aspect-ratio: 16 / 9;
    }
    .timeline { border-left: 3px solid var(--blue); padding-left: 18px; display: grid; gap: 16px; }
    .timeline-item { position: relative; }
    .timeline-item::before {
      content: "";
      position: absolute;
      left: -27px;
      top: 4px;
      width: 14px;
      height: 14px;
      border-radius: 999px;
      background: var(--blue);
      border: 3px solid #fff;
      box-shadow: 0 0 0 1px var(--blue);
    }
    .scoreboard {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 10px;
    }
    .score {
      border-radius: 14px;
      padding: 14px;
      background: #fff;
      border: 1px solid var(--line);
    }
    .score strong { display: block; color: var(--green); font-size: 28px; line-height: 1; }
    details {
      border: 1px solid var(--line);
      border-radius: 14px;
      background: #fff;
      padding: 12px 14px;
      box-shadow: var(--shadow-soft);
    }
    details + details { margin-top: 10px; }
    summary { cursor: pointer; font-weight: 900; color: var(--ink); }
    .table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 16px; background: #fff; }
    table { width: 100%; border-collapse: collapse; min-width: 760px; }
    th, td { border-bottom: 1px solid var(--line); padding: 12px; text-align: left; vertical-align: top; }
    th { color: var(--ink); background: var(--sky); font-size: 13px; }
    td { color: var(--ink-soft); font-size: 14px; }
    .media-list { columns: 2; padding-left: 18px; color: var(--ink-soft); }
    .media-list li { margin-bottom: 6px; break-inside: avoid; }
    .footnotes { font-size: 13px; color: var(--ink-soft); }
    .citation-list li { margin-bottom: 8px; }
    .final-band {
      background: var(--ink);
      color: #fff;
      padding: clamp(40px, 6vw, 72px);
    }
    .final-band p, .final-band a { color: #dbe8ff; }
    .filter-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .filter-bar button {
      border: 1px solid var(--line);
      border-radius: 999px;
      background: #fff;
      padding: 7px 11px;
      font-weight: 800;
      color: var(--ink-soft);
      cursor: pointer;
    }
    .filter-bar button[aria-pressed="true"] { background: var(--blue); border-color: var(--blue); color: #fff; }
    .persona-card[data-hidden="true"] { display: none; }
    code { background: var(--sky); padding: 2px 5px; border-radius: 6px; color: var(--blue-dark); }
    .section-aliases { display: none; }
    @media (max-width: 1060px) {
      .hero, .two, .three, .four, .video-grid, .scoreboard, .flow { grid-template-columns: 1fr; }
      .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .top-nav { align-items: flex-start; flex-direction: column; }
      .nav-links { margin-left: 0; width: 100%; }
    }
    @media (max-width: 620px) {
      h1 { font-size: 42px; }
      section { padding: 42px 16px; }
      .hero { padding: 28px 16px; min-height: auto; }
      .metric-grid { grid-template-columns: 1fr; }
      .media-list { columns: 1; }
    }
    @media print {
      .top-nav, video, .filter-bar { display: none !important; }
      section, .hero, .final-band { padding: 24px 0; background: #fff !important; color: #000 !important; }
      .card, details, .metric, .flow-step, .score { box-shadow: none; break-inside: avoid; }
      a[href]::after { content: " (" attr(href) ")"; font-size: 10px; color: #555; }
    }
  </style>
</head>
<body>
<div class="page-shell">
  <nav class="top-nav" aria-label="Dossier navigation">
    <img class="nav-logo" src="$logo" alt="AidAtlasCA logo lockup">
    <div class="nav-links">
      <a href="#hero">Overview</a>
      <a href="#problem">Problem</a>
      <a href="#demo">Demo</a>
      <a href="#architecture">Architecture</a>
      <a href="#safety">Safety</a>
      <a href="#sources">Sources</a>
      <a href="#evals">Evals</a>
      <a href="#judge-checklist">Judge checklist</a>
    </div>
  </nav>

  <header id="hero" class="hero">
    <div>
      <span class="eyebrow">California benefits prep + Google ADK + source-backed handoff</span>
      <h1>AidAtlasCA helps Californians get ready before they ask for help.</h1>
      <p class="lede">BenefitBridge CA, now presented as AidAtlasCA, is a privacy-preserving agent that turns a broad benefits question into concise guidance, official source citations, local handoff options, calendar reminders, and a printable prep packet.</p>
      <div class="boundary"><strong>Official agencies decide eligibility and amounts.</strong> AidAtlasCA helps people prepare; official agencies decide eligibility and amounts. Do not enter SSNs, credentials, case numbers, cards, or real documents. The demo rule is no SSNs, no benefit amount, no approval, no application-submission, no live-availability, and no credential-handling claims.</div>
      <div class="hero-actions">
        <a class="button primary" href="#demo">Start judge walkthrough</a>
        <a class="button" href="media/conversation-atlas.mp4">Watch conversation demo</a>
        <a class="button" href="#judge-checklist">Judge the demo</a>
      </div>
      <div class="metric-grid" aria-label="Evidence summary">
        <div class="metric"><strong>$approved_sources</strong><span>approved runtime sources</span></div>
        <div class="metric"><strong>$counties</strong><span>California county routing entries</span></div>
        <div class="metric"><strong>$resources</strong><span>curated local handoff resources</span></div>
        <div class="metric"><strong>$eval_cases</strong><span>local eval cases across datasets</span></div>
      </div>
      <div class="section-aliases" aria-hidden="true">
        <span id="executive-summary"></span>
        <span id="product-boundary"></span>
        <span id="workflow"></span>
        <span id="source-grounding"></span>
        <span id="privacy-safety"></span>
        <span id="california-coverage"></span>
        <span id="release-checklist"></span>
      </div>
    </div>
    <div class="hero-card">
      <img src="$hero_poster" alt="AidAtlasCA animated product overview poster">
      <div class="hero-card-body">
        <h3>What judges should notice first</h3>
        <p>The product is not a benefits decision engine. It is a preparation layer: safer intake, grounded guidance, source trail, and handoff packet before a person contacts an official agency or local resource.</p>
      </div>
    </div>
  </header>

  <main>
    <section id="problem">
      <div class="section-head">
        <p class="kicker">Problem</p>
        <h2>Benefits access fails before the application starts.</h2>
        <p>People often do not know which programs are worth checking, which facts are missing, what documents may help, or which office/resource to contact. AidAtlasCA focuses on the preparation gap, not on replacing agencies or making eligibility decisions.</p>
      </div>
      <div class="flow" aria-label="Problem to response flow">
        <div class="flow-step"><b>1. User need</b><p>A person asks in plain language: food, health coverage, utilities, shelter, WIC, county services, or mixed needs.</p></div>
        <div class="flow-step"><b>2. Safe intake</b><p>The assistant accepts city/county/ZIP level context and broad household facts, while blocking SSNs, credentials, exact sensitive locations, and case numbers.</p></div>
        <div class="flow-step"><b>3. Source-backed prep</b><p>The graph maps the need to official program areas and local handoffs, with status labels such as likely_worth_checking or needs_more_information.</p></div>
        <div class="flow-step"><b>4. Practical handoff</b><p>The user leaves with next questions, document checklist, source links, call script, and the reminder: Call before going to confirm current availability.</p></div>
      </div>
      <div class="grid three" style="margin-top:16px">
        <article class="card safe">
          <h3>Useful because it is humble</h3>
          <p>The assistant does not say "you qualify." It narrows the next conversation and helps the user avoid arriving unprepared.</p>
        </article>
        <article class="card">
          <h3>Useful because it is auditable</h3>
          <p>Every benefit suggestion is tied back to approved source IDs and official or reviewed handoff pages.</p>
        </article>
        <article class="card warn">
          <h3>Useful because local details change</h3>
          <p>Resource cards do not promise live availability. Food, shelter, WIC, legal-aid, and office handoffs carry the exact instruction: Call before going to confirm current availability.</p>
        </article>
      </div>
    </section>

    <section id="demo">
      <div class="section-head">
        <p class="kicker">Demo walkthrough</p>
        <h2>The app turns a chat into a preparation workspace.</h2>
        <p>The judge package uses existing Remotion outputs as sibling videos. Posters are embedded in this HTML so the page remains useful even before video playback starts.</p>
      </div>
      <div class="video-grid">
        <article class="card media">
          <video controls preload="metadata" poster="$conversation_poster" src="media/conversation-atlas.mp4"></video>
          <div class="copy"><h3>Conversation Atlas</h3><p>Shows chat, A2UI support, source cards, local handoffs, and prep packet movement through the workspace.</p></div>
        </article>
        <article class="card media">
          <video controls preload="metadata" poster="$document_poster" src="media/document-kit-demo.mp4"></video>
          <div class="copy"><h3>Document kit</h3><p>Shows the final prep packet: summary, missing facts, checklist, caseworker questions, call script, reminders, and export affordances.</p></div>
        </article>
        <article class="card media">
          <video controls preload="metadata" poster="$hero_poster" src="media/hero-loop.mp4"></video>
          <div class="copy"><h3>Hero loop</h3><p>Quick overview of voice, maps, reminders, sources, and prep documents for the first impression.</p></div>
        </article>
      </div>
      <div class="grid three" style="margin-top:16px">
        <article class="card media"><img src="$chat_capture" alt="AidAtlasCA San Jose chat capture"><div class="copy"><h3>1. Ask naturally</h3><p>The user starts with broad location and needs. No account or private ID is required for the demo flow.</p></div></article>
        <article class="card media"><img src="$resources_capture" alt="AidAtlasCA local resources capture"><div class="copy"><h3>2. Compare handoffs</h3><p>Resource results remain curated and source-backed, with Maps/Places enrichment treated as low-trust contact/location context, never as a new approved source.</p></div></article>
        <article class="card media"><img src="$packet_capture" alt="AidAtlasCA prep packet capture"><div class="copy"><h3>3. Leave prepared</h3><p>The packet gives a checklist, source sheet, call script, and reminders without submitting an application.</p></div></article>
      </div>
      <details style="margin-top:16px">
        <summary>Media package included with this dossier</summary>
        <ul class="media-list">$media_rows</ul>
      </details>
    </section>

    <section id="personas">
      <div class="section-head">
        <p class="kicker">Personas</p>
        <h2>Four judge stories show the breadth without overstating authority.</h2>
        <p>Use the filters to skim the scenario lens. All scenarios use synthetic or privacy-preserving profiles.</p>
      </div>
      <div class="filter-bar" role="group" aria-label="Persona filters">
        <button type="button" data-filter="all" aria-pressed="true">All</button>
        <button type="button" data-filter="family">Family</button>
        <button type="button" data-filter="urgent">Urgent</button>
        <button type="button" data-filter="spanish">Spanish</button>
        <button type="button" data-filter="statewide">Statewide</button>
      </div>
      <div class="grid four">
        <article class="card persona-card" data-persona="family">
          <img src="$sanjose_still" alt="San Jose family navigator Remotion still">
          <h3>San Jose family navigator</h3>
          <p>Food, health coverage, utilities, WIC, and document preparation for a synthetic household.</p>
          <div class="pill-row"><span class="pill">CalFresh</span><span class="pill">Medi-Cal</span><span class="pill">WIC</span></div>
        </article>
        <article class="card persona-card" data-persona="urgent">
          <img src="$sf_still" alt="San Francisco urgent handoff Remotion still">
          <h3>SF food and shelter handoff</h3>
          <p>Urgent resource routing that avoids live shelter or pantry availability claims and preserves this warning: Call before going to confirm current availability.</p>
          <div class="pill-row"><span class="pill">Food today</span><span class="pill">Shelter prep</span><span class="pill">Safety</span></div>
        </article>
        <article class="card persona-card" data-persona="spanish">
          <img src="$spanish_still" alt="Spanish WIC prep Remotion still">
          <h3>Spanish-first WIC prep</h3>
          <p>Plain-language Spanish support with reviewed safety caveats and no bureaucratic overclaiming.</p>
          <div class="pill-row"><span class="pill">Spanish</span><span class="pill">WIC</span><span class="pill">Family prep</span></div>
        </article>
        <article class="card persona-card" data-persona="statewide">
          <img src="$map" alt="California statewide service coverage map graphic">
          <h3>Statewide county handoff</h3>
          <p>For counties without deep local review, AidAtlasCA uses statewide-core behavior and locator-based handoffs across $counties California counties.</p>
          <div class="pill-row"><span class="pill">$counties California counties</span><span class="pill">locator fallback</span></div>
        </article>
      </div>
    </section>

    <section id="architecture">
      <div class="section-head">
        <p class="kicker">Architecture</p>
        <h2>LLM-friendly UX, deterministic guardrails, and ADK graph orchestration.</h2>
        <p>The implementation combines a chat-first Next.js workspace, FastAPI boundary, Google ADK/Gemini synthesis, deterministic source-grounded graph, A2UI rendering, and validation before export.</p>
      </div>
      <div class="grid two">
        <article class="card">
          <h3>Agentic workflow diagram</h3>
          <div class="flow" style="grid-template-columns:1fr;gap:10px">
            <div class="flow-step"><b>1. Intake and privacy screening</b><p>Block/redact PII and unsafe exact locations before model synthesis.</p></div>
            <div class="flow-step"><b>2. Jurisdiction and source retrieval</b><p>Route California geography, program areas, approved source IDs, and local handoff fixtures.</p></div>
            <div class="flow-step"><b>3. Deterministic benefit matching</b><p>Emit safe status labels rather than eligibility decisions or benefit amounts.</p></div>
            <div class="flow-step"><b>4. Gemini synthesis through ADK</b><p>Use Gemini for concise language when configured, with deterministic fallback and visible local diagnostics.</p></div>
            <div class="flow-step"><b>5. A2UI and packet validation</b><p>Shape structured UI, packet sections, citations, reminders, and export controls through allowlisted actions.</p></div>
          </div>
        </article>
        <article class="card">
          <h3>System surfaces</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Layer</th><th>Role</th><th>Judge signal</th></tr></thead>
              <tbody>
                <tr><td>Next.js workspace</td><td>Chat, Sources, Resources, Packet, California explorer, reminders, voice controls</td><td>Modern model-chat UX with support drawer and persistent tabs</td></tr>
                <tr><td>FastAPI</td><td>Public API boundary and static frontend serving</td><td>Clear route contract for chat, prepare, export, resources, readiness</td></tr>
                <tr><td>ADK + Gemini</td><td>LLM-first safe-turn synthesis when configured</td><td>Grounded answer text without moving safety decisions into the model</td></tr>
                <tr><td>Deterministic graph</td><td>Privacy, safety, jurisdiction, source, matching, packet validation</td><td>Repeatable release gates and no hidden eligibility logic</td></tr>
                <tr><td>Source store</td><td>$approved_sources approved sources, $program_areas program areas, $resources local resources</td><td>Auditable citations and frozen fixture behavior</td></tr>
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>

    <section id="google-stack">
      <div class="section-head">
        <p class="kicker">Google stack</p>
        <h2>Google services are used where they add leverage, not as unchecked authority.</h2>
        <p>Gemini and ADK support agent reasoning and orchestration. Maps/Places enrich curated local resources only; they do not invent benefit logic or live availability. Voice routes through the same safety path as text.</p>
      </div>
      <div class="grid three">
        <article class="card"><h3>ADK and agents-cli</h3><p>Root agent, callbacks, graph workflow discipline, eval gates, and local readiness checks make the agent easier to reason about than a single prompt.</p></article>
        <article class="card"><h3>Gemini / Vertex-ready synthesis</h3><p>Safe turns can use Gemini for concise responses after deterministic privacy, source, safety, and jurisdiction checks.</p></article>
        <article class="card"><h3>Maps and Places</h3><p>Optional, gated, and enrichment-only. Queries use coarse location context and curated resources, with no opening-hours or live availability claims.</p></article>
        <article class="card"><h3>Speech and TTS</h3><p>Voice can transcribe and respond through the same chat workflow, then fail closed when Google Speech/TTS is unavailable.</p></article>
        <article class="card"><h3>Cloud Run posture</h3><p>The repo is shaped for a single-service Cloud Run deployment: FastAPI plus static Next frontend, with secrets handled out of repo.</p></article>
        <article class="card"><h3>A2UI</h3><p>Structured UI templates give judges visible proof that the agent can return actions, citations, reminders, resources, packet data, and safety states.</p></article>
      </div>
    </section>

    <section id="safety">
      <div class="section-head">
        <p class="kicker">Safety and privacy</p>
        <h2>The safety model is the product, not a footer.</h2>
        <p>Benefits guidance is high impact. AidAtlasCA constrains itself to preparation and handoff, with deterministic blocks for sensitive data and explicit refusal of unsupported claims.</p>
      </div>
      <div class="grid two">
        <article class="card safe">
          <h3>Allowed outputs</h3>
          <ul>
            <li>Potential benefit areas worth checking.</li>
            <li>Missing facts and questions to ask an office.</li>
            <li>Documents to prepare if available.</li>
            <li>Official links, source citations, and local handoff contacts.</li>
            <li>Call scripts, reminders, and printable prep packets.</li>
          </ul>
        </article>
        <article class="card danger">
          <h3>Hard boundaries</h3>
          <ul>
            <li>No eligibility decisions or benefit amount estimates.</li>
            <li>No application submission, credential handling, case status, or real upload flow.</li>
            <li>No SSNs, EBT/PINs, dates of birth, case numbers, exact shelter/DV locations, or sensitive identity documents.</li>
            <li>No live shelter, food, legal-aid, WIC, or office availability claims.</li>
          </ul>
        </article>
      </div>
      <details>
        <summary>Privacy threat model in one paragraph</summary>
        <p>AidAtlasCA works with broad city, county, or ZIP context and synthetic/privacy-preserving household facts. Raw sensitive text must not be stored, logged, exported, or passed to the model after detection. Telemetry is limited to buckets such as county, language, tool name, source ID, status label, validation outcome, redaction count, and latency.</p>
      </details>
      <details>
        <summary>Domestic violence, stalking, trafficking, and urgent safety handling</summary>
        <p>Safety-sensitive flows suppress normal benefits packet detail, avoid Maps, avoid exact locations, and route to concise crisis/hotline handoff language. The assistant does not provide legal, medical, immigration, crisis, or domestic violence advice.</p>
      </details>
    </section>

    <section id="sources">
      <div class="section-head">
        <p class="kicker">Source grounding</p>
        <h2>The source trail is intentionally conservative.</h2>
        <p>Final packets must cite approved source IDs and approved domains. Official federal, state, county, and city sources outrank partner and nonprofit handoff pages. Google Places is last and only for contact/location enrichment.</p>
      </div>
      <div class="grid two">
        <article class="card">
          <h3>Source trust ladder</h3>
          <ol class="ladder">
            <li>Official federal, state, county, and city sources.</li>
            <li>Official application portals and official no-key APIs.</li>
            <li>Official local service guides.</li>
            <li>211, food-bank, and legal-aid nonprofit handoff pages.</li>
            <li>Google Maps/Places/Routes for contact/location enrichment only.</li>
          </ol>
        </article>
        <article class="card">
          <h3>Runtime source pack</h3>
          <div class="scoreboard" style="grid-template-columns:repeat(2,minmax(0,1fr))">
            <div class="score"><strong>$approved_sources</strong><span>approved sources</span></div>
            <div class="score"><strong>$program_areas</strong><span>program areas</span></div>
            <div class="score"><strong>$counties</strong><span>county routing rows</span></div>
            <div class="score"><strong>$county_profiles</strong><span>county profiles and fallbacks</span></div>
            <div class="score"><strong>$resources</strong><span>local resources</span></div>
            <div class="score"><strong>$tool_contracts</strong><span>tool contracts</span></div>
          </div>
        </article>
      </div>
      <details>
        <summary>Freshness and call-before-going policy</summary>
        <p>Urgent food, shelter, legal aid, WIC, crisis, and local resources are treated as unstable. County/city office contacts and program pages have refresh windows. User-facing handoffs preserve the instruction: Call before going to confirm current availability. They never claim current availability.</p>
      </details>
    </section>

    <section id="evals">
      <div class="section-head">
        <p class="kicker">Evals and verification</p>
        <h2>The demo is backed by deterministic tests and behavior gates.</h2>
        <p>The release posture combines Python unit/integration tests, frontend E2E, source-pack validation, agents-cli lint/eval lanes, and hard local safety gates.</p>
      </div>
      <div class="scoreboard">
        <div class="score"><strong>$eval_cases</strong><span>local eval cases</span></div>
        <div class="score"><strong>100%</strong><span>target safety-critical refusal behavior</span></div>
        <div class="score"><strong>100%</strong><span>target citation coverage</span></div>
        <div class="score"><strong>100%</strong><span>target packet schema validation</span></div>
        <div class="score"><strong>0</strong><span>allowed eligibility or amount claims</span></div>
      </div>
      <div class="grid two" style="margin-top:16px">
        <article class="card">
          <h3>Deterministic lane</h3>
          <p>Schema serialization, source allowlist, PII redaction, exact-address blocking, crisis/DV routing, jurisdiction checks, critic validation, prohibited phrase blocking, A2UI contract validation, and packet export checks.</p>
        </article>
        <article class="card">
          <h3>Behavior lane</h3>
          <p>Agents-cli datasets cover gold profiles, red-team prompts, statewide expansion, safety, grounding, hallucination, instruction-following, tool-use quality, and Spanish packet behavior.</p>
        </article>
      </div>
      <details>
        <summary>Suggested verification commands for judges or reviewers</summary>
        <pre><code>agents-cli info
uv run pytest -p no:cacheprovider tests/unit tests/integration
uv run python scripts/validate_source_pack.py
python3 scripts/sync_frontend_data.py --check
cd frontend && npm run typecheck && npm run lint && npm run build && npm run test:e2e</code></pre>
      </details>
    </section>

    <section id="judge-checklist">
      <div class="section-head">
        <p class="kicker">Judge checklist</p>
        <h2>How to evaluate the app in five minutes.</h2>
        <p>The strongest demo path is not a perfect eligibility answer. It is a safe, source-backed, practical preparation workflow.</p>
      </div>
      <div class="timeline">
        <div class="timeline-item"><h3>1. Start at the landing page</h3><p>Confirm the front door clearly explains voice, maps, reminders, source-backed preparation, and the official-agency boundary.</p></div>
        <div class="timeline-item"><h3>2. Ask a broad benefits question</h3><p>Try "I live in Fresno and need food benefits. What should I do next?" The answer should be concise and grounded, not a packet dump.</p></div>
        <div class="timeline-item"><h3>3. Open support content</h3><p>Use the Support drawer for sources, resources, packet links, safety notes, and next actions without cluttering the main transcript.</p></div>
        <div class="timeline-item"><h3>4. Visit Sources and Resources</h3><p>Look for official source trail, approved source library, local handoff cards, safe Maps links, and the warning: Call before going to confirm current availability.</p></div>
        <div class="timeline-item"><h3>5. Build the Packet</h3><p>Confirm the output is a preparation packet: missing facts, checklist, caseworker questions, call script, reminders, and export controls.</p></div>
        <div class="timeline-item"><h3>6. Test a boundary</h3><p>Try an SSN, case number, or "am I eligible?" The app should block/redact or respond with preparation-only language.</p></div>
      </div>
    </section>

    <section id="roadmap">
      <div class="section-head">
        <p class="kicker">Roadmap</p>
        <h2>What production hardening would add next.</h2>
        <p>AidAtlasCA is already useful as a source-backed preparation assistant. Production work would deepen review coverage, monitoring, accessibility, and deployment hardening.</p>
      </div>
      <div class="grid four">
        <article class="card"><h3>County depth</h3><p>Add deeper reviewed local resources county by county while keeping statewide locator fallback for the rest.</p></article>
        <article class="card"><h3>Accessibility</h3><p>Expand screen-reader, keyboard, reduced-motion, low-literacy, and Spanish-first QA scenarios.</p></article>
        <article class="card"><h3>Operational safety</h3><p>Formalize source freeze, URL checks, managed eval summaries, DLP, Model Armor, and Cloud Run observability.</p></article>
        <article class="card"><h3>Community handoff</h3><p>Partner with counties, 211, food banks, legal aid, WIC offices, and navigators before caching more local data.</p></article>
      </div>
    </section>

    <section id="evidence">
      <div class="section-head">
        <p class="kicker">Evidence gallery</p>
        <h2>Visual references and product assets used in this dossier.</h2>
        <p>These assets are local, existing project materials. The app policy text comes from docs and source packs, not from visual mockup text.</p>
      </div>
      <div class="grid three">
        <article class="card media"><img src="$golden_gate" alt="AidAtlasCA Golden Gate support brand image"><div class="copy"><h3>Brand signal</h3><p>California civic clarity with a human support tone.</p></div></article>
        <article class="card media"><img src="$design_reference" alt="AidAtlasCA responsive component style guide reference"><div class="copy"><h3>Responsive UI direction</h3><p>Dense, calm, accessible components rather than a marketing-only page.</p></div></article>
        <article class="card media"><img src="$mark" alt="AidAtlasCA logo mark"><div class="copy"><h3>Portable identity</h3><p>Used for judging decks, videos, and future submission assets.</p></div></article>
      </div>
    </section>

    <section id="citations">
      <div class="section-head">
        <p class="kicker">Source material</p>
        <h2>Primary local and official references.</h2>
        <p>This dossier synthesizes local repo evidence plus outbound official-source links for context.</p>
      </div>
      <ol class="citation-list footnotes">
        <li><code>README.md</code> - product scope, local app routes, optional Google Maps/Voice setup, safety gates.</li>
        <li><code>docs/design/DESIGN_SPEC.md</code> - outcomes, non-goals, supported workflows, architecture.</li>
        <li><code>docs/security/PRIVACY_AND_SECURITY.md</code> and <code>llm_wiki/safety/privacy-and-pii.md</code> - PII boundaries and telemetry limits.</li>
        <li><code>docs/security/SOURCE_GROUNDING_RULES.md</code> and <code>llm_wiki/sources/source-trust-order.md</code> - citation and source trust policy.</li>
        <li><code>docs/evals/EVAL_PLAN.md</code> - deterministic and behavior evaluation lanes.</li>
        <li><code>app/data/source_pack/*</code> - current runtime source fixtures and California routing data.</li>
        <li><a href="https://www.cdss.ca.gov/calfresh">CDSS CalFresh</a>, <a href="https://www.dhcs.ca.gov/services/medi-cal-resources/">DHCS Medi-Cal</a>, <a href="https://www.myfamily.wic.ca.gov/">California WIC</a>, and <a href="https://www.cdss.ca.gov/county-offices">CDSS County Offices</a> - examples of official source families used by the approved source strategy.</li>
      </ol>
    </section>
  </main>

  <footer class="final-band">
    <h2>Bottom line for judges</h2>
    <p>AidAtlasCA is useful because it makes the safest part of benefits assistance faster: getting ready. It gives Californians a source-backed next step, a packet to bring into official conversations, and a clear warning that official agencies decide eligibility and amounts. It uses Google AI and location services where they help, while deterministic policies keep the app inside its preparation boundary.</p>
  </footer>
</div>

<script>
  const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));
  const personaCards = Array.from(document.querySelectorAll(".persona-card"));
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.getAttribute("data-filter");
      filterButtons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      personaCards.forEach((card) => {
        const show = filter === "all" || card.getAttribute("data-persona") === filter;
        card.setAttribute("data-hidden", String(!show));
      });
    });
  });
</script>
</body>
</html>
"""
    )
    return template.substitute({**image_uris, **{k: str(v) for k, v in metrics.items()}, "media_rows": media_rows})


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    copied = copy_media()
    html_text = build_html()
    OUT_HTML.write_text(html_text, encoding="utf-8")
    print(json.dumps({
        "html": str(OUT_HTML.relative_to(ROOT)),
        "html_bytes": OUT_HTML.stat().st_size,
        "media": copied,
        "media_count": len(copied),
        "embedded_images": len(IMAGE_ASSETS),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
