const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const images = [
  'maduro.png',
  'Tierno.png',
  'Queso-mesa-500.png',
  'Queso-mesa-750.png',
  'mesa-redondo.png',
  'mozarella-pequeño-.png',
  'Mozarella-entero-500gr.png',
  'cheedar-500g.png',
  'bolita-mozarella.png',
  'bloque-mozarella-1.png',
  'funda-yogurt-1.png',
  'yogurt-cereal.png',
  'yogurt-12.png',
  'yogurt-1lt.png',
  'yogurt-2lt-junto.png',
  'yogurt-4lt.png',
  'naranjada.png',
  'cola.png',
  'bolos-1.png',
  'beba.png',
  'gelatina1.png',
  'bolita-mantequilla.jpeg',
  'manaba.jpeg'
];

const targetDir = path.join(__dirname, '..', 'public', 'productos');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

console.log('Descargando imágenes oficiales de Lácteos Leo a public/productos...');

function downloadFile(url, destPath, filename, redirectCount = 0) {
  if (redirectCount > 5) {
    console.error(`Demasiadas redirecciones para ${filename}`);
    return;
  }

  const client = url.startsWith('https') ? https : http;

  client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (response) => {
    if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 308) {
      const location = response.headers.location;
      const nextUrl = location.startsWith('http') ? location : `https://lacteosleo.com${location}`;
      downloadFile(nextUrl, destPath, filename, redirectCount + 1);
      return;
    }

    if (response.statusCode === 200) {
      const file = fs.createWriteStream(destPath);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`[OK] Descargado: ${filename}`);
      });
    } else {
      console.error(`Error ${response.statusCode} descargando ${filename} desde ${url}`);
    }
  }).on('error', (err) => {
    fs.unlink(destPath, () => {});
    console.error(`Error en conexión para ${filename}:`, err.message);
  });
}

images.forEach(filename => {
  const encodedName = encodeURI(filename);
  const url = `https://lacteosleo.com/assets/${encodedName}`;
  const destPath = path.join(targetDir, filename);
  downloadFile(url, destPath, filename);
});
