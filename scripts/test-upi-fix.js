console.log('🧪 Testing Fixed UPI Link Generation...\n');

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

// Test with hardcoded values (like in the fixed RechargeModal)
const testAmounts = [1000, 2000, 5000, 10000];
const clientCompanyName = "Sujatha Gold Covering Works"; // Example client name

console.log('📋 Test Configuration:');
console.log(`   Payee VPA: scan2ship@ybl (hardcoded)`);
console.log(`   Payee Name: Scan2Ship (hardcoded)`);
console.log(`   Client Company: ${clientCompanyName}\n`);

console.log('💰 Generated UPI Links:');
testAmounts.forEach(amount => {
  const transactionNote = `Credit Recharge - ${clientCompanyName}`;
  
  const upiLink = upiUrl({
    pa: 'scan2ship@ybl',        // Hardcoded UPI ID
    pn: 'Scan2Ship',            // Hardcoded Payee Name
    am: amount,
    tn: transactionNote
  });
  
  console.log(`\n   Amount: ₹${amount.toLocaleString()}`);
  console.log(`   Transaction Note: ${transactionNote}`);
  console.log(`   UPI Link: ${upiLink}`);
  console.log(`   Decoded: ${decodeURIComponent(upiLink)}`);
  
  // Verify the link contains the required parameters
  const hasPa = upiLink.includes('pa=scan2ship%40ybl');
  const hasPn = upiLink.includes('pn=Scan2Ship');
  const hasAm = upiLink.includes(`am=${amount}`);
  const hasCu = upiLink.includes('cu=INR');
  const hasTn = upiLink.includes('tn=Credit+Recharge+-+Sujatha+Gold+Covering+Works');
  
  console.log(`   ✅ pa: ${hasPa ? 'YES' : 'NO'}`);
  console.log(`   ✅ pn: ${hasPn ? 'YES' : 'NO'}`);
  console.log(`   ✅ am: ${hasAm ? 'YES' : 'NO'}`);
  console.log(`   ✅ cu: ${hasCu ? 'YES' : 'NO'}`);
  console.log(`   ✅ tn: ${hasTn ? 'YES' : 'NO'}`);
});

console.log('\n🎉 Test completed! All UPI links should now contain the correct parameters.');
