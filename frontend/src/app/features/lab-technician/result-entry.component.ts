import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { LabTechService } from '../../core/services/lab-tech.service';
import { LabOrder, OrderTest } from '../../core/models/lab.model';

type ResultPreview = 'normal' | 'abnormal' | 'critical' | 'unknown';

@Component({
  selector: 'app-result-entry',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './result-entry.component.html',
  styleUrl: './result-entry.component.css',
})
export class ResultEntryComponent {
  @Input({ required: true }) order!: LabOrder;
  @Input({ required: true }) orderTest!: OrderTest;
  @Input() patientName?: string;
  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<void>();

  private labTech = inject(LabTechService);

  resultValue = signal<string>('');
  notes = signal<string>('');
  manualAbnormal = signal<boolean>(false);
  manualCritical = signal<boolean>(false);
  submitting = signal<boolean>(false);
  formError = signal<string | null>(null);

  isNumericTest = computed(
    () => this.orderTest.test.normal_range_min !== null && this.orderTest.test.normal_range_max !== null,
  );

  preview = computed<ResultPreview>(() => {
    if (!this.isNumericTest()) {
      return 'unknown';
    }
    const value = Number(this.resultValue());
    if (this.resultValue().trim() === '' || Number.isNaN(value)) {
      return 'unknown';
    }
    const min = this.orderTest.test.normal_range_min!;
    const max = this.orderTest.test.normal_range_max!;
    if (value > max * 1.5 || value < min * 0.5) {
      return 'critical';
    }
    if (value < min || value > max) {
      return 'abnormal';
    }
    return 'normal';
  });

  submit(): void {
    if (!this.resultValue().trim()) {
      this.formError.set('Please enter a result value.');
      return;
    }

    this.submitting.set(true);
    this.formError.set(null);

    const payload = this.isNumericTest()
      ? { result_value: this.resultValue(), notes: this.notes() || undefined, submitted_by: this.labTech.staffId() ?? undefined }
      : {
          result_value: this.resultValue(),
          notes: this.notes() || undefined,
          is_abnormal: this.manualAbnormal(),
          is_critical: this.manualCritical(),
          submitted_by: this.labTech.staffId() ?? undefined,
        };

    this.labTech.submitResult(this.order.order_id, this.orderTest.test_id, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.submitted.emit();
      },
      error: (err) => {
        this.formError.set(err?.error?.detail ?? 'Failed to submit result.');
        this.submitting.set(false);
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
