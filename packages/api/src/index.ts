// Export types
export interface ApiConfig {
  baseUrl: string
  version: string
}

// Export a simple test function
export const createApiClient = (config: ApiConfig) => {
  return {
    baseUrl: config.baseUrl,
    version: config.version
  }
}
