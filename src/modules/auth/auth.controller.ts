import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { SafeUser } from "../user/user.service";
import { LoginCredentialsDto } from "./auth.dto";
import { LocalAuthGuard } from "./auth.guards";
import { AuthService } from "./auth.service";
import { Public } from "./public.decorator";
import { ReqUser } from "./req-user.decorator";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post("/login")
  async login(
    @ReqUser() user: SafeUser,
    @Body() _credentials: LoginCredentialsDto,
  ) {
    const { access_token } = await this.authService.login(user);
    return {
      token: access_token,
      user,
    };
  }

  @Get("/me")
  me(@ReqUser() user: SafeUser) {
    return user;
  }
}
