import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UpdateQuery } from 'mongoose';
import { ReqUser } from './user.decorator';
import { CreateRoleDto, CreateUserDto, UpdateRoleDto } from './user.dto';
import { User } from './user.schema';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/me')
  getProfile(@ReqUser() user: User) {
    return user;
  }

  @Get('/setKnownGames')
  setKnownGames(@ReqUser() reqUser: User) {
    return this.userService.setKnownGames(reqUser);
  }
  @Post('/password')
  updatePassword(
    @ReqUser() user: User,
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.userService.updatePassword(user, oldPassword, newPassword);
  }
  @Post('/resetPassword')
  resetUserPassword(@ReqUser() reqUser: User, @Body('id') id: string) {
    return this.userService.resetUserPassword(reqUser, id);
  }

  @Get('/roles')
  listRoles() {
    return this.userService.getRoles();
  }

  @Post('/roles')
  createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.userService.createRole(createRoleDto);
  }

  @Patch('/roles/:id')
  updateRole(@Param('id') id: number, @Body() updateRoleDto: UpdateRoleDto) {
    return this.userService.updateRole(id, updateRoleDto);
  }

  @Get('/minimal')
  getUsersMinimal() {
    return this.userService.getUsersMinimal();
  }

  @Get()
  listUsers(@Query('all') all: boolean) {
    return this.userService.getAll(!all);
  }

  @Post()
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Patch('/:id')
  updateUser(
    @ReqUser() reqUser: User,
    @Param('id') id: string,
    @Body() updateQuery: UpdateQuery<User>,
  ) {
    return this.userService.update(reqUser, id, updateQuery);
  }
  @Get('/:id')
  getUser(@Param('id') id: string) {
    return this.userService.findById(id);
  }
}
