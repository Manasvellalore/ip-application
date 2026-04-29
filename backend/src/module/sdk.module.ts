import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SdkDataModel } from 'src/sdk_data';
import { SdkService } from 'src/service/sdk.service';
import { SdkController } from 'src/controller/sdk.controller';
import { IPService } from 'src/service/ip.service';

@Module({
  imports: [TypeOrmModule.forFeature([SdkDataModel])],
  controllers: [SdkController],
  providers: [SdkService, IPService],
})
export class SdkModule {}