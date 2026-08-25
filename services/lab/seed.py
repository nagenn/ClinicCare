from sqlalchemy.orm import Session

from models import Test

SEED_TESTS = [
    # Hematology
    dict(test_code="CBC", test_name="Complete Blood Count", specialty="Hematology", sample_type="blood", processing_time_days=1),
    dict(test_code="WBC", test_name="White Blood Cell Count", specialty="Hematology", sample_type="blood", normal_range_min=4.5, normal_range_max=11.0, unit="K/uL"),
    dict(test_code="RBC", test_name="Red Blood Cell Count", specialty="Hematology", sample_type="blood", normal_range_min=4.5, normal_range_max=5.9, unit="M/uL"),
    dict(test_code="HGB", test_name="Hemoglobin", specialty="Hematology", sample_type="blood", normal_range_min=12.0, normal_range_max=17.5, unit="g/dL"),
    dict(test_code="HCT", test_name="Hematocrit", specialty="Hematology", sample_type="blood", normal_range_min=36.0, normal_range_max=46.0, unit="%"),
    dict(test_code="PLT", test_name="Platelet Count", specialty="Hematology", sample_type="blood", normal_range_min=150, normal_range_max=400, unit="K/uL"),

    # Chemistry
    dict(test_code="GLU", test_name="Glucose", specialty="Chemistry", sample_type="blood", normal_range_min=70, normal_range_max=100, unit="mg/dL"),
    dict(test_code="BUN", test_name="Blood Urea Nitrogen", specialty="Chemistry", sample_type="blood", normal_range_min=7, normal_range_max=20, unit="mg/dL"),
    dict(test_code="CRE", test_name="Creatinine", specialty="Chemistry", sample_type="blood", normal_range_min=0.7, normal_range_max=1.3, unit="mg/dL"),
    dict(test_code="NA", test_name="Sodium", specialty="Chemistry", sample_type="blood", normal_range_min=135, normal_range_max=145, unit="mEq/L"),
    dict(test_code="K", test_name="Potassium", specialty="Chemistry", sample_type="blood", normal_range_min=3.5, normal_range_max=5.0, unit="mEq/L"),
    dict(test_code="CL", test_name="Chloride", specialty="Chemistry", sample_type="blood", normal_range_min=98, normal_range_max=107, unit="mEq/L"),
    dict(test_code="CO2", test_name="Carbon Dioxide", specialty="Chemistry", sample_type="blood", normal_range_min=23, normal_range_max=29, unit="mEq/L"),
    dict(test_code="ALB", test_name="Albumin", specialty="Chemistry", sample_type="blood", normal_range_min=3.4, normal_range_max=5.4, unit="g/dL"),
    dict(test_code="TP", test_name="Total Protein", specialty="Chemistry", sample_type="blood", normal_range_min=6.0, normal_range_max=8.3, unit="g/dL"),

    # Liver Function
    dict(test_code="ALT", test_name="Alanine Aminotransferase", specialty="Liver Function", sample_type="blood", normal_range_min=7, normal_range_max=56, unit="U/L"),
    dict(test_code="AST", test_name="Aspartate Aminotransferase", specialty="Liver Function", sample_type="blood", normal_range_min=10, normal_range_max=40, unit="U/L"),
    dict(test_code="ALP", test_name="Alkaline Phosphatase", specialty="Liver Function", sample_type="blood", normal_range_min=44, normal_range_max=147, unit="U/L"),
    dict(test_code="BIL", test_name="Bilirubin Total", specialty="Liver Function", sample_type="blood", normal_range_min=0.1, normal_range_max=1.2, unit="mg/dL"),

    # Lipids
    dict(test_code="CHOL", test_name="Total Cholesterol", specialty="Cardiology", sample_type="blood", normal_range_min=0, normal_range_max=200, unit="mg/dL"),
    dict(test_code="LDL", test_name="LDL Cholesterol", specialty="Cardiology", sample_type="blood", normal_range_min=0, normal_range_max=100, unit="mg/dL"),
    dict(test_code="HDL", test_name="HDL Cholesterol", specialty="Cardiology", sample_type="blood", normal_range_min=40, normal_range_max=200, unit="mg/dL"),
    dict(test_code="TRIG", test_name="Triglycerides", specialty="Cardiology", sample_type="blood", normal_range_min=0, normal_range_max=150, unit="mg/dL"),

    # Thyroid
    dict(test_code="TSH", test_name="Thyroid Stimulating Hormone", specialty="Endocrinology", sample_type="blood", normal_range_min=0.4, normal_range_max=4.0, unit="mIU/L"),
    dict(test_code="T3", test_name="Triiodothyronine", specialty="Endocrinology", sample_type="blood", normal_range_min=80, normal_range_max=200, unit="ng/dL"),
    dict(test_code="T4", test_name="Thyroxine", specialty="Endocrinology", sample_type="blood", normal_range_min=4.5, normal_range_max=12.0, unit="mcg/dL"),

    # Urinalysis
    dict(test_code="UA", test_name="Urinalysis", specialty="Urology", sample_type="urine", processing_time_days=1),
]


def seed_if_empty(db: Session) -> None:
    if db.query(Test).count() > 0:
        return
    for test_data in SEED_TESTS:
        test = Test(**test_data)
        db.add(test)
    db.commit()
