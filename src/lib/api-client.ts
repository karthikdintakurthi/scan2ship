// Utility for making authenticated API calls
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  // Get the auth token from localStorage
  let token: string | null = null;
  
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('authToken');
  }

  if (!token) {
    throw new Error('No authentication token found');
  }

  // Set up headers with authorization
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  // Make the request
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle unauthorized responses
  if (response.status === 401) {
    // Clear the invalid token
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
    throw new Error('Authentication failed - please login again');
  }

  return response;
}

// Helper for GET requests
export async function authenticatedGet(url: string) {
  return authenticatedFetch(url, { method: 'GET' });
}

// Helper for POST requests
export async function authenticatedPost(url: string, data: any) {
  return authenticatedFetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Helper for PUT requests
export async function authenticatedPut(url: string, data: any) {
  return authenticatedFetch(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Helper for DELETE requests
export async function authenticatedDelete(url: string) {
  return authenticatedFetch(url, { method: 'DELETE' });
}
