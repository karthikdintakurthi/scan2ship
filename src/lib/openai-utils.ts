/**
 * OpenAI API Utility Functions
 * Provides improved error handling and response formatting for OpenAI API calls
 */

interface OpenAIErrorResponse {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}

interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
  usage: OpenAIUsage;
}

export class OpenAIError extends Error {
  public statusCode: number;
  public errorType: string;
  public errorCode?: string;
  public retryable: boolean;

  constructor(message: string, statusCode: number, errorType: string, errorCode?: string, retryable: boolean = false) {
    super(message);
    this.name = 'OpenAIError';
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.errorCode = errorCode;
    this.retryable = retryable;
  }
}

/**
 * Enhanced error handling for OpenAI API responses
 */
export async function handleOpenAIResponse(response: Response): Promise<OpenAIResponse> {
  const statusCode = response.status;
  
  if (!response.ok) {
    let errorMessage = `OpenAI API request failed with status ${statusCode}`;
    let errorType = 'api_error';
    let errorCode: string | undefined;
    let retryable = false;

    try {
      const errorData: OpenAIErrorResponse = await response.json();
      
      if (errorData.error) {
        errorMessage = errorData.error.message;
        errorType = errorData.error.type;
        errorCode = errorData.error.code;
        
        // Determine if error is retryable
        retryable = isRetryableError(statusCode, errorType, errorCode);
      }
    } catch (parseError) {
      // If we can't parse the error response, use the response text
      try {
        const errorText = await response.text();
        errorMessage = `OpenAI API error: ${errorText}`;
      } catch (textError) {
        errorMessage = `OpenAI API error: Unable to read error response (Status: ${statusCode})`;
      }
    }

    // Provide more descriptive error messages
    const descriptiveMessage = getDescriptiveErrorMessage(statusCode, errorMessage, errorType);
    
    throw new OpenAIError(descriptiveMessage, statusCode, errorType, errorCode, retryable);
  }

  try {
    const data: OpenAIResponse = await response.json();
    return data;
  } catch (parseError) {
    throw new OpenAIError(
      'Failed to parse OpenAI API response',
      500,
      'parse_error',
      undefined,
      false
    );
  }
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(statusCode: number, errorType: string, errorCode?: string): boolean {
  // Rate limit errors are retryable
  if (statusCode === 429) return true;
  
  // Server errors (5xx) are generally retryable
  if (statusCode >= 500) return true;
  
  // Specific OpenAI error types that are retryable
  if (errorType === 'rate_limit_exceeded') return true;
  if (errorType === 'server_error') return true;
  if (errorType === 'temporary_error') return true;
  
  // Specific error codes that are retryable
  if (errorCode === 'rate_limit_exceeded') return true;
  if (errorCode === 'server_error') return true;
  
  return false;
}

/**
 * Get descriptive error messages for common OpenAI errors
 */
function getDescriptiveErrorMessage(statusCode: number, originalMessage: string, errorType: string): string {
  switch (statusCode) {
    case 400:
      if (errorType === 'invalid_request_error') {
        return `Invalid request to OpenAI API: ${originalMessage}. Please check your request parameters and try again.`;
      }
      return `Bad request to OpenAI API: ${originalMessage}. Please verify your input data.`;
      
    case 401:
      return `Authentication failed with OpenAI API: ${originalMessage}. Please check your API key configuration.`;
      
    case 403:
      return `Access forbidden by OpenAI API: ${originalMessage}. Your API key may not have permission for this operation.`;
      
    case 404:
      return `OpenAI API endpoint not found: ${originalMessage}. The requested model or endpoint may not be available.`;
      
    case 429:
      return `Rate limit exceeded with OpenAI API: ${originalMessage}. Please wait a moment and try again.`;
      
    case 500:
      return `OpenAI API server error: ${originalMessage}. This is a temporary issue, please try again later.`;
      
    case 502:
      return `OpenAI API gateway error: ${originalMessage}. The service is temporarily unavailable.`;
      
    case 503:
      return `OpenAI API service unavailable: ${originalMessage}. The service is temporarily down for maintenance.`;
      
    case 504:
      return `OpenAI API timeout: ${originalMessage}. The request took too long to process.`;
      
    default:
      return `OpenAI API error (${statusCode}): ${originalMessage}`;
  }
}

/**
 * Clean and format OpenAI response content
 */
export function cleanOpenAIResponse(content: string): string {
  if (!content) return '';
  
  // Remove special characters that might cause issues
  let cleaned = content
    // Replace problematic characters
    .replace(/&/g, 'and')  // Replace & with 'and'
    .replace(/</g, '&lt;') // Escape < for HTML safety
    .replace(/>/g, '&gt;') // Escape > for HTML safety
    .replace(/"/g, '"')    // Replace smart quotes with regular quotes
    .replace(/'/g, "'")    // Replace smart apostrophes with regular apostrophes
    .replace(/–/g, '-')    // Replace en-dash with regular dash
    .replace(/—/g, '-')    // Replace em-dash with regular dash
    .replace(/…/g, '...')  // Replace ellipsis with three dots
    .replace(/"/g, '"')    // Replace left double quote
    .replace(/"/g, '"')    // Replace right double quote
    .replace(/'/g, "'")    // Replace left single quote
    .replace(/'/g, "'")    // Replace right single quote
    // Remove or replace other problematic characters
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Remove non-printable characters except extended Unicode
    .trim();
  
  return cleaned;
}

/**
 * Extract JSON from OpenAI response content
 */
export function extractJSONFromResponse(content: string): any {
  if (!content) {
    throw new Error('No content provided for JSON extraction');
  }
  
  // Clean the content first
  const cleanedContent = cleanOpenAIResponse(content);
  
  // Try to find JSON in the response
  const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
  
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      throw new Error(`Failed to parse JSON from OpenAI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
  }
  
  // If no JSON object found, try parsing the entire content
  try {
    return JSON.parse(cleanedContent);
  } catch (parseError) {
    throw new Error(`No valid JSON found in OpenAI response. Content: ${cleanedContent.substring(0, 200)}...`);
  }
}

/**
 * Enhanced OpenAI API call with retry logic
 */
export async function callOpenAIWithRetry(
  apiKey: string,
  requestBody: any,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<OpenAIResponse> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 OpenAI API attempt ${attempt}/${maxRetries}`);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await handleOpenAIResponse(response);
      console.log(`✅ OpenAI API call successful on attempt ${attempt}`);
      return data;
      
    } catch (error) {
      lastError = error;
      
      if (error instanceof OpenAIError && error.retryable && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`⏳ Retrying OpenAI API call in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If not retryable or max retries reached, throw the error
      throw error;
    }
  }
  
  // This should never be reached, but just in case
  throw lastError || new Error('OpenAI API call failed after all retry attempts');
}

/**
 * Get enhanced prompt with special character handling instructions
 */
export function getEnhancedPrompt(basePrompt: string): string {
  return `${basePrompt}

IMPORTANT FORMATTING INSTRUCTIONS:
1. Replace all "&" characters with "and" in your response
2. Use only standard ASCII characters (avoid smart quotes, em-dashes, etc.)
3. Use regular quotes (") instead of smart quotes ("")
4. Use regular apostrophes (') instead of smart apostrophes (')
5. Use regular dashes (-) instead of en-dashes (–) or em-dashes (—)
6. Use three dots (...) instead of ellipsis (…)
7. Ensure all text is properly encoded and safe for JSON parsing
8. Return ONLY valid JSON - no additional text, explanations, or formatting outside the JSON object`;
}
