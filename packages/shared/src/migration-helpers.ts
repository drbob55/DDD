// Migration Helper Utilities
// These utilities help with the gradual migration process

export interface MigrationConfig {
  useNewArchitecture: boolean;
  features: {
    [key: string]: boolean;
  };
}

export class MigrationHelper {
  private static config: MigrationConfig = {
    useNewArchitecture: false,
    features: {
      newCaseService: false,
      newPatientService: false,
      newAuthFlow: false,
      newFileUpload: false,
    }
  };

  static isFeatureEnabled(feature: string): boolean {
    return this.config.features[feature] ?? false;
  }

  static enableFeature(feature: string): void {
    this.config.features[feature] = true;
  }

  static switchToNewArchitecture(): void {
    this.config.useNewArchitecture = true;
  }
}

// Feature flags for gradual migration
export const FEATURE_FLAGS = {
  USE_NEW_CASE_SERVICE: 'newCaseService',
  USE_NEW_PATIENT_SERVICE: 'newPatientService',
  USE_NEW_AUTH_FLOW: 'newAuthFlow',
  USE_NEW_FILE_UPLOAD: 'newFileUpload',
} as const;
