import { Logger } from '@nestjs/common';
import { createApp } from './app.js';
import { ENV } from './config/env.module.js';
import type { Env } from './config/env.js';

const app = await createApp();
const env = app.get<Env>(ENV);
await app.listen(env.PORT, '0.0.0.0');
Logger.log(`API listening on http://localhost:${env.PORT}/api/v1`, 'Bootstrap');
