import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async me(userId: string) {
    const user = await this.userModel.findById(userId).lean();
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user._id,
      email: user.email,
      username: user.username,
      bio: user.bio,
      avatar: user.avatar,
      followersCount: user.followers.length,
      followingCount: user.following.length,
    };
  }

  async follow(currentUserId: string, targetUserId: string) {
    const current = await this.userModel.findById(currentUserId);
    const target = await this.userModel.findById(targetUserId);
    if (!current || !target) throw new NotFoundException('User not found');

    const targetObjId = new Types.ObjectId(targetUserId);
    const currentObjId = new Types.ObjectId(currentUserId);

    if (!current.following.some((id) => id.equals(targetObjId))) {
      current.following.push(targetObjId);
      await current.save();
    }
    if (!target.followers.some((id) => id.equals(currentObjId))) {
      target.followers.push(currentObjId);
      await target.save();
    }
    return { success: true };
  }
}
