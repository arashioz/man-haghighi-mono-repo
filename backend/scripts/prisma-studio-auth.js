#!/usr/bin/env node

/**
 * Prisma Studio with Basic Authentication
 * 
 * Usage:
 *   PRISMA_STUDIO_USERNAME=admin PRISMA_STUDIO_PASSWORD=secret npm run prisma:studio:auth
 * 
 * Or set in .env:
 *   PRISMA_STUDIO_USERNAME=admin
 *   PRISMA_STUDIO_PASSWORD=your-secure-password
 *   PRISMA_STUDIO_PORT=5555 (optional, default: 5555)
 */

const { spawn } = require('child_process');
const http = require('http');
const net = require('net');

// Get credentials from environment
const USERNAME = process.env.PRISMA_STUDIO_USERNAME || 'admin';
const PASSWORD = process.env.PRISMA_STUDIO_PASSWORD || 'changeme';
const PORT = parseInt(process.env.PRISMA_STUDIO_PORT || '5555', 10);
const STUDIO_PORT = PORT + 1;

// Validate credentials
if (PASSWORD === 'changeme') {
  console.warn('⚠️  WARNING: Using default password "changeme"!');
  console.warn('   Please set PRISMA_STUDIO_PASSWORD in your .env file.');
}

// Start Prisma Studio on internal port
console.log(`🚀 Starting Prisma Studio on internal port ${STUDIO_PORT}...`);
const studioProcess = spawn('npx', ['prisma', 'studio', '--port', STUDIO_PORT.toString(), '--browser', 'none'], {
  stdio: 'pipe',
  shell: true,
  env: { ...process.env }
});

studioProcess.stdout.on('data', (data) => {
  const output = data.toString();
  // Only show important messages, not all Prisma Studio output
  if (output.includes('ready') || output.includes('error') || output.includes('Error')) {
    process.stdout.write(data);
  }
});

studioProcess.stderr.on('data', (data) => {
  process.stderr.write(data);
});

studioProcess.on('error', (err) => {
  console.error('❌ Failed to start Prisma Studio:', err);
  process.exit(1);
});

// Wait for Prisma Studio to be ready
let studioReady = false;
studioProcess.stdout.on('data', (data) => {
  if (data.toString().includes('ready') || data.toString().includes('Local:')) {
    if (!studioReady) {
      studioReady = true;
      startProxyServer();
    }
  }
});

// Fallback: start proxy after 5 seconds even if we don't see "ready"
setTimeout(() => {
  if (!studioReady) {
    console.log('⏳ Starting proxy server (assuming Prisma Studio is ready)...');
    startProxyServer();
  }
}, 5000);

function startProxyServer() {
  // Basic Auth function
  function checkAuth(req, res) {
    const auth = req.headers.authorization;
    
    if (!auth || !auth.startsWith('Basic ')) {
      res.writeHead(401, {
        'WWW-Authenticate': 'Basic realm="Prisma Studio - Authentication Required"',
        'Content-Type': 'text/plain'
      });
      res.end('Authentication required');
      return false;
    }

    try {
      const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString('utf-8');
      const [username, password] = credentials.split(':');

      if (username === USERNAME && password === PASSWORD) {
        return true;
      } else {
        res.writeHead(401, {
          'WWW-Authenticate': 'Basic realm="Prisma Studio - Authentication Required"',
          'Content-Type': 'text/plain'
        });
        res.end('Invalid credentials');
        return false;
      }
    } catch (err) {
      res.writeHead(401, {
        'WWW-Authenticate': 'Basic realm="Prisma Studio - Authentication Required"',
        'Content-Type': 'text/plain'
      });
      res.end('Invalid authentication format');
      return false;
    }
  }

  const server = http.createServer((req, res) => {
    if (!checkAuth(req, res)) {
      return;
    }

    // Proxy HTTP request to Prisma Studio
    const options = {
      hostname: 'localhost',
      port: STUDIO_PORT,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `localhost:${STUDIO_PORT}`
      }
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      if (!res.headersSent) {
        res.writeHead(500);
        res.end('Proxy error: ' + err.message);
      }
    });

    req.pipe(proxyReq);
  });

  // WebSocket support
  server.on('upgrade', (req, socket, head) => {
    // Simple auth check for WebSocket (you might want to improve this)
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Basic ')) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n');
      socket.write('WWW-Authenticate: Basic realm="Prisma Studio"\r\n');
      socket.write('\r\n');
      socket.end();
      return;
    }

    try {
      const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString('utf-8');
      const [username, password] = credentials.split(':');
      
      if (username !== USERNAME || password !== PASSWORD) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n');
        socket.write('WWW-Authenticate: Basic realm="Prisma Studio"\r\n');
        socket.write('\r\n');
        socket.end();
        return;
      }
    } catch (err) {
      socket.end();
      return;
    }

    // Proxy WebSocket connection
    const proxySocket = net.createConnection(STUDIO_PORT, 'localhost', () => {
      proxySocket.write(head);
      socket.pipe(proxySocket);
      proxySocket.pipe(socket);
    });

    proxySocket.on('error', () => {
      socket.end();
    });

    socket.on('error', () => {
      proxySocket.end();
    });
  });

  server.listen(PORT, () => {
    console.log('');
    console.log('✅ Prisma Studio with authentication is running!');
    console.log(`   URL: http://localhost:${PORT}`);
    console.log(`   Username: ${USERNAME}`);
    console.log(`   Password: ${PASSWORD.length > 0 ? '*'.repeat(Math.min(PASSWORD.length, 20)) : 'not set'}`);
    console.log('');
    if (PASSWORD === 'changeme') {
      console.log('⚠️  WARNING: Change the default password in .env file!');
      console.log('');
    }
  });

  // Cleanup on exit
  const cleanup = () => {
    console.log('\n🛑 Shutting down Prisma Studio...');
    studioProcess.kill();
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

