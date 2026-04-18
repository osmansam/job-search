import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'crypto';
import { Model, UpdateQuery } from 'mongoose';
import { usernamify } from 'src/utils/usernamify';
import { CreateRoleDto, CreateUserDto, UpdateRoleDto } from './user.dto';
import { Role } from './user.role.schema';
import { User } from './user.schema';

export interface SafeUser {
  id: string;
  username: string;
  isActive: boolean;
  role: string;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password: string, storedPassword: string): boolean {
  const [salt, storedHash] = storedPassword.split(':');
  if (!salt || !storedHash) {
    return false;
  }

  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  const storedBuffer = Buffer.from(storedHash, 'hex');
  const derivedBuffer = Buffer.from(derivedKey, 'hex');

  if (storedBuffer.length !== derivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, derivedBuffer);
}

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Role.name) private roleModel: Model<Role>,
  ) {}
  onModuleInit() {}

  private generateTempPassword(): string {
    return randomInt(100000, 1000000).toString();
  }

  async create(userProps: CreateUserDto) {
    const user = new this.userModel(
      userProps.imageUrl !== '' ? userProps : { ...userProps, imageUrl: null },
    );

    const randomNumber = this.generateTempPassword();
    const passwordToUse = userProps.password?.trim() || randomNumber;

    user.password = hashPassword(passwordToUse);
    if (user._id !== 'dv') {
      user._id = usernamify(user.name);
    }
    user.active = true;
    await user.save();
    const response = { ...user.toObject() } as Record<string, unknown>;
    if (!userProps.password?.trim()) {
      response.tempPassword = randomNumber;
    }
    return response;
  }

  async update(reqUser: User, id: string, updateQuery: UpdateQuery<User>) {
    if (reqUser.role?._id !== 1 && updateQuery.role !== undefined) {
      delete updateQuery.role;
    }
    const user = await this.userModel.findByIdAndUpdate(id, updateQuery, {
      new: true,
    });
    return user;
  }

  async updatePassword(user: User, oldPassword: string, newPassword: string) {
    const isValid = await this.validateCredentials(user._id, oldPassword);
    if (!isValid) {
      throw new HttpException('Invalid password', HttpStatus.BAD_REQUEST);
    }
    const hashedNewPassword = hashPassword(newPassword);
    return this.update(user, user._id, {
      password: hashedNewPassword,
    });
  }
  async checkUserActive(id: string) {
    const user = await this.userModel.findById(id);
    return Boolean(user?.active);
  }
  async resetUserPassword(reqUser: User, id: string) {
    if (reqUser.role?._id !== 1) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    const randomNumber = this.generateTempPassword();
    const hashedNewPassword = hashPassword(randomNumber);
    const user = await this.update(reqUser, id, {
      password: hashedNewPassword,
    });
    return { ...user.toObject(), tempPassword: randomNumber };
  }

  async findById(id: string): Promise<SafeUser | null> {
    const user = await this.userModel.findById(id).populate('role').lean();
    if (!user) {
      return null;
    }

    return this.toSafeUser(user);
  }
  async searchUserIds(search: string) {
    const searchUserIds = await this.userModel
      .find({ name: { $regex: new RegExp(search, 'i') } })
      .select('_id')
      .then((docs) => docs.map((doc) => doc._id));
    return searchUserIds;
  }

  async findUsersByIds(userIds: string[]) {
    const users = await this.userModel
      .find({ _id: { $in: userIds } })
      .populate('role')
      .lean();
    return users;
  }

  async findByIdWithoutPopulate(id: string) {
    const user = await this.userModel.findById(id);
    return user;
  }

  async getAll(filterInactives = true): Promise<User[]> {
    const query = filterInactives ? { active: true } : {};
    return this.userModel.find(query).populate('role').sort({ _id: 1 });
  }
  async findAllUsers() {
    try {
      const users = await this.userModel
        .find({ active: true })
        .populate('role')
        .sort({ _id: 1 })
        .exec();
      return users;
    } catch (error) {
      console.error('Failed to retrieve users from database:', error);
      throw new HttpException('Could not retrieve users', HttpStatus.NOT_FOUND);
    }
  }

  async getUsersMinimal() {
    try {
      const minimalUsers = await this.userModel
        .find({ active: true })
        .select('name _id role')
        .populate('role')
        .exec();
      return minimalUsers;
    } catch (error) {
      console.error('Failed to retrieve minimal users from database:', error);
      throw new HttpException(
        'Could not retrieve minimal users',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async getRoles(): Promise<Role[]> {
    return this.roleModel.find();
  }

  async createRole(createRoleDto: CreateRoleDto): Promise<Role> {
    const role = new this.roleModel(createRoleDto);
    await role.save();
    return role;
  }

  async updateRole(id: number, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.roleModel.findByIdAndUpdate(id, updateRoleDto, {
      new: true,
    });
    if (!role) {
      throw new HttpException('Role not found', HttpStatus.NOT_FOUND);
    }
    return role;
  }
  async setKnownGames(_reqUser: User) {
    return;
  }

  async validateCredentials(
    identifier: string,
    password: string,
  ): Promise<SafeUser | null> {
    const user = await this.userModel
      .findOne({
        $or: [{ _id: identifier }, { name: identifier }],
      })
      .populate('role')
      .lean();

    if (!user) {
      return null;
    }
    const isValid = verifyPassword(password, user.password);

    return isValid ? this.toSafeUser(user) : null;
  }

  async findByCafeId(cafeId: string) {
    const users = await this.userModel.find({ cafeId: cafeId });
    return users[0];
  }

  private toSafeUser(user: any): SafeUser {
    const role =
      typeof user.role === 'object'
        ? (user.role?.name ?? String(user.role?._id ?? ''))
        : String(user.role ?? '');

    return {
      id: String(user._id),
      username: String(user.name ?? user._id),
      isActive: Boolean(user.active),
      role,
    };
  }
}
