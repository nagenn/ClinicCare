import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import { DoctorService } from '../../core/services/doctor.service';
import { LabService } from '../../core/services/lab.service';
import { PatientService } from '../../core/services/patient.service';
import { ReferralService } from '../../core/services/referral.service';
import { LabOrderCreate, LabOrderPriority } from '../../core/models/lab.model';

interface WizardStep {
  step: number;
  label: string;
}

const STEPS: WizardStep[] = [
  { step: 1, label: 'Patient' },
  { step: 2, label: 'Referral' },
  { step: 3, label: 'Tests' },
  { step: 4, label: 'Priority & Indication' },
  { step: 5, label: 'Review' },
];

@Component({
  selector: 'app-create-lab-order',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './create-lab-order.component.html',
  styleUrl: './create-lab-order.component.css',
})
export class CreateLabOrderComponent implements OnInit {
  patientService = inject(PatientService);
  doctorService = inject(DoctorService);
  referralService = inject(ReferralService);
  labService = inject(LabService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  steps = STEPS;
  currentStep = signal(1);
  standaloneOrder = signal(false);
  selectedTestIds = signal<Set<number>>(new Set());

  errorMessage = signal<string | null>(null);
  submitting = signal(false);

  priorities: LabOrderPriority[] = ['routine', 'stat'];

  form = {
    patientId: 0,
    referralId: 0,
    orderedBy: 0,
    priority: 'routine' as LabOrderPriority,
    clinicalIndication: '',
  };

  private prefilledPatientId = toSignal(
    this.route.queryParamMap.pipe(map((p) => (p.get('patientId') ? Number(p.get('patientId')) : undefined))),
    { initialValue: undefined },
  );

  private prefilledReferralId = toSignal(
    this.route.queryParamMap.pipe(map((p) => (p.get('referralId') ? Number(p.get('referralId')) : undefined))),
    { initialValue: undefined },
  );

  patientName = computed(() => {
    const p = this.patientService.patients().find((x) => x.PatientId === this.form.patientId);
    return p?.Name ?? '';
  });

  doctorName = computed(() => {
    const d = this.doctorService.doctors().find((x) => x.DoctorId === this.form.orderedBy);
    return d ? `${d.Name} (${d.Specialty})` : '';
  });

  selectedTests = computed(() =>
    this.labService.tests().filter((t) => this.selectedTestIds().has(t.test_id)),
  );

  constructor() {
    effect(() => {
      const patientId = this.form.patientId;
      if (patientId) {
        this.referralService.loadByPatient(patientId);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.patientService.search();
    this.doctorService.search();
    this.labService.loadTests();

    const prefilledPatientId = this.prefilledPatientId();
    if (prefilledPatientId) {
      this.form.patientId = prefilledPatientId;
    }
    const prefilledReferralId = this.prefilledReferralId();
    if (prefilledReferralId) {
      this.form.referralId = prefilledReferralId;
    }
  }

  goTo(step: number): void {
    this.currentStep.set(step);
  }

  next(): void {
    this.currentStep.update((s) => Math.min(s + 1, this.steps.length));
  }

  back(): void {
    this.currentStep.update((s) => Math.max(s - 1, 1));
  }

  toggleTest(testId: number): void {
    this.selectedTestIds.update((set) => {
      const next = new Set(set);
      if (next.has(testId)) {
        next.delete(testId);
      } else {
        next.add(testId);
      }
      return next;
    });
  }

  isTestSelected(testId: number): boolean {
    return this.selectedTestIds().has(testId);
  }

  canProceedFromStep1(): boolean {
    return this.form.patientId > 0;
  }

  canProceedFromStep3(): boolean {
    return this.selectedTestIds().size > 0;
  }

  canProceedFromStep4(): boolean {
    return this.form.orderedBy > 0;
  }

  submit(): void {
    this.errorMessage.set(null);
    this.submitting.set(true);

    const payload: LabOrderCreate = {
      patient_id: this.form.patientId,
      referral_id: this.standaloneOrder() || !this.form.referralId ? undefined : this.form.referralId,
      ordered_by: this.form.orderedBy,
      priority: this.form.priority,
      clinical_indication: this.form.clinicalIndication || undefined,
      test_ids: Array.from(this.selectedTestIds()),
    };

    this.labService.createOrder(payload).subscribe({
      next: (order) => {
        this.submitting.set(false);
        this.router.navigate(['/lab/orders', order.order_id]);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.detail ?? 'Failed to create lab order.');
      },
    });
  }
}
