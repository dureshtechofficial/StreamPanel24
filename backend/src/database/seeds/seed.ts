import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';
import { UserStatus } from '../../users/enums/user-status.enum';

async function seed() {
  await dataSource.initialize();

  const userRepository = dataSource.getRepository(User);

  const seedUsers = [
    {
      name: 'Admin',
      email: 'admin@example.com',
      password: 'ChangeMe123!',
      role: UserRole.ADMIN,
    },
    {
      name: 'Test User',
      email: 'user@example.com',
      password: 'ChangeMe123!',
      role: UserRole.USER,
    },
  ];

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10);

  for (const seedUser of seedUsers) {
    const existing = await userRepository.findOne({
      where: { email: seedUser.email },
    });
    if (existing) {
      console.log(`Skipping existing user: ${seedUser.email}`);
      continue;
    }

    const password_hash = await bcrypt.hash(seedUser.password, saltRounds);
    const user = userRepository.create({
      name: seedUser.name,
      email: seedUser.email,
      password_hash,
      role: seedUser.role,
      status: UserStatus.ACTIVE,
    });
    await userRepository.save(user);
    console.log(`Seeded user: ${seedUser.email} / ${seedUser.password}`);
  }

  await dataSource.destroy();
}

seed()
  .then(() => {
    console.log('Seeding complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
