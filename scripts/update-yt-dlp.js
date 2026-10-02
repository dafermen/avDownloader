import { spawn } from 'node:child_process';
import youtubeDl from 'youtube-dl-exec';

/**
 * Actualiza el binario local elegido por youtube-dl-exec para la plataforma
 * actual. En Linux el archivo se llama `yt-dlp`; en Windows de desarrollo, el
 * paquete resuelve su variante correspondiente sin rutas codificadas aquí.
 */
const binaryPath = process.env.YT_DLP_PATH?.trim()
  || (process.platform === 'linux' ? 'yt-dlp' : youtubeDl.constants?.YOUTUBE_DL_PATH);
if (!binaryPath) {
  console.error('No se encontró el binario local de yt-dlp. Ejecuta npm install.');
  process.exitCode = 1;
} else {
  const child = spawn(binaryPath, ['-U'], { windowsHide: true, stdio: 'inherit' });
  child.once('error', (error) => {
    console.error(`No fue posible iniciar yt-dlp: ${error.message}`);
    process.exitCode = 1;
  });
  child.once('close', (code) => { process.exitCode = code ?? 1; });
}
