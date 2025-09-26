// This is a simple test to check environment variables
// We'll create a temporary API endpoint to debug this

const fs = require('fs');
const path = require('path');

// Create a temporary debug endpoint
const debugEndpoint = `
export async function GET() {
  try {
    const envVars = {
      CATALOG_APP_URL: process.env.CATALOG_APP_URL,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      // Add other relevant env vars
    };
    
    return Response.json({
      message: 'Environment variables debug',
      envVars,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
`;

// Write the debug endpoint
const debugPath = path.join(__dirname, 'src/app/api/debug-env/route.ts');
fs.mkdirSync(path.dirname(debugPath), { recursive: true });
fs.writeFileSync(debugPath, debugEndpoint);

console.log('✅ Created debug endpoint at /api/debug-env');
console.log('You can now test it by visiting: https://qa.scan2ship.in/api/debug-env');
console.log('This will show you what environment variables are actually available.');
