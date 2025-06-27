// NAIKKAN VERSI CACHE UNTUK MEMICU UPDATE SERVICE WORKER
const CACHE_NAME = 'Kasir-POS-Tius-System-v24'; 
const urlsToCache = [
  '/Pos-Kasir/',
  '/Pos-Kasir/index.html',
  '/Pos-Kasir/app.webmanifest',
  '/Pos-Kasir/logo192.png',
  '/Pos-Kasir/logo.png',
  '/Pos-Kasir/favicon-32x32.png',
  
  // Aset eksternal
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache dibuka.');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Service Worker: Gagal menyimpan aset ke cache:', error);
      })
  );
});

// ==================================================================
// PASTIKAN ANDA MENG-COPY BAGIAN INI DENGAN LENGKAP
// INILAH KUNCI UNTUK MEMPERBAIKI ERROR FIREBASE
// ==================================================================
self.addEventListener('fetch', event => {
  // Cek jika permintaan ditujukan ke API Google atau Firestore
  if (event.request.url.startsWith('https://firestore.googleapis.com') || 
      event.request.url.startsWith('https://www.googleapis.com')) {
    // Untuk permintaan API, selalu gunakan strategi Network Only.
    // Jangan coba-coba cari di cache.
    return event.respondWith(fetch(event.request));
  }

  // Untuk semua permintaan lainnya (aset aplikasi Anda), gunakan strategi Cache First
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Jika ada di cache, kembalikan dari cache. Jika tidak, ambil dari jaringan.
        return response || fetch(event.request);
      })
  );
});
// ==================================================================
// AKHIR DARI BAGIAN PENTING
// ==================================================================

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    })
  );
});
