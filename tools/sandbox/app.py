import json
import uuid

import streamlit as st

st.set_page_config(page_title="Radon Sandbox", layout="wide")
st.title("Sandbox - Radon V3 Multi-Agent")

# Sidebar status
with st.sidebar:
    st.header("Status")
    st.metric("Calculator", "Unknown")
    st.metric("Golden Set", "10 cases")

    st.divider()
    st.markdown("**Shortcuts:**")
    st.code("./scripts/run_sandbox.sh", language="bash")
    st.code("./scripts/export_metrics_csv.sh", language="bash")

# Main columns
col1, col2 = st.columns(2)

with col1:
    st.header("1. Input")

    input_type = st.radio("Input type:", ["Paste text", "Upload JSON"])

    if input_type == "Paste text":
        raw_input = st.text_area(
            "Paste dictation/input:",
            height=300,
            placeholder="Paste dictation, OCR, or clinical data...",
        )
    else:
        uploaded = st.file_uploader("Upload JSON (CaseBundle)", type=["json"])
        if uploaded:
            raw_input = uploaded.read().decode()
            try:
                st.json(json.loads(raw_input))
            except json.JSONDecodeError:
                st.warning("Invalid JSON")
        else:
            raw_input = ""

    run_button = st.button("Run Pipeline", type="primary", use_container_width=True)

with col2:
    st.header("2. Output")

    if run_button and raw_input.strip():
        with st.spinner("Processing..."):
            # TODO: Integrate orchestrator
            st.info("Pipeline not integrated yet. Connect orchestrator here.")

            result = {
                "case_id": str(uuid.uuid4())[:8],
                "qa_passed": True,
                "risk_score": "S3",
                "latency_ms": 2500,
            }

            st.success(f"Processed in {result['latency_ms']}ms")
            st.metric("QA", "Passed" if result["qa_passed"] else "Failed")
            st.metric("Risk", result["risk_score"])

            st.markdown("### Generated Report")
            st.text_area("Markdown:", value="[Report will appear here]", height=200, disabled=True)

    elif run_button:
        st.warning("Provide input first.")

# Evaluation section
st.divider()
st.header("3. Review")

eval_col1, eval_col2 = st.columns([1, 2])

with eval_col1:
    rating = st.slider("Score (0-10):", 0, 10, 8)

    tags = st.multiselect(
        "Error tags (if any):",
        ["meta_text", "laterality", "measurement", "calculation", "terminology", "omission", "hallucination"],
    )

with eval_col2:
    correction = st.text_area(
        "Manual correction (if needed):",
        height=150,
        placeholder="Paste corrected report if you had to fix anything...",
    )

approve_col, reject_col = st.columns(2)

with approve_col:
    if st.button("Approve", type="primary", use_container_width=True):
        st.success(f"Approved with score {rating}!")
        # TODO: Save to SQLite

with reject_col:
    if st.button("Reject", type="secondary", use_container_width=True):
        st.error("Rejected. Feedback saved.")
        # TODO: Save to SQLite with feedback

st.divider()
st.caption("Radon V3 Multi-Agent System | Sandbox")
