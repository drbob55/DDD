// API Client for migrated routes
// This replaces direct /api calls with tRPC or use case calls

// Legacy API wrapper for gradual migration
export const legacyApi = {
  async post(url: string, data: any) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
  
  async get(url: string) {
    const response = await fetch(url);
    return response.json();
  },
  
  async put(url: string, data: any) {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
  
  async delete(url: string) {
    const response = await fetch(url, {
      method: 'DELETE',
    });
    return response.json();
  },
};

// TODO: Add tRPC client here once configured
// export const api = createTRPCProxyClient({...});
