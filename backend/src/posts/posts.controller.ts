import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PostsService } from './posts.service';

class CreatePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content!: string;
}

class LikePostDto {
  @IsString()
  postId!: string;
}

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: { user: { userId: string } }, @Body() dto: CreatePostDto) {
    return this.postsService.create(req.user.userId, dto.content);
  }

  @Get()
  list(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.postsService.list(page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Post('like')
  like(@Req() req: { user: { userId: string } }, @Body() dto: LikePostDto) {
    return this.postsService.like(dto.postId, req.user.userId);
  }
}
