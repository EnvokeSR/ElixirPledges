import { toast } from "@/hooks/use-toast";

// Get the base URL from environment or fallback to relative path
const getBaseUrl = () => {
  // In development, use relative path
  if (import.meta.env.DEV) {
    return '';
  }
  
  // In production, try to get from environment or construct from window.location
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 
    `${window.location.protocol}//${window.location.host}`;
  
  console.log('API Base URL:', baseUrl);
  return baseUrl;
};

export const api = {
  fetch: async (endpoint: string, options: RequestInit = {}) => {
    const url = `${getBaseUrl()}${endpoint}`;
    console.log('Fetching from:', url);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', {
          url,
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.message || 'API request failed');
      }

      return response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete request",
        variant: "destructive",
      });
      throw error;
    }
  }
};
