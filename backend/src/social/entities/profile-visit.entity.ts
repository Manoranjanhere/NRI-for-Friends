import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/** One row per (visitor, visited) pair; repeat visits bump lastVisitedAt and visitCount. */
@Entity('profile_visits')
@Unique(['visitorId', 'visitedId'])
export class ProfileVisit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  visitorId: string;

  @Index()
  @Column()
  visitedId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'visitorId' })
  visitor: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'visitedId' })
  visited: User;

  @Column({ type: 'int', default: 1 })
  visitCount: number;

  @Index()
  @Column({ type: 'timestamp' })
  lastVisitedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
