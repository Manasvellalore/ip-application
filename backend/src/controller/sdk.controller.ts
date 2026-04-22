import { Controller, Post, Body, Get, Param, Req, NotFoundException } from '@nestjs/common';
import { SdkService } from 'src/service/sdk.service'
import type { Request } from 'express';

@Controller('sdk-data')
export class SdkController {
  constructor(private readonly sdkService: SdkService) {}

  @Post()
  async save(@Body() body: any, @Req() req: Request) {
    return this.sdkService.saveSdkData(body, req);
  }

  @Get(':sessionID')
  async get(@Param('sessionID') sessionID: string) {
    const sdkData = await this.sdkService.getBySession(sessionID);
    if (!sdkData) {
      throw new NotFoundException('SDK data not found for this sessionID');
    }
    return sdkData;
  }
}