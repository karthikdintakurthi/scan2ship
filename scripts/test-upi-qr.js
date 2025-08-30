const QRCode = require('qrcode');

function upiUrl({ pa, pn, am, tn }) {
  const params = new URLSearchParams({
    pa,                  // Payee VPA (UPI ID)
    pn,                  // Payee name
    am: String(am),      // Amount
    cu: "INR",           // Currency
    tn                   // Transaction note
  });
  return `upi://pay?${params.toString()}`;
}

async function testUPIQRGeneration() {
  try {
    console.log('🧪 Testing UPI QR Code Generation...\n');

    // Test UPI payment link using the working approach
    const upiLink = upiUrl({
      pa: "scan2ship@ybl",
      pn: "Scan2Ship",
      am: 1000,
      tn: "Credit Recharge"
    });

    console.log('📱 UPI Link:', upiLink);
    console.log('🔗 Decoded UPI Link:', decodeURIComponent(upiLink));

          // Generate QR code with better options
      const qrDataUrl = await QRCode.toDataURL(upiLink, {
        errorCorrectionLevel: "H",
        margin: 2,
        scale: 8,
        width: 300
      });

    console.log('✅ QR Code generated successfully!');
    console.log('📊 QR Code data URL length:', qrDataUrl.length);
    console.log('📊 QR Code data URL preview:', qrDataUrl.substring(0, 100) + '...');

    // Test different amounts
    const testAmounts = [1000, 2000, 5000, 10000];
    
    console.log('\n💰 Testing different amounts:');
    for (const amount of testAmounts) {
      const testLink = upiUrl({
        pa: "scan2ship@ybl",
        pn: "Scan2Ship",
        am: amount,
        tn: "Credit Recharge"
      });
      const testQR = await QRCode.toDataURL(testLink, { 
        errorCorrectionLevel: "H",
        margin: 2,
        scale: 8,
        width: 200 
      });
      console.log(`   ₹${amount.toLocaleString()}: QR generated (${testQR.length} chars)`);
    }

    console.log('\n🎉 All tests passed! UPI QR code generation is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testUPIQRGeneration();
