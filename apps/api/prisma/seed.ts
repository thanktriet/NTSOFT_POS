import { PrismaClient, StaffRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create Store
  const store = await prisma.store.upsert({
    where: { id: 'store-001' },
    update: {},
    create: {
      id: 'store-001',
      name: 'Nam Thắng Beer & Food',
      address: '123 Nguyễn Huệ, Q.1, TP.HCM',
      phone: '0901234567',
    },
  });
  console.log('✓ Store created:', store.name);

  // 2. Create Staff
  const staffData = [
    { name: 'Trần Minh Tâm', pin: '0000', role: StaffRole.owner },
    { name: 'Nguyễn Văn Nam', pin: '1234', role: StaffRole.staff },
    { name: 'Trần Thị Hoa', pin: '2345', role: StaffRole.staff },
    { name: 'Lê Văn Tài', pin: '3456', role: StaffRole.staff },
    { name: 'Nguyễn Văn Minh', pin: '4567', role: StaffRole.kitchen },
    { name: 'Trần Văn Hùng', pin: '5678', role: StaffRole.kitchen },
    { name: 'Phạm Thị Lan', pin: '6789', role: StaffRole.kitchen },
  ];

  for (const s of staffData) {
    const hashedPin = await bcrypt.hash(s.pin, 10);
    await prisma.staff.upsert({
      where: { storeId_pin: { storeId: store.id, pin: hashedPin } },
      update: {},
      create: {
        storeId: store.id,
        name: s.name,
        pin: hashedPin,
        role: s.role,
      },
    });
  }
  console.log('✓ Staff created:', staffData.length, 'members');

  // 3. Create Tables
  const tables = [];
  const floors = [
    { floor: '1', prefix: 'A', count: 9 },
    { floor: '1', prefix: 'B', count: 5 },
    { floor: '2', prefix: 'C', count: 5 },
  ];

  for (const f of floors) {
    for (let i = 1; i <= f.count; i++) {
      const name = `${f.prefix}${i.toString().padStart(2, '0')}`;
      tables.push({
        storeId: store.id,
        name,
        floor: f.floor,
        seats: i <= 3 ? 2 : i <= 7 ? 4 : 6,
        qrCode: `${store.id}/${name}`.toLowerCase(),
      });
    }
  }

  for (const t of tables) {
    await prisma.table.upsert({
      where: { storeId_name: { storeId: t.storeId, name: t.name } },
      update: {},
      create: t,
    });
  }
  console.log('✓ Tables created:', tables.length);

  // 4. Create Menu Categories + Items
  const categories = [
    {
      name: 'Món ngon',
      icon: '🍖',
      items: [
        { name: 'Bò nướng tảng', price: 250000, prepTime: 15 },
        { name: 'Mực nướng muối ớt', price: 250000, prepTime: 12 },
        { name: 'Bò lúc lắc', price: 180000, prepTime: 10 },
        { name: 'Sườn nướng', price: 200000, prepTime: 15 },
        { name: 'Thát bát cá lóc', price: 220000, prepTime: 20 },
      ],
    },
    {
      name: 'Bia',
      icon: '🍺',
      items: [
        { name: 'Tiger Bạc', price: 25000, prepTime: 1 },
        { name: 'Heineken', price: 30000, prepTime: 1 },
        { name: 'Bia Sài Gòn', price: 18000, prepTime: 1 },
        { name: 'Tiger Nâu', price: 22000, prepTime: 1 },
      ],
    },
    {
      name: 'Món nhậu',
      icon: '🍢',
      items: [
        { name: 'Cánh gà chiên mắm', price: 155000, prepTime: 12 },
        { name: 'Nem chua rán', price: 85000, prepTime: 8 },
        { name: 'Đậu phộng rang tỏi', price: 35000, prepTime: 3 },
        { name: 'Bàn chân gà', price: 180000, prepTime: 10 },
      ],
    },
    {
      name: 'Hải sản',
      icon: '🦐',
      items: [
        { name: 'Tôm hùm đúc lò', price: 450000, prepTime: 20 },
        { name: 'Ngao hấp sả', price: 120000, prepTime: 10 },
        { name: 'Mì xào hải sản', price: 150000, prepTime: 12 },
      ],
    },
    {
      name: 'Lẩu',
      icon: '🍲',
      items: [
        { name: 'Lẩu hải sản chua cay', price: 450000, prepTime: 18 },
        { name: 'Lẩu bò nhúng dấm', price: 380000, prepTime: 15 },
        { name: 'Lẩu nướng BBQ', price: 350000, prepTime: 15 },
      ],
    },
    {
      name: 'Khác',
      icon: '📋',
      items: [
        { name: 'Cơm trắng', price: 10000, prepTime: 2 },
        { name: 'Cơm rang dương châu', price: 65000, prepTime: 8 },
        { name: 'Rau muống xào tỏi', price: 45000, prepTime: 5 },
        { name: 'Khoai tây chiên', price: 55000, prepTime: 8 },
      ],
    },
  ];

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const category = await prisma.menuCategory.create({
      data: {
        storeId: store.id,
        name: cat.name,
        icon: cat.icon,
        sortOrder: i,
      },
    });

    for (let j = 0; j < cat.items.length; j++) {
      const item = cat.items[j];
      await prisma.menuItem.create({
        data: {
          categoryId: category.id,
          name: item.name,
          price: item.price,
          prepTime: item.prepTime,
          sortOrder: j,
        },
      });
    }
  }
  console.log('✓ Menu created:', categories.length, 'categories');

  console.log('\n✅ Seed complete!');
  console.log('\n📝 Staff PINs:');
  staffData.forEach((s) => console.log(`   ${s.name} (${s.role}): ${s.pin}`));
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
