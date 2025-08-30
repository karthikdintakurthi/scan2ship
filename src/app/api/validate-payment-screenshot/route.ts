import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { CreditService } from '@/lib/credit-service';

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
    console.log('🔍 [API_VALIDATE_PAYMENT_SCREENSHOT] Starting payment screenshot validation...');

    // Authenticate user
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client, user } = auth;

    console.log('✅ [API_VALIDATE_PAYMENT_SCREENSHOT] Authentication successful:', {
      userId: user.id,
      clientId: client.id,
      clientName: client.companyName
    });

    // Parse the request body
    const formData = await request.formData();
    const screenshot = formData.get('screenshot') as File;
    const expectedAmount = parseInt(formData.get('expectedAmount') as string);
    const transactionRef = formData.get('transactionRef') as string;

    if (!screenshot || !expectedAmount || !transactionRef) {
      return NextResponse.json({ 
        error: 'Screenshot, expected amount, and transaction reference are required' 
      }, { status: 400 });
    }

    console.log('📋 [API_VALIDATE_PAYMENT_SCREENSHOT] Request details:', {
      screenshotSize: screenshot.size,
      screenshotType: screenshot.type,
      expectedAmount,
      transactionRef
    });

    // Check if OpenAI API key is configured
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Convert image to base64
    const arrayBuffer = await screenshot.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = screenshot.type;

    console.log('🖼️ [API_VALIDATE_PAYMENT_SCREENSHOT] Image converted to base64, size:', base64Image.length);

    // Prepare OpenAI Vision API request
    const models = ['gpt-4o-mini', 'gpt-4o'];
    let lastError = '';

    for (const model of models) {
      try {
        console.log(`🤖 [API_VALIDATE_PAYMENT_SCREENSHOT] Trying model: ${model}`);

        const requestBody = {
          model: model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `You are a payment validation expert. Analyze this payment screenshot and extract the following information in JSON format:

1. UTR Number: Look for UTR (Unique Transaction Reference) number, Transaction Reference, Payment Reference, or similar identifiers
2. Payment Amount: Extract the exact payment amount in INR (Indian Rupees)
3. Payment Status: Check if the payment was successful
4. Payee Details: Extract payee name if visible
5. UPI ID: Extract the UPI ID (UPI address) that the payment was sent to

IMPORTANT VALIDATION RULES:
- Only extract UTR numbers that are explicitly labeled as UTR, Transaction Reference, Payment Reference, etc.
- Do NOT extract barcodes, QR codes, or random numbers
- The payment amount must match exactly with the expected amount: ₹${expectedAmount.toLocaleString()}
- The UPI ID must be exactly "scan2ship@ybl" (case-sensitive)
- If amounts don't match, mark validation as failed
- If UTR is not clearly visible or labeled, mark it as not found
- If UPI ID doesn't match "scan2ship@ybl", mark validation as failed

Return the response in this exact JSON format:
{
  "utrNumber": "UTR123456789012" or null if not found,
  "paymentAmount": 1000.00,
  "paymentStatus": "success" or "failed" or "pending",
  "payeeName": "Payee Name" or null if not visible,
  "upiId": "scan2ship@ybl" or null if not found,
  "validationPassed": true or false,
  "validationMessage": "Detailed validation message",
  "extractedText": "All text found in the image for debugging"
}

Focus on accuracy and only extract information that is clearly visible and properly labeled.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1000,
          temperature: 0.1
        };

        console.log('📋 [API_VALIDATE_PAYMENT_SCREENSHOT] Sending request to OpenAI Vision API...');

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        console.log('📋 [API_VALIDATE_PAYMENT_SCREENSHOT] OpenAI API Response Status:', response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ [API_VALIDATE_PAYMENT_SCREENSHOT] OpenAI API Error Response for ${model}:`, errorText);
          lastError = `OpenAI API error: ${response.status} - ${errorText}`;
          continue; // Try next model
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        console.log('🔍 [API_VALIDATE_PAYMENT_SCREENSHOT] OpenAI Vision API Response:');
        console.log('💬 Content:', content);

        if (!content) {
          throw new Error('No content received from OpenAI');
        }

        // Parse the JSON response
        let validationResult;
        try {
          // Extract JSON from the response (in case there's extra text)
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            validationResult = JSON.parse(jsonMatch[0]);
            console.log('✅ [API_VALIDATE_PAYMENT_SCREENSHOT] JSON extracted using regex match');
          } else {
            validationResult = JSON.parse(content);
            console.log('✅ [API_VALIDATE_PAYMENT_SCREENSHOT] JSON parsed directly from content');
          }

          console.log('📊 [API_VALIDATE_PAYMENT_SCREENSHOT] Parsed Validation Result:', JSON.stringify(validationResult, null, 2));
        } catch (parseError) {
          console.error('❌ [API_VALIDATE_PAYMENT_SCREENSHOT] Failed to parse OpenAI response:', content);
          console.error('🔍 Parse Error Details:', parseError);
          throw new Error('Invalid response format from OpenAI');
        }

        // Validate the parsed data structure
        const requiredFields = ['utrNumber', 'paymentAmount', 'paymentStatus', 'upiId', 'validationPassed', 'validationMessage'];
        for (const field of requiredFields) {
          if (validationResult[field] === undefined) {
            return NextResponse.json({
              error: `Missing required field in OpenAI response: ${field}`,
              receivedData: validationResult
            }, { status: 400 });
          }
        }

        // Additional validation logic
        const extractedAmount = validationResult.paymentAmount;
        const amountMatches = extractedAmount === expectedAmount;
        const utrFound = validationResult.utrNumber && validationResult.utrNumber.trim() !== '';
        const paymentSuccessful = validationResult.paymentStatus === 'success';
        const upiIdMatches = validationResult.upiId === 'scan2ship@ybl';

        // Update validation result based on our business logic
        validationResult.amountMatches = amountMatches;
        validationResult.utrFound = utrFound;
        validationResult.paymentSuccessful = paymentSuccessful;
        validationResult.upiIdMatches = upiIdMatches;
        validationResult.expectedAmount = expectedAmount;

        // Final validation decision
        const finalValidationPassed = amountMatches && utrFound && paymentSuccessful && upiIdMatches;
        validationResult.finalValidationPassed = finalValidationPassed;

        console.log('🎯 [API_VALIDATE_PAYMENT_SCREENSHOT] Final Validation Result:', {
          amountMatches,
          utrFound,
          paymentSuccessful,
          upiIdMatches,
          finalValidationPassed,
          extractedAmount,
          expectedAmount,
          utrNumber: validationResult.utrNumber,
          upiId: validationResult.upiId
        });

        // Deduct credits for successful image processing
        try {
          await CreditService.deductImageProcessingCredits(client.id, user.id);
          console.log('💳 [API_VALIDATE_PAYMENT_SCREENSHOT] Credits deducted for image processing: 2 credits');
        } catch (creditError) {
          console.error('❌ [API_VALIDATE_PAYMENT_SCREENSHOT] Failed to deduct credits for image processing:', creditError);
        }

        return NextResponse.json({
          success: true,
          validationResult
        });

      } catch (error) {
        console.error(`❌ [API_VALIDATE_PAYMENT_SCREENSHOT] Error with model ${model}:`, error);
        lastError = error instanceof Error ? error.message : 'Unknown error';
        continue; // Try next model
      }
    }

    // If we get here, all models failed
    console.error('❌ [API_VALIDATE_PAYMENT_SCREENSHOT] All OpenAI models failed');
    return NextResponse.json({
      error: 'Failed to validate payment screenshot',
      details: lastError
    }, { status: 500 });

  } catch (error) {
    console.error('❌ [API_VALIDATE_PAYMENT_SCREENSHOT] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to validate payment screenshot' },
      { status: 500 }
    );
  }
}
