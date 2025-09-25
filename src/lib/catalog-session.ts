import { prisma } from './prisma';

export interface CatalogSession {
  id: string;
  scan2shipClientId: string;
  catalogClientId: string;
  catalogUserId: string;
  catalogUserEmail: string;
  catalogUserRole: string;
  catalogClientSlug: string | null;
  authToken: string;
  tokenExpiresAt: Date;
  isActive: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get active catalog session for a scan2ship client
 */
export async function getActiveCatalogSession(scan2shipClientId: string): Promise<CatalogSession | null> {
  try {
    const session = await prisma.catalog_sessions.findFirst({
      where: {
        scan2shipClientId,
        isActive: true,
        tokenExpiresAt: {
          gt: new Date() // Token hasn't expired
        }
      }
    });

    if (!session) {
      return null;
    }

    // Update last used timestamp
    await prisma.catalog_sessions.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() }
    });

    return session;
  } catch (error) {
    console.error('Error getting catalog session:', error);
    return null;
  }
}

/**
 * Check if catalog session is valid and not expired
 */
export async function isCatalogSessionValid(scan2shipClientId: string): Promise<boolean> {
  const session = await getActiveCatalogSession(scan2shipClientId);
  return session !== null;
}

/**
 * Invalidate catalog session (logout)
 */
export async function invalidateCatalogSession(scan2shipClientId: string): Promise<void> {
  try {
    await prisma.catalog_sessions.updateMany({
      where: {
        scan2shipClientId,
        isActive: true
      },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error invalidating catalog session:', error);
  }
}

/**
 * Get catalog session details for API calls
 */
export async function getCatalogSessionForApi(scan2shipClientId: string): Promise<{
  authToken: string;
  catalogClientId: string;
  catalogUserId: string;
  catalogUserEmail: string;
  catalogUserRole: string;
  catalogClientSlug: string | null;
} | null> {
  const session = await getActiveCatalogSession(scan2shipClientId);
  
  if (!session) {
    return null;
  }

  return {
    authToken: session.authToken,
    catalogClientId: session.catalogClientId,
    catalogUserId: session.catalogUserId,
    catalogUserEmail: session.catalogUserEmail,
    catalogUserRole: session.catalogUserRole,
    catalogClientSlug: session.catalogClientSlug
  };
}
