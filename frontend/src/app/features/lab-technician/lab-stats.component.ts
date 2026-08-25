import { DecimalPipe, KeyValuePipe } from '@angular/common';
import { Component, OnInit, computed, inject } from '@angular/core';

import { LabTechService } from '../../core/services/lab-tech.service';

@Component({
  selector: 'app-lab-stats',
  standalone: true,
  imports: [KeyValuePipe, DecimalPipe],
  templateUrl: './lab-stats.component.html',
  styleUrl: './lab-stats.component.css',
})
export class LabStatsComponent implements OnInit {
  labTech = inject(LabTechService);

  avgProcessingDays = computed<number | null>(() => {
    const durations = this.labTech.orders().flatMap((o) => o.order_tests.map((ot) => ot.test.processing_time_days));
    if (durations.length === 0) {
      return null;
    }
    return durations.reduce((sum, d) => sum + d, 0) / durations.length;
  });

  ngOnInit(): void {
    this.labTech.loadStats();
    this.labTech.loadOrders();
  }

  barWidth(count: number, total: number): number {
    if (total === 0) {
      return 0;
    }
    return Math.round((count / total) * 100);
  }
}
