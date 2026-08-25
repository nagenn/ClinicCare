import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, finalize, of, tap } from 'rxjs';

import { API_BASE_URL } from '../config';
import { LabOrder, LabOrderCreate, LabTest, TestResult } from '../models/lab.model';

export interface LabOrderFilters {
  patient_id?: number;
  referral_id?: number;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class LabService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/labs`;

  tests = signal<LabTest[]>([]);
  orders = signal<LabOrder[]>([]);
  selectedOrder = signal<LabOrder | null>(null);
  results = signal<TestResult[]>([]);

  loading = signal(false);
  error = signal<string | null>(null);

  private handleError(message: string) {
    return (err: { error?: { detail?: string } }) => {
      this.error.set(err?.error?.detail ?? message);
      return of(null);
    };
  }

  loadTests(specialty?: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.http
      .get<LabTest[]>(`${this.base}/tests`, { params: specialty ? { specialty } : {} })
      .pipe(
        catchError((err) => {
          this.handleError('Failed to load test catalog.')(err);
          return of([] as LabTest[]);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((r) => this.tests.set(r ?? []));
  }

  loadOrders(filters: LabOrderFilters = {}): void {
    this.loading.set(true);
    this.error.set(null);
    let params = new HttpParams();
    if (filters.patient_id !== undefined) params = params.set('patient_id', filters.patient_id);
    if (filters.referral_id !== undefined) params = params.set('referral_id', filters.referral_id);
    if (filters.status) params = params.set('status', filters.status);

    this.http
      .get<LabOrder[]>(`${this.base}/orders`, { params })
      .pipe(
        catchError((err) => {
          this.handleError('Failed to load lab orders.')(err);
          return of([] as LabOrder[]);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((r) => this.orders.set(r ?? []));
  }

  refreshOrdersSilently(filters: LabOrderFilters = {}): void {
    let params = new HttpParams();
    if (filters.patient_id !== undefined) params = params.set('patient_id', filters.patient_id);
    if (filters.referral_id !== undefined) params = params.set('referral_id', filters.referral_id);
    if (filters.status) params = params.set('status', filters.status);

    this.http
      .get<LabOrder[]>(`${this.base}/orders`, { params })
      .pipe(catchError(() => of(null)))
      .subscribe((r) => {
        if (r) this.orders.set(r);
      });
  }

  loadOrder(orderId: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.http
      .get<LabOrder>(`${this.base}/orders/${orderId}`)
      .pipe(
        catchError((err) => {
          this.handleError('Failed to load lab order.')(err);
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((r) => this.selectedOrder.set(r));
  }

  loadResults(orderId: number): void {
    this.http
      .get<TestResult[]>(`${this.base}/orders/${orderId}/results`)
      .pipe(catchError(() => of([] as TestResult[])))
      .subscribe((r) => this.results.set(r ?? []));
  }

  createOrder(payload: LabOrderCreate) {
    return this.http.post<LabOrder>(`${this.base}/orders`, payload).pipe(
      tap((order) => this.orders.update((list) => [order, ...list])),
    );
  }

  reviewResult(resultId: number, reviewedBy: number) {
    return this.http
      .patch<TestResult>(`${this.base}/results/${resultId}/review`, { reviewed_by: reviewedBy })
      .pipe(
        tap((updated) =>
          this.results.update((list) =>
            list.map((r) => (r.result_id === updated.result_id ? updated : r)),
          ),
        ),
      );
  }
}
