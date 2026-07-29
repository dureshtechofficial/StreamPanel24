import { Exclude, Expose } from 'class-transformer';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  nowUnixSeconds,
  unixTimestampTransformer,
} from '../../common/utils/unix-timestamp.util';

/**
 * A single global row (seeded by migration) holding the outbound email / SMTP
 * configuration used to send transactional mail. The password is reversibly
 * AES-256-GCM encrypted at rest (`password_enc`, same scheme as the Flussonic
 * API password) — never hashed, since nodemailer needs the plaintext back to
 * authenticate against the SMTP server — and `@Exclude()`d from every API
 * response. The client is told only whether a password is stored
 * (`has_password`), so an edit can leave the field blank to keep the existing
 * one.
 */
@Entity('smtp_settings')
export class SmtpSetting {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Column({ type: 'varchar', length: 255, default: '' })
  host: string;

  @Column({ type: 'smallint', unsigned: true, default: 587 })
  port: number;

  /** true = implicit TLS (usually port 465); false = STARTTLS/plain (587/25). */
  @Column({ type: 'boolean', default: false })
  secure: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  username: string | null;

  @Exclude()
  @Column({ type: 'varchar', length: 500, nullable: true })
  password_enc: string | null;

  @Column({ type: 'varchar', length: 255, default: '' })
  from_email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  from_name: string | null;

  @Column({
    type: 'bigint',
    unsigned: true,
    transformer: unixTimestampTransformer,
  })
  created_at: number;

  @Column({
    type: 'bigint',
    unsigned: true,
    transformer: unixTimestampTransformer,
  })
  updated_at: number;

  /** Surfaced to the client instead of the secret itself, so the edit form can show "password saved — leave blank to keep". */
  @Expose()
  get has_password(): boolean {
    return !!this.password_enc;
  }

  @BeforeInsert()
  setTimestampsOnInsert() {
    const now = nowUnixSeconds();
    this.created_at = now;
    this.updated_at = now;
  }

  @BeforeUpdate()
  setTimestampOnUpdate() {
    this.updated_at = nowUnixSeconds();
  }
}
