import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { DoctorService } from '../../core/services/doctor.service';
import { LabTechService } from '../../core/services/lab-tech.service';
import { PatientService } from '../../core/services/patient.service';
import { LabOrder, LabSample } from '../../core/models/lab.model';
import { SampleLabelComponent } from './sample-label.component';

function nowForDateTimeLocal(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

@Component({
  selector: 'app-sample-tracker',
  standalone: true,
  imports: [FormsModule, DatePipe, SampleLabelComponent],
  templateUrl: './sample-tracker.component.html',
  styleUrl: './sample-tracker.component.css',
})
export class SampleTrackerComponent implements OnInit {
  labTech = inject(LabTechService);
  doctorService = inject(DoctorService);
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

  selectedOrderIds = signal<Set<number>>(new Set());
  modalOrderIds = signal<number[] | null>(null);
  collectionDateTime = signal<string>(nowForDateTimeLocal());
  collectedBy = signal<number | null>(null);
  notes = signal<string>('');
  submitting = signal<boolean>(false);
  formError = signal<string | null>(null);

  collectedSamples = signal<Map<number, LabSample>>(new Map());

  pendingOrders = computed(() => this.labTech.orders().filter((o) => o.status === 'placed'));
  alreadyCollectedOrders = computed(() =>
    this.labTech.orders().filter((o) => o.status !== 'placed' && o.status !== 'draft'),
  );

  ngOnInit(): void {
    this.labTech.loadOrders();
    this.doctorService.search(undefined, 'lab_technician');
    this.patientService.search();
    this.collectedBy.set(this.labTech.staffId());
  }

  isSelected(orderId: number): boolean {
    return this.selectedOrderIds().has(orderId);
  }

  toggleSelected(orderId: number): void {
    const next = new Set(this.selectedOrderIds());
    if (next.has(orderId)) {
      next.delete(orderId);
    } else {
      next.add(orderId);
    }
    this.selectedOrderIds.set(next);
  }

  toggleSelectAll(): void {
    const all = this.pendingOrders().map((o) => o.order_id);
    this.selectedOrderIds.set(this.selectedOrderIds().size === all.length ? new Set() : new Set(all));
  }

  openCollectModal(orderId: number): void {
    this.modalOrderIds.set([orderId]);
    this.resetForm();
  }

  openBulkCollectModal(): void {
    if (this.selectedOrderIds().size === 0) {
      return;
    }
    this.modalOrderIds.set(Array.from(this.selectedOrderIds()));
    this.resetForm();
  }

  private resetForm(): void {
    this.collectionDateTime.set(nowForDateTimeLocal());
    this.collectedBy.set(this.labTech.staffId());
    this.notes.set('');
    this.formError.set(null);
  }

  closeModal(): void {
    this.modalOrderIds.set(null);
  }

  submitCollection(): void {
    const orderIds = this.modalOrderIds();
    if (!orderIds) {
      return;
    }
    if (!this.collectedBy()) {
      this.formError.set('Please select who collected the sample.');
      return;
    }

    this.submitting.set(true);
    this.formError.set(null);

    const payload = {
      collection_date: new Date(this.collectionDateTime()).toISOString(),
      collected_by: this.collectedBy()!,
      notes: this.notes() || undefined,
    };

    forkJoin(orderIds.map((id) => this.labTech.collectSample(id, payload))).subscribe({
      next: (samples) => {
        const next = new Map(this.collectedSamples());
        samples.forEach((sample) => next.set(sample.order_id, sample));
        this.collectedSamples.set(next);
        this.selectedOrderIds.set(new Set());
        this.submitting.set(false);
        this.closeModal();
      },
      error: (err) => {
        this.formError.set(err?.error?.detail ?? 'Failed to record sample collection.');
        this.submitting.set(false);
      },
    });
  }

  orderById(orderId: number): LabOrder | undefined {
    return this.labTech.orders().find((o) => o.order_id === orderId);
  }

  sessionCollectedEntries(): { order: LabOrder; sample: LabSample }[] {
    const entries: { order: LabOrder; sample: LabSample }[] = [];
    for (const [orderId, sample] of this.collectedSamples()) {
      const order = this.orderById(orderId);
      if (order) {
        entries.push({ order, sample });
      }
    }
    return entries;
  }
}
