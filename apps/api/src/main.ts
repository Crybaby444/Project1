import 'dotenv/config';
import { createApp } from './app.factory';
import { ENV, type Env } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await createApp();
  const env = app.get<Env>(ENV);
  await app.listen(env.PORT);
}

void bootstrap();
