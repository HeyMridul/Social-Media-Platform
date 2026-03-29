import { Model, Types } from 'mongoose';
import { UserDocument } from './user.schema';
export declare class UsersService {
    private readonly userModel;
    constructor(userModel: Model<UserDocument>);
    me(userId: string): Promise<{
        id: Types.ObjectId;
        email: string;
        username: string;
        bio: string;
        avatar: string;
        followersCount: number;
        followingCount: number;
    }>;
    follow(currentUserId: string, targetUserId: string): Promise<{
        success: boolean;
    }>;
}
