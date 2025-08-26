import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Encryption key for sensitive data
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'vanitha-logistics-encryption-key-2024';

// Helper function to decrypt sensitive data
function decrypt(encryptedText: string): string {
  try {
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('❌ Error decrypting value:', error);
    return encryptedText; // Return original if decryption fails
  }
}

// Helper function to get authenticated user
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        client: {
          include: {
            pickupLocations: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`📊 [API_PICKUP_LOCATIONS_GET] Fetching pickup locations for client: ${user.client.companyName}`);

    // Get pickup locations for the current client
    const pickupLocations = await prisma.pickupLocation.findMany({
      where: { clientId: user.client.id },
      orderBy: { label: 'asc' }
    });

    // Transform pickup locations to match the expected format
    const formattedLocations = pickupLocations.map(location => {
      // Decrypt the Delhivery API key if it exists
      let decryptedApiKey = '';
      if (location.delhiveryApiKey) {
        // Check if the API key is encrypted (96 characters) or plain text (40 characters for Delhivery)
        if (location.delhiveryApiKey.length === 96) {
          // Likely encrypted - try to decrypt
          try {
            decryptedApiKey = decrypt(location.delhiveryApiKey);
            console.log(`🔓 [PICKUP_LOCATIONS] Decrypted API key for ${location.label}: ${decryptedApiKey.substring(0, 8)}...`);
          } catch (error) {
            console.error(`❌ [PICKUP_LOCATIONS] Failed to decrypt API key for ${location.label}:`, error);
            decryptedApiKey = location.delhiveryApiKey; // Fallback to encrypted value
          }
        } else if (location.delhiveryApiKey.length === 40) {
          // Likely plain text Delhivery API key
          decryptedApiKey = location.delhiveryApiKey;
          console.log(`🔑 [PICKUP_LOCATIONS] Found plain text API key for ${location.label}: ${decryptedApiKey.substring(0, 8)}...`);
        } else {
          // Unknown format - return as-is
          decryptedApiKey = location.delhiveryApiKey;
          console.warn(`⚠️ [PICKUP_LOCATIONS] Unknown API key format for ${location.label}: length ${location.delhiveryApiKey.length}`);
        }
      }

      return {
        value: location.value,
        label: location.label,
        delhiveryApiKey: decryptedApiKey,
        // Add default configuration for other required fields
        productDetails: {
          description: 'ARTIFICAL JEWELLERY',
          commodity_value: 5000,
          tax_value: 0,
          category: 'ARTIFICAL JEWELLERY',
          hsn_code: ''
        },
        returnAddress: {
          address: 'Mahalakshmi Complex-2, 2nd floor Vijayawada',
          pincode: '520002'
        },
        sellerDetails: {
          name: location.label,
          address: 'Mahalakshmi Complex-2, 2nd floor Vijayawada 520002',
          gst: '',
          cst_no: '',
          tin: ''
        },
        vendorPickupLocation: location.value,
        shipmentDimensions: {
          length: 10,
          breadth: 10,
          height: 10
        },
        fragileShipment: false
      };
    });

    console.log(`✅ [API_PICKUP_LOCATIONS_GET] Found ${formattedLocations.length} pickup locations for client ${user.client.companyName}`);

    return NextResponse.json({
      pickupLocations: formattedLocations,
      clientId: user.client.id,
      clientName: user.client.companyName
    });

  } catch (error) {
    console.error('❌ [API_PICKUP_LOCATIONS_GET] Error fetching pickup locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pickup locations' },
      { status: 500 }
    );
  }
}
