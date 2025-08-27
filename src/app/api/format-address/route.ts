import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { CreditService } from '@/lib/credit-service'

// Helper function to get authenticated user and client
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    
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

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client, user } = auth;
    const { addressText } = await request.json()
    
    if (!addressText) {
      return NextResponse.json({ error: 'Address text is required' }, { status: 400 })
    }

    // Check if client has sufficient credits for text processing
    const textProcessingCreditCost = CreditService.getCreditCost('TEXT_PROCESSING');
    const hasSufficientCredits = await CreditService.hasSufficientCredits(client.id, textProcessingCreditCost);

    if (!hasSufficientCredits) {
      return NextResponse.json({
        error: 'Insufficient credits',
        details: `Text processing requires ${textProcessingCreditCost} credits. Please contact your administrator to add more credits.`
      }, { status: 402 });
    }

    // Check if OpenAI API key is configured
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const prompt = `Please format the following Indian address and extract the required information. Return ONLY a valid JSON object with the exact structure specified:

Address text: "${addressText}"

Expected JSON response format:
{
  "customer_name": "First and Last name (properly formatted with proper case)",
  "mobile_number": "remove any international formats and give just 10 digit mobile number",
  "alt_mobile_number": "second mobile number if present, otherwise null",
  "pincode": "6 digit pincode entered",
  "city": "City name",
  "state": "State name", 
  "country": "fetch it, default to India",
  "address": "rest of the address without name, city, state, country, pincode in it",
  "tracking_number": "Barcode number if present, or printed number below barcode",
  "reseller_name": "Secondary name if present (from reseller, from, contact person, etc.)",
  "reseller_mobile": "Secondary mobile number if present (from reseller, from, contact person, etc.)"
}

Rules:
1. CAREFULLY ANALYZE the entire address text to find the person's name - it may be mentioned anywhere in the text
2. Look for names in various formats: "Name:", "Contact:", "Customer:", "To:", "Attn:", or standalone names
3. IMPORTANT: If the address starts with a name (like "G.subrahmanyam" or "John Doe"), extract that as the customer name
4. Handle names with initials (like "G.subrahmanyam" → "G. Subrahmanyam")
5. Format the customer name properly with proper case (e.g., "John Doe" not "john doe" or "JOHN DOE")
6. If no name is found anywhere in the text, use "No Name"
7. MOBILE NUMBER EXTRACTION: Look for ALL mobile numbers in the address
8. If there are 2 mobile numbers mentioned:
   - First mobile number goes to "mobile_number" field
   - Second mobile number goes to "alt_mobile_number" field
9. Remove any +91, 91, or other country codes, keep only 10 digits
10. RESELLER DETECTION: Look for secondary names and mobile numbers with labels like "From:", "Reseller:", "Contact Person:", "Agent:", "Dealer:", etc.
11. CRITICAL: When you see "From:" followed by a name and mobile number on separate lines, extract that as reseller information
12. If a secondary name is found, put it in reseller_name field
13. If a secondary mobile number is found, put it in reseller_mobile field
14. Extract 6-digit pincode
15. Extract city name
16. Extract state name
17. Set country to "India" if not specified
18. Address field should contain only the street address, building, area, etc. without the extracted fields
19. TRACKING NUMBER EXTRACTION: Look for barcode numbers or tracking numbers in the text
20. If barcode number is present, extract it
21. If no tracking number found, set to null
22. Return ONLY the JSON object, no additional text or explanation

Examples of name extraction:
- "G.subrahmanyam, plot no 92, flat no.202..." → customer_name: "G. Subrahmanyam"
- "John Doe, 123 Main St, Mumbai" → customer_name: "John Doe"
- "Address: 123 Main St, Jane Smith, Mumbai" → customer_name: "Jane Smith"
- "Contact: Robert Johnson, 456 Park Ave" → customer_name: "Robert Johnson"  
- "To: Mr. Mary Wilson" → customer_name: "Mary Wilson"
- "Customer: Alice Brown" → customer_name: "Alice Brown"
- "A.B. Kumar, 789 Oak St, Delhi" → customer_name: "A.B. Kumar"

Examples of mobile number extraction:
- "Mobile: 9876543210" → mobile_number: "9876543210", alt_mobile_number: null
- "Contact: 9876543210, Alt: 8765432109" → mobile_number: "9876543210", alt_mobile_number: "8765432109"
- "Phone: 9876543210, Mobile: 8765432109" → mobile_number: "9876543210", alt_mobile_number: "8765432109"
- "9876543210, 8765432109" → mobile_number: "9876543210", alt_mobile_number: "8765432109"

Examples of reseller detection:
- "From: ABC Store, Contact: 9876543210" → reseller_name: "ABC Store", reseller_mobile: "9876543210"
- "Reseller: XYZ Agency, Mobile: 8765432109" → reseller_name: "XYZ Agency", reseller_mobile: "8765432109"
- "Agent: John Dealer, Phone: 7654321098" → reseller_name: "John Dealer", reseller_mobile: "7654321098"
- "Dealer: Mary Agent, Contact: 6543210987" → reseller_name: "Mary Agent", reseller_mobile: "6543210987"
- "From: kavitha\n6281182320" → reseller_name: "kavitha", reseller_mobile: "6281182320"
- "From: John\n9876543210" → reseller_name: "John", reseller_mobile: "9876543210"

Examples of tracking number extraction:
- "Package with barcode 123456789012345" → tracking_number: "123456789012345"
- "Tracking: ABC123456789" → tracking_number: "ABC123456789"
- "No barcode mentioned" → tracking_number: null`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    console.log('🔍 OpenAI API Response:')
    console.log('📋 Full Response Data:', JSON.stringify(data, null, 2))
    console.log('💬 Content:', content)

    if (!content) {
      throw new Error('No content received from OpenAI')
    }

    // Try to parse the JSON response
    let parsedAddress
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedAddress = JSON.parse(jsonMatch[0])
        console.log('✅ JSON extracted using regex match')
      } else {
        parsedAddress = JSON.parse(content)
        console.log('✅ JSON parsed directly from content')
      }
      
      console.log('📊 Parsed Address Data:', JSON.stringify(parsedAddress, null, 2))
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response:', content)
      console.error('🔍 Parse Error Details:', parseError)
      throw new Error('Invalid response format from OpenAI')
    }

    // Validate the parsed data
    const requiredFields = ['customer_name', 'mobile_number', 'pincode', 'city', 'state', 'country', 'address']
    for (const field of requiredFields) {
      if (!parsedAddress[field]) {
        return NextResponse.json({ 
          error: `Missing required field: ${field}`,
          receivedData: parsedAddress 
        }, { status: 400 })
      }
    }
    
    // Set default values for optional fields if not present
    if (!parsedAddress.tracking_number) {
      parsedAddress.tracking_number = null
    }
    if (!parsedAddress.reseller_name) {
      parsedAddress.reseller_name = null
    }
    if (!parsedAddress.reseller_mobile) {
      parsedAddress.reseller_mobile = null
    }

    console.log('🎉 Final Response Sent to Client:', JSON.stringify(parsedAddress, null, 2))
    
    // Deduct credits for successful text processing
    try {
      await CreditService.deductTextProcessingCredits(client.id, user.id);
      console.log('💳 [API_FORMAT_ADDRESS] Credits deducted for text processing: 1 credit');
    } catch (creditError) {
      console.error('❌ [API_FORMAT_ADDRESS] Failed to deduct credits for text processing:', creditError);
    }
    
    return NextResponse.json({ 
      success: true, 
      formattedAddress: parsedAddress 
    })

  } catch (error) {
    console.error('Error formatting address:', error)
    return NextResponse.json({ 
      error: 'Failed to format address',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
