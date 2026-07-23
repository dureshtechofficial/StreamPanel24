import { MigrationInterface, QueryRunner } from 'typeorm';
import { config } from 'dotenv';
import {
  decryptSecret,
  encryptSecret,
} from '../../common/utils/encryption.util';
import { computeFlussonicAccessToken } from '../../flussonic-servers/utils/access-token.util';

config();

interface ServerRow {
  id: string;
  api_username: string;
  api_password_enc: string;
}

/**
 * computeFlussonicAccessToken originally joined username/password with "/"
 * before being corrected to ":" (matching Flussonic's real scheme, the same
 * encoding as HTTP Basic auth). Recomputes and re-encrypts api_access_token
 * for every existing row so none are left with a token in the old format.
 */
export class FixFlussonicAccessTokenSeparator1784577326992 implements MigrationInterface {
  name = 'FixFlussonicAccessTokenSeparator1784577326992';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const encryptionKey = process.env.CREDENTIALS_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error(
        'CREDENTIALS_ENCRYPTION_KEY is required to run this migration',
      );
    }

    const rows = (await queryRunner.query(
      `SELECT id, api_username, api_password_enc FROM flussonic_servers`,
    )) as ServerRow[];

    for (const row of rows) {
      const password = decryptSecret(row.api_password_enc, encryptionKey);
      const token = computeFlussonicAccessToken(row.api_username, password);
      const encryptedToken = encryptSecret(token, encryptionKey);

      await queryRunner.query(
        `UPDATE flussonic_servers SET api_access_token = ? WHERE id = ?`,
        [encryptedToken, row.id],
      );
    }
  }

  public async down(): Promise<void> {
    // No-op: the previous ("/") format was a bug, not a supported state to roll back to.
  }
}
