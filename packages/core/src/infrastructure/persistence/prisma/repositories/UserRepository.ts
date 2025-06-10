import { BaseRepository } from './BaseRepository';
import { User } from '@dental/shared';

export class UserRepository extends BaseRepository {
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id }
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email }
    });
  }

  async findByUserId(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { userId }
    });
  }

  async create(data: Partial<User>): Promise<User> {
    return this.prisma.user.create({
      data: data as any
    });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: data as any
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id }
    });
  }
}
