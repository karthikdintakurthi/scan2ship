console.log('🔗 UPI Payment Link Demo for Scan2Ship\n');

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

const payeeVpa = 'scan2ship@ybl';
const payeeName = 'Scan2Ship';
const transactionNote = 'Credit Recharge';

const amounts = [1000, 2000, 5000, 10000];

console.log('📋 Payment Details:');
console.log(`   Payee VPA: ${payeeVpa}`);
console.log(`   Payee Name: ${payeeName}`);
console.log(`   Transaction Note: ${transactionNote}\n`);

console.log('💰 Generated UPI Links:');
amounts.forEach(amount => {
  const upiLink = upiUrl({
    pa: payeeVpa,
    pn: payeeName,
    am: amount,
    tn: transactionNote
  });
  
  console.log(`\n   Amount: ₹${amount.toLocaleString()}`);
  console.log(`   UPI Link: ${upiLink}`);
  console.log(`   Decoded: ${decodeURIComponent(upiLink)}`);
});

console.log('\n📱 Usage:');
console.log('   • Desktop: Scan QR code with any UPI app');
console.log('   • Mobile: Click deep link to open UPI app directly');
console.log('   • All amounts use the same official Scan2Ship UPI ID');
