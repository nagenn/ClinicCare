import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { DoctorService } from '../../core/services/doctor.service';
import { LabTechService } from '../../core/services/lab-tech.service';
import { PatientService } from '../../core/services/patient.service';

@Component({
  selector: 'app-technician-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './technician-dashboard.component.html',
  styleUrl: './technician-dashboard.component.css',
})
export class TechnicianDashboardComponent implements OnInit {
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

  pendingCollection = computed(() => this.labTech.orders().filter((o) => o.status === 'placed'));

  inProgressOrders = computed(() => this.labTech.orders().filter((o) => o.status === 'processing'));

  samplesNeedingProcessing = computed(() =>
    this.labTech
      .orders()
      .flatMap((order) => order.order_tests.map((ot) => ({ order, orderTest: ot })))
      .filter((entry) => entry.orderTest.order_status === 'sample_collected'),
  );

  testsAwaitingResults = computed(() =>
    this.labTech
      .orders()
      .flatMap((order) => order.order_tests.map((ot) => ({ order, orderTest: ot })))
      .filter((entry) => entry.orderTest.order_status === 'in_progress'),
  );

  ngOnInit(): void {
    this.labTech.loadOrders();
    this.labTech.loadStats();
    this.doctorService.search(undefined, 'lab_technician');
    this.patientService.search();
  }

  onStaffChange(value: string): void {
    this.labTech.setStaffId(value ? Number(value) : null);
  }
}
