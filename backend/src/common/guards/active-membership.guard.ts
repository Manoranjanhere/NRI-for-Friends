import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';
import { hasActiveMembership, TRIAL_PLAN_ID } from '../../subscriptions/subscription.constants';

export function isPaidFeaturesDisabled(): boolean {
  return (
    process.env.DISABLE_PAID_FEATURES === 'true' ||
    process.env.NODE_ENV === 'development'
  );
}

/** Throws unless the user is on the free trial or has a paid membership. */
export function assertActiveMembership(user: User, action: string): void {
  if (isPaidFeaturesDisabled()) return;
  if (hasActiveMembership(user)) return;
  if (user.subscriptionPlan === TRIAL_PLAN_ID) {
    throw new ForbiddenException(`Your free trial has ended. Subscribe for ₹300/month to ${action}.`);
  }
  throw new ForbiddenException(`Subscribe for ₹300/month to ${action}.`);
}

@Injectable()
export class ActiveMembershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    assertActiveMembership(req.user as User, 'send messages');
    return true;
  }
}
