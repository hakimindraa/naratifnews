import { db } from '@/db';
import { systemSettings } from '@/db/schema';

export interface AdSlotConfig {
  enabled: boolean;
  type: 'adsense' | 'custom';
  slotId?: string; // AdSense slot ID (misal: "1234567890")
  bannerImage?: string; // URL gambar banner sponsor
  bannerUrl?: string; // URL tujuan ketika diklik
  bannerAlt?: string; // Judul / nama sponsor
}

export interface AdSettingsData {
  clientId: string;
  autoAdsEnabled: boolean;
  header: AdSlotConfig;
  inArticle: AdSlotConfig;
  sidebar: AdSlotConfig;
  footer: AdSlotConfig;
}

export const DEFAULT_ADS_SETTINGS: AdSettingsData = {
  clientId: 'ca-pub-9829376296588403',
  autoAdsEnabled: true,
  header: {
    enabled: false,
    type: 'adsense',
    slotId: '',
    bannerImage: '',
    bannerUrl: '',
    bannerAlt: 'Sponsor Ada Fakta',
  },
  inArticle: {
    enabled: false,
    type: 'adsense',
    slotId: '',
    bannerImage: '',
    bannerUrl: '',
    bannerAlt: 'Sponsor Ada Fakta',
  },
  sidebar: {
    enabled: false,
    type: 'adsense',
    slotId: '',
    bannerImage: '',
    bannerUrl: '',
    bannerAlt: 'Sponsor Ada Fakta',
  },
  footer: {
    enabled: false,
    type: 'adsense',
    slotId: '',
    bannerImage: '',
    bannerUrl: '',
    bannerAlt: 'Sponsor Ada Fakta',
  },
};

export async function getAdSettings(): Promise<AdSettingsData> {
  try {
    const rows = await db.select().from(systemSettings);
    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.key, r.value);
    }

    const clientId = map.get('ads_client_id') || DEFAULT_ADS_SETTINGS.clientId;
    const autoAdsEnabled = map.has('ads_auto_enabled')
      ? map.get('ads_auto_enabled') === 'true'
      : DEFAULT_ADS_SETTINGS.autoAdsEnabled;

    const parseSlot = (prefix: string, defaultSlot: AdSlotConfig): AdSlotConfig => {
      const enabled = map.has(`${prefix}_enabled`)
        ? map.get(`${prefix}_enabled`) === 'true'
        : defaultSlot.enabled;
      const type = (map.get(`${prefix}_type`) as 'adsense' | 'custom') || defaultSlot.type;
      const slotId = map.get(`${prefix}_slot_id`) ?? defaultSlot.slotId;
      const bannerImage = map.get(`${prefix}_banner_image`) ?? defaultSlot.bannerImage;
      const bannerUrl = map.get(`${prefix}_banner_url`) ?? defaultSlot.bannerUrl;
      const bannerAlt = map.get(`${prefix}_banner_alt`) ?? defaultSlot.bannerAlt;

      return {
        enabled,
        type,
        slotId,
        bannerImage,
        bannerUrl,
        bannerAlt,
      };
    };

    return {
      clientId,
      autoAdsEnabled,
      header: parseSlot('ads_header', DEFAULT_ADS_SETTINGS.header),
      inArticle: parseSlot('ads_in_article', DEFAULT_ADS_SETTINGS.inArticle),
      sidebar: parseSlot('ads_sidebar', DEFAULT_ADS_SETTINGS.sidebar),
      footer: parseSlot('ads_footer', DEFAULT_ADS_SETTINGS.footer),
    };
  } catch (error) {
    console.error('Failed to get ad settings from database, using defaults:', error);
    return DEFAULT_ADS_SETTINGS;
  }
}

export async function saveAdSettings(settings: AdSettingsData): Promise<void> {
  const entries: [string, string][] = [
    ['ads_client_id', settings.clientId.trim()],
    ['ads_auto_enabled', settings.autoAdsEnabled ? 'true' : 'false'],

    ['ads_header_enabled', settings.header.enabled ? 'true' : 'false'],
    ['ads_header_type', settings.header.type],
    ['ads_header_slot_id', (settings.header.slotId || '').trim()],
    ['ads_header_banner_image', (settings.header.bannerImage || '').trim()],
    ['ads_header_banner_url', (settings.header.bannerUrl || '').trim()],
    ['ads_header_banner_alt', (settings.header.bannerAlt || 'Sponsor Ada Fakta').trim()],

    ['ads_in_article_enabled', settings.inArticle.enabled ? 'true' : 'false'],
    ['ads_in_article_type', settings.inArticle.type],
    ['ads_in_article_slot_id', (settings.inArticle.slotId || '').trim()],
    ['ads_in_article_banner_image', (settings.inArticle.bannerImage || '').trim()],
    ['ads_in_article_banner_url', (settings.inArticle.bannerUrl || '').trim()],
    ['ads_in_article_banner_alt', (settings.inArticle.bannerAlt || 'Sponsor Ada Fakta').trim()],

    ['ads_sidebar_enabled', settings.sidebar.enabled ? 'true' : 'false'],
    ['ads_sidebar_type', settings.sidebar.type],
    ['ads_sidebar_slot_id', (settings.sidebar.slotId || '').trim()],
    ['ads_sidebar_banner_image', (settings.sidebar.bannerImage || '').trim()],
    ['ads_sidebar_banner_url', (settings.sidebar.bannerUrl || '').trim()],
    ['ads_sidebar_banner_alt', (settings.sidebar.bannerAlt || 'Sponsor Ada Fakta').trim()],

    ['ads_footer_enabled', settings.footer.enabled ? 'true' : 'false'],
    ['ads_footer_type', settings.footer.type],
    ['ads_footer_slot_id', (settings.footer.slotId || '').trim()],
    ['ads_footer_banner_image', (settings.footer.bannerImage || '').trim()],
    ['ads_footer_banner_url', (settings.footer.bannerUrl || '').trim()],
    ['ads_footer_banner_alt', (settings.footer.bannerAlt || 'Sponsor Ada Fakta').trim()],
  ];

  for (const [key, value] of entries) {
    await db
      .insert(systemSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, updatedAt: new Date() },
      });
  }
}
