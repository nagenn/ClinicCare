import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { LabService } from '../../core/services/lab.service';

@Component({
  selector: 'app-lab-test-catalog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './lab-test-catalog.component.html',
  styleUrl: './lab-test-catalog.component.css',
})
export class LabTestCatalogComponent implements OnInit {
  labService = inject(LabService);

  specialtyFilter = signal('');

  specialties = computed(() => {
    const set = new Set<string>();
    for (const t of this.labService.tests()) {
      if (t.specialty) set.add(t.specialty);
    }
    return Array.from(set).sort();
  });

  ngOnInit(): void {
    this.labService.loadTests();
  }

  applyFilter(): void {
    this.labService.loadTests(this.specialtyFilter() || undefined);
  }
}
