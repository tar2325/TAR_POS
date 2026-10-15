import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BreadcrumbItem } from '../../../models/breadcrumb.model';

@Component({
  selector: 'app-page-header',
  imports: [RouterLink, MatIconModule],
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss',
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly breadcrumbs = input<BreadcrumbItem[]>([]);
}
