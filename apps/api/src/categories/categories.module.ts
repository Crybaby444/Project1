import { Injectable, Logger, Module, type OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { ensureCategories } from './ensure-categories';

/**
 * Syncs the catalog on every API start, as AdminBootstrap does for the admin account (production never
 * runs the seed). A failure, e.g. the database being down, is logged and never stops the API.
 */
@Injectable()
export class CategoriesBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger('Categories');

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await ensureCategories(this.prisma);
    } catch (error) {
      this.logger.error(`could not sync the category catalog: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoriesBootstrap],
  exports: [CategoriesService],
})
export class CategoriesModule {}
