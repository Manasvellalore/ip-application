import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IPController } from './controller/ip.controller';
import { SdkController } from './controller/sdk.controller';
import { IPService } from './service/ip.service';
import { SdkService } from './service/sdk.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
  }),],
  controllers: [AppController, IPController, SdkController],
  providers: [AppService, IPService, SdkService],
})
export class AppModule { }
