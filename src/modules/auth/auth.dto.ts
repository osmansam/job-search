import { IsString, MaxLength } from 'class-validator';

export class LoginCredentialsDto {
  @IsString()
  @MaxLength(50)
  username!: string;

  @IsString()
  @MaxLength(100)
  password!: string;
}
