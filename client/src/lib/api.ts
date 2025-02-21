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
        credentials: 'include'  // Changed from 'same-origin' to 'include' for cross-origin requests
      });

      // Log response status and headers for debugging
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      let data: ApiResponse<T>;
      try {
        data = await response.json();
      } catch (error) {
        console.error('Failed to parse JSON response:', error);
        throw new Error('Invalid response format from server');
      }

      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || response.statusText || 'Request failed');
      }

      // Handle both old and new response formats
      return (data.data !== undefined ? data.data : data) as T;
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