import { Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading',
  imports: [MatProgressSpinnerModule],
  template: `<div class="loading"><mat-spinner diameter="40" /><p>{{ message() }}</p></div>`,
  styles: `.loading { display:flex; flex-direction:column; align-items:center; gap:16px; padding:32px; color:#64748b; }`,
})
export class LoadingComponent {
  readonly message = input('กำลังโหลด...');
}
