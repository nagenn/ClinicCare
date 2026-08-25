import { Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { PatientService } from '../../core/services/patient.service';
import { DocumentsPanelComponent } from '../documents/documents-panel.component';
import { LabResultsPanelComponent } from '../lab/lab-results-panel.component';

@Component({
  selector: 'app-patient-details',
  standalone: true,
  imports: [RouterLink, DocumentsPanelComponent, LabResultsPanelComponent],
  templateUrl: './patient-details.component.html',
  styleUrl: './patient-details.component.css',
})
export class PatientDetailsComponent {
  patientService = inject(PatientService);
  private route = inject(ActivatedRoute);

  patientId = toSignal(
    this.route.paramMap.pipe(map((params) => Number(params.get('id')))),
    { initialValue: 0 },
  );

  constructor() {
    effect(() => {
      const id = this.patientId();
      if (id) {
        this.patientService.loadById(id);
      }
    });
  }
}
