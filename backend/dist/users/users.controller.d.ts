import { UsersService } from './users.service';
declare class FollowDto {
    targetUserId: string;
}
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    me(req: {
        user: {
            userId: string;
        };
    }): Promise<{
        id: import("mongoose").Types.ObjectId;
        email: string;
        username: string;
        bio: string;
        avatar: string;
        followersCount: number;
        followingCount: number;
    }>;
    follow(req: {
        user: {
            userId: string;
        };
    }, dto: FollowDto): Promise<{
        success: boolean;
    }>;
}
export {};
