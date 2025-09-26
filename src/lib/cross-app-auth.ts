import { prisma } from './prisma';

export interface CrossAppMapping {
  id: string;
  scan2shipClientId: string;
  catalogClientId: string;
  catalogApiKey: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get catalog API key for a scan2ship client
 */
export async function getCatalogApiKey(scan2shipClientId: string): Promise<{
  catalogApiKey: string;
  catalogClientId: string;
} | null> {
  try {
    console.log('🔍 [CROSS_APP_AUTH] Looking for mapping for client:', scan2shipClientId);
    
    const mapping = await prisma.cross_app_mappings.findFirst({
      where: {
        scan2shipClientId,
        isActive: true
      }
    });

    console.log('🔍 [CROSS_APP_AUTH] Found mapping:', mapping ? 'YES' : 'NO');
    if (mapping) {
      console.log('🔍 [CROSS_APP_AUTH] Mapping details:', {
        id: mapping.id,
        catalogClientId: mapping.catalogClientId,
        hasApiKey: !!mapping.catalogApiKey
      });
    }

    if (!mapping) {
      console.log('❌ [CROSS_APP_AUTH] No mapping found for client:', scan2shipClientId);
      return null;
    }

    return {
      catalogApiKey: mapping.catalogApiKey,
      catalogClientId: mapping.catalogClientId
    };
  } catch (error) {
    console.error('❌ [CROSS_APP_AUTH] Error getting catalog API key:', error);
    return null;
  }
}

/**
 * Check if a scan2ship client has catalog app integration
 */
export async function hasCatalogIntegration(scan2shipClientId: string): Promise<boolean> {
  const mapping = await getCatalogApiKey(scan2shipClientId);
  return mapping !== null;
}

/**
 * Get all active cross-app mappings
 */
export async function getAllActiveMappings(): Promise<CrossAppMapping[]> {
  try {
    return await prisma.cross_app_mappings.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  } catch (error) {
    console.error('Error getting active mappings:', error);
    return [];
  }
}
