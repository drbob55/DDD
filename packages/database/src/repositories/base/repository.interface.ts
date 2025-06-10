// packages/database/src/repositories/base/repository.interface.ts
/**
 * Base Repository Interface
 * Following DDD principles - repositories provide collection-like interface for aggregates
 */

export interface IRepository<T, ID = string> {
  // Basic CRUD
  findById(id: ID): Promise<T | null>;
  findOne(specification: ISpecification<T>): Promise<T | null>;
  findMany(specification?: ISpecification<T>): Promise<T[]>;
  count(specification?: ISpecification<T>): Promise<number>;
  exists(id: ID): Promise<boolean>;
  
  // Write operations
  create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: ID, entity: Partial<T>): Promise<T>;
  delete(id: ID): Promise<void>;
  
  // Batch operations
  createMany(entities: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<T[]>;
  updateMany(specification: ISpecification<T>, update: Partial<T>): Promise<number>;
  deleteMany(specification: ISpecification<T>): Promise<number>;
}

export interface ISpecification<T> {
  toCondition(): any;
  and(specification: ISpecification<T>): ISpecification<T>;
  or(specification: ISpecification<T>): ISpecification<T>;
  not(): ISpecification<T>;
}

export interface IPaginationOptions {
  page: number;
  pageSize: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface IPaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IUnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  getRepository<T>(name: string): IRepository<T>;
}