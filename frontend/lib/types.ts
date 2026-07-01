export type Language = "en" | "es";

export type HouseholdSnapshotInput = {
  language: Language;
  location_text: string;
  household_size?: number;
  adults?: number;
  children_ages: number[];
  needs: string[];
  income_range_monthly?: string;
  housing_status: string;
  utilities_need: boolean;
  food_need_today: boolean;
  safety_sensitive: boolean;
};

export type SourceCitation = {
  source_id: string;
  source_title?: string;
  agency_owner?: string;
  source_type?: string;
  url?: string;
  last_checked?: string;
  freshness_state?: string;
};

export type BenefitPath = {
  area: string;
  program_name: string;
  status_label: string;
  why_this_is_relevant: string[];
  missing_facts: string[];
  documents_to_prepare: string[];
  source_citations: SourceCitation[];
  warnings: string[];
  official_links: string[];
  agency_contacts: string[];
};

export type PrepPacket = {
  household_snapshot_summary: string;
  potential_benefit_paths: BenefitPath[];
  missing_answers: string[];
  document_checklist: string[];
  caseworker_questions: string[];
  call_script: string;
  safety_notice: string;
  source_citations: SourceCitation[];
  user_language: Language;
  immediate_help_notes: string[];
  generated_at?: string;
};

export type PrepareResult = {
  route: string;
  message?: string;
  events: string[];
  packet?: PrepPacket;
  validation?: {
    pass: boolean;
    failures: string[];
    blocking_failures: string[];
  };
  jurisdiction?: Record<string, unknown>;
  redaction?: {
    findings: string[];
    blocked: boolean;
  };
};

export type ReadinessResult = {
  app: Record<string, unknown>;
  source_pack: Record<string, unknown>;
  evals: {
    datasets?: Record<string, number>;
    latest_grade_summary?: {
      present: boolean;
      file?: string;
      metrics?: Array<{
        metric_name: string;
        mean_score: number | null;
        score_status?: string;
      }>;
      out_of_range_scores?: number;
    };
    metric_config?: string;
  };
  integrations: Array<{
    name: string;
    enabled: boolean;
    available: boolean;
    mode: string;
    notes: string[];
  }>;
  release_gates: Record<string, unknown>;
};

export type LocalResource = {
  id: string;
  organization: string;
  service_name: string;
  service_type: string;
  jurisdiction: string;
  phone?: string;
  url?: string;
  address?: string;
  hours?: string;
  map_query?: string;
  maps_url?: string;
  place_id?: string;
  languages: string[];
  call_before_going: boolean;
  availability_notice?: string;
};

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type A2UILink = {
  label: string;
  href: string;
};

export type A2UIItem = {
  label?: string;
  value?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  badges?: string[];
  links?: A2UILink[];
};

export type A2UITemplate = {
  id: string;
  type: string;
  title: string;
  tone: "neutral" | "info" | "success" | "warning" | "danger" | "accent" | "source";
  subtitle?: string;
  body?: string;
  items: A2UIItem[];
  actions: A2UILink[];
  citations: SourceCitation[];
};

export type ChatResponse = {
  route: string;
  message: string;
  events: string[];
  snapshot: HouseholdSnapshotInput;
  snapshot_patch: Partial<HouseholdSnapshotInput>;
  next_questions: string[];
  ui_templates: A2UITemplate[];
  packet?: PrepPacket;
  resources?: LocalResource[];
  validation?: PrepareResult["validation"];
  redaction?: {
    findings: string[];
    blocked: boolean;
  };
};

export type SyntheticProfile = {
  id: string;
  label: string;
  summary: string;
  userText: string;
  snapshot: HouseholdSnapshotInput;
};
