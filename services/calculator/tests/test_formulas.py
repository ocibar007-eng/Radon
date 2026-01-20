import pytest
from ..formulas import *

def test_volume_ellipsoid():
    assert volume_ellipsoid(5, 4, 3) == 31.2  # 0.52 * 5 * 4 * 3

def test_resistive_index():
    assert resistive_index(100, 30) == 0.7
    assert resistive_index(0, 30) is None  # divisao por zero

def test_adrenal_washout_abs():
    # Pre=10, Portal=100, Delayed=40 -> 66.7%
    result = adrenal_washout_abs(10, 100, 40)
    assert result == 66.7

def test_steatosis_grade():
    assert steatosis_grade(30, 50) == "moderada a acentuada"
    assert steatosis_grade(45, 50) == "leve"
    assert steatosis_grade(55, 50) == "ausente"

def test_percent_change():
    assert percent_change(15, 10) == 50.0  # +50%
    assert percent_change(8, 10) == -20.0  # -20%

def test_sum_target_lesions():
    assert sum_target_lesions([10.0, 15.5, 8.3]) == 33.8
