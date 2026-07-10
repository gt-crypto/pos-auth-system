import mongoose from 'mongoose';
import dotenv from 'dotenv';

import User from './models/User.js';
import Branch from './models/Branch.js';
import Category from './models/Category.js';
import Product from './models/Product.js';
import Inventory from './models/Inventory.js';
import Customer from './models/Customer.js';
import Supplier from './models/Supplier.js';
import Ingredient from './models/Ingredient.js';
import Order from './models/Order.js';
import AuditLog from './models/AuditLog.js';

dotenv.config();

const log = (message) => console.log(`[seed] ${message}`);

const ensureDocument = async (Model, filter, values) => {
  const existing = await Model.findOne(filter);
  if (existing) {
    Object.assign(existing, values);
    await existing.save();
    return existing;
  }

  const created = new Model(values);
  await created.save();
  return created;
};

const ensureUser = async (filter, values) => {
  const existing = await User.findOne(filter);
  if (existing) {
    Object.assign(existing, values);
    await existing.save();
    return existing;
  }

  const created = new User(values);
  await created.save();
  return created;
};

const orderLine = (product, quantity) => ({
  productId: product._id,
  name: product.name,
  sku: product.sku,
  quantity,
  unitPrice: product.price,
  taxAmount: +(product.price * quantity * (product.taxPercentage / 100)).toFixed(2),
  totalPrice: +(product.price * quantity).toFixed(2)
});

