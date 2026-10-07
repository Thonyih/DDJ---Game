import os from 'node:os';
import { defineConfig, type Plugin } from 'vite';

// This computer's IPv4 addresses on the local network (e.g. Wi-Fi).
function lanAddresses(): string[] {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((net) => net && net.family === 'IPv4' && !net.internal)
    .map((net) => net!.address);
}

// Prints the link other players on the same network should open.
function shareLinkBanner(): Plugin {
  return {
    name: 'share-link-banner',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        const address = server.httpServer?.address();
        const port = typeof address === 'object' && address ? address.port : 5173;
        // Printed just after Vite's own startup output.
        setTimeout(() => {
          const ips = lanAddresses();
          console.log('\n  \x1b[1m\x1b[33mMultiplayer — players on this network open:\x1b[0m');
          if (ips.length === 0) {
            console.log('  (no network connection found)');
          }
          for (const ip of ips) {
            console.log(`  \x1b[1m\x1b[36m➜  http://${ip}:${port}/\x1b[0m`);
          }
          console.log('  Game server must be running: dotnet run (in v3/server)\n');
        }, 100);
      });
    },
  };
}

export default defineConfig({
  // Relative paths so the build works under GitHub Pages' /<repo>/ subpath.
  base: './',
  // Reachable from other computers on the network, for LAN multiplayer.
  server: { host: true },
  plugins: [shareLinkBanner()],
});
