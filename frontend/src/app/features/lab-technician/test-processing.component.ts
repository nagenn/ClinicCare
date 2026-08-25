import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { LabTechService } from '../../core/services/lab-tech.service';
import { PatientService } from '../../core/services/patient.service';
import { LabOrder, OrderTest } from '../../core/models/lab.model';
import { ResultEntryComponent } from './result-entry.component';

interface OrderTestEntry {
  order: LabOrder;
  orderTest: OrderTest;
}

@Component({
  selector: 'app-test-processing',
  standalone: true,
  imports: [ResultEntryComponent],
  templateUrl: './test-processing.component.html',
  styleUrl: './test-processing.component.css',
})
export class TestProcessingComponent implements OnInit {
  labTech = inject(LabTechService);
  private patientService = inject(PatientService);

  private patientNames = computed(() => {
    const map = new Map<number, string>();
    for (const p of this.patientService.patients()) {
      map.set(p.PatientId, p.Name);
    }
    return map;
  });

  patientName(id: number): string {
    return this.patientNames().get(id) ?? `Patient #${id}`;
  }

  selectedTestIds = signal<Set<number>>(new Set());
  resultEntryTarget = signal<OrderTestEntry | null>(null);
  actionError = signal<string | null>(null);
  processingIds = signal<Set<number>>(new Set());

  readyToStart = computed<OrderTestEntry[]>(() =>
    this.labTech
      .orders()
      .flatMap((order) => order.order_tests.map((orderTest) => ({ order, orderTest })))
      .filter((entry) => entry.orderTest.order_status === 'sample_collected'),
  );

  inProgress = computed<OrderTestEntry[]>(() =>
    this.labTech
      .orders()
      .flatMap((order) => order.order_tests.map((orderTest) => ({ order, orderTest })))
      .filter((entry) => entry.orderTest.order_status === 'in_progress'),
  );

  ngOnInit(): void {
    this.labTech.loadOrders();
    this.patientService.search();
  }

  orderProgress(order: LabOrder): string {
    const done = order.order_tests.filter((t) => t.order_status === 'completed').length;
    return `${done} of ${order.order_tests.length} tests completed`;
  }

  isSelected(orderTestId: number): boolean {
    return this.selectedTestIds().has(orderTestId);
  }

  toggleSelected(orderTestId: number): void {
    const next = new Set(this.selectedTestIds());
    if (next.has(orderTestId)) {
      next.delete(orderTestId);
    } else {
      next.add(orderTestId);
    }
    this.selectedTestIds.set(next);
  }

  toggleSelectAll(): void {
    const all = this.readyToStart().map((e) => e.orderTest.order_test_id);
    this.selectedTestIds.set(this.selectedTestIds().size === all.length ? new Set() : new Set(all));
  }

  startProcessing(entry: OrderTestEntry): void {
    this.runStatusUpdate([entry]);
  }

  startSelected(): void {
    const selected = this.readyToStart().filter((e) => this.selectedTestIds().has(e.orderTest.order_test_id));
    if (selected.length === 0) {
      return;
    }
    this.runStatusUpdate(selected);
  }

  private runStatusUpdate(entries: OrderTestEntry[]): void {
    if (!this.labTech.staffId()) {
      this.actionError.set('Select "Acting as" technician on the dashboard before processing tests.');
      return;
    }
    this.actionError.set(null);
    const ids = new Set(this.processingIds());
    entries.forEach((e) => ids.add(e.orderTest.order_test_id));
    this.processingIds.set(ids);

    forkJoin(
      entries.map((e) =>
        this.labTech.updateTestStatus(e.order.order_id, e.orderTest.test_id, {
          new_status: 'in_progress',
          changed_by: this.labTech.staffId()!,
        }),
      ),
    ).subscribe({
      next: () => {
        this.selectedTestIds.set(new Set());
        this.clearProcessing(entries);
      },
      error: (err) => {
        this.actionError.set(err?.error?.detail ?? 'Failed to update test status.');
        this.clearProcessing(entries);
      },
    });
  }

  private clearProcessing(entries: OrderTestEntry[]): void {
    const ids = new Set(this.processingIds());
    entries.forEach((e) => ids.delete(e.orderTest.order_test_id));
    this.processingIds.set(ids);
  }

  openResultEntry(entry: OrderTestEntry): void {
    this.resultEntryTarget.set(entry);
  }

  closeResultEntry(): void {
    this.resultEntryTarget.set(null);
  }

  onResultSubmitted(): void {
    this.resultEntryTarget.set(null);
  }
}
