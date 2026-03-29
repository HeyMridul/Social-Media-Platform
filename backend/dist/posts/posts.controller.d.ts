import { PostsService } from './posts.service';
declare class CreatePostDto {
    content: string;
}
declare class LikePostDto {
    postId: string;
}
export declare class PostsController {
    private readonly postsService;
    constructor(postsService: PostsService);
    create(req: {
        user: {
            userId: string;
        };
    }, dto: CreatePostDto): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./post.schema").Post, {}, {}> & import("./post.schema").Post & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, import("./post.schema").Post, {}, {}> & import("./post.schema").Post & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    list(page?: number, limit?: number): Promise<(import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, import("./post.schema").Post, {}, {}> & import("./post.schema").Post & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[]>;
    like(req: {
        user: {
            userId: string;
        };
    }, dto: LikePostDto): Promise<{
        success: boolean;
    }>;
}
export {};
