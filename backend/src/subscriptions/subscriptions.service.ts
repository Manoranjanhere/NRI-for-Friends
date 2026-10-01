import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Subscription, SubscriptionStatus } from './entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import {
  NRI_MONTHLY_PLAN,
  FREE_TRIAL_DAYS,
  TRIAL_PLAN_ID,
  DAILY_FREE_INTERESTS,
  getPlayCatalog,
  getPlaySubscriptionProductId,
  isPlaySubscriptionProductId,
  hasActiveMembership,
} from './subscription.constants';
import { GooglePlayBillingService } from './google-play-billing.service';
import { AuditService } from '../audits/audits.service';
import { PaymentActivityName } from '../audits/audit.constants';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subRepository: Repository<Subscription>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly googlePlay: GooglePlayBillingService,
    private readonly auditService: AuditService,
  ) {}

  private planWithPlayId() {
    return { ...NRI_MONTHLY_PLAN, playProductId: getPlaySubscriptionProductId() };
  }

  getPlans() {
    return {
      plan: this.planWithPlayId(),
      freeTrialDays: FREE_TRIAL_DAYS,
      dailyFreeInterests: DAILY_FREE_INTERESTS,
      paymentProvider: 'google_play',
      playCatalog: getPlayCatalog(),
    };
  }

  getPlayCatalog() {
    return getPlayCatalog();
  }

  getFeatureFlags() {
    return {
      paidFeaturesDisabled:
        process.env.DISABLE_PAID_FEATURES === 'true' ||
        process.env.NODE_ENV === 'development',
    };
  }

  async getMembershipStatus(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const active = hasActiveMembership(user);
    const onTrial = active && user.subscriptionPlan === TRIAL_PLAN_ID;
    const expiresAt = user.subscriptionExpiresAt ?? null;
    const daysLeft = active && expiresAt
      ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000))
      : 0;

    return {
      active,
      onTrial,
      plan: user.subscriptionPlan ?? null,
      expiresAt,
      trialEndsAt: user.trialEndsAt ?? null,
      daysLeft,
    };
  }

  async verifyGooglePlaySubscription(userId: string, productId: string, purchaseToken: string) {
    try {
      if (!isPlaySubscriptionProductId(productId)) {
        throw new BadRequestException('Unknown Google Play subscription product');
      }

      const existing = await this.subRepository.findOne({
        where: { googlePlayPurchaseToken: purchaseToken },
      });
      if (existing) {
        return {
          alreadyProcessed: true,
          subscription: existing,
          plan: this.planWithPlayId(),
          expiresAt: existing.expiresAt,
        };
      }

      const verification = await this.googlePlay.verifySubscription(productId, purchaseToken);
      if (!verification.valid) {
        throw new BadRequestException('Google Play subscription is not valid');
      }

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      const previousPlan = user.subscriptionPlan || null;
      const sub = await this.activateSubscription({
        userId,
        googlePlayProductId: productId,
        googlePlayPurchaseToken: purchaseToken,
        googlePlayOrderId: verification.orderId,
        playExpiryTimeMillis: verification.expiryTimeMillis,
      });

      const updatedUser = await this.userRepository.findOne({ where: { id: userId } });

      await this.auditService.logPayment({
        forUser: userId,
        byUser: userId,
        activityName: PaymentActivityName.PAYMENT_SUBSCRIPTION,
        affectedDataName: 'SubscriptionPlan',
        fromValue: previousPlan,
        toValue: NRI_MONTHLY_PLAN.id,
        notes: [
          `productId=${productId}`,
          verification.orderId ? `orderId=${verification.orderId}` : null,
          `amountInr=${NRI_MONTHLY_PLAN.monthlyPrice}`,
        ]
          .filter(Boolean)
          .join(' | '),
      });

      return {
        alreadyProcessed: false,
        subscription: sub,
        plan: this.planWithPlayId(),
        expiresAt: updatedUser?.subscriptionExpiresAt,
        user: {
          subscriptionPlan: updatedUser?.subscriptionPlan,
          subscriptionTier: updatedUser?.subscriptionTier,
          subscriptionExpiresAt: updatedUser?.subscriptionExpiresAt,
        },
      };
    } catch (err) {
      await this.auditService.logPayment({
        forUser: userId,
        byUser: userId,
        activityName: PaymentActivityName.PAYMENT_SUBSCRIPTION_FAILED,
        affectedDataName: 'SubscriptionPlan',
        fromValue: null,
        toValue: productId,
        notes: (err as Error)?.message || 'verification failed',
      });
      throw err;
    }
  }

  private async activateSubscription(opts: {
    userId: string;
    googlePlayProductId: string;
    googlePlayPurchaseToken: string;
    googlePlayOrderId?: string;
    playExpiryTimeMillis?: number;
  }): Promise<Subscription> {
    const now = new Date();
    const user = await this.userRepository.findOne({ where: { id: opts.userId } });

    // Paying during the free trial keeps the remaining trial days.
    const baseStart =
      user?.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > now
        ? new Date(user.subscriptionExpiresAt)
        : now;

    let expiresAt: Date;
    if (opts.playExpiryTimeMillis && opts.playExpiryTimeMillis > Date.now()) {
      expiresAt = new Date(Math.max(opts.playExpiryTimeMillis, baseStart.getTime()));
    } else {
      expiresAt = new Date(baseStart);
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    const sub = await this.subRepository.save(
      this.subRepository.create({
        userId: opts.userId,
        planId: NRI_MONTHLY_PLAN.id,
        tier: NRI_MONTHLY_PLAN.tier,
        billingPeriod: 'monthly',
        amountPaid: NRI_MONTHLY_PLAN.monthlyPrice * 100,
        googlePlayProductId: opts.googlePlayProductId,
        googlePlayPurchaseToken: opts.googlePlayPurchaseToken,
        googlePlayOrderId: opts.googlePlayOrderId,
        status: SubscriptionStatus.ACTIVE,
        startsAt: now,
        expiresAt,
      }),
    );

    await this.userRepository.update(opts.userId, {
      subscriptionPlan: NRI_MONTHLY_PLAN.id,
      subscriptionTier: NRI_MONTHLY_PLAN.tier,
      subscriptionExpiresAt: expiresAt,
    });

    return sub;
  }

  async getCurrentSubscription(userId: string) {
    const sub = await this.subRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      order: { expiresAt: 'DESC' },
    });
    return { subscription: sub, plan: sub ? this.planWithPlayId() : null };
  }

  async getSubscriptionHistory(userId: string) {
    return this.subRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
