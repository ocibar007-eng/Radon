from pathlib import Path

from medical_translation_pipeline import (
    translate_term,
    load_overrides,
    load_generic_terms,
)


class DummyDeCSClient:
    def __init__(self, result=None):
        self.result = result
        self.calls = []

    def search_term(self, term):
        self.calls.append(term)
        return self.result


def _load_overrides():
    root = Path(__file__).resolve().parents[1]
    return load_overrides([root / "radiology_gold.csv", root / "overrides.csv"])


def test_override_priority_anecoic():
    overrides = _load_overrides()
    rec = translate_term(
        "anechoic",
        1,
        decs_client=None,
        overrides=overrides,
        generic_terms=set(),
        no_decs=True,
    )
    assert rec.term_pt == "anecóico"
    assert rec.status == "ok"
    assert rec.sources[0].startswith("override")


def test_gold_neuroradiology_and_scintigraphy():
    overrides = _load_overrides()
    rec1 = translate_term(
        "neuroradiology",
        1,
        decs_client=None,
        overrides=overrides,
        generic_terms=set(),
        no_decs=True,
    )
    rec2 = translate_term(
        "scintigraphy",
        2,
        decs_client=None,
        overrides=overrides,
        generic_terms=set(),
        no_decs=True,
    )
    assert rec1.term_pt == "neurorradiologia"
    assert rec1.status == "ok"
    assert rec2.term_pt == "cintilografia"
    assert rec2.status == "ok"


def test_no_false_ok_when_same():
    overrides = _load_overrides()
    rec = translate_term(
        "axial",
        1,
        decs_client=None,
        overrides=overrides,
        generic_terms=set(),
        no_decs=True,
    )
    assert rec.term_pt.lower() == rec.term_en.lower()
    assert rec.status != "ok"


def test_decs_called_when_local_ambiguous():
    dummy = DummyDeCSClient(result="varredura cerebral")
    rec = translate_term(
        "brain scan",
        1,
        decs_client=dummy,
        overrides={},
        generic_terms=set(),
        no_decs=False,
    )
    assert dummy.calls == ["brain scan"]
    assert rec.term_pt == "varredura cerebral"
    assert rec.status == "ok"


def test_decs_not_called_for_abbr():
    dummy = DummyDeCSClient(result="should_not_be_used")
    rec = translate_term(
        "ABCD",
        1,
        decs_client=dummy,
        overrides={},
        generic_terms=set(),
        no_decs=False,
    )
    assert dummy.calls == []
    assert rec.status == "keep_en"


def test_urethrocystitis_needs_review_if_only_suffix():
    rec = translate_term(
        "urethrocystitis",
        1,
        decs_client=None,
        overrides={},
        generic_terms=set(),
        no_decs=True,
    )
    assert rec.status in {"needs_review", "ambiguous"}
