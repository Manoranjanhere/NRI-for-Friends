import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

/** Simple key/value store for admin-controlled app switches (e.g. feedEnabled). */
@Entity('app_settings')
export class AppSetting {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
