from google.adk.workflow import Workflow

from app.graph_workflow import (
    EXPECTED_GRAPH_NODE_NAMES,
    build_benefitbridge_workflow,
    graph_workflow_readiness_summary,
)


def test_benefitbridge_workflow_exposes_adk_workflow_topology() -> None:
    workflow = build_benefitbridge_workflow()

    assert isinstance(workflow, Workflow)
    assert workflow.name == "benefitbridge_statewide_graph"

    graph = workflow.graph
    assert graph is not None
    node_names = {node.name for node in graph.nodes}
    assert EXPECTED_GRAPH_NODE_NAMES.issubset(node_names)


def test_graph_workflow_readiness_summary_documents_safe_routes() -> None:
    summary = graph_workflow_readiness_summary()

    assert summary["workflow_name"] == "benefitbridge_statewide_graph"
    assert summary["node_count"] >= len(EXPECTED_GRAPH_NODE_NAMES)
    assert {
        "privacy_block",
        "safety_handoff",
        "jurisdiction_block",
        "statewide_core",
        "packet_ready",
    }.issubset(set(summary["routes"]))
    assert summary["streaming_mode"] == "disabled_for_graph_workflow"
