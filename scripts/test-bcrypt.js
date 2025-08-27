const bcrypt = require('bcryptjs');

async function testBcrypt() {
  try {
    console.log('🔍 Testing bcrypt...');
    
    const password = 'testpassword';
    console.log('📝 Original password:', password);
    
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('🔐 Hashed password:', hashedPassword);
    console.log('📏 Hash length:', hashedPassword.length);
    
    const isValid = await bcrypt.compare(password, hashedPassword);
    console.log('✅ Password validation:', isValid);
    
    console.log('✅ Bcrypt test successful!');
  } catch (error) {
    console.error('❌ Bcrypt test failed:', error);
    console.error('❌ Error stack:', error.stack);
  }
}

testBcrypt();
