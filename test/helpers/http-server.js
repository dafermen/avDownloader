import { server } from '../../server.js';

/**
 * Starts the real HTTP application on an operating-system-assigned port.
 * Each test process owns its server instance and closes it after use.
 *
 * @returns {Promise<{baseUrl:string, close:() => Promise<void>}>}
 */
export async function startTestServer() {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    })
  };
}
