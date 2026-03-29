import { HydratedDocument, Types } from 'mongoose';
export type PostDocument = HydratedDocument<Post>;
export declare class Post {
    authorId: Types.ObjectId;
    content: string;
    likes: Types.ObjectId[];
}
export declare const PostSchema: import("mongoose").Schema<Post, import("mongoose").Model<Post, any, any, any, import("mongoose").Document<unknown, any, Post, any, {}> & Post & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Post, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Post>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Post> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
