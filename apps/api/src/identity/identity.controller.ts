import { Body, Controller, Get, HttpCode, Param, Post, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOkResponse, ApiProduces, ApiTags } from '@nestjs/swagger';
import {
  AdminIdentityQueueSchema,
  IdentityDecisionSchema,
  IdentityStateSchema,
  IdentitySubmitSchema,
  LISTING_LIMITS,
  type AdminIdentityQueue,
  type IdentityState,
  type PublicUser,
} from '@yoyo/shared';
import type { Response } from 'express';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles, RolesGuard, Section } from '../auth/roles.guard';
import { ApiErrors } from '../common/api-errors';
import { AppError } from '../common/app-error';
import { RateLimiter } from '../common/rate-limiter';
import { RATE_LIMITS } from '../common/rate-limits';
import { IdentityService } from './identity.service';

class IdentityStateDto extends createZodDto(IdentityStateSchema) {}
class AdminIdentityQueueDto extends createZodDto(AdminIdentityQueueSchema) {}
class IdentityDecisionDto extends createZodDto(IdentityDecisionSchema) {}

type Uploads = { document?: { buffer: Buffer }[]; selfie?: { buffer: Buffer }[] } | undefined;

@ApiTags('me')
@Controller('me/identity')
@UseGuards(AuthGuard)
export class IdentityController {
  constructor(
    private readonly identity: IdentityService,
    private readonly limiter: RateLimiter,
  ) {}

  @Get()
  @ZodResponse({ status: 200, type: IdentityStateDto, description: 'Where your identity check stands' })
  @ApiErrors(401)
  state(@CurrentUser() user: PublicUser): Promise<IdentityState> {
    return this.identity.state(user.id);
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'document', maxCount: 1 }, { name: 'selfie', maxCount: 1 }], { limits: { fileSize: LISTING_LIMITS.photoBytes, files: 2, fields: 4, parts: 6 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['document', 'selfie', 'documentType', 'consent'],
      properties: {
        document: { type: 'string', format: 'binary' },
        selfie: { type: 'string', format: 'binary' },
        documentType: { type: 'string', enum: ['PASSPORT', 'ID_CARD', 'DRIVING_LICENCE'] },
        consent: { type: 'string', enum: ['true'] },
      },
    },
  })
  @ZodResponse({ status: 201, type: IdentityStateDto, description: 'Sent to a moderator' })
  @ApiErrors(400, 401, 409, 413, 415, 429)
  async submit(@CurrentUser() user: PublicUser, @Body() body: Record<string, unknown>, @UploadedFiles() files: Uploads): Promise<IdentityState> {
    const fields = IdentitySubmitSchema.safeParse(body);
    const document = files?.document?.[0]?.buffer;
    const selfie = files?.selfie?.[0]?.buffer;
    if (!fields.success || !document || !selfie) {
      throw new AppError('VALIDATION_FAILED', 400, undefined, {
        ...(!document && { document: 'Attach a photo of your document' }),
        ...(!selfie && { selfie: 'Attach a photo of yourself' }),
        ...(!fields.success && { consent: 'Agree to the check and choose the document' }),
      });
    }
    this.limiter.hit(RATE_LIMITS.photoUpload(user.id));
    return this.identity.submit(user.id, fields.data.documentType, document, selfie);
  }
}

@ApiTags('admin')
@Controller('admin/identity')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Section('identity')
export class AdminIdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Get()
  @ZodResponse({ status: 200, type: AdminIdentityQueueDto, description: 'Checks waiting, oldest first' })
  @ApiErrors(401, 403)
  queue(): Promise<AdminIdentityQueue> {
    return this.identity.queue();
  }

  @Get(':id/:which')
  @ApiProduces('image/webp')
  @ApiOkResponse({ description: 'The decrypted photo; never cached; the look is logged' })
  @ApiErrors(401, 403, 404)
  async photo(@CurrentUser() admin: PublicUser, @Param('id') id: string, @Param('which') which: string, @Res() res: Response): Promise<void> {
    if (which !== 'document' && which !== 'selfie') throw new AppError('NOT_FOUND', 404);
    const data = await this.identity.photo(id, which, admin);
    res.set({ 'content-type': 'image/webp', 'cache-control': 'no-store, private', 'x-content-type-options': 'nosniff' }).send(data);
  }

  @Post(':id')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Decided; the photos are erased' })
  @ApiErrors(400, 401, 403, 404, 409)
  async decide(@CurrentUser() admin: PublicUser, @Param('id') id: string, @Body() body: IdentityDecisionDto): Promise<void> {
    await this.identity.decide(id, body, admin);
  }
}
