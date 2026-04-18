import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { PriceCompareModule } from './modules/price-compare/price-compare.module';
import { UserModule } from './modules/user/user.module';
import { WebhookModule } from './modules/webhook/webhook.module';

const DbModule = MongooseModule.forRootAsync({
  useFactory: () => {
    const mongoUriBase = process.env.MONGO_URI_BASE;
    const mongoUriSuffix = process.env.MONGO_URI_SUFFIX;
    const databaseName = process.env.COLLECTION_NAME;

    if (!mongoUriBase || !mongoUriSuffix || !databaseName) {
      throw new Error(
        'Missing required MongoDB env vars: MONGO_URI_BASE, COLLECTION_NAME, MONGO_URI_SUFFIX',
      );
    }

    return {
      uri: `${mongoUriBase}${databaseName}${mongoUriSuffix}`,
      ignoreUndefined: true,
    };
  },
});

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    HealthModule,
    UserModule,
    AuthModule,
    PriceCompareModule,
    WebhookModule,
  ],
})
export class AppModule {}
