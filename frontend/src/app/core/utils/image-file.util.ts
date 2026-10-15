const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function readImageFile(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Promise.reject(new Error('รองรับเฉพาะไฟล์ JPG, PNG, WEBP หรือ GIF'));
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return Promise.reject(new Error('ขนาดไฟล์ต้องไม่เกิน 2 MB'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('อ่านไฟล์รูปไม่สำเร็จ'));
    };
    reader.onerror = () => reject(new Error('อ่านไฟล์รูปไม่สำเร็จ'));
    reader.readAsDataURL(file);
  });
}
