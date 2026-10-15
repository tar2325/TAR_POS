import { Component, ElementRef, output, signal, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-barcode-input',
  imports: [MatIconModule],
  templateUrl: './barcode-input.component.html',
  styleUrl: './barcode-input.component.scss',
})
export class BarcodeInputComponent {
  readonly scan = output<string>();

  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('barcodeInput');
  protected readonly hasValue = signal(false);

  focus(): void {
    const element = this.inputRef()?.nativeElement;
    if (element) {
      element.focus();
      element.select();
    }
  }

  onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.hasValue.set(val.trim().length > 0);
  }

  clear(): void {
    const el = this.inputRef()?.nativeElement;
    if (el) {
      el.value = '';
      this.hasValue.set(false);
      el.focus();
    }
  }

  submit(): void {
    const el = this.inputRef()?.nativeElement;
    if (!el) {
      return;
    }

    const value = el.value.trim();
    if (!value) {
      return;
    }

    this.scan.emit(value);
    el.value = '';
    this.hasValue.set(false);
    this.focus();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.submit();
    } else if (event.key === 'Escape') {
      this.clear();
    }
  }
}
