import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from './entities/app-setting.entity';
import { HOW_TO_USE_FEED, FeedItem } from './feed-content';
import { AuditService } from '../audits/audits.service';
import { AdminActivityName } from '../audits/audit.constants';

const FEED_ENABLED_KEY = 'feedEnabled';
const CACHE_TTL_MS = 30_000;

@Injectable()
export class FeedService {
  private cache: { value: boolean; at: number } | null = null;

  constructor(
    @InjectRepository(AppSetting)
    private readonly settingRepository: Repository<AppSetting>,
    private readonly auditService: AuditService,
  ) {}

  async isEnabled(): Promise<boolean> {
    if (this.cache && Date.now() - this.cache.at < CACHE_TTL_MS) return this.cache.value;
    const row = await this.settingRepository.findOne({ where: { key: FEED_ENABLED_KEY } });
    const value = row ? row.value === 'true' : true;
    this.cache = { value, at: Date.now() };
    return value;
  }

  async setEnabled(enabled: boolean, adminId: string): Promise<{ enabled: boolean }> {
    const before = await this.isEnabled();
    await this.settingRepository.save({ key: FEED_ENABLED_KEY, value: String(enabled), updatedBy: adminId });
    this.cache = { value: enabled, at: Date.now() };

    await this.auditService.logAdminAction({
      byUser: adminId,
      activityName: AdminActivityName.ADMIN_UPDATE_SETTING,
      affectedDataName: FEED_ENABLED_KEY,
      fromValue: String(before),
      toValue: String(enabled),
    });
    return { enabled };
  }

  async getFeed(): Promise<{ enabled: boolean; items: FeedItem[] }> {
    const enabled = await this.isEnabled();
    return { enabled, items: enabled ? HOW_TO_USE_FEED : [] };
  }
}
