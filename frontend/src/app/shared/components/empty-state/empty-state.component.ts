import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  imports: [MatIconModule],
  template: `<div class="empty"><mat-icon>{{ icon() }}</mat-icon><h3>{{ title() }}</h3><p>{{ description() }}</p></div>`,
  styles: `.empty { text-align:center; padding:32px; color:#64748b; mat-icon{font-size:48px;width:48px;height:48px;color:#e2e8f0;} h3{color:#1e293b;margin:8px 0;} }`,
})
export class EmptyStateComponent {
  readonly icon = input('inbox');
  readonly title = input('ไม่มีข้อมูล');
  readonly description = input('');
}
