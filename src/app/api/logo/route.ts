import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

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
    const uploadsDir = join(process.cwd(), 'public', 'images', 'uploads', 'logos');
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `logo_${client.id}_${timestamp}.${fileExtension}`;
    const filePath = join(uploadsDir, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Get or create client order config
    let orderConfig = await prisma.client_order_configs.findUnique({
      where: { clientId: client.id }
    });

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
          enableAltMobileNumber: false,
          // Logo settings
          logoFileName: fileName,
          logoFileSize: file.size,
          logoFileType: file.type,
          displayLogoOnWaybill: displayLogoOnWaybill,
          logoEnabledCouriers: logoEnabledCouriers || '[]'
        }
      });
    }

    console.log('✅ [LOGO_UPLOAD] Logo uploaded successfully:', {
      clientId: client.id,
      fileName: fileName,
      fileSize: file.size,
      fileType: file.type,
      displayLogoOnWaybill: displayLogoOnWaybill
    });

    return NextResponse.json({
      success: true,
      message: 'Logo uploaded successfully',
      logo: {
        fileName: fileName,
        fileSize: file.size,
        fileType: file.type,
        displayLogoOnWaybill: displayLogoOnWaybill,
        logoEnabledCouriers: logoEnabledCouriers || '[]',
        url: `/images/uploads/logos/${fileName}`
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
    const orderConfig = await prisma.client_order_configs.findUnique({
      where: { clientId: client.id }
    });

    if (!orderConfig || !orderConfig.logoFileName) {
      console.log('🔍 [API_LOGO_GET] No logo found for client:', client.id);
      return NextResponse.json({
        success: true,
        logo: null
      });
    }

    console.log('🔍 [API_LOGO_GET] Logo found:', {
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
        url: `/images/uploads/logos/${orderConfig.logoFileName}`
      }
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

    // Get the form data
    const formData = await request.formData();
    const displayLogoOnWaybill = formData.get('displayLogoOnWaybill') === 'true';
    const logoEnabledCouriers = formData.get('logoEnabledCouriers') as string;

    // Get or create client order config
    let orderConfig = await prisma.client_order_configs.findUnique({
      where: { clientId: client.id }
    });

    if (!orderConfig) {
      return NextResponse.json({ error: 'No order configuration found' }, { status: 404 });
    }

    // Update order config with logo settings
    orderConfig = await prisma.client_order_configs.update({
      where: { clientId: client.id },
      data: {
        displayLogoOnWaybill: displayLogoOnWaybill,
        logoEnabledCouriers: logoEnabledCouriers || '[]'
      }
    });

    console.log('✅ [LOGO_UPDATE] Logo settings updated successfully:', {
      clientId: client.id,
      displayLogoOnWaybill: displayLogoOnWaybill,
      logoEnabledCouriers: logoEnabledCouriers
    });

    return NextResponse.json({
      success: true,
      message: 'Logo settings updated successfully',
      logo: {
        fileName: orderConfig.logoFileName,
        fileSize: orderConfig.logoFileSize,
        fileType: orderConfig.logoFileType,
        displayLogoOnWaybill: displayLogoOnWaybill,
        logoEnabledCouriers: logoEnabledCouriers || '[]',
        url: orderConfig.logoFileName ? `/images/uploads/logos/${orderConfig.logoFileName}` : null
      }
    });

  } catch (error) {
    console.error('❌ [LOGO_UPDATE] Error updating logo settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update logo settings'
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
    const orderConfig = await prisma.client_order_configs.findUnique({
      where: { clientId: client.id }
    });

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
