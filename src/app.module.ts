import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { RefreshTokenSchema } from './services/tokens/schemas/refresh-token.schema';
import { TokensService } from './services/tokens/tokens.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.${process.env.NODE_ENV || 'dev'}.env`,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URL'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: 'RefreshToken', schema: RefreshTokenSchema },
    ]),
    HttpModule,
  ],
  controllers: [AppController],
  providers: [AppService, TokensService],
})
export class AppModule {}
