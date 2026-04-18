import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { RolePermissionEnum } from './user.enums';
import { Role } from './user.role.schema';
import { UserSettings } from './user.schema';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  _id: string;

  @IsString()
  fullName: string;

  @IsOptional()
  @IsString()
  password: string;

  @IsOptional()
  @IsBoolean()
  active: boolean;

  @IsString()
  imageUrl: string;
}

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsString()
  color: string;

  @IsArray()
  @IsEnum(RolePermissionEnum, { each: true })
  permissions: RolePermissionEnum[];
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(RolePermissionEnum, { each: true })
  permissions?: RolePermissionEnum[];
}

export class UserResponse {
  name: string;

  active: boolean;

  role: Role;

  _id: number;

  imageUrl: string;

  phone: string;

  address: string;

  settings: UserSettings;
}

export enum RoleEnum {
  MANAGER = 1,
  GAMEMASTER,
  GAMEMANAGER,
  OPERATIONSASISTANT,
  BARISTA,
  KITCHEN,
  SERVICE,
  CLEANING,
  KITCHEN2,
  KITCHEN3,
  BARCHEF,
}
