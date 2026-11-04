import { Module } from '@nestjs/common';
import { ENV, type Env } from '../config/env';
import { createStorageProvider, STORAGE_PROVIDER } from './storage.provider';

@Module({
  providers: [{ provide: STORAGE_PROVIDER, inject: [ENV], useFactory: (env: Env) => createStorageProvider(env) }],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
