import { Component, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { readImageFile } from '../../../core/utils/image-file.util';

@Component({
  selector: 'app-image-upload',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './image-upload.component.html',
  styleUrl: './image-upload.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ImageUploadComponent),
      multi: true,
    },
  ],
})
export class ImageUploadComponent implements ControlValueAccessor {
  protected readonly previewUrl = signal<string | undefined>(undefined);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isDragging = signal(false);

  private onChange: (value: string | undefined) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | undefined): void {
    this.previewUrl.set(value || undefined);
  }

  registerOnChange(fn: (value: string | undefined) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    void this.handleFile(file);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }
    void this.handleFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  removeImage(): void {
    this.previewUrl.set(undefined);
    this.errorMessage.set(null);
    this.onChange(undefined);
    this.onTouched();
  }

  private async handleFile(file: File): Promise<void> {
    this.errorMessage.set(null);
    try {
      const dataUrl = await readImageFile(file);
      this.previewUrl.set(dataUrl);
      this.onChange(dataUrl);
      this.onTouched();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'อัปโหลดรูปไม่สำเร็จ');
    }
  }
}
