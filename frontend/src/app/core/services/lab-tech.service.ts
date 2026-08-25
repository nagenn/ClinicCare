import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { API_BASE_URL } from '../config';
import {
  CollectSamplePayload,
  LabOrder,
  LabOrderStatus,
  LabSample,
  LabStats,
  StatusHistoryEntry,
  SubmitResultPayload,
  TestResult,
  UpdateTestStatusPayload,
} from '../models/lab.model';

const STAFF_ID_KEY = 'cliniccare_lab_tech_staff_id';

@Injectable({ providedIn: 'root' })
export class LabTechService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/labs`;

  orders = signal<LabOrder[]>([]);
  stats = signal<LabStats | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  staffId = signal<number | null>(readStoredStaffId());

  private lastStatusFilter: LabOrderStatus | undefined;

  setStaffId(id: number | null): void {
    this.staffId.set(id);
    if (id === null) {
      localStorage.removeItem(STAFF_ID_KEY);
    } else {
      localStorage.setItem(STAFF_ID_KEY, String(id));
    }
  }

  loadOrders(status?: LabOrderStatus): void {
    this.lastStatusFilter = status;
    this.loading.set(true);
    this.error.set(null);
    this.http
      .get<LabOrder[]>(this.base + '/orders', { params: status ? { status } : {} })
      .subscribe({
        next: (orders) => {
          this.orders.set(orders);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.detail ?? 'Failed to load lab orders.');
          this.loading.set(false);
        },
      });
  }

  refresh(): void {
    this.loadOrders(this.lastStatusFilter);
  }

  collectSample(orderId: number, payload: CollectSamplePayload): Observable<LabSample> {
    return this.http
      .post<LabSample>(`${this.base}/orders/${orderId}/collect`, payload)
      .pipe(tap(() => this.refresh()));
  }

  updateTestStatus(orderId: number, testId: number, payload: UpdateTestStatusPayload): Observable<unknown> {
    return this.http
      .patch(`${this.base}/orders/${orderId}/tests/${testId}/status`, payload)
      .pipe(tap(() => this.refresh()));
  }

  submitResult(orderId: number, testId: number, payload: SubmitResultPayload): Observable<TestResult> {
    return this.http
      .post<TestResult>(`${this.base}/orders/${orderId}/tests/${testId}/result`, payload)
      .pipe(tap(() => this.refresh()));
  }

  getHistory(orderId: number): Observable<StatusHistoryEntry[]> {
    return this.http.get<StatusHistoryEntry[]>(`${this.base}/orders/${orderId}/history`);
  }

  loadStats(): void {
    this.http.get<LabStats>(`${this.base}/stats`).subscribe({
      next: (stats) => this.stats.set(stats),
      error: (err) => this.error.set(err?.error?.detail ?? 'Failed to load lab statistics.'),
    });
  }
}

function readStoredStaffId(): number | null {
  const raw = localStorage.getItem(STAFF_ID_KEY);
  return raw ? Number(raw) : null;
}
