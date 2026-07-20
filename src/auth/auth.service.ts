import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { UserStatus } from '../users/enums/user-status.enum';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
} from './interfaces/token-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<User> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const saltRounds = this.configService.get<number>('bcryptSaltRounds')!;
    const password_hash = await bcrypt.hash(dto.password, saltRounds);

    return this.usersService.create({
      name: dto.name,
      email: dto.email,
      password_hash,
    });
  }

  async validateCredentials(dto: LoginDto): Promise<User> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('This account has been disabled');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }

  issueAccessToken(user: User): string {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.configService.get<string>(
        'jwt.accessExpiresIn',
      ) as StringValue,
    });
  }

  issueRefreshToken(user: User): string {
    const payload: RefreshTokenPayload = { sub: user.id };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>(
        'jwt.refreshExpiresIn',
      ) as StringValue,
    });
  }
}
