import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async create(data: {
    name: string;
    email: string;
    password: string;
    level?: string;
  }): Promise<User> {
    const user = this.usersRepository.create({ level: '', ...data });
    const saved = await this.usersRepository.save(user);
    // `date` la completa MySQL (DEFAULT CURRENT_TIMESTAMP()); save() no la recarga, así que
    // se relee para devolver el registro completo (incluida la fecha real).
    return (await this.findById(saved.id)) ?? saved;
  }
}
