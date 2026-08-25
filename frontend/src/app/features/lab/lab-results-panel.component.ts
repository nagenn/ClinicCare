import { SlicePipe } from '@angular/common';
import { Component, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LabService } from '../../core/services/lab.service';

@Component({
  selector: 'app-lab-results-panel',
  standalone: true,
  imports: [RouterLink, SlicePipe],
  templateUrl: './lab-results-panel.component.html',
  styleUrl: './lab-results-panel.component.css',
})
export class LabResultsPanelComponent {
  labService = inject(LabService);

  patientId = input<number | undefined>(undefined);
  referralId = input<number | undefined>(undefined);

  constructor() {
    effect(() => {
      const patientId = this.patientId();
      const referralId = this.referralId();
      if (referralId !== undefined) {
        this.labService.loadOrders({ referral_id: referralId });
      } else if (patientId !== undefined) {
        this.labService.loadOrders({ patient_id: patientId });
      }
    }, { allowSignalWrites: true });
  }
}
