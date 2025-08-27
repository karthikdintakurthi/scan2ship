// Test API key extraction logic
function testApiKeyExtraction() {
  console.log('🧪 Testing API Key Extraction Logic...\n');

  // Test case 1: JavaScript code wrapped API key
  const jsWrappedKey = "var clientKeyD = '52f81411e7185b24602a6b2b4b52ac491ed00a24';";
  console.log('1️⃣ JavaScript wrapped key:', jsWrappedKey);
  
  let cleanApiKey = jsWrappedKey;
  if (jsWrappedKey.includes("'") && jsWrappedKey.includes('clientKeyD')) {
    const match = jsWrappedKey.match(/'([^']+)'/);
    if (match) {
      cleanApiKey = match[1];
      console.log('   ✅ Extracted clean API key:', cleanApiKey);
    }
  }
  
  // Test case 2: Direct API key
  const directKey = '52f81411e7185b24602a6b2b4b52ac491ed00a24';
  console.log('\n2️⃣ Direct API key:', directKey);
  console.log('   ✅ No extraction needed');
  
  // Test case 3: Test the header format
  console.log('\n3️⃣ Testing header format:');
  console.log('   Authorization: Token', cleanApiKey);
  
  // Test case 4: Test the full header object
  const headers = {
    'Authorization': `Token ${cleanApiKey}`,
    'Accept': 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded'
  };
  
  console.log('\n4️⃣ Full headers object:');
  console.log(JSON.stringify(headers, null, 2));
  
  console.log('\n🎉 API key extraction test completed!');
}

// Run the test
testApiKeyExtraction();
