import mongoose from 'mongoose';
import logger from './logger.js';
import User from '../models/User.js';
import Branch from '../models/Branch.js';

const connectDB = async () => {
  try {
    console.log(process.env.MONGO_URI);
    const conn = await mongoose.connect(process.env.MONGO_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Scan for and migrate legacy user records to make them compliant with the new schema requirements
    const usersToMigrate = await User.find({
      $or: [
        { status: 'APPROVED' },
        { status: 'REJECTED' },
        { name: { $exists: false } },
        { name: '' }
      ]
    });

    if (usersToMigrate.length > 0) {
      logger.info(`Found ${usersToMigrate.length} legacy user records requiring schema-compliance migrations...`);
      for (const user of usersToMigrate) {
        let changed = false;

        // Map legacy statuses to new enum configurations
        if (user.status === 'APPROVED') {
          user.status = 'ACTIVE';
          changed = true;
        } else if (user.status === 'REJECTED') {
          user.status = 'INACTIVE';
          changed = true;
        }

        // Backfill name field using username
        if (!user.name || user.name.trim() === '') {
          const rawName = user.username || 'user';
          user.name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
          changed = true;
        }

        if (changed) {
          // ValidateBeforeSave disabled for single-pass migration saving
          await user.save({ validateBeforeSave: false });
          logger.info(`Successfully migrated legacy user record: ${user.username} (Mapped Name: ${user.name}, Status: ${user.status})`);
        }
      }
      logger.info('Legacy user schema migrations completed successfully.');
    }

    // Auto-backfill branchId for legacy test active admins and cashiers
    const usersLackingBranch = await User.find({
      role: { $in: ['ADMIN', 'CASHIER'] },
      status: 'ACTIVE',
      $or: [
        { branchId: null },
        { branchId: { $exists: false } }
      ]
    });

    if (usersLackingBranch.length > 0) {
      logger.info(`Found ${usersLackingBranch.length} active Admin/Cashier accounts without an assigned branch. Migrating...`);
      
      let branch = await Branch.findOne({ status: 'ACTIVE', isDeleted: false });
      if (!branch) {
        branch = await Branch.create({
          name: 'Main HQ Branch',
          branchCode: 'HQB001',
          phone: '1234567890',
          email: 'hq@apexify.com',
          address: '123 Headquarters Blvd',
          city: 'Central City',
          state: 'Central State',
          country: 'Central Country',
          pincode: '123456',
          managerName: 'HQ Manager',
          status: 'ACTIVE'
        });
        logger.info(`Created default branch '${branch.name}' (${branch.branchCode}) for legacy staff migration.`);
      }

      for (const user of usersLackingBranch) {
        user.branchId = branch._id;
        await user.save({ validateBeforeSave: false });
        logger.info(`Successfully assigned branch '${branch.name}' to legacy account: ${user.username}`);
      }
      logger.info('Legacy active accounts branch migration completed successfully.');
    }
  } catch (error) {
    logger.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
