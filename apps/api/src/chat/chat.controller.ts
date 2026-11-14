import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ChatMessageSchema,
  ConversationListSchema,
  ConversationSummarySchema,
  ConversationThreadSchema,
  MessageRequestSchema,
  UnreadCountSchema,
  type ChatMessage,
  type ConversationList,
  type ConversationSummary,
  type ConversationThread,
  type PublicUser,
  type UnreadCount,
} from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiErrors } from '../common/api-errors';
import { RateLimiter } from '../common/rate-limiter';
import { RATE_LIMITS } from '../common/rate-limits';
import { ChatService } from './chat.service';

class MessageRequestDto extends createZodDto(MessageRequestSchema) {}
class MessageResponseDto extends createZodDto(z.object({ message: ChatMessageSchema })) {}
class ConversationResponseDto extends createZodDto(z.object({ conversation: ConversationSummarySchema })) {}
class ConversationListDto extends createZodDto(ConversationListSchema) {}
class ConversationThreadDto extends createZodDto(ConversationThreadSchema) {}
class UnreadCountDto extends createZodDto(UnreadCountSchema) {}
class ThreadQueryDto extends createZodDto(z.object({ after: z.iso.datetime().optional() })) {}

@ApiTags('chat')
@Controller()
@UseGuards(AuthGuard)
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly limiter: RateLimiter,
  ) {}

  @Post('listings/:id/conversation')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: ConversationResponseDto, description: "My conversation with the item's owner, started when there is none" })
  @ApiErrors(401, 404, 409, 429)
  async open(@CurrentUser() user: PublicUser, @Param('id') id: string): Promise<{ conversation: ConversationSummary }> {
    this.limiter.hit(RATE_LIMITS.chatOpen(user.id));
    return { conversation: await this.chat.open(user.id, id) };
  }

  @Get('me/conversations')
  @ZodResponse({ status: 200, type: ConversationListDto, description: 'My conversations, newest activity first' })
  @ApiErrors(401)
  list(@CurrentUser() user: PublicUser): Promise<ConversationList> {
    return this.chat.list(user.id);
  }

  @Get('me/conversations/unread')
  @ZodResponse({ status: 200, type: UnreadCountDto, description: 'How many lines I have not read, over all conversations' })
  @ApiErrors(401)
  async unread(@CurrentUser() user: PublicUser): Promise<UnreadCount> {
    return { count: await this.chat.unreadCount(user.id) };
  }

  @Get('conversations/:id')
  @ZodResponse({ status: 200, type: ConversationThreadDto, description: 'A conversation with its messages, oldest first (only newer than `after`, when given)' })
  @ApiErrors(400, 401, 404)
  thread(@CurrentUser() user: PublicUser, @Param('id') id: string, @Query() query: ThreadQueryDto): Promise<ConversationThread> {
    return this.chat.thread(user.id, id, query.after ? new Date(query.after) : undefined);
  }

  @Post('conversations/:id/messages')
  @HttpCode(201)
  @ZodResponse({ status: 201, type: MessageResponseDto, description: 'Sends a plain-text message' })
  @ApiErrors(400, 401, 404, 429)
  async send(@CurrentUser() user: PublicUser, @Param('id') id: string, @Body() body: MessageRequestDto): Promise<{ message: ChatMessage }> {
    this.limiter.hit(RATE_LIMITS.chatMessage(user.id));
    return { message: await this.chat.send(user.id, id, body.text) };
  }

  @Post('conversations/:id/read')
  @HttpCode(204)
  @ApiErrors(401, 404)
  async read(@CurrentUser() user: PublicUser, @Param('id') id: string): Promise<void> {
    await this.chat.read(user.id, id);
  }
}
