"use client";

import type {
  A2UITemplate,
  ChatMessage,
  HouseholdSnapshotInput,
  LocalResource,
  PrepareResult,
  PrepPacket,
  ReadinessResult,
  SourceCitation,
} from "../lib/types";
import { fallbackResult, syntheticProfiles } from "../data/syntheticProfiles";
import { copyFor, type Locale, localeOptions, needLabels } from "./conversation-atlas/i18n";
import {
  canRenderMapsEmbed,
  googleMapsEmbedUrl,
  googleMapsSearchUrl,
  resourceMapQuery,
} from "./conversation-atlas/maps";
import styles from "./conversation-atlas/ConversationAtlas.module.css";
import {
  type AtlasSection,
  fallbackResources,
  useBenefitBridgeController,
} from "./conversation-atlas/useBenefitBridgeController";

type AtlasIconName =
  | "arrow"
  | "bay"
  | "chat"
  | "check"
  | "document"
  | "external"
  | "globe"
  | "map"
  | "pin"
  | "play"
  | "prepare"
  | "shield"
  | "source"
  | "user";

const atlasSections: ReadonlyArray<{
  id: AtlasSection;
  icon: AtlasIconName;
}> = [
  { id: "chat", icon: "chat" },
  { id: "prepare", icon: "prepare" },
  { id: "sources", icon: "source" },
  { id: "resources", icon: "pin" },
  { id: "packet", icon: "document" },
  { id: "bay-area", icon: "map" },
] as const satisfies ReadonlyArray<{
  id: AtlasSection;
  icon: AtlasIconName;
}>;

const needsOptions = [
  "food",
  "health coverage",
  "utility help",
  "cash aid",
  "housing",
  "WIC",
  "shelter",
];

type AtlasCopy = ReturnType<typeof copyFor>;

