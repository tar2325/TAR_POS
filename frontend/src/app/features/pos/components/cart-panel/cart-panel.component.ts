import { Component, input, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CartItem, CartSummary } from '../../../../models/cart-item.model';

@Component({
  selector: 'app-cart-panel',
  imports: [CurrencyPipe, MatButtonModule, MatIconModule],
  templateUrl: './cart-panel.component.html',
  styleUrl: './cart-panel.component.scss',
})
export class CartPanelComponent {
  readonly items = input<CartItem[]>([]);
  readonly summary = input.required<CartSummary>();
  readonly increase = output<number>();
  readonly decrease = output<number>();
  readonly remove = output<number>();
  readonly checkout = output<void>();
  readonly clear = output<void>();
}
