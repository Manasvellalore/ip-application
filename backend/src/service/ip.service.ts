import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Request } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AddressData } from 'src/interface/addressData';
import { CoordinateData } from 'src/interface/coordinateData';


@Injectable()
export class IPService {
  private readonly logger = new Logger(IPService.name);

  async getNetworkIntelligence(req: Request, lookupIp?: string) {
    const forwarded = req.headers['x-forwarded-for'] as string;
    const clientIp = forwarded?.split(',')[0]?.trim() || req.socket.remoteAddress;
    const ip =
      lookupIp?.trim() ||
      clientIp;

    if (!ip || ip === '::1' || ip.includes('127.0.0.1')) {
      return {
        ip: 'localhost',
        asn: 'N/A',
        isp: 'Local Network',
        org: 'N/A',
        location: 'Development',
        region: 'Local',
        latitude: 0,
        longitude: 0,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const { data } = await axios.get(
        `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon,timezone,isp,org,as,query`
      );

      if (data.status !== 'success') {
        throw new Error('IP API failed');
      }

      return {
        ip: data.query,

        asn: data.as?.split(' ')[0] || 'Unknown',
        isp: data.isp || 'Unknown',
        org: data.org || 'N/A',

        location: `${data.city}, ${data.regionName}`,
        region: data.country,

        latitude: data.lat,
        longitude: data.lon,

        timezone: data.timezone,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error('IP intelligence failed', error.stack);

      return {
        ip,
        status: 'failed',
        message: 'Unable to fetch IP intelligence',
      };
    }
  }

  async saveCoordinates(data: CoordinateData) {
    const dirPath = path.join(process.cwd(), 'data');
    const filePath = path.join(dirPath, 'coordinates.json');

    try {
      await fs.mkdir(dirPath, { recursive: true });

      let existingData: CoordinateData[] = [];

      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        existingData = JSON.parse(fileContent) as CoordinateData[];
      } catch (error) { }

      existingData.push(data);

      await fs.writeFile(filePath, JSON.stringify(existingData, null, 2));
    } catch (err) {
      console.error('Error saving to file:', err);
    }
  }

  async saveAddress(data: AddressData) {
    const dirPath = path.join(process.cwd(), 'data');
    const filePath = path.join(dirPath, 'address.json');

    try {
      await fs.mkdir(dirPath, { recursive: true });

      let existingData: AddressData[] = [];

      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        existingData = JSON.parse(fileContent) as AddressData[];
      } catch (error) { }

      existingData.push(data);

      await fs.writeFile(filePath, JSON.stringify(existingData, null, 2));
      this.logger.log(`Address saved: ${data.address}`);
    } catch (err) {
      this.logger.error('Error saving address', err);
    }
  }

  calculateDistance(
    lat1: number | null,
    lon1: number | null,
    lat2: number | null,
    lon2: number | null
  ): number | null {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;

    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }
}