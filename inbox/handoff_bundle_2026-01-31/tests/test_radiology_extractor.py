from analyze_radiology_terms import is_radiology_term


def test_ct_boundary():
    assert is_radiology_term("CT scan", "TC")
    assert not is_radiology_term("Act now", "Aja agora")


def test_stopword_excluded():
    assert not is_radiology_term("and", "e")
