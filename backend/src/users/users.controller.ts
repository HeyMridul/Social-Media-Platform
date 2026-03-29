import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

class FollowDto {
  @IsString()
  targetUserId!: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: { user: { userId: string } }) {
    return this.usersService.me(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('follow')
  follow(@Req() req: { user: { userId: string } }, @Body() dto: FollowDto) {
    return this.usersService.follow(req.user.userId, dto.targetUserId);
  }
}
