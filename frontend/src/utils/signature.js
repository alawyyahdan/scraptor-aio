/**
 * Module untuk membangkitkan kombinasi Signature dan Timestamp (HMAC)
 * Menghasilkan hash SHA-256 menggunakan Web Crypto API bawaan peramban.
 */

export async function generateSignature(urlPath) {
  const secret = import.meta.env.VITE_API_SECRET || '';
  const timestamp = Date.now().toString();
  
  // Karena URL di axios/fetch mungkin utuh atau relatif, kita hanya mau me-hash struktur konsistennya.
  // Untuk keamanan maksimal namun stabil, kita akan gunakan stempel waktu + rahasia
  // (Pilihan: ditambah dengan urlPath, jika backend juga konsisten memetakan path yang sama)
  const message = `${timestamp}:${secret}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return { signature, timestamp };
}
