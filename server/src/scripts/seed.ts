/**
 * Seeds MongoDB with the bundled demo dataset.
 *
 * Usage: npm run seed --workspace @ium/server   (or: npm run seed from server/)
 *
 * The collections listed below are replaced, everything else is left alone.
 */
import { assertDatabaseConfigured } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import {
  AuditLogModel,
  FamilyModel,
  FeePlanModel,
  AnomalyModel,
  ReminderLogModel,
  StudentModel,
  PaymentModel,
} from '../models/index.js';
import { generateSeedData } from '../services/seedData.js';

async function main() {
  assertDatabaseConfigured();
  await connectDatabase();

  const seed = generateSeedData();

  console.log('Clearing existing demo collections...');
  await Promise.all([
    FamilyModel.deleteMany({}),
    StudentModel.deleteMany({}),
    FeePlanModel.deleteMany({}),
    PaymentModel.deleteMany({}),
    AuditLogModel.deleteMany({}),
    ReminderLogModel.deleteMany({}),
    AnomalyModel.deleteMany({}),
  ]);

  console.log('Inserting demo dataset...');
  await FamilyModel.insertMany(seed.families);
  await StudentModel.insertMany(seed.students);
  await FeePlanModel.insertMany(seed.feePlans);
  await PaymentModel.insertMany(seed.payments);
  await AuditLogModel.insertMany(seed.auditLogs);
  await ReminderLogModel.insertMany(seed.reminders);
  await AnomalyModel.insertMany(seed.anomalies);

  console.log(
    `Seed complete: ${seed.families.length} families, ${seed.students.length} students, ` +
      `${seed.payments.length} payments.`
  );

  await disconnectDatabase();
}

main().catch(async (err) => {
  console.error('Seed failed:', err.message);
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
