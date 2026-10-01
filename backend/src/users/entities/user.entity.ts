import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  BeforeInsert,
} from 'typeorm';
import { FREE_TRIAL_DAYS, TRIAL_PLAN_ID, SubscriptionTier } from '../../subscriptions/subscription.constants';

export enum UserGender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum ProfileStage {
  REGISTERED = 0,
  STAGE1_COMPLETE = 1,
  STAGE2_COMPLETE = 2,
  ACTIVE = 3,
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- Auth identifiers ---
  @Column({ nullable: true, unique: true })
  phone: string;

  @Column({ nullable: true, unique: true })
  email: string;

  @Column({ nullable: true, unique: true })
  googleId: string;

  @Column({ nullable: true, unique: true })
  facebookId: string;

  @Column({ nullable: true, unique: true })
  appleId: string;

  // --- Profile info (Stage 1) ---
  @Column({ nullable: true })
  name: string;

  @Column({ type: 'enum', enum: UserGender, nullable: true })
  gender: UserGender;

  @Column({ nullable: true })
  age: number;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  country: string;

  // --- Extended profile (allowed values in ../profile-options.ts) ---
  @Column({ nullable: true, type: 'text' })
  bio: string;

  @Column({ type: 'simple-array', nullable: true })
  passions: string[];

  @Column({ type: 'varchar', length: 32, nullable: true })
  relationshipStatus: string;

  @Column({ type: 'simple-array', nullable: true })
  lookingFor: string[];

  @Column({ type: 'varchar', length: 16, nullable: true })
  interestedIn: string;         // male | female | everyone

  @Column({ type: 'varchar', length: 40, nullable: true })
  motherTongue: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  religion: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  education: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  profession: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  jobProfile: string;           // free-text job title, e.g. "Senior Data Analyst"

  @Column({ type: 'varchar', length: 40, nullable: true })
  salaryRange: string;

  @Column({ default: false })
  hideSalary: boolean;

  @Column({ type: 'int', nullable: true })
  heightCm: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  grewUpCity: string;

  // --- Photo verification ---
  @Column({ default: 'unverified' })
  photoVerifiedStatus: string;  // unverified | pending | verified | failed

  @Column({ nullable: true })
  selfieS3Key: string;

  @Column({ nullable: true, type: 'float' })
  faceMatchConfidence: number;

  // --- Profile completion tracking ---
  @Column({ type: 'int', default: ProfileStage.REGISTERED })
  profileStage: number;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isBanned: boolean;

  @Column({ type: 'text', nullable: true })
  accountWarningMessage: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  accountWarningAt: Date | null;

  @Column({ default: false })
  isAdmin: boolean;

  @Column({ default: false })
  isSuperAdmin: boolean;  // can manage admins themselves

  // --- Profile visibility ---
  @Column({ nullable: true, type: 'timestamp' })
  hiddenUntil: Date;          // if set and in future → profile hidden from discover

  @Column({ nullable: true, type: 'timestamp' })
  likedBySeenAt: Date;        // last time user opened Liked By list

  // --- Soft delete ---
  @DeleteDateColumn()
  deletedAt: Date;            // TypeORM soft-delete

  // --- Referral ---
  @Column({ nullable: true, unique: true, length: 6 })
  referralCode: string;

  @Column({ nullable: true })
  referredByCode: string;

  // --- Subscription ---
  @Column({ nullable: true })
  stripeCustomerId: string;

  @Column({ nullable: true })
  subscriptionPlan: string;       // trial | nri_monthly

  @Column({ type: 'int', default: 0 })
  subscriptionTier: number;       // 0 = none, 1 = trial or paid member

  @Column({ nullable: true, type: 'timestamp' })
  subscriptionExpiresAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  trialEndsAt: Date;

  // --- Coins ---
  @Column({ type: 'int', default: 0 })
  coins: number;

  @Column({ nullable: true, type: 'date' })
  lastDailyRewardAt: Date;

  // --- Daily Quotas (reset at midnight) ---
  @Column({ type: 'int', default: 0 })
  dailyMsgCount: number;

  @Column({ nullable: true, type: 'date' })
  dailyMsgResetAt: Date;

  @Column({ type: 'int', default: 0 })
  dailySuperLikeCount: number;

  @Column({ nullable: true, type: 'date' })
  dailySuperLikeResetAt: Date;

  @Column({ type: 'int', default: 0 })
  dailyComplimentCount: number;

  @Column({ nullable: true, type: 'date' })
  dailyComplimentResetAt: Date;

  @Column({ type: 'int', default: 0 })
  dailyInterestCount: number;

  @Column({ nullable: true, type: 'date' })
  dailyInterestResetAt: Date;

  // --- Extra quota purchased ---
  @Column({ type: 'int', default: 0 })
  extraMsgCredits: number;

  @Column({ type: 'int', default: 0 })
  extraSuperLikeCredits: number;

  // --- Location ---
  @Column({ nullable: true, type: 'float' })
  latitude: number;

  @Column({ nullable: true, type: 'float' })
  longitude: number;

  @Column({ nullable: true, type: 'timestamp' })
  locationUpdatedAt: Date;

  // --- Timestamps ---
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  lastActiveAt: Date;

  @BeforeInsert()
  startFreeTrial() {
    if (this.subscriptionPlan) return;
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + FREE_TRIAL_DAYS);
    this.subscriptionPlan = TRIAL_PLAN_ID;
    this.subscriptionTier = SubscriptionTier.MEMBER;
    this.subscriptionExpiresAt = trialEnd;
    this.trialEndsAt = trialEnd;
    this.lastActiveAt = new Date();
  }
}
