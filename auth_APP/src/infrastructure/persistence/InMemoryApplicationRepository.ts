import {
    Application,
    ApplicationLdapConfig,
    IApplicationRepository
} from '../../domain/repositories/IApplicationRepository';

/**
 * In-Memory Application Repository
 * Used for testing purposes
 */
export class InMemoryApplicationRepository implements IApplicationRepository {
  private readonly applications: Map<string, Application> = new Map();

  constructor() {
    // Initialize with a default test application
    this.applications.set('testApp', {
      id: 1,
      name: 'testApp',
      description: 'Test Application',
      isActive: true,
      allowLdapSync: true,
      ldapDefaultRole: 'viewer',
      createdAt: new Date().toISOString()
    });
  }

  async findByName(name: string): Promise<Application | null> {
    return this.applications.get(name) || null;
  }

  async getApplicationLdapConfig(applicationName: string): Promise<ApplicationLdapConfig | null> {
    const app = this.applications.get(applicationName);
    
    if (!app?.isActive) {
      return null;
    }

    return {
      applicationName: app.name,
      allowLdapSync: app.allowLdapSync || false,
      ldapDefaultRole: app.ldapDefaultRole || null
    };
  }

  // Helper methods for testing
  addApplication(app: Application): void {
    this.applications.set(app.name, app);
  }

  clear(): void {
    this.applications.clear();
  }
}
