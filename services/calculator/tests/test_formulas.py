import pytest
from ..formulas import (
    calculate_resistive_index,
    calculate_adrenal_absolute_washout,
    grade_hepatic_steatosis_ct,
    calculate_ankle_brachial_index,
    calculate_nascet_stenosis,
    calculate_stone_skin_distance_mean,
    classify_nodule_fleischner_2017,
    measure_bile_duct_diameter,
)


def test_calculate_resistive_index():
    result = calculate_resistive_index(100, 30)
    assert result["value"] == 0.7
    assert "Borderline" in result["category"]


def test_calculate_adrenal_absolute_washout():
    result = calculate_adrenal_absolute_washout(10, 100, 40)
    assert result["value"] == 66.7
    assert result["category"] == "Adenoma"


def test_grade_hepatic_steatosis_ct():
    result = grade_hepatic_steatosis_ct(30, 50)
    assert result["value"] == -20.0
    assert result["category"] == "Esteatose moderada"


def test_calculate_ankle_brachial_index():
    result = calculate_ankle_brachial_index(90, 100)
    assert result["value"] == 0.9
    assert result["category"] == "PAD leve-moderada"


def test_calculate_nascet_stenosis():
    result = calculate_nascet_stenosis(2, 4)
    assert result["value"] == 50.0
    assert "moderada" in result["category"]


def test_calculate_stone_skin_distance_mean():
    result = calculate_stone_skin_distance_mean(100, 110, 90)
    assert result["value"] == 100.0


def test_classify_nodule_fleischner_2017():
    result = classify_nodule_fleischner_2017(5, "solido", "baixo")
    assert result["value"] == "Follow-up 12 meses"


def test_measure_bile_duct_diameter():
    result = measure_bile_duct_diameter(8)
    assert result["value"] == 8.0
    assert result["category"] == "Dilatado leve"
