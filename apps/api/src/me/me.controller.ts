import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { PublicUser, UserResponse } from '@yoyo/shared';
import { ZodResponse } from 'nestjs-zod';
import { UserResponseDto } from '../auth/auth.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiErrors } from '../common/api-errors';

@ApiTags('me')
@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  @Get()
  @ZodResponse({ status: 200, type: UserResponseDto, description: 'The signed-in user' })
  @ApiErrors(401, 403)
  me(@CurrentUser() user: PublicUser): UserResponse {
    return { user };
  }
}
