import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MyShopSchema, MyShopsResponseSchema, ShopInputSchema, ShopResponseSchema, ShopsResponseSchema, type MyShop, type PublicUser, type ShopResponse } from '@yoyo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiErrors } from '../common/api-errors';
import { ShopsService } from './shops.service';

class ShopsDto extends createZodDto(ShopsResponseSchema) {}
class ShopDto extends createZodDto(ShopResponseSchema) {}
class MyShopDto extends createZodDto(MyShopSchema) {}
class MyShopsDto extends createZodDto(MyShopsResponseSchema) {}
class ShopInputDto extends createZodDto(ShopInputSchema) {}
class ShopPatchDto extends createZodDto(ShopInputSchema.partial()) {}

/** Shops as everyone sees them. */
@ApiTags('shops')
@Controller()
export class ShopsPublicController {
  constructor(private readonly shops: ShopsService) {}

  @Get('users/:id/shops')
  @ZodResponse({ status: 200, type: ShopsDto, description: "A person's shops with items in the catalog" })
  async ofUser(@Param('id') id: string): Promise<{ items: Awaited<ReturnType<ShopsService['ofUser']>> }> {
    return { items: await this.shops.ofUser(id) };
  }

  @Get('shops/:id')
  @ZodResponse({ status: 200, type: ShopDto, description: 'A shop and its items in the catalog' })
  @ApiErrors(404)
  one(@Param('id') id: string): Promise<ShopResponse> {
    return this.shops.one(id);
  }
}

/** My shops: make, rename, fill and order, delete. */
@ApiTags('shops')
@Controller('me/shops')
@UseGuards(AuthGuard)
export class MyShopsController {
  constructor(private readonly shops: ShopsService) {}

  @Get()
  @ZodResponse({ status: 200, type: MyShopsDto, description: 'My shops with every item in them' })
  @ApiErrors(401)
  async list(@CurrentUser() user: PublicUser): Promise<{ items: MyShop[] }> {
    return { items: await this.shops.mine(user.id) };
  }

  @Post()
  @HttpCode(201)
  @ZodResponse({ status: 201, type: MyShopDto, description: 'Made' })
  @ApiErrors(400, 401, 409)
  create(@CurrentUser() user: PublicUser, @Body() body: ShopInputDto): Promise<MyShop> {
    return this.shops.create(user.id, body);
  }

  @Patch(':id')
  @ZodResponse({ status: 200, type: MyShopDto, description: 'Saved' })
  @ApiErrors(400, 401, 404)
  update(@CurrentUser() user: PublicUser, @Param('id') id: string, @Body() body: ShopPatchDto): Promise<MyShop> {
    return this.shops.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiErrors(401, 404)
  async remove(@CurrentUser() user: PublicUser, @Param('id') id: string): Promise<void> {
    await this.shops.remove(user.id, id);
  }
}
