from datetime import datetime

from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, Boolean, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from db import Base


class Test(Base):
    __tablename__ = "tests"

    test_id = Column(Integer, primary_key=True, index=True)
    test_code = Column(String, unique=True, nullable=False, index=True)
    test_name = Column(String, nullable=False, index=True)
    description = Column(String)
    sample_type = Column(String, nullable=False)
    processing_time_days = Column(Integer, default=1)
    normal_range_min = Column(Float, nullable=True)
    normal_range_max = Column(Float, nullable=True)
    unit = Column(String)
    specialty = Column(String, index=True)

    order_tests = relationship("OrderTest", back_populates="test", cascade="all, delete-orphan")


class LabOrder(Base):
    __tablename__ = "lab_orders"

    order_id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, nullable=False, index=True)
    referral_id = Column(Integer, nullable=True, index=True)
    ordered_by = Column(Integer, nullable=False)
    ordered_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    priority = Column(String, default="routine", nullable=False)
    clinical_indication = Column(String)
    status = Column(String, default="draft", nullable=False, index=True)

    order_tests = relationship("OrderTest", back_populates="lab_order", cascade="all, delete-orphan")
    samples = relationship("LabSample", back_populates="lab_order", cascade="all, delete-orphan")


class OrderTest(Base):
    __tablename__ = "order_tests"
    __table_args__ = (UniqueConstraint("order_id", "test_id", name="uq_order_tests_order_id_test_id"),)

    order_test_id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("lab_orders.order_id"), nullable=False, index=True)
    test_id = Column(Integer, ForeignKey("tests.test_id"), nullable=False, index=True)
    order_status = Column(String, default="ordered", nullable=False, index=True)

    lab_order = relationship("LabOrder", back_populates="order_tests")
    test = relationship("Test", back_populates="order_tests")
    results = relationship("TestResult", back_populates="order_test", cascade="all, delete-orphan")
    status_history = relationship("StatusHistory", back_populates="order_test", cascade="all, delete-orphan")


class LabSample(Base):
    __tablename__ = "lab_samples"

    sample_id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("lab_orders.order_id"), nullable=False, index=True)
    sample_type = Column(String, nullable=False)
    collection_date = Column(DateTime, nullable=True)
    collected_by = Column(Integer, nullable=True)
    sample_label = Column(String, unique=True, nullable=True)
    status = Column(String, default="pending", nullable=False, index=True)

    lab_order = relationship("LabOrder", back_populates="samples")


class TestResult(Base):
    __tablename__ = "test_results"

    result_id = Column(Integer, primary_key=True, index=True)
    order_test_id = Column(Integer, ForeignKey("order_tests.order_test_id"), nullable=False, index=True)
    result_value = Column(String, nullable=False)
    result_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    reviewed_date = Column(DateTime, nullable=True)
    reviewed_by = Column(Integer, nullable=True)
    is_abnormal = Column(Boolean, default=False)
    is_critical = Column(Boolean, default=False)
    notes = Column(Text)

    order_test = relationship("OrderTest", back_populates="results")


class StatusHistory(Base):
    __tablename__ = "status_history"

    history_id = Column(Integer, primary_key=True, index=True)
    order_test_id = Column(Integer, ForeignKey("order_tests.order_test_id"), nullable=False, index=True)
    old_status = Column(String)
    new_status = Column(String, nullable=False)
    changed_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    changed_by = Column(Integer, nullable=True)

    order_test = relationship("OrderTest", back_populates="status_history")
