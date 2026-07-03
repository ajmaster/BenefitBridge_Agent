"""ADK 2.0 Workflow topology for the deterministic AidAtlasCA graph."""

from __future__ import annotations

from google.adk.workflow import Edge, FunctionNode, START, Workflow

EXPECTED_GRAPH_NODE_NAMES: set[str] = {
    "consent_privacy",
    "language",
    "safety_triage",
    "jurisdiction",
    "household_snapshot",
    "needs_classifier",
    "official_source_retrieval",
    "benefit_path_matcher",
    "missing_facts",
    "document_checklist",
    "agency_contact",
    "safety_and_grounding_critic",
    "a2ui_shaper",
    "translation",
    "export_prep_packet",
    "eval_telemetry",
}

SAFE_ROUTE_NAMES: tuple[str, ...] = (
    "privacy_block",
    "safety_handoff",
    "jurisdiction_block",
    "statewide_core",
    "packet_ready",
)


def _node_output() -> None:
    """No-op node body used to expose ADK Workflow topology safely."""

    return None


def _node(name: str) -> FunctionNode:
    return FunctionNode(func=_node_output, name=name)


def build_benefitbridge_workflow() -> Workflow:
    """Build the explicit ADK Workflow graph around the deterministic runtime."""

    consent_privacy = _node("consent_privacy")
    language = _node("language")
    safety_triage = _node("safety_triage")
    jurisdiction = _node("jurisdiction")
    household_snapshot = _node("household_snapshot")
    needs_classifier = _node("needs_classifier")
    official_source_retrieval = _node("official_source_retrieval")
    benefit_path_matcher = _node("benefit_path_matcher")
    missing_facts = _node("missing_facts")
    document_checklist = _node("document_checklist")
    agency_contact = _node("agency_contact")
    critic = _node("safety_and_grounding_critic")
    a2ui_shaper = _node("a2ui_shaper")
    translation = _node("translation")
    export_prep_packet = _node("export_prep_packet")
    eval_telemetry = _node("eval_telemetry")

    return Workflow(
        name="benefitbridge_statewide_graph",
        description=(
            "Explicit ADK 2.0 graph topology for AidAtlasCA. Runtime packet "
            "generation remains delegated to run_benefitbridge_graph."
        ),
        edges=[
            (START, consent_privacy),
            Edge(from_node=consent_privacy, to_node=language),
            Edge(from_node=language, to_node=safety_triage),
            Edge(from_node=safety_triage, to_node=jurisdiction),
            Edge(from_node=jurisdiction, to_node=household_snapshot),
            Edge(from_node=household_snapshot, to_node=needs_classifier),
            Edge(from_node=needs_classifier, to_node=official_source_retrieval),
            Edge(from_node=official_source_retrieval, to_node=benefit_path_matcher),
            Edge(from_node=benefit_path_matcher, to_node=missing_facts),
            Edge(from_node=missing_facts, to_node=document_checklist),
            Edge(from_node=document_checklist, to_node=agency_contact),
            Edge(from_node=agency_contact, to_node=critic),
            Edge(from_node=critic, to_node=a2ui_shaper),
            Edge(from_node=a2ui_shaper, to_node=translation),
            Edge(from_node=translation, to_node=export_prep_packet),
            Edge(from_node=export_prep_packet, to_node=eval_telemetry),
        ],
    )


def graph_workflow_readiness_summary() -> dict[str, Any]:
    """Expose graph topology and safe routes for readiness and eval gates."""

    workflow = build_benefitbridge_workflow()
    node_names = sorted(node.name for node in (workflow.graph.nodes if workflow.graph else []))
    return {
        "workflow_name": workflow.name,
        "node_count": len(node_names),
        "nodes": node_names,
        "routes": list(SAFE_ROUTE_NAMES),
        "runtime_contract": "run_benefitbridge_graph",
        "streaming_mode": "disabled_for_graph_workflow",
    }
