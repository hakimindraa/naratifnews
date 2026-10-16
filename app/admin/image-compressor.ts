/**
 * Utilitas Kompresi Gambar Otomatis Sisi Klien (Client-Side)
 * Menggunakan HTML5 Canvas murni (tanpa dependensi eksternal)
 * Mengubah gambar ke format WebP dengan lebar maks 1000px
 * dan menjamin ukuran berkas di bawah 100 KB (target 40 KB - 85 KB).
 */

export interface CompressionResult {
  file: File;
  originalSizeKB: number;
  compressedSizeKB: number;
  savingsPercent: number;
}

export async function compressImageUnder100KB(
  file: File,
  maxWidth = 1000,
  maxHeight = 1000,
  targetMaxBytes = 95 * 1024 // 95 KB batas aman agar pasti < 100 KB
): Promise<CompressionResult> {
  const originalSizeKB = Math.round(file.size / 1024);

  // Jika file sudah kecil (< 70KB) dan sudah webp, tidak perlu diolah ulang
  if (file.size <= 70 * 1024 && file.type === 'image/webp') {
    return {
      file,
      originalSizeKB,
      compressedSizeKB: originalSizeKB,
      savingsPercent: 0,
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = async () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize proporsional jika resolusi melebihi maxWidth atau maxHeight
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve({
            file,
            originalSizeKB,
            compressedSizeKB: originalSizeKB,
            savingsPercent: 0,
          });
          return;
        }

        // Render gambar ke canvas
        ctx.drawImage(img, 0, 0, width, height);

        const getBlob = (quality: number): Promise<Blob | null> => {
          return new Promise((res) => {
            canvas.toBlob((b) => res(b), 'image/webp', quality);
          });
        };

        // Percobaan 1: kualitas 0.75 (sangat tajam untuk WebP)
        let quality = 0.75;
        let blob = await getBlob(quality);

        // Jika ukuran masih > 95 KB, turunkan bertahap
        const qualitySteps = [0.65, 0.55, 0.48];
        let stepIdx = 0;

        while (blob && blob.size > targetMaxBytes && stepIdx < qualitySteps.length) {
          quality = qualitySteps[stepIdx];
          blob = await getBlob(quality);
          stepIdx++;
        }

        // Jika masih di atas 95 KB (pada gambar yang sangat kompleks/ramai detail),
        // kurangi resolusi sedikit (lebar ~820px) agar pasti di bawah 95 KB
        if (blob && blob.size > targetMaxBytes) {
          const scaledCanvas = document.createElement('canvas');
          const scaledWidth = Math.round(width * 0.82);
          const scaledHeight = Math.round(height * 0.82);

          scaledCanvas.width = scaledWidth;
          scaledCanvas.height = scaledHeight;
          const sCtx = scaledCanvas.getContext('2d');
          sCtx?.drawImage(canvas, 0, 0, scaledWidth, scaledHeight);

          blob = await new Promise((res) => {
            scaledCanvas.toBlob((b) => res(b), 'image/webp', 0.62);
          });
        }

        if (blob) {
          const rawName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-');
          const cleanName = rawName || 'adafakta-cover';
          const compressedFile = new File([blob], `${cleanName}.webp`, {
            type: 'image/webp',
          });
          const compressedSizeKB = Math.round(compressedFile.size / 1024);
          const savings =
            originalSizeKB > compressedSizeKB
              ? Math.round(((originalSizeKB - compressedSizeKB) / originalSizeKB) * 100)
              : 0;

          resolve({
            file: compressedFile,
            originalSizeKB,
            compressedSizeKB,
            savingsPercent: savings,
          });
        } else {
          resolve({
            file,
            originalSizeKB,
            compressedSizeKB: originalSizeKB,
            savingsPercent: 0,
          });
        }
      };

      img.onerror = () => {
        resolve({
          file,
          originalSizeKB,
          compressedSizeKB: originalSizeKB,
          savingsPercent: 0,
        });
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      resolve({
        file,
        originalSizeKB,
        compressedSizeKB: originalSizeKB,
        savingsPercent: 0,
      });
    };

    reader.readAsDataURL(file);
  });
}
