export type LabOrderPriority = 'routine' | 'stat';
export type LabOrderStatus = 'draft' | 'placed' | 'collected' | 'processing' | 'completed';
export type OrderTestStatus = 'ordered' | 'sample_collected' | 'in_progress' | 'completed';
export type SampleStatus = 'pending' | 'collected' | 'processed';

export interface LabTest {
  test_id: number;
  test_code: string;
  test_name: string;
  description?: string | null;
  sample_type: string;
  processing_time_days: number;
  normal_range_min?: number | null;
  normal_range_max?: number | null;
  unit?: string | null;
  specialty?: string | null;
}

export interface OrderTest {
  order_test_id: number;
  order_id: number;
  test_id: number;
  order_status: OrderTestStatus;
  test: LabTest;
}

export interface LabOrder {
  order_id: number;
  patient_id: number;
  referral_id?: number | null;
  ordered_by: number;
  ordered_date: string;
  priority: LabOrderPriority;
  clinical_indication?: string | null;
  status: LabOrderStatus;
  order_tests: OrderTest[];
}

export interface LabOrderCreate {
  patient_id: number;
  referral_id?: number | null;
  ordered_by: number;
  priority: LabOrderPriority;
  clinical_indication?: string;
  test_ids: number[];
}

export interface LabSample {
  sample_id: number;
  order_id: number;
  sample_type: string;
  collection_date: string | null;
  collected_by: number | null;
  sample_label: string | null;
  status: SampleStatus;
}

export interface TestResult {
  result_id: number;
  order_test_id: number;
  result_value: string;
  result_date: string;
  reviewed_date?: string | null;
  reviewed_by?: number | null;
  is_abnormal: boolean;
  is_critical: boolean;
  notes?: string | null;
}

export interface StatusHistoryEntry {
  history_id: number;
  order_test_id: number;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  changed_by: number | null;
}

export interface CollectSamplePayload {
  collection_date: string;
  collected_by: number;
  notes?: string;
}

export interface UpdateTestStatusPayload {
  new_status: OrderTestStatus;
  changed_by: number;
}

export interface SubmitResultPayload {
  result_value: string;
  notes?: string;
  is_abnormal?: boolean;
  is_critical?: boolean;
  submitted_by?: number;
}

export interface LabStats {
  orders: {
    total: number;
    by_status: Record<string, number>;
  };
  tests: {
    catalog_total: number;
    by_status: Record<string, number>;
  };
  results: {
    total: number;
    abnormal: number;
    critical: number;
    reviewed: number;
  };
}
