import { NextRequest, NextResponse } from 'next/server';
import { enhancedJwtConfig } from '@/lib/jwt-config';
import { prisma } from '@/lib/prisma';
import { 
  applySecurityMiddleware, 
  FileUploadValidator,
  InputValidator 
} from '@/lib/security-middleware';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';

// Helper function to get authenticated user
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = enhancedJwtConfig.verifyToken(token);
    
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: { clients: true }
    });

    if (!user || !user.isActive || !user.clients.isActive) {
      return null;
    }
    return user;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply security middleware with upload rate limiting
    const securityResponse = applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'upload', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      return securityResponse;
    }

    // Check authentication
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate number of files
    if (files.length > 5) {
      return NextResponse.json({ 
        error: 'Maximum 5 files allowed per request' 
      }, { status: 400 });
    }

    const uploadedFiles = [];
    const uploadDir = join(process.cwd(), 'uploads', user.clientId);
    
    // Create upload directory if it doesn't exist
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
      return NextResponse.json({ 
        error: 'Failed to create upload directory' 
      }, { status: 500 });
    }

    for (const file of files) {
      try {
        // Validate file
        const validation = FileUploadValidator.validateFile({
          name: file.name,
          type: file.type,
          size: file.size
        });

        if (!validation.valid) {
          return NextResponse.json({ 
            error: `File validation failed: ${validation.error}` 
          }, { status: 400 });
        }

        // Generate secure filename
        const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
        const secureFilename = `${crypto.randomUUID()}${fileExtension}`;
        const filePath = join(uploadDir, secureFilename);

        // Convert file to buffer and save
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        await writeFile(filePath, buffer);

        // Record file upload in database
        const fileRecord = await prisma.file_uploads.create({
          data: {
            id: crypto.randomUUID(),
            filename: secureFilename,
            originalName: file.name,
            mimeType: file.type,
            size: file.size,
            path: filePath,
            clientId: user.clientId,
            uploadedBy: user.id,
            uploadType: 'general',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        uploadedFiles.push({
          id: fileRecord.id,
          filename: secureFilename,
          originalName: file.name,
          size: file.size,
          mimeType: file.type,
          uploadedAt: fileRecord.createdAt
        });

      } catch (error) {
        console.error('Error processing file:', error);
        return NextResponse.json({ 
          error: `Failed to process file: ${file.name}` 
        }, { status: 500 });
      }
    }

    const response = NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
      files: uploadedFiles
    });

    // Apply security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    return response;

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  // Handle preflight request for CORS
  const response = new NextResponse(null, { status: 200 });
  
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  
  return response;
}
