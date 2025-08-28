import { NextRequest, NextResponse } from 'next/server';
import { generatePWAManifest } from '@/lib/pwa-config';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// Helper function to get client from query parameter or token
async function getClientFromRequest(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('client');
  
  if (clientId && clientId !== 'default') {
    try {
      const client = await prisma.clients.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          companyName: true,
          name: true
        }
      });
      return client;
    } catch (error) {
      console.error('Error fetching client for PWA manifest:', error);
    }
  }
  
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const client = await getClientFromRequest(request);
    const manifest = generatePWAManifest(client);
    
    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error generating PWA manifest:', error);
    
    // Return default manifest on error
    const defaultManifest = generatePWAManifest(null);
    return NextResponse.json(defaultManifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  }
}
