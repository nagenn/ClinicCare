import { DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';

import { LabOrder, LabSample } from '../../core/models/lab.model';

@Component({
  selector: 'app-sample-label',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './sample-label.component.html',
  styleUrl: './sample-label.component.css',
})
export class SampleLabelComponent {
  @Input({ required: true }) order!: LabOrder;
  @Input({ required: true }) sample!: LabSample;
  @Input() patientName?: string;

  print(): void {
    const win = window.open('', '_blank', 'width=420,height=320');
    if (!win) {
      return;
    }
    const labelHtml = document.getElementById(this.printTargetId())?.outerHTML ?? '';
    win.document.write(`
      <html>
        <head>
          <title>Sample Label - ${this.sample.sample_label ?? ''}</title>
          <style>${LABEL_PRINT_CSS}</style>
        </head>
        <body>${labelHtml}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  printTargetId(): string {
    return `label-${this.sample.sample_id}`;
  }

  barWidths(): number[] {
    const source = this.sample.sample_label ?? String(this.sample.sample_id);
    return Array.from(source).map((char) => (char.charCodeAt(0) % 4) + 1);
  }
}

const LABEL_PRINT_CSS = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 1rem; }
  .label { border: 1px solid #000; padding: 0.75rem; width: 320px; }
  .barcode { display: flex; gap: 1px; height: 40px; margin: 0.5rem 0; }
  .bar { background: #000; }
  .label-code { text-align: center; font-family: monospace; font-size: 0.8rem; letter-spacing: 1px; }
  .label-row { font-size: 0.75rem; margin: 0.15rem 0; }
`;
