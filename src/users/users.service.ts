import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { UserStatus } from './enums/user-status.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('user.email = :email', { email })
      .getOne();
  }

  async create(data: {
    name: string;
    email: string;
    password_hash: string;
    role?: UserRole;
    status?: UserStatus;
  }): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }
}
