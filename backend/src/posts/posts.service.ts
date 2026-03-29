import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from './post.schema';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
  ) {}

  async create(authorId: string, content: string) {
    return this.postModel.create({ authorId: new Types.ObjectId(authorId), content });
  }

  async list(page: number, limit: number) {
    const skip = (page - 1) * limit;
    return this.postModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async like(postId: string, userId: string) {
    await this.postModel.updateOne(
      { _id: postId },
      { $addToSet: { likes: new Types.ObjectId(userId) } },
    );
    return { success: true };
  }
}
