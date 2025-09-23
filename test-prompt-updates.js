const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://karthiknaidudintakurthi@localhost:5432/vanitha-logistics"
    }
  }
});

async function testPromptUpdates() {
  try {
    console.log('🧪 Testing updated OpenAI prompts for address processing...\n');
    
    // Get a user for authentication
    const user = await prisma.users.findFirst({
      where: {
        clientId: 'client-1756653250197-7ltxt67xn'
      },
      include: {
        clients: true
      }
    });
    
    if (!user) {
      console.log('❌ No user found for testing');
      return;
    }
    
    console.log('✅ User found:', user.email);
    console.log('  Client:', user.clients.name);
    console.log('');
    
    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        clientId: user.clientId
      },
      process.env.JWT_SECRET || 'vanitha-logistics-super-secret-jwt-key-2024',
      {
        issuer: 'vanitha-logistics',
        audience: 'vanitha-logistics-users',
        expiresIn: '1h',
        algorithm: 'HS256'
      }
    );
    
    console.log('✅ JWT token generated');
    console.log('');
    
    // Test cases for address processing
    const testCases = [
      {
        name: 'Address with reseller info',
        addressText: 'John Doe\n123 Main St, Mumbai\nFrom: ABC Store\nContact: 9876543210\nPincode: 400001'
      },
      {
        name: 'Address without reseller info',
        addressText: 'Jane Smith\n456 Park Ave, Delhi\nMobile: 8765432109\nPincode: 110001'
      },
      {
        name: 'Address with only reseller name',
        addressText: 'Robert Johnson\n789 Oak St, Bangalore\nFrom: XYZ Agency\nPincode: 560001'
      },
      {
        name: 'Address with only reseller mobile',
        addressText: 'Alice Brown\n321 Pine St, Chennai\nReseller Mobile: 7654321098\nPincode: 600001'
      }
    ];
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`--- Test Case ${i + 1}: ${testCase.name} ---`);
      
      try {
        const response = await fetch('http://localhost:3000/api/format-address', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ addressText: testCase.addressText })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Address processed successfully');
          console.log('  Customer Name:', data.formattedAddress.customer_name);
          console.log('  Mobile:', data.formattedAddress.mobile_number);
          console.log('  Reseller Name:', data.formattedAddress.reseller_name || 'EMPTY');
          console.log('  Reseller Mobile:', data.formattedAddress.reseller_mobile || 'EMPTY');
          console.log('  Pincode:', data.formattedAddress.pincode);
          console.log('  City:', data.formattedAddress.city);
          console.log('  State:', data.formattedAddress.state);
          
          // Check if reseller fields are empty strings instead of "no name"/"no number"
          const resellerName = data.formattedAddress.reseller_name;
          const resellerMobile = data.formattedAddress.reseller_mobile;
          
          if (resellerName === '' || resellerName === null || resellerName === undefined) {
            console.log('✅ Reseller name is properly empty');
          } else if (resellerName.toLowerCase().includes('no name')) {
            console.log('❌ Reseller name contains "no name" - should be empty string');
          } else {
            console.log('✅ Reseller name has valid data:', resellerName);
          }
          
          if (resellerMobile === '' || resellerMobile === null || resellerMobile === undefined) {
            console.log('✅ Reseller mobile is properly empty');
          } else if (resellerMobile.toLowerCase().includes('no number')) {
            console.log('❌ Reseller mobile contains "no number" - should be empty string');
          } else {
            console.log('✅ Reseller mobile has valid data:', resellerMobile);
          }
          
        } else {
          const errorText = await response.text();
          console.log('❌ API Error:', response.status, response.statusText);
          console.log('Error details:', errorText);
        }
        
      } catch (error) {
        console.log('❌ Request failed:', error.message);
      }
      
      console.log('---\n');
    }
    
    console.log('🎉 Prompt update testing completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Set JWT secret for testing
process.env.JWT_SECRET = 'vanitha-logistics-super-secret-jwt-key-2024';

testPromptUpdates();
