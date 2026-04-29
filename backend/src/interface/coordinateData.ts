export interface CoordinateData {
    timestamp: string;
    ip: {
      address: any;
      isp: any;
      asn: any;
      location?: string;
      region: any;
      latitude: any;
      longitude: any;
    };
    gps: {
      latitude: number;
      longitude: number;
    };
    mismatch: any;
  }