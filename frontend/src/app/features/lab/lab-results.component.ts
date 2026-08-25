import { SlicePipe } from '@angular/common';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { DoctorService } from '../../core/services/doctor.service';
import { LabService } from '../../core/services/lab.service';
import { PatientService } from '../../core/services/patient.service';
import { OrderTest, TestResult } from '../../core/models/lab.model';

@Component({
  selector: 'app-lab-results',
  standalone: true,
  imports: [RouterLink, FormsModule, SlicePipe],
  templateUrl: './lab-results.component.html',
  styleUrl: './lab-results.component.css',
})
export class LabResultsComponent implements OnInit {
  labService = inject(LabService);
  patientService = inject(PatientService);
  doctorService = inject(DoctorService);
  private route = inject(ActivatedRoute);

  reviewerId = signal(0);
  reviewError = signal<string | null>(null);

  orderId = toSignal(
    this.route.paramMap.pipe(map((params) => Number(params.get('id')))),
    { initialValue: 0 },
  );

  patientName = computed(() => {
    const order = this.labService.selectedOrder();
    if (!order) return '';
    const p = this.patientService.patients().find((x) => x.PatientId === order.patient_id);
    return p?.Name ?? `Patient #${order.patient_id}`;
  });

  resultByOrderTestId = computed(() => {
    const map = new Map<number, TestResult>();
    for (const r of this.labService.results()) {
      map.set(r.order_test_id, r);
    }
    return map;
  });

  constructor() {
    effect(() => {
      const id = this.orderId();
      if (id) {
        this.labService.loadOrder(id);
        this.labService.loadResults(id);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.patientService.search();
    this.doctorService.search();
  }

  resultFor(orderTest: OrderTest): TestResult | undefined {
    return this.resultByOrderTestId().get(orderTest.order_test_id);
  }

  rangeLabel(orderTest: OrderTest): string {
    const { normal_range_min, normal_range_max, unit } = orderTest.test;
    if (normal_range_min == null && normal_range_max == null) return '—';
    return `${normal_range_min ?? '?'} – ${normal_range_max ?? '?'} ${unit ?? ''}`.trim();
  }

  markReviewed(result: TestResult): void {
    this.reviewError.set(null);
    if (!this.reviewerId()) {
      this.reviewError.set('Select a reviewing doctor first.');
      return;
    }
    this.labService.reviewResult(result.result_id, this.reviewerId()).subscribe({
      error: (err) => this.reviewError.set(err?.error?.detail ?? 'Failed to mark result as reviewed.'),
    });
  }

  print(): void {
    window.print();
  }
}
