import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixWebhookDeliveriesMerchantIdType1762154100000 implements MigrationInterface {
  name = 'FixWebhookDeliveriesMerchantIdType1762154100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE webhook_deliveries 
      ALTER COLUMN "merchantId" TYPE VARCHAR(50) USING "merchantId"::VARCHAR;
    `);

    await queryRunner.query(`
      ALTER TABLE event_streams 
      ALTER COLUMN "recipientId" TYPE VARCHAR(100) USING "recipientId"::VARCHAR;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE webhook_deliveries 
      ALTER COLUMN "merchantId" TYPE UUID USING "merchantId"::UUID;
    `);

    await queryRunner.query(`
      ALTER TABLE event_streams 
      ALTER COLUMN "recipientId" TYPE UUID USING "recipientId"::UUID;
    `);
  }
}

