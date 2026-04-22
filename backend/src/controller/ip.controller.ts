import { Controller, Get, Post, Body, Req, Query, InternalServerErrorException } from '@nestjs/common';
import { IPService } from 'src/service/ip.service';
import { CoordinateData } from 'src/interface/coordinateData';
import type { Request } from 'express';
import axios from 'axios'; 

@Controller('api/ip')
export class IPController {
  constructor(private readonly ipService: IPService) { }

  @Get('details')
  getNetworkIntelligence(@Req() req: Request, @Query('ip') ip?: string) {
    return this.ipService.getNetworkIntelligence(req, ip);
  }

  @Get('reverse-geocode')
  async reverseGeocode(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    const bargadKey =
      process.env.GENERATED_API_KEY?.trim() ||
      process.env.generated_api_key?.trim() ||
      '';
    try {
      if (!bargadKey) {
        throw new Error('Set GENERATED_API_KEY (or generated_api_key) on the server for reverse geocode.');
      }

      const { data } = await axios.post(
        `https://api.bargad.ai/api/v1/fifthservice/reverse-geo`,
        {
          lat: parseFloat(lat),
          long: parseFloat(lng),
        },
        {
          headers: {
            'generated-api-key': bargadKey,
          },
        }
      );

      // console.log('RAW RESPONSE:', JSON.stringify(data));
      const result = data.results?.[0];

      const response = {
        address: result?.formatted_address || 'Unknown',
        city: result?.city || 'Unknown',
        state: result?.state || 'Unknown',
        pincode: result?.pincode || 'Unknown',
        district: result?.district || 'Unknown',
      };

      await this.ipService.saveAddress({
        timestamp: new Date().toISOString(),
        lat,
        lng,
        ...response,
      });
  
      return response;

    } catch (error) {
      console.error('Reverse geocode error:', error?.response?.data || error.message);
    
      throw new InternalServerErrorException('Reverse geocoding failed');
    }
  }

  @Post('cordinates')
  async getIPandGPS(
    @Req() req: Request,
    @Body() body: { ip: any; gps: { latitude: number; longitude: number } }
  ) {
    const ipData = await this.ipService.getNetworkIntelligence(req);

    const responseData: CoordinateData = {
      timestamp: new Date().toISOString(),
      ip: {
        address: ipData.ip,
        isp: ipData.isp,
        asn: ipData.asn,
        location: ipData.location,
        region: ipData.region,
        latitude: ipData.latitude,
        longitude: ipData.longitude,
      },
      gps: body.gps,
      mismatch: this.ipService.calculateDistance(
        body.gps.latitude,
        body.gps.longitude,
        ipData.latitude,
        ipData.longitude
      ),
    };

    await this.ipService.saveCoordinates(responseData as CoordinateData);

    return responseData;
  }
}