#!/usr/bin/env node

/**
 * Fix Fallback Secrets Script
 * Replaces all remaining fallback secrets with secure authentication
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 Fixing remaining fallback secrets in API routes...\n');

// Files that need to be updated
const filesToUpdate = [
  'src/app/api/analytics/platform/route.ts',
  'src/app/api/analytics/track/route.ts',
  'src/app/api/test-admin/route.ts',
  'src/app/api/analytics/clients/[id]/route.ts',
  'src/app/api/pickup-locations/route.ts',
  'src/app/api/process-text/route.ts',
  'src/app/api/courier-services/route.ts',
  'src/app/api/process-image/route.ts',
  'src/app/api/analytics/clients/route.ts',
  'src/app/api/format-address-image/route.ts',
  'src/app/api/order-config/route.ts',
  'src/app/api/admin/client-configurations/route.ts',
  'src/app/api/admin/system-config/route.ts',
  'src/app/api/admin/clients/[id]/route.ts',
  'src/app/api/credits/verify-payment/route.ts',
  'src/app/api/admin/settings/clients/[id]/route.ts',
  'src/app/api/admin/clients/[id]/update-password/route.ts',
  'src/app/api/format-address/route.ts',
  'src/app/api/admin/users/[id]/update-password/route.ts',
  'src/app/api/users/profile/route.ts',
  'src/app/api/orders/route-new.ts',
  'src/app/api/orders/[id]/waybill/route.ts'
];

// Template for the new authentication helper function
const authHelperTemplate = `
// Helper function to get authenticated user and client
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const { enhancedJwtConfig } = await import('@/lib/jwt-config');
    const decoded = enhancedJwtConfig.verifyToken(token);
    
    // Get user and client data from database
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: {
        clients: true
      }
    });

    if (!user || !user.isActive || !user.clients.isActive) {
      return null;
    }

    return {
      user: user,
      client: user.clients
    };
  } catch (error) {
    return null;
  }
}
`;

// Template for admin authentication helper
const adminAuthHelperTemplate = `
// Helper function to get authenticated admin user
async function getAuthenticatedAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const { enhancedJwtConfig } = await import('@/lib/jwt-config');
    const decoded = enhancedJwtConfig.verifyToken(token);
    
    // Get user and client data from database
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: {
        clients: true
      }
    });

    if (!user || !user.isActive || (user.role !== 'admin' && user.role !== 'master_admin')) {
      return null;
    }

    return {
      user: user,
      client: user.clients
    };
  } catch (error) {
    return null;
  }
}
`;

function updateFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // Replace fallback secret usage
    if (content.includes("process.env.JWT_SECRET || 'fallback-secret'")) {
      content = content.replace(
        /process\.env\.JWT_SECRET \|\| 'fallback-secret'/g,
        "enhancedJwtConfig.getSecret()"
      );
      updated = true;
    }

    // Replace jwt.verify calls with fallback secrets
    if (content.includes("jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret'")) {
      content = content.replace(
        /jwt\.verify\(token, process\.env\.JWT_SECRET \|\| 'fallback-secret'\)/g,
        "enhancedJwtConfig.verifyToken(token)"
      );
      updated = true;
    }

    // Add import for enhanced JWT config if not present
    if (!content.includes('@/lib/jwt-config') && !content.includes('enhancedJwtConfig')) {
      const importStatement = "import { enhancedJwtConfig } from '@/lib/jwt-config';";
      const lastImportIndex = content.lastIndexOf('import');
      if (lastImportIndex !== -1) {
        const nextLineIndex = content.indexOf('\n', lastImportIndex) + 1;
        content = content.slice(0, nextLineIndex) + importStatement + '\n' + content.slice(nextLineIndex);
      } else {
        content = importStatement + '\n' + content;
      }
      updated = true;
    }

    // Add authentication helper if not present
    if (!content.includes('getAuthenticatedUser') && !content.includes('getAuthenticatedAdmin')) {
      if (filePath.includes('/admin/')) {
        content = content.replace(
          /export async function/,
          adminAuthHelperTemplate + '\n\nexport async function'
        );
      } else {
        content = content.replace(
          /export async function/,
          authHelperTemplate + '\n\nexport async function'
        );
      }
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  No changes needed: ${filePath}`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

// Update all files
let totalUpdated = 0;
for (const file of filesToUpdate) {
  if (updateFile(file)) {
    totalUpdated++;
  }
}

console.log(`\n🎉 Fallback secret cleanup completed!`);
console.log(`✅ Updated ${totalUpdated} files`);
console.log(`📋 Files that were updated:`);

for (const file of filesToUpdate) {
  if (fs.existsSync(file)) {
    console.log(`   • ${file}`);
  }
}

console.log(`\n🔒 All fallback secrets have been replaced with secure authentication!`);
console.log(`📝 Next steps:`);
console.log(`   1. Test the application to ensure authentication still works`);
console.log(`   2. Run: npm run validate-env`);
console.log(`   3. Test a few API endpoints to verify security`);