const seed = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing');
  }

  await mongoose.connect(process.env.MONGO_URI);
  log('connected to MongoDB');

  const superAdmin = await ensureUser(
    { username: 'superadmin' },
    {
      username: 'superadmin',
      name: 'Super Admin',
      email: 'super@admin.com',
      password: 'Password@123',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE'
    }
  );

  const branchAlpha = await ensureDocument(Branch, { branchCode: 'B-ALPH' }, {
    name: 'Branch Alpha',
    branchCode: 'B-ALPH',
    phone: '+1-555-0101',
    email: 'alpha@apexify.demo',
    address: '100 Alpha Street',
    city: 'Metropolis',
    state: 'NY',
    country: 'USA',
    pincode: '10001',
    managerName: 'Ava Alpha',
    status: 'ACTIVE',
    createdBy: superAdmin._id,
    updatedBy: superAdmin._id
  });

  const branchBeta = await ensureDocument(Branch, { branchCode: 'B-BETA' }, {
    name: 'Branch Beta',
    branchCode: 'B-BETA',
    phone: '+1-555-0102',
    email: 'beta@apexify.demo',
    address: '200 Beta Avenue',
    city: 'Gotham',
    state: 'NJ',
    country: 'USA',
    pincode: '07001',
    managerName: 'Ben Beta',
    status: 'ACTIVE',
    createdBy: superAdmin._id,
    updatedBy: superAdmin._id
  });

  const adminAlpha = await ensureUser(
    { username: 'admin_alpha' },
    {
      username: 'admin_alpha',
      name: 'Admin Alpha',
      email: 'admin_alpha@apexify.demo',
      password: 'Password@123',
      role: 'ADMIN',
      status: 'ACTIVE',
      branchId: branchAlpha._id
    }
  );

  const cashierAlpha = await ensureUser(
    { username: 'cashier_alpha' },
    {
      username: 'cashier_alpha',
      name: 'Cashier Alpha',
      email: 'cashier_alpha@apexify.demo',
      password: 'Password@123',
      role: 'CASHIER',
      status: 'ACTIVE',
      branchId: branchAlpha._id,
      hasIngredientsAccess: true
    }
  );

  const adminBeta = await ensureUser(
    { username: 'admin_beta' },
    {
      username: 'admin_beta',
      name: 'Admin Beta',
      email: 'admin_beta@apexify.demo',
      password: 'Password@123',
      role: 'ADMIN',
      status: 'ACTIVE',
      branchId: branchBeta._id
    }
  );

  const cashierBeta = await ensureUser(
    { username: 'cashier_beta' },
    {
      username: 'cashier_beta',
      name: 'Cashier Beta',
      email: 'cashier_beta@apexify.demo',
      password: 'Password@123',
      role: 'CASHIER',
      status: 'ACTIVE',
      branchId: branchBeta._id,
      hasIngredientsAccess: true
    }
  );

  const categoriesAlpha = {
    burgers: await ensureDocument(Category, { branchId: branchAlpha._id, name: 'Burgers' }, {
      branchId: branchAlpha._id,
      name: 'Burgers',
      description: 'Handheld burgers and sandwiches',
      displayOrder: 1,
      isActive: true,
      createdBy: adminAlpha._id,
      updatedBy: adminAlpha._id
    }),
    drinks: await ensureDocument(Category, { branchId: branchAlpha._id, name: 'Drinks' }, {
      branchId: branchAlpha._id,
      name: 'Drinks',
      description: 'Hot and cold beverages',
      displayOrder: 2,
      isActive: true,
      createdBy: adminAlpha._id,
      updatedBy: adminAlpha._id
    }),
    sides: await ensureDocument(Category, { branchId: branchAlpha._id, name: 'Sides' }, {
      branchId: branchAlpha._id,
      name: 'Sides',
      description: 'Small plates and add-ons',
      displayOrder: 3,
      isActive: true,
      createdBy: adminAlpha._id,
      updatedBy: adminAlpha._id
    })
  };

  const categoriesBeta = {
    wraps: await ensureDocument(Category, { branchId: branchBeta._id, name: 'Wraps' }, {
      branchId: branchBeta._id,
      name: 'Wraps',
      description: 'Wrap meals and grilled sandwiches',
      displayOrder: 1,
      isActive: true,
      createdBy: adminBeta._id,
      updatedBy: adminBeta._id
    }),
    desserts: await ensureDocument(Category, { branchId: branchBeta._id, name: 'Desserts' }, {
      branchId: branchBeta._id,
      name: 'Desserts',
      description: 'Sweet treats and cakes',
      displayOrder: 2,
      isActive: true,
      createdBy: adminBeta._id,
      updatedBy: adminBeta._id
    }),
    drinks: await ensureDocument(Category, { branchId: branchBeta._id, name: 'Drinks' }, {
      branchId: branchBeta._id,
      name: 'Drinks',
      description: 'Soft drinks and beverages',
      displayOrder: 3,
      isActive: true,
      createdBy: adminBeta._id,
      updatedBy: adminBeta._id
    })
  };

  const products = {
    alpha: [
      await ensureDocument(Product, { branchId: branchAlpha._id, sku: 'A-BUR-001' }, {
        branchId: branchAlpha._id,
        categoryId: categoriesAlpha.burgers._id,
        name: 'Classic Burger',
        description: 'Signature beef burger with lettuce and tomato',
        sku: 'A-BUR-001',
        price: 8.5,
        taxPercentage: 10,
        isVeg: false,
        isAvailable: true,
        status: 'ACTIVE',
        createdBy: adminAlpha._id,
        updatedBy: adminAlpha._id
      }),
      await ensureDocument(Product, { branchId: branchAlpha._id, sku: 'A-BUR-002' }, {
        branchId: branchAlpha._id,
        categoryId: categoriesAlpha.burgers._id,
        name: 'Veg Burger',
        description: 'Grilled vegetable burger',
        sku: 'A-BUR-002',
        price: 7.25,
        taxPercentage: 10,
        isVeg: true,
        isAvailable: true,
        status: 'ACTIVE',
        createdBy: adminAlpha._id,
        updatedBy: adminAlpha._id
      }),
      await ensureDocument(Product, { branchId: branchAlpha._id, sku: 'A-SID-001' }, {
        branchId: branchAlpha._id,
        categoryId: categoriesAlpha.sides._id,
        name: 'French Fries',
        description: 'Crispy seasoned fries',
        sku: 'A-SID-001',
        price: 4,
        taxPercentage: 5,
        isVeg: true,
        isAvailable: true,
        status: 'ACTIVE',
        createdBy: adminAlpha._id,
        updatedBy: adminAlpha._id
      }),
      await ensureDocument(Product, { branchId: branchAlpha._id, sku: 'A-DRK-001' }, {
        branchId: branchAlpha._id,
        categoryId: categoriesAlpha.drinks._id,
        name: 'Cola',
        description: 'Chilled cola beverage',
        sku: 'A-DRK-001',
        price: 2.5,
        taxPercentage: 12,
        isVeg: true,
        isAvailable: true,
        status: 'ACTIVE',
        createdBy: adminAlpha._id,
        updatedBy: adminAlpha._id
      }),
      await ensureDocument(Product, { branchId: branchAlpha._id, sku: 'A-DRK-002' }, {
        branchId: branchAlpha._id,
        categoryId: categoriesAlpha.drinks._id,
        name: 'Cold Coffee',
        description: 'Iced coffee with milk',
        sku: 'A-DRK-002',
        price: 3.75,
        taxPercentage: 12,
        isVeg: true,
        isAvailable: true,
        status: 'ACTIVE',
        createdBy: adminAlpha._id,
        updatedBy: adminAlpha._id
      })
    ],
    beta: [
      await ensureDocument(Product, { branchId: branchBeta._id, sku: 'B-WRP-001' }, {
        branchId: branchBeta._id,
        categoryId: categoriesBeta.wraps._id,
        name: 'Chicken Wrap',
        description: 'Grilled chicken wrap with sauce',
        sku: 'B-WRP-001',
        price: 9.25,
        taxPercentage: 10,
        isVeg: false,
        isAvailable: true,
        status: 'ACTIVE',
        createdBy: adminBeta._id,
        updatedBy: adminBeta._id
      }),
      await ensureDocument(Product, { branchId: branchBeta._id, sku: 'B-DSR-001' }, {
        branchId: branchBeta._id,
        categoryId: categoriesBeta.desserts._id,
        name: 'Cheesecake Slice',
        description: 'Creamy cheesecake slice',
        sku: 'B-DSR-001',
        price: 5.5,
        taxPercentage: 5,
        isVeg: true,
        isAvailable: true,
        status: 'ACTIVE',
        createdBy: adminBeta._id,
        updatedBy: adminBeta._id
      }),
      await ensureDocument(Product, { branchId: branchBeta._id, sku: 'B-DRK-001' }, {
        branchId: branchBeta._id,
        categoryId: categoriesBeta.drinks._id,
        name: 'Lemon Soda',
        description: 'Sparkling lemon drink',
        sku: 'B-DRK-001',
        price: 2.75,
        taxPercentage: 12,
        isVeg: true,
        isAvailable: true,
        status: 'ACTIVE',
        createdBy: adminBeta._id,
        updatedBy: adminBeta._id
      }),
      await ensureDocument(Product, { branchId: branchBeta._id, sku: 'B-SID-001' }, {
        branchId: branchBeta._id,
        categoryId: categoriesBeta.wraps._id,
        name: 'Onion Rings',
        description: 'Golden fried onion rings',
        sku: 'B-SID-001',
        price: 4.5,
        taxPercentage: 5,
        isVeg: true,
        isAvailable: true,
        status: 'ACTIVE',
        createdBy: adminBeta._id,
        updatedBy: adminBeta._id
      }),
      await ensureDocument(Product, { branchId: branchBeta._id, sku: 'B-SAN-001' }, {
        branchId: branchBeta._id,
        categoryId: categoriesBeta.wraps._id,
        name: 'Grilled Sandwich',
        description: 'Toast sandwich with cheese and herbs',
        sku: 'B-SAN-001',
        price: 6.25,
        taxPercentage: 10,
        isVeg: true,
        isAvailable: true,
        status: 'ACTIVE',
        createdBy: adminBeta._id,
        updatedBy: adminBeta._id
      })
    ]
  };

  const inventoryRows = [
    [products.alpha[0], branchAlpha, 42, 8],
    [products.alpha[1], branchAlpha, 38, 8],
    [products.alpha[2], branchAlpha, 25, 6],
    [products.alpha[3], branchAlpha, 70, 10],
    [products.alpha[4], branchAlpha, 36, 10],
    [products.beta[0], branchBeta, 31, 6],
    [products.beta[1], branchBeta, 14, 5],
    [products.beta[2], branchBeta, 54, 10],
    [products.beta[3], branchBeta, 21, 6],
    [products.beta[4], branchBeta, 19, 6]
  ];

  for (const [product, branch, quantity, threshold] of inventoryRows) {
    await ensureDocument(Inventory, { branchId: branch._id, productId: product._id }, {
      branchId: branch._id,
      productId: product._id,
      quantity,
      threshold,
      unit: 'pieces',
      createdBy: branch._id.equals(branchAlpha._id) ? adminAlpha._id : adminBeta._id,
      updatedBy: branch._id.equals(branchAlpha._id) ? adminAlpha._id : adminBeta._id
    });
  }

  const suppliers = [
    await ensureDocument(Supplier, { companyName: 'FreshFarm Supplies' }, {
      companyName: 'FreshFarm Supplies',
      contactPerson: 'Isha Verma',
      phone: '+1-555-0201',
      email: 'orders@freshfarm.demo',
      gstNumber: 'GST-FRESH-001',
      address: '12 Farm Road, Metropolis',
      notes: 'Produce and bakery supplier',
      status: 'ACTIVE',
      createdBy: superAdmin._id,
      updatedBy: superAdmin._id
    }),
    await ensureDocument(Supplier, { companyName: 'DairyWorld Foods' }, {
      companyName: 'DairyWorld Foods',
      contactPerson: 'Mila Shah',
      phone: '+1-555-0202',
      email: 'sales@dairyworld.demo',
      gstNumber: 'GST-DAIRY-002',
      address: '44 Dairy Lane, Gotham',
      notes: 'Cheese and milk products',
      status: 'ACTIVE',
      createdBy: superAdmin._id,
      updatedBy: superAdmin._id
    }),
    await ensureDocument(Supplier, { companyName: 'SpiceRoute Traders' }, {
      companyName: 'SpiceRoute Traders',
      contactPerson: 'Karan Patel',
      phone: '+1-555-0203',
      email: 'hello@spiceroute.demo',
      gstNumber: 'GST-SPICE-003',
      address: '81 Market Street, Central City',
      notes: 'Spices, sauces, and condiments',
      status: 'ACTIVE',
      createdBy: superAdmin._id,
      updatedBy: superAdmin._id
    })
  ];

  const ingredients = [
    await ensureDocument(Ingredient, { branchId: branchAlpha._id, name: 'Tomatoes' }, {
      name: 'Tomatoes', category: 'Vegetables', unit: 'Kg', quantity: 18, minimumQuantity: 5, costPerUnit: 1.2,
      supplier: suppliers[0]._id, branch: branchAlpha._id, branchId: branchAlpha._id,
      status: 'ACTIVE', createdBy: adminAlpha._id, updatedBy: adminAlpha._id
    }),
    await ensureDocument(Ingredient, { branchId: branchAlpha._id, name: 'Burger Buns' }, {
      name: 'Burger Buns', category: 'Bakery', unit: 'Piece', quantity: 120, minimumQuantity: 40, costPerUnit: 0.35,
      supplier: suppliers[0]._id, branch: branchAlpha._id, branchId: branchAlpha._id,
      status: 'ACTIVE', createdBy: adminAlpha._id, updatedBy: adminAlpha._id
    }),
    await ensureDocument(Ingredient, { branchId: branchAlpha._id, name: 'Cheese Slices' }, {
      name: 'Cheese Slices', category: 'Dairy', unit: 'Piece', quantity: 90, minimumQuantity: 25, costPerUnit: 0.4,
      supplier: suppliers[1]._id, branch: branchAlpha._id, branchId: branchAlpha._id,
      status: 'ACTIVE', createdBy: adminAlpha._id, updatedBy: adminAlpha._id
    }),
    await ensureDocument(Ingredient, { branchId: branchAlpha._id, name: 'Chicken Patties' }, {
      name: 'Chicken Patties', category: 'Meat', unit: 'Piece', quantity: 60, minimumQuantity: 15, costPerUnit: 1.1,
      supplier: suppliers[2]._id, branch: branchAlpha._id, branchId: branchAlpha._id,
      status: 'ACTIVE', createdBy: adminAlpha._id, updatedBy: adminAlpha._id
    }),
    await ensureDocument(Ingredient, { branchId: branchAlpha._id, name: 'Potatoes' }, {
      name: 'Potatoes', category: 'Vegetables', unit: 'Kg', quantity: 24, minimumQuantity: 8, costPerUnit: 0.8,
      supplier: suppliers[0]._id, branch: branchAlpha._id, branchId: branchAlpha._id,
      status: 'ACTIVE', createdBy: adminAlpha._id, updatedBy: adminAlpha._id
    }),
    await ensureDocument(Ingredient, { branchId: branchAlpha._id, name: 'Coffee Beans' }, {
      name: 'Coffee Beans', category: 'Beverages', unit: 'Kg', quantity: 15, minimumQuantity: 4, costPerUnit: 6.5,
      supplier: suppliers[2]._id, branch: branchAlpha._id, branchId: branchAlpha._id,
      status: 'ACTIVE', createdBy: adminAlpha._id, updatedBy: adminAlpha._id
    })
  ];

  const customers = [
    { branchId: branchAlpha._id, name: 'Aarav Mehta', phoneNumber: '+1-555-1001', email: 'aarav@demo.com', notes: 'Lunch regular' },
    { branchId: branchAlpha._id, name: 'Noah Carter', phoneNumber: '+1-555-1002', email: 'noah@demo.com', notes: 'Prefers card payments' },
    { branchId: branchAlpha._id, name: 'Mia Lopez', phoneNumber: '+1-555-1003', email: 'mia@demo.com', notes: 'Frequent burger orders' },
    { branchId: branchAlpha._id, name: 'Ethan Walker', phoneNumber: '+1-555-1004', email: 'ethan@demo.com', notes: 'Weekend customer' },
    { branchId: branchAlpha._id, name: 'Sara Khan', phoneNumber: '+1-555-1005', email: 'sara@demo.com', notes: 'Coffee lover' },
    { branchId: branchBeta._id, name: 'Liam Chen', phoneNumber: '+1-555-2001', email: 'liam@demo.com', notes: 'Wrap fan' },
    { branchId: branchBeta._id, name: 'Olivia Brown', phoneNumber: '+1-555-2002', email: 'olivia@demo.com', notes: 'Dessert orders' },
    { branchId: branchBeta._id, name: 'James Wilson', phoneNumber: '+1-555-2003', email: 'james@demo.com', notes: 'Regular walk-in' },
    { branchId: branchBeta._id, name: 'Emma Taylor', phoneNumber: '+1-555-2004', email: 'emma@demo.com', notes: 'Mixed orders' },
    { branchId: branchBeta._id, name: 'Sophia Davis', phoneNumber: '+1-555-2005', email: 'sophia@demo.com', notes: 'Evening visitor' }
  ];

  const customerDocs = [];
  for (const customer of customers) {
    const createdBy = customer.branchId.equals(branchAlpha._id) ? adminAlpha._id : adminBeta._id;
    const doc = await ensureDocument(Customer, { branchId: customer.branchId, phoneNumber: customer.phoneNumber }, {
      ...customer,
      phone: customer.phoneNumber,
      status: 'ACTIVE',
      createdBy,
      updatedBy: createdBy
    });
    customerDocs.push(doc);
  }

  const orderSpecs = [
    {
      orderNumber: 'DEMO-ORD-001',
      branchId: branchAlpha._id,
      cashierId: cashierAlpha._id,
      customerId: customerDocs[0]._id,
      customerName: customerDocs[0].name,
      customerPhone: customerDocs[0].phoneNumber,
      paymentMethod: 'CASH',
      itemLines: [orderLine(products.alpha[0], 2), orderLine(products.alpha[2], 1)]
    },
    {
      orderNumber: 'DEMO-ORD-002',
      branchId: branchAlpha._id,
      cashierId: cashierAlpha._id,
      customerId: customerDocs[1]._id,
      customerName: customerDocs[1].name,
      customerPhone: customerDocs[1].phoneNumber,
      paymentMethod: 'CARD',
      itemLines: [orderLine(products.alpha[4], 2), orderLine(products.alpha[3], 2)]
    },
    {
      orderNumber: 'DEMO-ORD-003',
      branchId: branchAlpha._id,
      cashierId: cashierAlpha._id,
      customerId: customerDocs[2]._id,
      customerName: customerDocs[2].name,
      customerPhone: customerDocs[2].phoneNumber,
      paymentMethod: 'UPI',
      itemLines: [orderLine(products.alpha[1], 1), orderLine(products.alpha[3], 1), orderLine(products.alpha[2], 1)]
    },
    {
      orderNumber: 'DEMO-ORD-004',
      branchId: branchBeta._id,
      cashierId: cashierBeta._id,
      customerId: customerDocs[5]._id,
      customerName: customerDocs[5].name,
      customerPhone: customerDocs[5].phoneNumber,
      paymentMethod: 'CASH',
      itemLines: [orderLine(products.beta[0], 1), orderLine(products.beta[2], 2)]
    },
    {
      orderNumber: 'DEMO-ORD-005',
      branchId: branchBeta._id,
      cashierId: cashierBeta._id,
      customerId: customerDocs[6]._id,
      customerName: customerDocs[6].name,
      customerPhone: customerDocs[6].phoneNumber,
      paymentMethod: 'UPI',
      itemLines: [orderLine(products.beta[1], 2), orderLine(products.beta[3], 1)]
    },
    {
      orderNumber: 'DEMO-ORD-006',
      branchId: branchBeta._id,
      cashierId: cashierBeta._id,
      customerId: null,
      customerName: 'Walk-in Customer',
      customerPhone: '',
      paymentMethod: 'CARD',
      itemLines: [orderLine(products.beta[4], 1), orderLine(products.beta[2], 1)]
    }
  ];

  for (const spec of orderSpecs) {
    const subtotal = +spec.itemLines.reduce((sum, line) => sum + line.totalPrice, 0).toFixed(2);
    const totalTax = +spec.itemLines.reduce((sum, line) => sum + line.taxAmount, 0).toFixed(2);
    const totalAmount = +(subtotal + totalTax).toFixed(2);

    await ensureDocument(Order, { orderNumber: spec.orderNumber }, {
      orderNumber: spec.orderNumber,
      customerId: spec.customerId,
      customerName: spec.customerName,
      customerPhone: spec.customerPhone,
      branchId: spec.branchId,
      cashierId: spec.cashierId,
      items: spec.itemLines,
      subtotal,
      totalDiscount: 0,
      totalTax,
      totalAmount,
      paymentMethod: spec.paymentMethod,
      paymentMethods: [{ method: spec.paymentMethod, amount: totalAmount }],
      paymentStatus: 'PAID',
      status: 'COMPLETED',
      notes: 'Seeded demo order',
      orderDate: new Date()
    });
  }

  const auditEntries = [
    { action: 'SEED_BRANCH_DATA', entityType: 'Branch', entityId: branchAlpha._id, branchId: branchAlpha._id, metadata: { branch: branchAlpha.name } },
    { action: 'SEED_BRANCH_DATA', entityType: 'Branch', entityId: branchBeta._id, branchId: branchBeta._id, metadata: { branch: branchBeta.name } },
    { action: 'SEED_CATALOG_DATA', entityType: 'Category', entityId: categoriesAlpha.burgers._id, branchId: branchAlpha._id, metadata: { categories: 6 } },
    { action: 'SEED_CUSTOMER_DATA', entityType: 'Customer', entityId: customerDocs[0]._id, branchId: branchAlpha._id, metadata: { customers: 10 } },
    { action: 'SEED_ORDER_DATA', entityType: 'Order', entityId: (await Order.findOne({ orderNumber: 'DEMO-ORD-001' }))._id, branchId: branchAlpha._id, metadata: { orders: 6 } }
  ];

  for (const entry of auditEntries) {
    const exists = await AuditLog.findOne({ action: entry.action, entityType: entry.entityType, entityId: entry.entityId });
    if (!exists) {
      await AuditLog.create({
        performedBy: superAdmin._id,
        performedByRole: 'SUPER_ADMIN',
        actor: superAdmin._id,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        branchId: entry.branchId,
        metadata: entry.metadata,
        ipAddress: '127.0.0.1',
        userAgent: 'seedDemoData.js'
      });
    }
  }

  log(`seeded 2 branches, 5 users, ${Object.keys(categoriesAlpha).length + Object.keys(categoriesBeta).length} categories, 10 products, 10 customers, 3 suppliers, 6 ingredients, and 6 completed orders`);
  log('login credentials: superadmin / Password@123');

  await mongoose.disconnect();
};

seed().catch(async (error) => {
  console.error('[seed] failed:', error?.message || error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});