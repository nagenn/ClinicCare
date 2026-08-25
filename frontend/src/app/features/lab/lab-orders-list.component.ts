import { SlicePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { DoctorService } from '../../core/services/doctor.service';
import { LabService } from '../../core/services/lab.service';
import { PatientService } from '../../core/services/patient.service';
import { LabOrderStatus } from '../../core/models/lab.model';

const STATUS_FILTERS: (LabOrderStatus | 'All')[] = [
  'All',
  'draft',
  'placed',
  'collected',
  'processing',
  'completed',
];

const POLL_INTERVAL_MS = 30000;

@Component({
  selector: 'app-lab-orders-list',
  standalone: true,
  imports: [RouterLink, SlicePipe],
  templateUrl: './lab-orders-list.component.html',
  styleUrl: './lab-orders-list.component.css',
})
export class LabOrdersListComponent implements OnInit, OnDestroy {
  labService = inject(LabService);
  private patientService = inject(PatientService);
  private doctorService = inject(DoctorService);
  private route = inject(ActivatedRoute);

  statusFilters = STATUS_FILTERS;
  activeFilter = signal<LabOrderStatus | 'All'>('All');
  private pollHandle: ReturnType<typeof setInterval> | undefined;

  patientId = toSignal(
    this.route.queryParamMap.pipe(map((p) => (p.get('patientId') ? Number(p.get('patientId')) : undefined))),
    { initialValue: undefined },
  );

  referralId = toSignal(
    this.route.queryParamMap.pipe(map((p) => (p.get('referralId') ? Number(p.get('referralId')) : undefined))),
    { initialValue: undefined },
  );

  private patientNames = computed(() => {
    const map = new Map<number, string>();
    for (const p of this.patientService.patients()) {
      map.set(p.PatientId, p.Name);
    }
    return map;
  });

  filteredOrders = computed(() => {
    const filter = this.activeFilter();
    const all = this.labService.orders();
    return filter === 'All' ? all : all.filter((o) => o.status === filter);
  });

  hasActiveOrders = computed(() =>
    this.labService.orders().some((o) => o.status !== 'completed'),
  );

  ngOnInit(): void {
    this.patientService.search();
    this.doctorService.search();
    this.reload();

    this.pollHandle = setInterval(() => {
      if (this.hasActiveOrders()) {
        this.labService.refreshOrdersSilently({
          patient_id: this.patientId(),
          referral_id: this.referralId(),
        });
      }
    }, POLL_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (this.pollHandle !== undefined) {
      clearInterval(this.pollHandle);
    }
  }

  private reload(): void {
    this.labService.loadOrders({ patient_id: this.patientId(), referral_id: this.referralId() });
  }

  patientName(id: number): string {
    return this.patientNames().get(id) ?? `Patient #${id}`;
  }

  setFilter(status: LabOrderStatus | 'All'): void {
    this.activeFilter.set(status);
  }
}
