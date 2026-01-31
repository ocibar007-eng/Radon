from pathlib import Path

from vocabulary_gate import VocabularyGate


def test_lookup_ok():
    gate = VocabularyGate(dictionary_path="dist/dictionary_full.csv", log_path="/tmp/needs_review_hits.jsonl")
    res = gate.lookup("anechoic")
    assert res.status == "ok"
    assert res.term_out == "anecóico"


def test_lookup_keep_en():
    gate = VocabularyGate(dictionary_path="dist/dictionary_full.csv", log_path="/tmp/needs_review_hits.jsonl")
    res = gate.lookup("11-dehydrocorticosterone")
    assert res.status == "keep_en"
    assert res.term_out == "11-dehydrocorticosterone"


def test_lookup_needs_review_no_invent():
    gate = VocabularyGate(dictionary_path="dist/dictionary_full.csv", log_path="/tmp/needs_review_hits.jsonl")
    res = gate.lookup("chip")
    assert res.status == "needs_review"
    assert res.term_out.lower() == "chip"


def test_lookup_variants_hyphen_space():
    gate = VocabularyGate(dictionary_path="dist/dictionary_full.csv", log_path="/tmp/needs_review_hits.jsonl")
    res = gate.lookup("11 dehydrocorticosterone")
    assert res.status == "keep_en"


def test_needs_review_log_written(tmp_path):
    log_path = tmp_path / "needs_review_hits.jsonl"
    gate = VocabularyGate(dictionary_path="dist/dictionary_full.csv", log_path=log_path)
    rewritten, report = gate.validate_and_rewrite(["chip"])
    assert log_path.exists()
    content = log_path.read_text(encoding="utf-8")
    assert "chip" in content
