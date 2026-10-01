import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

const LAST_ACTIVE_THROTTLE_MS = 5 * 60 * 1000;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default_secret',
    });
  }

  async validate(payload: { sub: string; phone: string }) {
    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive || user.isBanned) {
      throw new UnauthorizedException('User not found or banned');
    }
    const now = Date.now();
    if (!user.lastActiveAt || now - new Date(user.lastActiveAt).getTime() > LAST_ACTIVE_THROTTLE_MS) {
      user.lastActiveAt = new Date(now);
      this.userRepository.update(user.id, { lastActiveAt: user.lastActiveAt }).catch(() => undefined);
    }
    return user;
  }
}
