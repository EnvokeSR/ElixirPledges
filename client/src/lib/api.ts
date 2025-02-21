import { toast } from "@/hooks/use-toast";

// Get the base URL from environment or fallback to relative path
const getBaseUrl = () => {
  // In development, use relative path
  if (import.meta.env.DEV) {
    return '';
  }

  // In production, construct from window.location
  const baseUrl = `${window.location.protocol}//${window.location.host}`;
  console.log('API Base URL:', baseUrl, 'Environment:', import.meta.env.MODE);
  return baseUrl;
};

type ApiResponse<T> = {
  status: 'ok' | 'error';
  data?: T;
  message?: string;
  statusCode?: number;
};

export const api = {
  fetch: async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const url = `${getBaseUrl()}${endpoint}`;
    console.log('Fetching from:', url);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        credentials: 'include'
      });

      // Log response status and headers for debugging
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid content type. Expected JSON response.');
      }

      const jsonResponse: ApiResponse<T> = await response.json();
      console.log('API Response:', jsonResponse); // Add detailed logging

      // Check if the response follows our expected format
      if (!jsonResponse || typeof jsonResponse !== 'object') {
        throw new Error('Invalid response format: Response is not an object');
      }

      if (!('status' in jsonResponse)) {
        throw new Error('Invalid response format: Missing status field');
      }

      if (jsonResponse.status === 'error') {
        throw new Error(jsonResponse.message || 'An error occurred');
      }

      // If we have data property, return it, otherwise return the whole response minus status
      if ('data' in jsonResponse && jsonResponse.data !== undefined) {
        return jsonResponse.data as T;
      }

      // If no data property, remove status and return the rest
      const { status, ...rest } = jsonResponse;
      return rest as T;

    } catch (error) {
      console.error('API Request failed:', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete request",
        variant: "destructive",
      });

      throw error;
    }
  }
};