export function BenefitBridgeDashboard() {
  const {
    activeSection,
    busy,
    chatBusy,
    chatInput,
    chatMessages,
    chatTemplates,
    displayResources,
    handleSelectProfile,
    notice,
    packet,
    readiness,
    result,
    runChat,
    runExport,
    runPrepare,
    runTranslate,
    selectedProfileId,
    setActiveSection,
    setChatInput,
    setLanguage,
    setUserText,
    snapshot,
    toggleNeed,
    updateSnapshot,
    userText,
    validationPass,
  } = useBenefitBridgeController();
  const locale = snapshot.language as Locale;
  const copy = copyFor(locale);

  function moveToSection(section: AtlasSection) {
    setActiveSection(section);
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (section === "chat") {
      window.setTimeout(() => document.getElementById("chat-input")?.focus(), 280);
    }
  }

  async function prepareAndShowPacket() {
    await runPrepare();
    moveToSection("packet");
  }

  function moveToDemo() {
    setActiveSection("prepare");
    document.getElementById("atlas-demo")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <main className={styles.shell} data-testid="conversation-shell">
      <header className={styles.header}>
        <a className={styles.brand} href="#chat" onClick={() => setActiveSection("chat")}>
          <BrandMark />
          <span>BenefitBridge CA</span>
        </a>
        <nav className={styles.nav} aria-label={copy.navAria}>
          {atlasSections.map((item) => (
            <button
              key={item.id}
              type="button"
              data-testid={`nav-${item.id}`}
              className={`${styles.navButton} ${
                activeSection === item.id ? styles.navButtonActive : ""
              }`}
              aria-current={activeSection === item.id ? "page" : undefined}
              onClick={() => moveToSection(item.id)}
            >
              <AtlasIcon name={item.icon} />
              <span>{copy.sections[item.id]}</span>
            </button>
          ))}
        </nav>
        <label className={styles.languageSelect}>
          <AtlasIcon name="globe" />
          <span className={styles.srOnly}>{copy.languageLabel}</span>
          <select
            data-testid="language-select"
            aria-label={copy.languageLabel}
            value={locale}
            onChange={(event) => setLanguage(event.target.value as Locale)}
          >
            {localeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className={styles.appFrame}>
        <div className={styles.mainColumn}>
          <section className={styles.hero} aria-labelledby="hero-heading">
            <div className={styles.heroCopy}>
              <span className={styles.heroKicker}>{copy.heroKicker}</span>
              <h1 id="hero-heading">{copy.heroTitle}</h1>
              <p className={styles.heroBody}>{copy.heroBody}</p>
              <div className={styles.heroAccent} aria-hidden="true" />
              <ul className={styles.promiseList} aria-label="BenefitBridge preparation promises">
                {copy.promises.map((promise, index) => (
                  <li key={promise}>
                    <AtlasIcon name={index === 0 ? "chat" : index === 1 ? "map" : "check"} />
                    <span>{promise}</span>
                  </li>
                ))}
              </ul>
              <div className={styles.heroActions}>
                <button className={styles.primaryCta} type="button" onClick={() => moveToSection("chat")}>
                  <span>{copy.primaryCta}</span>
                  <AtlasIcon name="arrow" />
                </button>
                <button className={styles.secondaryCta} type="button" onClick={moveToDemo}>
                  <AtlasIcon name="play" />
                  <span>{copy.watchDemo}</span>
                </button>
              </div>
            </div>

            <div className={styles.heroAtlas} aria-label="Conversation Atlas preview">
              <div className={styles.flowSteps} aria-hidden="true">
                {copy.flowSteps.map((step, index) => (
                  <span key={step} className={index === 0 ? styles.flowStepActive : undefined}>
                    {step}
                  </span>
                ))}
              </div>
              <div className={styles.atlasMapLayer}>
                <AtlasResultStack
                  packet={packet}
                  resources={displayResources}
                  validationPass={validationPass}
                  copy={copy}
                />
                <BayAreaPins locationText={snapshot.location_text} />
              </div>
            </div>
          </section>

          <section className={styles.atlasRail} aria-label="Conversation Atlas progress">
            {atlasSections.map((item) => (
              <button
                key={`rail-${item.id}`}
                type="button"
                data-testid={`rail-${item.id}`}
                className={`${styles.railStep} ${
                  activeSection === item.id ? styles.railStepActive : ""
                }`}
                onClick={() => moveToSection(item.id)}
              >
                <AtlasIcon name={item.icon} />
                <span>{copy.sections[item.id]}</span>
              </button>
            ))}
          </section>

          <section
            className={styles.notice}
            data-kind={notice.kind}
            role="status"
            data-testid="workspace-status"
          >
            <strong>{notice.kind === "ready" ? copy.workspaceStatus : copy.attention}</strong>
            <span>{notice.text}</span>
          </section>

          <div className={styles.sectionStack}>
            <SectionFrame
              id="chat"
              label={copy.sections.chat}
              title={copy.sectionCopy.chat.title}
              copy={copy.sectionCopy.chat.body}
            >
              <div className={styles.chatSectionGrid}>
                <div className={styles.chatSectionCopy}>
                  <h3>{copy.chatWorkspace}</h3>
                  <p>{copy.sectionCopy.chat.body}</p>
                  <BoundaryList copy={copy.boundary} />
                </div>
                <AtlasResultStack
                  packet={packet}
                  resources={displayResources}
                  validationPass={validationPass}
                  copy={copy}
                />
              </div>
            </SectionFrame>

            <SectionFrame
              id="prepare"
              label={copy.sections.prepare}
              title={copy.sectionCopy.prepare.title}
              copy={copy.sectionCopy.prepare.body}
            >
              <PreparePanel
                selectedProfileId={selectedProfileId}
                snapshot={snapshot}
                userText={userText}
                busy={busy}
                readiness={readiness}
                copy={copy}
                locale={locale}
                onPrepare={prepareAndShowPacket}
                onSelectProfile={handleSelectProfile}
                onSnapshotChange={updateSnapshot}
                onTextChange={setUserText}
                onToggleNeed={toggleNeed}
              />
              <DemoBlock copy={copy} />
            </SectionFrame>

            <SectionFrame
              id="sources"
              label={copy.sections.sources}
              title={copy.sectionCopy.sources.title}
              copy={copy.sectionCopy.sources.body}
            >
              <SourcesPanel packet={packet} validationPass={validationPass} copy={copy} />
            </SectionFrame>

            <SectionFrame
              id="resources"
              label={copy.sections.resources}
              title={copy.sectionCopy.resources.title}
              copy={copy.sectionCopy.resources.body}
            >
              <ResourcesPanel resources={displayResources} copy={copy} locale={locale} />
            </SectionFrame>

            <SectionFrame
              id="packet"
              label={copy.sections.packet}
              title={copy.sectionCopy.packet.title}
              copy={copy.sectionCopy.packet.body}
            >
              <PacketPanel
                packet={packet}
                result={result}
                busy={busy}
                copy={copy}
                onExport={runExport}
                onTranslate={runTranslate}
              />
            </SectionFrame>

            <SectionFrame
              id="bay-area"
              label={copy.sections["bay-area"]}
              title={copy.sectionCopy["bay-area"].title}
              copy={copy.sectionCopy["bay-area"].body}
            >
              <BayAreaPanel snapshot={snapshot} resources={displayResources} copy={copy} locale={locale} />
            </SectionFrame>
          </div>
        </div>

        <aside
          className={styles.chatSidePanel}
          aria-label={copy.chatWorkspace}
          data-testid="chat-sidepanel"
        >
          <ConversationCard
            messages={chatMessages}
            templates={chatTemplates}
            input={chatInput}
            inputId="chat-input"
            inputTestId="chat-input"
            busy={chatBusy}
            copy={copy}
            onInputChange={setChatInput}
            onSubmit={runChat}
            expanded
          />
          <BoundaryList copy={copy.boundary} compact />
        </aside>
      </div>
    </main>
  );
}

function SectionFrame({
  id,
  label,
  title,
  copy,
  children,
}: {
  id: AtlasSection;
  label: string;
  title: string;
  copy: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={styles.sectionFrame} aria-labelledby={`${id}-heading`}>
      <div className={styles.sectionIntro}>
        <span>{label}</span>
        <h2 id={`${id}-heading`}>{title}</h2>
        <p>{copy}</p>
      </div>
      {children}
    </section>
  );
}

function ConversationCard({
  messages,
  templates,
  input,
  inputId,
  inputTestId,
  busy,
  copy,
  expanded = false,
  onInputChange,
  onSubmit,
}: {
  messages: ChatMessage[];
  templates: A2UITemplate[];
  input: string;
  inputId: string;
  inputTestId?: string;
  busy: boolean;
  copy: AtlasCopy;
  expanded?: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (messageText?: string) => void;
}) {
  return (
    <article className={`${styles.chatCard} ${expanded ? styles.chatCardExpanded : ""}`}>
      <div className={styles.cardHeader}>
        <div>
          <AtlasIcon name="chat" />
          <h3>{copy.chatTitle}</h3>
        </div>
        <span>{copy.chatBadge}</span>
      </div>

      <div className={styles.chatLog} aria-live="polite">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`${styles.chatBubble} ${
              message.role === "assistant" ? styles.chatBubbleAgent : styles.chatBubbleUser
            }`}
          >
            <span>{message.role === "assistant" ? "BenefitBridge" : "You"}</span>
            <p>{message.content}</p>
          </div>
        ))}
      </div>

      {templates.length > 0 && (
        <div className={styles.templateStack} aria-label="Agent answer templates">
          {templates.map((template) => (
            <A2UITemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}

      <form
        className={styles.chatForm}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label className={styles.srOnly} htmlFor={inputId}>
          {copy.chatInputLabel}
        </label>
        <textarea
          id={inputId}
          data-testid={inputTestId}
          value={input}
          rows={expanded ? 4 : 2}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder={copy.chatPlaceholder}
        />
        <button className={styles.sendButton} type="submit" disabled={busy || !input.trim()}>
          <AtlasIcon name="arrow" />
          <span className={styles.srOnly}>{busy ? copy.chatChecking : copy.chatSend}</span>
        </button>
      </form>

      {expanded && (
        <div className={styles.quickPrompts} aria-label="Example prompts">
          {copy.quickPrompts.map((prompt) => (
            <button key={prompt} type="button" onClick={() => onSubmit(prompt)} disabled={busy}>
              {prompt}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

function AtlasResultStack({
  packet,
  resources,
  validationPass,
  copy,
}: {
  packet?: PrepPacket;
  resources: LocalResource[];
  validationPass: boolean;
  copy: AtlasCopy;
}) {
  const primaryPath = packet?.potential_benefit_paths[0];
  const primaryCitation =
    primaryPath?.source_citations[0] ?? packet?.source_citations[0] ?? fallbackResult.packet?.source_citations[0];
  const primaryResource = resources[0] ?? fallbackResources[0];
  const checklist = packet?.document_checklist.slice(0, 5) ?? [];

  return (
    <div className={styles.resultStack} aria-label="Source, resource, and packet preview">
      <article className={`${styles.resultCard} ${styles.sourceCard}`}>
        <div className={styles.resultCardHeader}>
          <AtlasIcon name="shield" />
          <span>{copy.officialSource}</span>
          <strong>{validationPass ? copy.verified : copy.review}</strong>
        </div>
        <h3>{primaryPath?.program_name ?? "BenefitsCal"}</h3>
        <p>{primaryCitation?.source_title ?? "Official program source"}</p>
        {primaryCitation?.url && (
          <a href={primaryCitation.url} target="_blank" rel="noreferrer">
            {domainLabel(primaryCitation.url)}
            <AtlasIcon name="external" />
          </a>
        )}
      </article>
      <article className={`${styles.resultCard} ${styles.resourceCard}`}>
        <div className={styles.resultCardHeader}>
          <AtlasIcon name="pin" />
          <span>{copy.localResource}</span>
          <strong>{copy.callBeforeGoing}</strong>
        </div>
        <h3>{primaryResource.organization}</h3>
        <p>{primaryResource.service_name}</p>
        {primaryResource.phone && <span>{primaryResource.phone}</span>}
      </article>
      <article className={`${styles.resultCard} ${styles.packetCard}`}>
        <div className={styles.resultCardHeader}>
          <AtlasIcon name="document" />
          <span>{copy.sections.packet}</span>
          <strong>{checklist.length} items</strong>
        </div>
        <ul>
          {checklist.map((item) => (
            <li key={item}>
              <AtlasIcon name="check" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}

function PreparePanel({
  selectedProfileId,
  snapshot,
  userText,
  busy,
  readiness,
  copy,
  locale,
  onPrepare,
  onSelectProfile,
  onSnapshotChange,
  onTextChange,
  onToggleNeed,
}: {
  selectedProfileId: string;
  snapshot: HouseholdSnapshotInput;
  userText: string;
  busy: boolean;
  readiness: ReadinessResult | null;
  copy: AtlasCopy;
  locale: Locale;
  onPrepare: () => void;
  onSelectProfile: (profileId: string) => void;
  onSnapshotChange: <K extends keyof HouseholdSnapshotInput>(
    key: K,
    value: HouseholdSnapshotInput[K],
  ) => void;
  onTextChange: (value: string) => void;
  onToggleNeed: (need: string) => void;
}) {
  return (
    <div className={styles.prepareGrid}>
      <div className={styles.formPanel}>
        <label className={styles.field}>
          <span>{copy.syntheticProfile}</span>
          <select value={selectedProfileId} onChange={(event) => onSelectProfile(event.target.value)}>
            {syntheticProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.label} - {profile.summary}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.twoColumn}>
          <label className={styles.field}>
            <span>{copy.languageLabel}</span>
            <select
              value={snapshot.language}
              onChange={(event) =>
                onSnapshotChange("language", event.target.value as HouseholdSnapshotInput["language"])
              }
            >
              <option value="en">English</option>
              <option value="es">Espanol</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>{copy.locationLabel}</span>
            <input
              value={snapshot.location_text}
              onChange={(event) => onSnapshotChange("location_text", event.target.value)}
              placeholder={copy.locationPlaceholder}
            />
          </label>
        </div>

        <div className={styles.twoColumn}>
          <label className={styles.field}>
            <span>{copy.householdSize}</span>
            <input
              type="number"
              min={1}
              max={20}
              value={snapshot.household_size ?? ""}
              onChange={(event) =>
                onSnapshotChange(
                  "household_size",
                  event.target.value ? Number(event.target.value) : undefined,
                )
              }
            />
          </label>
          <label className={styles.field}>
            <span>{copy.adults}</span>
            <input
              type="number"
              min={0}
              max={20}
              value={snapshot.adults ?? ""}
              onChange={(event) =>
                onSnapshotChange(
                  "adults",
                  event.target.value ? Number(event.target.value) : undefined,
                )
              }
            />
          </label>
        </div>

        <div className={styles.twoColumn}>
          <label className={styles.field}>
            <span>{copy.incomeRange}</span>
            <input
              value={snapshot.income_range_monthly ?? ""}
              onChange={(event) => onSnapshotChange("income_range_monthly", event.target.value)}
              placeholder={copy.incomePlaceholder}
            />
          </label>
          <label className={styles.field}>
            <span>{copy.housingStatus}</span>
            <select
              value={snapshot.housing_status}
              onChange={(event) => onSnapshotChange("housing_status", event.target.value)}
            >
              <option value="housed">{copy.housingOptions.housed}</option>
              <option value="housed but rent stressed">
                {copy.housingOptions["housed but rent stressed"]}
              </option>
              <option value="unstable">{copy.housingOptions.unstable}</option>
              <option value="unknown">{copy.housingOptions.unknown}</option>
            </select>
          </label>
        </div>

        <fieldset className={styles.needGrid}>
          <legend>{copy.helpAreas}</legend>
          {needsOptions.map((need) => (
            <label key={need} className={styles.checkPill}>
              <input
                type="checkbox"
                checked={snapshot.needs.includes(need)}
                onChange={() => onToggleNeed(need)}
              />
              <span>{needLabels[locale][need] ?? need}</span>
            </label>
          ))}
        </fieldset>

        <label className={styles.field}>
          <span>{copy.packetContext}</span>
          <textarea
            value={userText}
            rows={5}
            onChange={(event) => onTextChange(event.target.value)}
            placeholder={copy.packetContextPlaceholder}
          />
        </label>

        <button
          className={styles.primaryCta}
          type="button"
          onClick={onPrepare}
          disabled={busy}
          data-testid="prepare-button"
        >
          <span>{busy ? copy.preparing : copy.preparePacket}</span>
          <AtlasIcon name="arrow" />
        </button>
      </div>

      <ReadinessPanel readiness={readiness} copy={copy} />
    </div>
  );
}

function SourcesPanel({
  packet,
  validationPass,
  copy,
}: {
  packet?: PrepPacket;
  validationPass: boolean;
  copy: AtlasCopy;
}) {
  const citations = uniqueCitations([
    ...(packet?.source_citations ?? []),
    ...(packet?.potential_benefit_paths.flatMap((path) => path.source_citations) ?? []),
  ]).slice(0, 8);

  return (
    <div className={styles.sourceGrid}>
      {citations.map((citation) => (
        <SourceCitationCard
          key={`${citation.source_id}-${citation.url ?? citation.source_title}`}
          citation={citation}
          validationPass={validationPass}
          copy={copy}
        />
      ))}
    </div>
  );
}

function SourceCitationCard({
  citation,
  validationPass,
  copy,
}: {
  citation: SourceCitation;
  validationPass: boolean;
  copy: AtlasCopy;
}) {
  return (
    <article className={styles.sourceCitationCard}>
      <div className={styles.resultCardHeader}>
        <AtlasIcon name="shield" />
        <span>{citation.agency_owner ?? "Official"} source</span>
        <strong>{validationPass ? copy.verified : copy.review}</strong>
      </div>
      <h3>{citation.source_title ?? citation.source_id}</h3>
      <p>{citation.source_type?.replaceAll("_", " ") ?? "Official program reference"}</p>
      {citation.url ? (
        <a href={citation.url} target="_blank" rel="noreferrer">
          {domainLabel(citation.url)}
          <AtlasIcon name="external" />
        </a>
      ) : (
        <span className={styles.mutedText}>{copy.noUrl}</span>
      )}
    </article>
  );
}

function ResourcesPanel({
  resources,
  copy,
  locale,
}: {
  resources: LocalResource[];
  copy: AtlasCopy;
  locale: Locale;
}) {
  return (
    <div className={styles.resourcesLayout}>
      <MapEmbedPanel
        resources={resources}
        copy={copy}
        locale={locale}
        testId="bay-map-panel"
        fallbackTestId="bay-map-fallback"
      />
      <div className={styles.resourceGrid}>
        {resources.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} copy={copy} />
        ))}
      </div>
    </div>
  );
}

function ResourceCard({ resource, copy }: { resource: LocalResource; copy: AtlasCopy }) {
  return (
    <article className={styles.localResourceCard}>
      <div className={styles.resourceIcon}>
        <AtlasIcon name="pin" />
      </div>
      <div>
        <div className={styles.resultCardHeader}>
          <span>{resource.service_type}</span>
          <strong>{resource.call_before_going ? copy.callBeforeGoing : copy.verifyFirst}</strong>
        </div>
        <h3>{resource.organization}</h3>
        <p>{resource.service_name}</p>
        <dl className={styles.resourceMeta}>
          <div>
            <dt>{copy.area}</dt>
            <dd>{resource.jurisdiction}</dd>
          </div>
          {resource.phone && (
            <div>
              <dt>{copy.phone}</dt>
              <dd>{resource.phone}</dd>
            </div>
          )}
          <div>
            <dt>{copy.languages}</dt>
            <dd>{resource.languages.length > 0 ? resource.languages.join(", ") : "n/a"}</dd>
          </div>
        </dl>
        <p className={styles.callNotice}>
          {resource.availability_notice ?? copy.boundary[3]}
        </p>
        <div className={styles.resourceActions}>
          {resource.url && (
            <a className={styles.cardLink} href={resource.url} target="_blank" rel="noreferrer">
              {copy.openResource}
              <AtlasIcon name="external" />
            </a>
          )}
          <a
            className={styles.cardLink}
            href={googleMapsSearchUrl(resource)}
            target="_blank"
            rel="noreferrer"
          >
            {copy.openMaps}
            <AtlasIcon name="external" />
          </a>
        </div>
      </div>
    </article>
  );
}

function MapEmbedPanel({
  resources,
  copy,
  locale,
  testId = "map-panel",
  fallbackTestId = "map-fallback",
}: {
  resources: LocalResource[];
  copy: AtlasCopy;
  locale: Locale;
  testId?: string;
  fallbackTestId?: string;
}) {
  const primaryResource = resources[0] ?? fallbackResources[0];
  const query = resourceMapQuery(primaryResource);
  const embedUrl = googleMapsEmbedUrl(query, locale);

  return (
    <article className={styles.mapEmbedPanel} data-testid={testId}>
      <div className={styles.resultCardHeader}>
        <span>{copy.mapPreview}</span>
        <strong>{canRenderMapsEmbed ? "Embed" : "Fallback"}</strong>
      </div>
      {embedUrl ? (
        <iframe
          title={copy.mapIframeTitle}
          src={embedUrl}
          loading="lazy"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className={styles.mapFallback} data-testid={fallbackTestId}>
          <BayAreaPins locationText={primaryResource.jurisdiction} large />
          <strong>{copy.mapPreview}</strong>
          <p>{copy.mapFallback}</p>
          <a
            className={styles.cardLink}
            href={googleMapsSearchUrl(primaryResource)}
            target="_blank"
            rel="noreferrer"
          >
            {copy.openMaps}
            <AtlasIcon name="external" />
          </a>
        </div>
      )}
    </article>
  );
}

function PacketPanel({
  packet,
  result,
  busy,
  copy,
  onExport,
  onTranslate,
}: {
  packet?: PrepPacket;
  result: PrepareResult;
  busy: boolean;
  copy: AtlasCopy;
  onExport: () => void;
  onTranslate: () => void;
}) {
  if (!packet) {
    return (
      <div className={styles.emptyPanel}>
        <p>{copy.noPacket}</p>
      </div>
    );
  }

  return (
    <div className={styles.packetGrid} data-testid="packet-panel">
      <article className={styles.paperPreview}>
        <div className={styles.paperHeader}>
          <span>BenefitBridge CA</span>
          <strong>{result.route.replaceAll("_", " ")}</strong>
        </div>
        <h3>{copy.packetPreview}</h3>
        <p>{packet.household_snapshot_summary}</p>
        <div className={styles.paperColumns}>
          <ListBlock title={copy.checklist} items={packet.document_checklist.slice(0, 6)} />
          <ListBlock title={copy.questions} items={packet.caseworker_questions.slice(0, 5)} />
        </div>
        <div className={styles.callScript}>
          <h4>{copy.callScript}</h4>
          <p>{packet.call_script}</p>
        </div>
      </article>

      <aside className={styles.packetActions}>
        <h3>{copy.packetActions}</h3>
        <p>{copy.packetActionsBody}</p>
        <button className={styles.primaryCta} type="button" onClick={onExport} disabled={busy}>
          <span>{copy.exportPacket}</span>
          <AtlasIcon name="arrow" />
        </button>
        <button className={styles.secondaryCta} type="button" onClick={onTranslate} disabled={busy}>
          <AtlasIcon name="globe" />
          <span>{copy.translatePacket}</span>
        </button>
        <BoundaryList copy={copy.boundary} compact />
      </aside>
    </div>
  );
}

function BayAreaPanel({
  snapshot,
  resources,
  copy,
  locale,
}: {
  snapshot: HouseholdSnapshotInput;
  resources: LocalResource[];
  copy: AtlasCopy;
  locale: Locale;
}) {
  return (
    <div className={styles.bayAreaPanel}>
      <div className={styles.bayMapLarge} aria-label="Simplified Bay Area service map">
        <BayAreaPins locationText={snapshot.location_text} large />
      </div>
      <div className={styles.baySummary}>
        <h3>{snapshot.location_text || "Bay Area"}</h3>
        <p>{copy.bayBody}</p>
        <dl>
          <div>
            <dt>{copy.needsSelected}</dt>
            <dd>
              {snapshot.needs.map((need) => needLabels[locale][need] ?? need).join(", ") ||
                copy.noneSelected}
            </dd>
          </div>
          <div>
            <dt>{copy.loadedResources}</dt>
            <dd>{resources.length}</dd>
          </div>
          <div>
            <dt>{copy.reminder}</dt>
            <dd>{copy.boundary[3]}</dd>
          </div>
        </dl>
      </div>
      <MapEmbedPanel resources={resources} copy={copy} locale={locale} />
    </div>
  );
}

function ReadinessPanel({
  readiness,
  copy,
}: {
  readiness: ReadinessResult | null;
  copy: AtlasCopy;
}) {
  const metrics = readiness?.evals.latest_grade_summary?.metrics ?? [];
  return (
    <aside className={styles.readinessPanel} aria-label="Readiness checks">
      <div className={styles.cardHeader}>
        <div>
          <AtlasIcon name="check" />
          <h3>{copy.readiness}</h3>
        </div>
        <span>{readiness ? copy.loaded : copy.fallback}</span>
      </div>
      <dl className={styles.readinessGrid}>
        <div>
          <dt>{copy.sourcesMetric}</dt>
          <dd>{String(readiness?.source_pack.approved_sources ?? "demo")}</dd>
        </div>
        <div>
          <dt>{copy.datasetsMetric}</dt>
          <dd>{Object.keys(readiness?.evals.datasets ?? {}).length}</dd>
        </div>
        <div>
          <dt>{copy.outOfRange}</dt>
          <dd>{readiness?.evals.latest_grade_summary?.out_of_range_scores ?? 0}</dd>
        </div>
      </dl>
      <div className={styles.metricList}>
        {(metrics.length > 0 ? metrics : [{ metric_name: "local safety gates", mean_score: null }])
          .slice(0, 4)
          .map((metric) => (
            <div key={metric.metric_name} className={styles.metricRow}>
              <span>{metric.metric_name.replaceAll("_", " ")}</span>
              <strong>{metric.mean_score ?? "n/a"}</strong>
            </div>
          ))}
      </div>
    </aside>
  );
}

function DemoBlock({ copy }: { copy: AtlasCopy }) {
  return (
    <div id="atlas-demo" className={styles.demoBlock}>
      <div>
        <AtlasIcon name="play" />
        <h3>{copy.demoPreview}</h3>
      </div>
      <video
        className={styles.demoVideo}
        data-testid="demo-video"
        controls
        playsInline
        preload="metadata"
        poster="/demo-videos/conversation-atlas-poster.png"
        aria-label="BenefitBridge demo video"
      >
        <source src="/demo-videos/conversation-atlas.mp4" type="video/mp4" />
        <p>Your browser does not support HTML video.</p>
      </video>
    </div>
  );
}

function A2UITemplateCard({ template }: { template: A2UITemplate }) {
  return (
    <article
      className={`${styles.templateCard} ${toneClass(template.tone)}`}
      data-testid="a2ui-card"
    >
      <div className={styles.templateHeader}>
        <div>
          <h4>{template.title}</h4>
          {template.subtitle && <p>{template.subtitle}</p>}
        </div>
        <span>{template.type.replaceAll("_", " ")}</span>
      </div>
      {template.body && <p>{template.body}</p>}
      {template.items.length > 0 && (
        <div className={styles.templateItems}>
          {template.items.map((item, index) => (
            <div key={`${template.id}-${index}`}>
              {item.label && <strong>{item.label}</strong>}
              {item.title && <strong>{item.title}</strong>}
              {item.value && <span>{item.value}</span>}
              {item.subtitle && <span>{item.subtitle}</span>}
              {item.body && <p>{item.body}</p>}
              {item.links && item.links.length > 0 && (
                <div className={styles.inlineLinks}>
                  {item.links.map((link) => (
                    <a key={`${link.label}-${link.href}`} href={link.href} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function BoundaryList({
  copy,
  compact = false,
}: {
  copy: string[];
  compact?: boolean;
}) {
  return (
    <div className={`${styles.boundaryList} ${compact ? styles.boundaryListCompact : ""}`}>
      <AtlasIcon name="shield" />
      <ul>
        {copy.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function BayAreaPins({
  locationText,
  large = false,
}: {
  locationText: string;
  large?: boolean;
}) {
  const selected = locationText.toLowerCase();
  const pins = [
    { city: "San Francisco", top: "36%", left: "26%" },
    { city: "Oakland", top: "42%", left: "50%" },
    { city: "Hayward", top: "55%", left: "55%" },
    { city: "Fremont", top: "65%", left: "68%" },
    { city: "San Jose", top: "78%", left: "58%" },
  ];

  return (
    <div className={`${styles.pinLayer} ${large ? styles.pinLayerLarge : ""}`} aria-hidden="true">
      {pins.map((pin) => {
        const active = selected.includes(pin.city.toLowerCase().split(" ")[0]);
        return (
          <span
            key={pin.city}
            className={`${styles.mapPin} ${active ? styles.mapPinActive : ""}`}
            style={{ top: pin.top, left: pin.left }}
          >
            {pin.city}
          </span>
        );
      })}
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className={styles.listBlock}>
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function BrandMark() {
  return (
    <span className={styles.brandMark} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function AtlasIcon({ name }: { name: AtlasIconName }) {
  switch (name) {
    case "arrow":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h13" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );
    case "bay":
    case "map":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6Z" />
          <path d="M9 4v14" />
          <path d="M15 6v14" />
        </svg>
      );
    case "chat":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 6h14v9H9l-4 4V6Z" />
          <path d="M8 10h5" />
        </svg>
      );
    case "check":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 12 4 4 8-9" />
        </svg>
      );
    case "document":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 3h7l3 3v15H7V3Z" />
          <path d="M14 3v4h4" />
          <path d="M9 11h6" />
          <path d="M9 15h6" />
        </svg>
      );
    case "external":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 6H6v12h12v-4" />
          <path d="M14 6h4v4" />
          <path d="m18 6-8 8" />
        </svg>
      );
    case "globe":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <path d="M4 12h16" />
          <path d="M12 4a12 12 0 0 1 0 16" />
          <path d="M12 4a12 12 0 0 0 0 16" />
        </svg>
      );
    case "pin":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21s7-6.1 7-12a7 7 0 0 0-14 0c0 5.9 7 12 7 12Z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      );
    case "play":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="m10 8 6 4-6 4V8Z" />
        </svg>
      );
    case "prepare":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 4h8" />
          <path d="M9 2h6v4H9V2Z" />
          <path d="M6 5h12v16H6V5Z" />
          <path d="m9 13 2 2 4-5" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 5 6v5c0 4.6 3 7.8 7 10 4-2.2 7-5.4 7-10V6l-7-3Z" />
          <path d="m9 12 2 2 4-5" />
        </svg>
      );
    case "source":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4h10v16H7V4Z" />
          <path d="M9 8h6" />
          <path d="M9 12h6" />
          <path d="M9 16h4" />
        </svg>
      );
    case "user":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M5 21a7 7 0 0 1 14 0" />
        </svg>
      );
  }
}

function uniqueCitations(citations: SourceCitation[]) {
  const seen = new Set<string>();
  return citations.filter((citation) => {
    const key = `${citation.source_id}-${citation.url ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function domainLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function toneClass(tone: A2UITemplate["tone"]) {
  switch (tone) {
    case "success":
      return styles.templateSuccess;
    case "warning":
      return styles.templateWarning;
    case "danger":
      return styles.templateDanger;
    case "accent":
      return styles.templateAccent;
    case "source":
      return styles.templateSource;
    case "info":
      return styles.templateInfo;
    case "neutral":
      return styles.templateNeutral;
  }
}
