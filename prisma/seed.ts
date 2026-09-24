import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const ROLES = [
  { name: 'SUPER_ADMIN', description: 'Full system access with all permissions' },
  { name: 'ADMIN', description: 'Store, catalog, and inventory manager' },
  { name: 'SALESMAN', description: 'POS operator, sales creator, and customer manager' },
  { name: 'CUSTOMER', description: 'Regular registered customer' },
];

const PERMISSIONS = [
  // Product Management
  { resource: 'product', action: 'read', description: 'View products' },
  { resource: 'product', action: 'create', description: 'Create new products' },
  { resource: 'product', action: 'update', description: 'Edit products' },
  { resource: 'product', action: 'delete', description: 'Delete products' },

  // Category Management
  { resource: 'category', action: 'read', description: 'View categories' },
  { resource: 'category', action: 'create', description: 'Create categories' },
  { resource: 'category', action: 'update', description: 'Edit categories' },
  { resource: 'category', action: 'delete', description: 'Delete categories' },

  // Brand Management
  { resource: 'brand', action: 'read', description: 'View brands' },
  { resource: 'brand', action: 'create', description: 'Create brands' },
  { resource: 'brand', action: 'update', description: 'Edit brands' },
  { resource: 'brand', action: 'delete', description: 'Delete brands' },

  // Fabric Management
  { resource: 'fabric', action: 'read', description: 'View fabrics' },
  { resource: 'fabric', action: 'create', description: 'Create fabrics' },
  { resource: 'fabric', action: 'update', description: 'Edit fabrics' },
  { resource: 'fabric', action: 'delete', description: 'Delete fabrics' },

  // Order Management
  { resource: 'order', action: 'read', description: 'View orders' },
  { resource: 'order', action: 'create', description: 'Create orders' },
  { resource: 'order', action: 'update', description: 'Update order status' },
  { resource: 'order', action: 'cancel', description: 'Cancel orders' },
  { resource: 'order', action: 'delete', description: 'Delete orders' },

  // POS & Sales Management
  { resource: 'sale', action: 'read', description: 'View sales' },
  { resource: 'sale', action: 'create', description: 'Create POS sale' },
  { resource: 'sale', action: 'update', description: 'Update sale record' },
  { resource: 'sale', action: 'delete', description: 'Void or delete sale' },

  // Customer Management
  { resource: 'customer', action: 'read', description: 'View customer records' },
  { resource: 'customer', action: 'create', description: 'Create customer profile' },
  { resource: 'customer', action: 'update', description: 'Update customer details' },
  { resource: 'customer', action: 'delete', description: 'Delete customer records' },

  // Inventory Management
  { resource: 'inventory', action: 'read', description: 'View stock levels' },
  { resource: 'inventory', action: 'update', description: 'Update stock levels' },
  { resource: 'inventory', action: 'adjust', description: 'Perform stock adjustments' },

  // User & Staff Management
  { resource: 'user', action: 'read', description: 'View user and staff list' },
  { resource: 'user', action: 'create', description: 'Create staff accounts' },
  { resource: 'user', action: 'update', description: 'Update user profiles and roles' },
  { resource: 'user', action: 'delete', description: 'Delete user accounts' },

  // Role & Permissions
  { resource: 'role', action: 'read', description: 'View roles and permissions' },
  { resource: 'role', action: 'update', description: 'Assign permissions to roles' },
];

const ROLE_PERMISSIONS_MAP: Record<string, string[]> = {
  CUSTOMER: [
    'product:read',
    'category:read',
    'brand:read',
    'fabric:read',
    'order:read',
    'order:create',
    'order:cancel',
  ],
  SALESMAN: [
    'product:read',
    'category:read',
    'brand:read',
    'fabric:read',
    'customer:read',
    'customer:create',
    'sale:read',
    'sale:create',
    'sale:update',
    'order:read',
    'order:create',
    'order:update',
    'inventory:read',
  ],
  ADMIN: [
    'product:read', 'product:create', 'product:update', 'product:delete',
    'category:read', 'category:create', 'category:update', 'category:delete',
    'brand:read', 'brand:create', 'brand:update', 'brand:delete',
    'fabric:read', 'fabric:create', 'fabric:update', 'fabric:delete',
    'order:read', 'order:create', 'order:update', 'order:cancel', 'order:delete',
    'sale:read', 'sale:create', 'sale:update', 'sale:delete',
    'customer:read', 'customer:create', 'customer:update', 'customer:delete',
    'inventory:read', 'inventory:update', 'inventory:adjust',
    'user:read', 'user:create', 'user:update',
    'role:read',
  ],
  SUPER_ADMIN: PERMISSIONS.map((p) => `${p.resource}:${p.action}`),
};

async function main() {
  console.log('🌱 Starting database seed for Roles & Permissions...');

  // 1. Seed Roles
  console.log('1. Upserting Roles...');
  const roleMap = new Map<string, string>();
  for (const roleData of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description },
      create: roleData,
    });
    roleMap.set(role.name, role.id);
  }

  // 2. Seed Permissions
  console.log('2. Upserting Permissions...');
  const permMap = new Map<string, string>();
  for (const permData of PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: {
        resource_action: {
          resource: permData.resource,
          action: permData.action,
        },
      },
      update: { description: permData.description },
      create: permData,
    });
    permMap.set(`${perm.resource}:${perm.action}`, perm.id);
  }

  // 3. Seed RolePermissions
  console.log('3. Linking Role Permissions...');
  for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS_MAP)) {
    const roleId = roleMap.get(roleName);
    if (!roleId) continue;

    for (const permKey of permissions) {
      const permissionId = permMap.get(permKey);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId,
          permissionId,
        },
      });
    }
  }

  console.log('✅ Database seeded successfully with Roles and Permissions!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
