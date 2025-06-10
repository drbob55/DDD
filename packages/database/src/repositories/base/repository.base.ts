import { prisma } from '../../client';
import { IRepository, ISpecification, IPaginationOptions, IPaginatedResult } from './repository.interface';
import { NotFoundError, DatabaseError } from '../../errors';

export abstract class BaseRepository<T, ID = string> implements IRepository<T, ID> {
  constructor(
    protected readonly modelName: string,
    protected readonly prismaClient = prisma
  ) {}

  async findById(id: ID): Promise<T | null> {
    try {
      return await (this.prismaClient as any)[this.modelName].findUnique({
        where: { id }
      });
    } catch (error: any) {
      throw new DatabaseError(`Failed to find ${this.modelName} by id: ${error?.message || 'Unknown error'}`);
    }
  }

  async findOne(specification: ISpecification<T>): Promise<T | null> {
    try {
      return await (this.prismaClient as any)[this.modelName].findFirst({
        where: specification.toCondition()
      });
    } catch (error: any) {
      throw new DatabaseError(`Failed to find ${this.modelName}: ${error?.message || 'Unknown error'}`);
    }
  }

  async findMany(specification?: ISpecification<T>): Promise<T[]> {
    try {
      const where = specification?.toCondition() || {};
      return await (this.prismaClient as any)[this.modelName].findMany({ where });
    } catch (error: any) {
      throw new DatabaseError(`Failed to find ${this.modelName} records: ${error?.message || 'Unknown error'}`);
    }
  }

  async findManyPaginated(
    specification?: ISpecification<T>,
    pagination?: IPaginationOptions
  ): Promise<IPaginatedResult<T>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 10;
    const skip = (page - 1) * pageSize;

    try {
      const where = specification?.toCondition() || {};
      
      const [items, total] = await Promise.all([
        (this.prismaClient as any)[this.modelName].findMany({
          where,
          skip,
          take: pageSize,
          orderBy: pagination?.orderBy ? {
            [pagination.orderBy]: pagination.orderDirection || 'asc'
          } : undefined
        }),
        (this.prismaClient as any)[this.modelName].count({ where })
      ]);

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      };
    } catch (error: any) {
      throw new DatabaseError(`Failed to paginate ${this.modelName}: ${error?.message || 'Unknown error'}`);
    }
  }

  async count(specification?: ISpecification<T>): Promise<number> {
    try {
      const where = specification?.toCondition() || {};
      return await (this.prismaClient as any)[this.modelName].count({ where });
    } catch (error: any) {
      throw new DatabaseError(`Failed to count ${this.modelName}: ${error?.message || 'Unknown error'}`);
    }
  }

  async exists(id: ID): Promise<boolean> {
    const count = await this.count({
      toCondition: () => ({ id }),
      and: () => ({ toCondition: () => ({ id }) } as ISpecification<T>),
      or: () => ({ toCondition: () => ({ id }) } as ISpecification<T>),
      not: () => ({ toCondition: () => ({ id }) } as ISpecification<T>)
    });
    return count > 0;
  }

  async create(entity: any): Promise<T> {
    try {
      return await (this.prismaClient as any)[this.modelName].create({
        data: entity
      });
    } catch (error: any) {
      throw new DatabaseError(`Failed to create ${this.modelName}: ${error?.message || 'Unknown error'}`);
    }
  }

  async update(id: ID, entity: Partial<T>): Promise<T> {
    try {
      const exists = await this.exists(id);
      if (!exists) {
        throw new NotFoundError(this.modelName, id as string);
      }

      return await (this.prismaClient as any)[this.modelName].update({
        where: { id },
        data: entity
      });
    } catch (error: any) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(`Failed to update ${this.modelName}: ${error?.message || 'Unknown error'}`);
    }
  }

  async delete(id: ID): Promise<void> {
    try {
      await (this.prismaClient as any)[this.modelName].delete({
        where: { id }
      });
    } catch (error: any) {
      throw new DatabaseError(`Failed to delete ${this.modelName}: ${error?.message || 'Unknown error'}`);
    }
  }

  async createMany(entities: any[]): Promise<T[]> {
    try {
      await (this.prismaClient as any)[this.modelName].createMany({
        data: entities
      });
      return entities as T[];
    } catch (error: any) {
      throw new DatabaseError(`Failed to create multiple ${this.modelName}: ${error?.message || 'Unknown error'}`);
    }
  }

  async updateMany(specification: ISpecification<T>, update: Partial<T>): Promise<number> {
    try {
      const result = await (this.prismaClient as any)[this.modelName].updateMany({
        where: specification.toCondition(),
        data: update
      });
      return result.count;
    } catch (error: any) {
      throw new DatabaseError(`Failed to update multiple ${this.modelName}: ${error?.message || 'Unknown error'}`);
    }
  }

  async deleteMany(specification: ISpecification<T>): Promise<number> {
    try {
      const result = await (this.prismaClient as any)[this.modelName].deleteMany({
        where: specification.toCondition()
      });
      return result.count;
    } catch (error: any) {
      throw new DatabaseError(`Failed to delete multiple ${this.modelName}: ${error?.message || 'Unknown error'}`);
    }
  }

  async executeInTransaction<R>(
    operation: (tx: any) => Promise<R>
  ): Promise<R> {
    return this.prismaClient.$transaction(operation);
  }
}
