// sdkCollector.ts

interface LocationData {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: string;
  }
  
  interface SdkData {
    location_data: LocationData | null;
    device: {
      user_agent: string;
      cpu_cores: number | null;
      device_memory: number | null;
    };
    system: {
      timezone: string;
      timezone_offset: number;
      language: string;
      languages: readonly string[];
      platform: string;
    };
    network: {
      online: boolean;
      connection_type: string;
      effective_type: string;
    };
    security: {
      webdriver: boolean;
      is_bot: boolean;
    };
    display: {
      screen_width: number;
      screen_height: number;
      pixel_ratio: number;
    };
    session: {
      session_id: string;
      session_start_time: string;
    };
  }
  
  // Extension for the Network Information API which isn't in all TS versions
  interface NavigatorWithConnection extends Navigator {
    connection?: {
      type?: string;
      effectiveType?: string;
    };
    deviceMemory?: number;
  }
  
  export type CollectSdkDataOptions = {
    /** Skip a second getCurrentPosition when the host page already requests GPS (e.g. dashboard). */
    skipGeolocation?: boolean;
  };

  export async function collectSdkData(options?: CollectSdkDataOptions): Promise<SdkData> {
    const nav = navigator as NavigatorWithConnection;
  
    // ===== LOCATION =====
    const location_data =
      options?.skipGeolocation === true
        ? null
        : await new Promise<LocationData | null>((resolve) => {
            if (!nav.geolocation) return resolve(null);

            nav.geolocation.getCurrentPosition(
              (pos) => {
                resolve({
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: pos.coords.accuracy,
                  timestamp: new Date().toISOString(),
                });
              },
              () => resolve(null),
              { maximumAge: 120_000 }
            );
          });
  
    // ===== NETWORK INFO =====
    const connection = nav.connection || {};
  
    const data: SdkData = {
      location_data,
      
      device: {
        user_agent: nav.userAgent,
        cpu_cores: nav.hardwareConcurrency || null,
        device_memory: nav.deviceMemory || null,
      },
  
      system: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezone_offset: new Date().getTimezoneOffset(),
        language: nav.language,
        languages: nav.languages,
        platform: nav.platform,
      },
  
      network: {
        online: nav.onLine,
        connection_type: connection.type || "unknown",
        effective_type: connection.effectiveType || "unknown",
      },
  
      security: {
        webdriver: nav.webdriver,
        is_bot: nav.webdriver === true,
      },
  
      display: {
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        pixel_ratio: window.devicePixelRatio,
      },
  
      session: {
        session_id: crypto.randomUUID(),
        session_start_time: new Date().toISOString(),
      },
    };
  
    return data;
  }