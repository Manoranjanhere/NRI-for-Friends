import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Message } from '../messages/entities/message.entity';
import { DevicesService } from '../devices/devices.service';
import { MONTHLY_PRICE_INR, TRIAL_PLAN_ID } from '../subscriptions/subscription.constants';

/** Days-left values that trigger a reminder (day 25 and day 29 of the 30-day trial). */
const TRIAL_REMINDER_DAYS_LEFT = [5, 1];

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly devicesService: DevicesService,
  ) {}

  // ─── Unhide profiles whose hide period has ended (runs every hour) ────────

  @Cron(CronExpression.EVERY_HOUR)
  async unhideExpiredProfiles() {
    const result = await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({ hiddenUntil: null })
      .where('"hiddenUntil" IS NOT NULL AND "hiddenUntil" <= :now', { now: new Date() })
      .execute();

    if (result.affected > 0) {
      this.logger.log(`Unhid ${result.affected} profiles whose hide period expired`);
    }
  }

  // ─── Remind trial users before the free month ends (daily, 10am IST) ─────

  @Cron('0 10 * * *', { timeZone: 'Asia/Kolkata' })
  async sendTrialReminders() {
    let notified = 0;
    for (const daysLeft of TRIAL_REMINDER_DAYS_LEFT) {
      const users: { id: string }[] = await this.userRepository.query(
        `SELECT id FROM users
          WHERE "subscriptionPlan" = $1
            AND "isActive" = true AND "isBanned" = false AND "deletedAt" IS NULL
            AND "subscriptionExpiresAt" > NOW() + (($2::int - 1) * INTERVAL '1 day')
            AND "subscriptionExpiresAt" <= NOW() + ($2::int * INTERVAL '1 day')`,
        [TRIAL_PLAN_ID, daysLeft],
      );

      const body = daysLeft === 1
        ? `Your free month ends tomorrow. Subscribe for ₹${MONTHLY_PRICE_INR}/month to keep messaging and liking.`
        : `Your free month ends in ${daysLeft} days. Subscribe for ₹${MONTHLY_PRICE_INR}/month to keep connecting.`;

      for (const user of users) {
        await this.devicesService
          .sendPushToUser(user.id, {
            title: daysLeft === 1 ? '⏰ Last day of your free trial' : '🧡 Your free trial is ending soon',
            body,
            data: { type: 'trial_reminder', daysLeft: String(daysLeft) },
          })
          .catch(() => undefined);
        notified++;
      }
    }
    if (notified > 0) this.logger.log(`Sent ${notified} trial reminders`);
  }

  // ─── Hard-delete accounts soft-deleted 30+ days ago (runs daily at 2am) ──

  @Cron('0 2 * * *')
  async purgeDeletedAccounts() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const result = await this.userRepository
      .createQueryBuilder()
      .delete()
      .from(User)
      .where('"deletedAt" IS NOT NULL AND "deletedAt" <= :cutoff', { cutoff })
      .execute();

    if ((result.affected || 0) > 0) {
      this.logger.log(`Permanently purged ${result.affected} deleted accounts`);
    }
  }

  // ─── Delete messages older than 90 days (runs daily at 3am) ───────────────
  @Cron('0 3 * * *')
  async purgeOldMessages() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const result = await this.messageRepository.delete({
      createdAt: LessThan(cutoff),
    });

    if ((result.affected || 0) > 0) {
      this.logger.log(`Purged ${result.affected} old messages`);
    }
  }
}
