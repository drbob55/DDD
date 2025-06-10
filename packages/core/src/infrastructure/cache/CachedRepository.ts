import { ICacheService } from '../../application/ports/ICacheService';

export function Cacheable(options?: {
  ttl?: number;
  keyPrefix?: string;
  tags?: string[];
}) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cache: ICacheService = this.cache;
      if (!cache) {
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      const keyPrefix = options?.keyPrefix || `${target.constructor.name}:${propertyName}`;
      const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`;

      // Try to get from cache
      const cached = await cache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Cache the result
      await cache.set(cacheKey, result, {
        ttl: options?.ttl,
        tags: options?.tags
      });

      return result;
    };

    return descriptor;
  };
}

// Example usage in repository
export class CachedCaseRepository implements ICaseRepository {
  constructor(
    private repository: ICaseRepository,
    private cache: ICacheService
  ) {}

  @Cacheable({ ttl: 300, tags: ['cases'] })
  async findById(id: string): Promise<Case | null> {
    return this.repository.findById(id);
  }

  @Cacheable({ ttl: 60, tags: ['cases', 'dentist-cases'] })
  async findByDentist(dentistId: string, filters?: CaseFilters): Promise<Case[]> {
    return this.repository.findByDentist(dentistId, filters);
  }

  async save(dentalCase: Case): Promise<void> {
    await this.repository.save(dentalCase);
    
    // Invalidate related caches
    await this.cache.invalidateTag('cases');
    await this.cache.deleteByPattern(`*:findById:["${dentalCase.id}"]`);
  }
}
