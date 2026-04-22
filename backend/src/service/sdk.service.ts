import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { IPService } from 'src/service/ip.service';

type SdkDataPayload = {
  location_data: unknown;
  device: Record<string, unknown>;
  system: Record<string, unknown>;
  network: Record<string, unknown>;
  security: Record<string, unknown>;
  display: Record<string, unknown>;
  session: {
    session_id: string;
    session_start_time: string;
  };
  ip_data: Record<string, unknown>;
  risk_profile: {
    category: 'green' | 'amber' | 'red';
    score: number;
    reasons: string[];
  };
  created_at: string;
};

@Injectable()
export class SdkService {
  private readonly sdkStore = new Map<string, SdkDataPayload>();

  constructor(private ipService: IPService) {}

  async saveSdkData(body: any, req: Request) {
    const ipData = await this.ipService.getNetworkIntelligence(req);
    const sessionId = body?.session?.session_id;

    if (!sessionId) {
      throw new Error('Missing session.session_id in SDK payload');
    }

    const riskProfile = this.analyzeRisk(body, ipData);

    const record: SdkDataPayload = {
      location_data: body.location_data ?? null,
      device: body.device ?? {},
      system: body.system ?? {},
      network: body.network ?? {},
      security: body.security ?? {},
      display: body.display ?? {},
      session: {
        session_id: sessionId,
        session_start_time: body?.session?.session_start_time ?? new Date().toISOString(),
      },
      ip_data: ipData,
      risk_profile: riskProfile,
      created_at: new Date().toISOString(),
    };

    this.sdkStore.set(sessionId, record);
    return record;
  }

  async getBySession(sessionId: string) {
    return this.sdkStore.get(sessionId) ?? null;
  }

  private analyzeRisk(
    body: any,
    ipData: Record<string, unknown>
  ): SdkDataPayload['risk_profile'] {
    let score = 0;
    const reasons: string[] = [];

    const location = body?.location_data ?? {};
    const security = body?.security ?? {};
    const network = body?.network ?? {};
    const system = body?.system ?? {};

    const gpsAccuracy = Number(location?.accuracy);
    if (Number.isFinite(gpsAccuracy) && gpsAccuracy > 120) {
      score += 30;
      reasons.push('Low GPS accuracy');
    } else if (Number.isFinite(gpsAccuracy) && gpsAccuracy > 60) {
      score += 15;
      reasons.push('Moderate GPS accuracy');
    }

    if (security?.webdriver === true || security?.is_bot === true) {
      score += 60;
      reasons.push('Automation signals detected');
    }

    const ipLocation = String(ipData?.location ?? '').toLowerCase();
    if (ipLocation.includes('development') || ipLocation.includes('local')) {
      score += 25;
      reasons.push('IP resolves to local/development network');
    }

    const ipLat = Number(ipData?.latitude);
    const ipLng = Number(ipData?.longitude);
    const gpsLat = Number(location?.latitude);
    const gpsLng = Number(location?.longitude);
    const hasIpCoords = Number.isFinite(ipLat) && Number.isFinite(ipLng);
    const hasGpsCoords = Number.isFinite(gpsLat) && Number.isFinite(gpsLng);

    if (hasIpCoords && hasGpsCoords) {
      const distanceKm = this.distanceKm(gpsLat, gpsLng, ipLat, ipLng);
      if (distanceKm > 1000) {
        score += 40;
        reasons.push('Large IP/GPS mismatch');
      } else if (distanceKm > 200) {
        score += 20;
        reasons.push('Moderate IP/GPS mismatch');
      }
    }

    const isOnline = network?.online;
    if (isOnline === false) {
      score += 20;
      reasons.push('Device reports offline state');
    }

    const browserTimezone = String(system?.timezone ?? '');
    const ipTimezone = String(ipData?.timezone ?? '');
    if (browserTimezone && ipTimezone && browserTimezone !== ipTimezone) {
      score += 10;
      reasons.push('Browser and IP timezones differ');
    }

    const normalizedScore = Math.max(0, Math.min(100, score));
    const category =
      normalizedScore >= 70 ? 'red' : normalizedScore >= 35 ? 'amber' : 'green';

    if (reasons.length === 0) {
      reasons.push('No major risk signals detected');
    }

    return { category, score: normalizedScore, reasons };
  }

  private distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }
}