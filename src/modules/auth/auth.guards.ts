import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class LocalAuthGuard extends AuthGuard("local") {}

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.get<boolean>(
      "isPublic",
      context.getHandler(),
    );
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(
    err: any,
    user: any,
    _info: any,
    context: ExecutionContext,
    _status?: any,
  ): TUser {
    const isPublic = this.reflector.get<boolean>(
      "isPublic",
      context.getHandler(),
    );

    if (user) {
      return user as TUser;
    }

    if (isPublic) {
      return null as TUser;
    }

    throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);
  }
}
