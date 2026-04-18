import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SafeUser, UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(
    username: string,
    password: string,
  ): Promise<SafeUser | null> {
    if (typeof username !== 'string') {
      return null;
    }
    return this.userService.validateCredentials(username.trim(), password);
  }

  async login(user: SafeUser) {
    const payload = { username: user.id };
    const isUserActive = await this.userService.checkUserActive(user.id);

    if (!isUserActive) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
