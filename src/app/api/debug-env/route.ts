
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
