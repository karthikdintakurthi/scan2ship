// Simple script to reset authentication state
console.log('Resetting authentication state...');

// Clear localStorage authentication
if (typeof window !== 'undefined') {
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('authTimestamp');
  console.log('Authentication state cleared!');
  console.log('Please refresh the page and enter the password again.');
} else {
  console.log('This script should be run in the browser console');
}
