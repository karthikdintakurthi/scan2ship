import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { safeDatabaseQuery } from '@/lib/database-health-check';

// PUT method for updating logo URL
export async function PUT(request: NextRequest) {
  try {
    // Apply security middleware
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

    // Authorize user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.USER,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const { client } = authResult.user!;

    // Get the request body
    let body;
    try {
      const bodyText = await request.text();
      console.log('🔍 [LOGO_URL_UPDATE] Request body length:', bodyText.length);
      console.log('🔍 [LOGO_URL_UPDATE] Request body first 100 chars:', bodyText.substring(0, 100));
      console.log('🔍 [LOGO_URL_UPDATE] Request body last 100 chars:', bodyText.substring(Math.max(0, bodyText.length - 100)));
      
      if (!bodyText || bodyText.trim() === '') {
        console.error('❌ [LOGO_URL_UPDATE] Empty request body');
        return NextResponse.json({
          success: false,
          error: 'Empty request body'
        }, { status: 400 });
      }
      
      body = JSON.parse(bodyText);
    } catch (error) {
      console.error('❌ [LOGO_URL_UPDATE] JSON parse error:', error);
      console.error('❌ [LOGO_URL_UPDATE] Raw body:', await request.text());
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 400 });
    }
    
    const { logoUrl, displayLogoOnWaybill, logoEnabledCouriers } = body;

    // Validate URL if provided
    if (logoUrl && logoUrl.trim() !== '') {
      try {
        new URL(logoUrl);
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: 'Invalid URL format'
        }, { status: 400 });
      }
    }

    // Get or create client order config
    let orderConfig;
    try {
      orderConfig = await safeDatabaseQuery(
        () => prisma.client_order_configs.findUnique({
          where: { clientId: client.id }
        }),
        'LOGO_URL_UPDATE'
      );
      console.log('✅ [LOGO_URL_UPDATE] Retrieved order config for client:', client.id);
    } catch (error) {
      console.error('❌ [LOGO_URL_UPDATE] Failed to retrieve order config:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to retrieve client configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

    // Update or create order config with logo URL
    try {
      if (orderConfig) {
        orderConfig = await prisma.client_order_configs.update({
          where: { clientId: client.id },
          data: {
            logoUrl: logoUrl || null,
            displayLogoOnWaybill: displayLogoOnWaybill,
            logoEnabledCouriers: logoEnabledCouriers || '[]'
          }
        });
        console.log('✅ [LOGO_URL_UPDATE] Updated existing order config with URL');
      } else {
        orderConfig = await prisma.client_order_configs.create({
          data: {
            id: `order-config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            clientId: client.id,
            // Default values
            defaultProductDescription: 'ARTIFICAL JEWELLERY',
            defaultPackageValue: 5000,
            defaultWeight: 100,
            defaultTotalItems: 1,
            codEnabledByDefault: false,
            defaultCodAmount: null,
            minPackageValue: 100,
            maxPackageValue: 100000,
            minWeight: 1,
            maxWeight: 50000,
            minTotalItems: 1,
            maxTotalItems: 100,
            requireProductDescription: true,
            requirePackageValue: true,
            requireWeight: true,
            requireTotalItems: true,
            enableResellerFallback: true,
            enableThermalPrint: false,
            enableReferencePrefix: true,
            // Logo settings
            logoUrl: logoUrl || null,
            displayLogoOnWaybill: displayLogoOnWaybill,
            logoEnabledCouriers: logoEnabledCouriers || '[]'
          }
        });
        console.log('✅ [LOGO_URL_UPDATE] Created new order config with URL');
      }
    } catch (error) {
      console.error('❌ [LOGO_URL_UPDATE] Failed to update/create order config:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to save logo URL to database',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

    console.log('✅ [LOGO_URL_UPDATE] Logo URL updated successfully:', {
      clientId: client.id,
      logoUrl: logoUrl,
      displayLogoOnWaybill: displayLogoOnWaybill
    });

    return NextResponse.json({
      success: true,
      message: 'Logo URL updated successfully',
      logo: {
        logoUrl: logoUrl,
        displayLogoOnWaybill: displayLogoOnWaybill,
        logoEnabledCouriers: logoEnabledCouriers || '[]'
      }
    });

  } catch (error) {
    console.error('❌ [LOGO_URL_UPDATE] Error updating logo URL:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply security middleware
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

    // Authorize user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.USER,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const { client } = authResult.user!;

    // Get the form data
    const formData = await request.formData();
    const file = formData.get('logo') as File;
    const displayLogoOnWaybill = formData.get('displayLogoOnWaybill') === 'true';
    const logoEnabledCouriers = formData.get('logoEnabledCouriers') as string;

    if (!file) {
      return NextResponse.json({ error: 'No logo file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' 
      }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 5MB.' 
      }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    // Try multiple directory locations for better production compatibility
    let uploadsDir;
    const possibleDirs = [
      join(process.cwd(), 'public', 'images', 'uploads', 'logos'),
      join(process.cwd(), 'uploads', 'logos'),
      join('/tmp', 'scan2ship', 'logos'),
      join(process.cwd(), 'public', 'uploads', 'logos')
    ];
    
    let dirCreated = false;
    for (const dir of possibleDirs) {
      try {
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
          console.log('✅ [LOGO_UPLOAD] Created uploads directory:', dir);
        }
        uploadsDir = dir;
        dirCreated = true;
        break;
      } catch (error) {
        console.warn(`⚠️ [LOGO_UPLOAD] Failed to create directory ${dir}:`, error);
        continue;
      }
    }
    
    if (!dirCreated) {
      console.error('❌ [LOGO_UPLOAD] Failed to create any upload directory');
      return NextResponse.json({
        success: false,
        error: 'Failed to create upload directory',
        details: 'Unable to create upload directory in any of the attempted locations'
      }, { status: 500 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `logo_${client.id}_${timestamp}.${fileExtension}`;
    const filePath = join(uploadsDir, fileName);

    // Convert file to buffer and save
    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);
      console.log('✅ [LOGO_UPLOAD] File saved successfully:', filePath);
    } catch (error) {
      console.error('❌ [LOGO_UPLOAD] Failed to save file:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to save logo file',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

    // Get or create client order config
    let orderConfig;
    try {
      orderConfig = await safeDatabaseQuery(
        () => prisma.client_order_configs.findUnique({
          where: { clientId: client.id }
        }),
        'LOGO_UPLOAD'
      );
      console.log('✅ [LOGO_UPLOAD] Retrieved order config for client:', client.id);
    } catch (error) {
      console.error('❌ [LOGO_UPLOAD] Failed to retrieve order config:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to retrieve client configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

    // Delete old logo if it exists
    if (orderConfig?.logoFileName) {
      const oldLogoPath = join(uploadsDir, orderConfig.logoFileName);
      try {
        if (existsSync(oldLogoPath)) {
          await unlink(oldLogoPath);
        }
      } catch (error) {
        console.warn('Failed to delete old logo:', error);
      }
    }

    // Update or create order config with logo information
    try {
      if (orderConfig) {
        orderConfig = await prisma.client_order_configs.update({
          where: { clientId: client.id },
          data: {
            logoFileName: fileName,
            logoFileSize: file.size,
            logoFileType: file.type,
            displayLogoOnWaybill: displayLogoOnWaybill,
            logoEnabledCouriers: logoEnabledCouriers || '[]'
          }
        });
        console.log('✅ [LOGO_UPLOAD] Updated existing order config');
      } else {
        orderConfig = await prisma.client_order_configs.create({
          data: {
            id: `order-config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            clientId: client.id,
            // Default values
            defaultProductDescription: 'ARTIFICAL JEWELLERY',
            defaultPackageValue: 5000,
            defaultWeight: 100,
            defaultTotalItems: 1,
            codEnabledByDefault: false,
            defaultCodAmount: null,
            minPackageValue: 100,
            maxPackageValue: 100000,
            minWeight: 1,
            maxWeight: 50000,
            minTotalItems: 1,
            maxTotalItems: 100,
            requireProductDescription: true,
            requirePackageValue: true,
            requireWeight: true,
            requireTotalItems: true,
            enableResellerFallback: true,
            enableThermalPrint: false,
            enableReferencePrefix: true,
            // Logo settings
            logoFileName: fileName,
            logoFileSize: file.size,
            logoFileType: file.type,
            displayLogoOnWaybill: displayLogoOnWaybill,
            logoEnabledCouriers: logoEnabledCouriers || '[]'
          }
        });
        console.log('✅ [LOGO_UPLOAD] Created new order config');
      }
    } catch (error) {
      console.error('❌ [LOGO_UPLOAD] Failed to update/create order config:', error);
      // Try to clean up the uploaded file
      try {
        if (existsSync(filePath)) {
          await unlink(filePath);
          console.log('🧹 [LOGO_UPLOAD] Cleaned up uploaded file after database error');
        }
      } catch (cleanupError) {
        console.error('❌ [LOGO_UPLOAD] Failed to clean up uploaded file:', cleanupError);
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to save logo information to database',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

    console.log('✅ [LOGO_UPLOAD] Logo uploaded successfully:', {
      clientId: client.id,
      fileName: fileName,
      fileSize: file.size,
      fileType: file.type,
      displayLogoOnWaybill: displayLogoOnWaybill
    });

    // Generate the correct URL based on the directory used
    let logoUrl;
    if (uploadsDir.includes('public/images/uploads/logos')) {
      logoUrl = `/images/uploads/logos/${fileName}`;
    } else if (uploadsDir.includes('public/uploads/logos')) {
      logoUrl = `/uploads/logos/${fileName}`;
    } else if (uploadsDir.includes('/tmp/scan2ship/logos')) {
      // For temp directory, we need to serve it differently
      logoUrl = `/api/logo/file/${fileName}`;
    } else {
      logoUrl = `/uploads/logos/${fileName}`;
    }

    return NextResponse.json({
      success: true,
      message: 'Logo uploaded successfully',
      logo: {
        fileName: fileName,
        fileSize: file.size,
        fileType: file.type,
        displayLogoOnWaybill: displayLogoOnWaybill,
        logoEnabledCouriers: logoEnabledCouriers || '[]',
        url: logoUrl
      }
    });

  } catch (error) {
    console.error('❌ [LOGO_UPLOAD] Error uploading logo:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to upload logo'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  console.log('🔍 [API_LOGO_GET] Starting request processing...');
  console.log('🔍 [API_LOGO_GET] Request URL:', request.url);
  console.log('🔍 [API_LOGO_GET] Request headers:', Object.fromEntries(request.headers.entries()));
  
  try {
    // Apply security middleware
    console.log('🔍 [API_LOGO_GET] Applying security middleware...');
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      console.log('🔍 [API_LOGO_GET] Security middleware blocked request');
      securityHeaders(securityResponse);
      return securityResponse;
    }
    console.log('🔍 [API_LOGO_GET] Security middleware passed');

    // Authorize user
    console.log('🔍 [API_LOGO_GET] Starting user authorization...');
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.USER,
      requiredPermissions: [PermissionLevel.READ],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      console.log('🔍 [API_LOGO_GET] Authorization failed:', authResult.response.status);
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const { client } = authResult.user!;
    console.log('🔍 [API_LOGO_GET] User authorized successfully:', {
      userId: authResult.user!.id,
      email: authResult.user!.email,
      role: authResult.user!.role,
      clientId: client.id
    });

    // Get client order config
    console.log('🔍 [API_LOGO_GET] Querying database for order config...');
    const orderConfig = await safeDatabaseQuery(
      () => prisma.client_order_configs.findUnique({
        where: { clientId: client.id }
      }),
      'API_LOGO_GET'
    );

    if (!orderConfig) {
      console.log('🔍 [API_LOGO_GET] No order config found for client:', client.id);
      return NextResponse.json({
        success: true,
        logo: null
      });
    }

    // Check for uploaded logo file first
    if (orderConfig.logoFileName) {
      console.log('🔍 [API_LOGO_GET] Uploaded logo found:', {
        fileName: orderConfig.logoFileName,
        fileSize: orderConfig.logoFileSize,
        fileType: orderConfig.logoFileType,
        displayLogoOnWaybill: orderConfig.displayLogoOnWaybill
      });

      return NextResponse.json({
        success: true,
        logo: {
          fileName: orderConfig.logoFileName,
          fileSize: orderConfig.logoFileSize,
          fileType: orderConfig.logoFileType,
          displayLogoOnWaybill: orderConfig.displayLogoOnWaybill,
          logoEnabledCouriers: orderConfig.logoEnabledCouriers || '[]',
          url: `/images/uploads/logos/${orderConfig.logoFileName}`,
          type: 'uploaded'
        }
      });
    }

    // Fallback to logo URL if no uploaded file
    if (orderConfig.logoUrl) {
      console.log('🔍 [API_LOGO_GET] Logo URL found as fallback:', {
        logoUrl: orderConfig.logoUrl,
        displayLogoOnWaybill: orderConfig.displayLogoOnWaybill
      });

      return NextResponse.json({
        success: true,
        logo: {
          logoUrl: orderConfig.logoUrl,
          displayLogoOnWaybill: orderConfig.displayLogoOnWaybill,
          logoEnabledCouriers: orderConfig.logoEnabledCouriers || '[]',
          url: orderConfig.logoUrl,
          type: 'url'
        }
      });
    }

    // No logo found (neither uploaded file nor URL)
    console.log('🔍 [API_LOGO_GET] No logo found for client:', client.id);
    return NextResponse.json({
      success: true,
      logo: null
    });

  } catch (error) {
    console.error('❌ [API_LOGO_GET] Error getting logo:', error);
    console.error('❌ [API_LOGO_GET] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    
    // Log additional context for debugging
    console.error('❌ [API_LOGO_GET] Request context:', {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries())
    });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get logo information',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}


export async function DELETE(request: NextRequest) {
  try {
    // Apply security middleware
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

    // Authorize user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.USER,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const { client } = authResult.user!;

    // Get client order config
    const orderConfig = await safeDatabaseQuery(
      () => prisma.client_order_configs.findUnique({
        where: { clientId: client.id }
      }),
      'LOGO_DELETE'
    );

    if (!orderConfig || !orderConfig.logoFileName) {
      return NextResponse.json({
        success: true,
        message: 'No logo to delete'
      });
    }

    // Delete logo file
    const uploadsDir = join(process.cwd(), 'public', 'images', 'uploads', 'logos');
    const filePath = join(uploadsDir, orderConfig.logoFileName);
    
    try {
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    } catch (error) {
      console.warn('Failed to delete logo file:', error);
    }

    // Update order config to remove logo information
    await prisma.client_order_configs.update({
      where: { clientId: client.id },
      data: {
        logoFileName: null,
        logoFileSize: null,
        logoFileType: null,
        displayLogoOnWaybill: false
      }
    });

    console.log('✅ [LOGO_DELETE] Logo deleted successfully:', {
      clientId: client.id,
      fileName: orderConfig.logoFileName
    });

    return NextResponse.json({
      success: true,
      message: 'Logo deleted successfully'
    });

  } catch (error) {
    console.error('❌ [LOGO_DELETE] Error deleting logo:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete logo'
    }, { status: 500 });
  }
}
