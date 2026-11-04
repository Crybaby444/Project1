import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  LISTING_LIMITS,
  PhotoOrderRequestSchema,
  PhotoOrderResponseSchema,
  PhotoUploadResponseSchema,
  type PhotoOrderResponse,
  type PhotoUploadResponse,
  type PublicUser,
} from '@yoyo/shared';
import type { Response } from 'express';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiErrors } from '../common/api-errors';
import { AppError } from '../common/app-error';
import { RateLimiter } from '../common/rate-limiter';
import { RATE_LIMITS } from '../common/rate-limits';
import { LocalStorageProvider } from './local-storage.provider';
import { PhotosService } from './photos.service';
import { PHOTO_VARIANTS, STORAGE_PROVIDER, type PhotoVariant, type StorageProvider } from './storage.provider';

class PhotoOrderDto extends createZodDto(PhotoOrderRequestSchema) {}
class PhotoOrderResponseDto extends createZodDto(PhotoOrderResponseSchema) {}
class PhotoUploadResponseDto extends createZodDto(PhotoUploadResponseSchema) {}

/** The uploaded file as multer keeps it in memory (only `buffer` is used; name and type are not trusted). */
interface UploadedPhoto {
  buffer: Buffer;
}

@ApiTags('listings')
@Controller('listings/:id/photos')
@UseGuards(AuthGuard)
export class PhotosController {
  constructor(
    private readonly photos: PhotosService,
    private readonly limiter: RateLimiter,
  ) {}

  /** One photo per request in the `file` field; multer stops reading at 10 MB (413). */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: LISTING_LIMITS.photoBytes, files: 1, fields: 5, parts: 6 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } } })
  @ZodResponse({ status: 201, type: PhotoUploadResponseDto, description: 'Stored; cleaned of metadata, at most 2048 px' })
  @ApiErrors(400, 401, 403, 404, 409, 413, 415, 429, 503)
  async upload(
    @CurrentUser() user: PublicUser,
    @Param('id') id: string,
    @UploadedFile() file: UploadedPhoto | undefined,
  ): Promise<PhotoUploadResponse> {
    if (!file) throw new AppError('VALIDATION_FAILED', 400, undefined, { file: 'Attach the photo in the "file" field' });
    this.limiter.hit(RATE_LIMITS.photoUpload(user.id));
    return this.photos.add(id, user.id, file.buffer);
  }

  @Put('order')
  @ZodResponse({ status: 200, type: PhotoOrderResponseDto, description: 'New order; the first photo is the cover' })
  @ApiErrors(400, 401, 403, 404, 409)
  async reorder(@CurrentUser() user: PublicUser, @Param('id') id: string, @Body() body: PhotoOrderDto): Promise<PhotoOrderResponse> {
    return this.photos.reorder(id, user.id, body.ids, body.version);
  }

  @Delete(':photoId')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Photo and its file deleted' })
  @ApiErrors(401, 403, 404, 409)
  async remove(@CurrentUser() user: PublicUser, @Param('id') id: string, @Param('photoId') photoId: string): Promise<void> {
    await this.photos.remove(id, user.id, photoId);
  }
}

/** Photo files of the local storage (development and tests); with Cloudinary, its CDN serves them. */
@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(@Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider) {}

  @Get(':key/:variant')
  @ApiOkResponse({ description: 'The image (WebP)', content: { 'image/webp': { schema: { type: 'string', format: 'binary' } } } })
  @ApiErrors(404)
  async file(@Param('key') key: string, @Param('variant') variant: string, @Res() res: Response): Promise<void> {
    const known = (PHOTO_VARIANTS as readonly string[]).includes(variant);
    const data = known && this.storage instanceof LocalStorageProvider ? await this.storage.read(key, variant as PhotoVariant) : null;
    if (!data) throw new AppError('NOT_FOUND', 404, 'No such photo');
    // A key names one photo forever (a new photo gets a new key), so the file can be cached for good.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.type('image/webp').send(data);
  }
}
