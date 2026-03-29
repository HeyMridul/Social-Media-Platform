import { Model, Types } from 'mongoose';
import { Post, PostDocument } from './post.schema';
export declare class PostsService {
    private readonly postModel;
    constructor(postModel: Model<PostDocument>);
    create(authorId: string, content: string): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Post, {}, {}> & Post & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, Post, {}, {}> & Post & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: Types.ObjectId;
    }>>;
    list(page: number, limit: number): Promise<(import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, Post, {}, {}> & Post & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }> & Required<{
        _id: Types.ObjectId;
    }>)[]>;
    like(postId: string, userId: string): Promise<{
        success: boolean;
    }>;
}
