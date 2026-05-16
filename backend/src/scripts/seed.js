/**
 * Seed script — populates a fresh local DB with realistic sample data.
 * Run: node src/scripts/seed.js
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// ─── helpers ────────────────────────────────────────────────────────────────

function d(offsetDays) {
  const dt = new Date();
  dt.setDate(dt.getDate() + offsetDays);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

// ─── seed functions ──────────────────────────────────────────────────────────

async function seedUsers() {
  const users = [
    { username: "Krushang",  email: "krushangshah18@gmail.com", password: "ks@123"        },
    { username: "Ajay",      email: "talodman@yahoo.com",       password: "Ajay6444"      },
    { username: "Mayur",     email: "ocsfiori@gmail.com",       password: "mayur@123"     },
    { username: "Yashraj",   email: "ypchauhan47@gmail.com",    password: "yashraj@123"   },
    { username: "Vairanya",  email: "vairanya_shah@yahoo.co.in",password: "vairanya6444"  },
  ];

  const created = [];
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    const user = await prisma.user.upsert({
      where:  { username: u.username },
      update: {},
      create: { username: u.username, email: u.email, password: hash },
    });
    created.push(user);
  }
  console.log(`  ✅ ${created.length} users`);
  return created;
}

async function seedCompany() {
  const existing = await prisma.ourCompanyDetails.count();
  if (existing > 0) {
    console.log("  ⏭  company details already present");
    return prisma.ourCompanyDetails.findFirst();
  }
  const company = await prisma.ourCompanyDetails.create({
    data: {
      companyName: "M/S O.C.Shah",
      gstNumber:   "24AABCS1234A1Z5",
      email:       "ocs.group.service@gmail.com",
      phone:       "+91 98765 43210",
      phone2:      "+91 98765 12345",
      address:     "Plot No. 12, Industrial Area, Surat, Gujarat - 395010",
    },
  });
  console.log("  ✅ company details");
  return company;
}

async function seedMachines() {
  const machines = [
    { machineNumber: "GJ-05-BX-1234", name: "Ajax Fiori Argo 5000 — #1",  description: "6 cu.m self-loading concrete mixer, 2019 model" },
    { machineNumber: "GJ-05-BX-1235", name: "Ajax Fiori Argo 5000 — #2",  description: "6 cu.m self-loading concrete mixer, 2020 model" },
    { machineNumber: "GJ-05-CY-4422", name: "Schwing Stetter CP30 — #1",  description: "Transit mixer 7 cu.m capacity, 2021 model" },
    { machineNumber: "GJ-05-CY-4423", name: "Schwing Stetter CP30 — #2",  description: "Transit mixer 7 cu.m capacity, 2022 model" },
    { machineNumber: "GJ-05-DZ-8800", name: "Putzmeister BSF 32Z-4 Pump", description: "Concrete boom pump, 32 m reach, 2020 model" },
  ];

  const created = [];
  for (const m of machines) {
    const machine = await prisma.machine.upsert({
      where:  { machineNumber: m.machineNumber },
      update: {},
      create: m,
    });
    created.push(machine);
  }
  console.log(`  ✅ ${created.length} machines`);
  return created;
}

async function seedMachineDocuments(machines) {
  const docs = [];
  for (const m of machines) {
    const entries = [
      { documentType: "RC_Book",   expiryDate: d(540),  lastRenewedDate: d(-180), remarks: "Registration certificate valid"        },
      { documentType: "PUC",       expiryDate: d(60),   lastRenewedDate: d(-305), remarks: "Pollution check done at Surat RTO"     },
      { documentType: "Fitness",   expiryDate: d(120),  lastRenewedDate: d(-245), remarks: "Annual fitness cert from RTO"          },
      { documentType: "Insurance", expiryDate: d(30),   lastRenewedDate: d(-335), remarks: "Comprehensive policy — New India Assurance" },
    ];
    for (const e of entries) {
      const doc = await prisma.machineDocument.upsert({
        where:  { machineId_documentType: { machineId: m.id, documentType: e.documentType } },
        update: {},
        create: { machineId: m.id, ...e },
      });
      // notification thresholds: 30 and 7 days before expiry
      for (const days of [30, 7]) {
        await prisma.documentNotification.upsert({
          where:  { id: doc.id * 100 + days }, // stable pseudo-id; not elegant but idempotent
          update: {},
          create: { machineDocumentId: doc.id, daysBefore: days, isActive: true },
        }).catch(() => {
          // upsert by composite key not available; just create if missing
        });
      }
      docs.push(doc);
    }
  }
  console.log(`  ✅ ${docs.length} machine documents`);
  return docs;
}

async function seedNotificationDefaults(adminUser) {
  for (const docType of ["RC_Book", "PUC", "Fitness", "Insurance"]) {
    const existing = await prisma.notificationDefault.findFirst({ where: { documentType: docType } });
    if (!existing) {
      await prisma.notificationDefault.create({
        data: { documentType: docType, daysBefore: [30, 7], createdBy: adminUser.id },
      });
    }
  }
  console.log("  ✅ notification defaults");
}

async function seedDocumentNotifications(machines) {
  let count = 0;
  for (const m of machines) {
    const docs = await prisma.machineDocument.findMany({ where: { machineId: m.id } });
    for (const doc of docs) {
      const existing = await prisma.documentNotification.findFirst({ where: { machineDocumentId: doc.id } });
      if (!existing) {
        for (const days of [30, 7]) {
          await prisma.documentNotification.create({
            data: { machineDocumentId: doc.id, daysBefore: days, isActive: true },
          });
          count++;
        }
      }
    }
  }
  console.log(`  ✅ ${count} document notification rules`);
}

async function seedQuotationMachines() {
  const catalog = [
    { name: "Ajax Fiori Argo 5000 (6 cu.m)",   description: "Self-loading concrete mixer, 6 cubic meter", priceByDay: 6500,  priceByWeek: 40000,  priceByMonth: 145000, gstPercentage: 18 },
    { name: "Schwing Stetter CP30 (7 cu.m)",    description: "Transit mixer, 7 cubic meter capacity",      priceByDay: 7500,  priceByWeek: 47000,  priceByMonth: 168000, gstPercentage: 18 },
    { name: "Putzmeister Boom Pump 32 m",        description: "Concrete boom pump, 32 m vertical reach",   priceByDay: 15000, priceByWeek: 95000,  priceByMonth: 340000, gstPercentage: 18 },
    { name: "Operator / Labour Charges",         description: "Skilled operator per shift (8 hr)",         priceByDay: 1200,  priceByWeek: 7500,   priceByMonth: 26000,  gstPercentage: 18 },
  ];

  const created = [];
  for (const c of catalog) {
    const qm = await prisma.quotationMachine.create({ data: c }).catch(async () => {
      return prisma.quotationMachine.findFirst({ where: { name: c.name } });
    });
    created.push(qm);
  }
  console.log(`  ✅ ${created.length} quotation machine catalog entries`);
  return created;
}

async function seedCustomers() {
  const list = [
    { companyName: "Rajhans Builders Pvt. Ltd.",     contactPerson: "Rajan Mehta",    email: "rajan@rajhansbuilders.com",    phone: "9876501010", address: "A-12, Ring Road, Surat",       siteLocation: "Palanpur Patia, Surat",    gstNumber: "24AABCR5678A1Z3" },
    { companyName: "Shiv Construction Co.",           contactPerson: "Bhavesh Patel",  email: "bhavesh@shivconst.in",         phone: "9876502020", address: "B-7, Udhna, Surat",            siteLocation: "Katargam, Surat",          gstNumber: "24AABCS9012B1Z7" },
    { companyName: "Mahavir Infrastructure Ltd.",     contactPerson: "Kishore Shah",   email: "kishore@mahavirinfra.com",     phone: "9876503030", address: "23, Citylight Road, Surat",    siteLocation: "Dindoli, Surat",           gstNumber: "24AABCM3456C1Z1" },
    { companyName: "Param Developers",                contactPerson: "Parimal Desai",  email: "parimal@paramdevelopers.com",  phone: "9876504040", address: "17, Varachha Road, Surat",     siteLocation: "Varachha, Surat",          gstNumber: null                           },
    { companyName: "Global Civil Works",              contactPerson: "Arvind Joshi",   email: "arvind@globalcivil.in",        phone: "9876505050", address: "Plot 5, GIDC Sachin, Surat",   siteLocation: "Sachin GIDC, Surat",       gstNumber: "24AABCG7890D1Z5" },
  ];

  const created = [];
  for (const c of list) {
    const customer = await prisma.customer.create({ data: c }).catch(async () => {
      return prisma.customer.findFirst({ where: { companyName: c.companyName } });
    });
    created.push(customer);
  }
  console.log(`  ✅ ${created.length} customers`);
  return created;
}

async function seedCustomerQueries() {
  const existing = await prisma.customerQuery.count();
  if (existing > 0) {
    console.log("  ⏭  customer queries already present");
    return;
  }
  await prisma.customerQuery.createMany({
    data: [
      { companyName: "Sunrise Realty",    email: "info@sunriserealty.in",   siteLocation: "Adajan, Surat",      contactNumber: "9988776655", duration: "3 months",  workDescription: "Residential complex — G+7 floors, need 2 transit mixers",      status: "new"       },
      { companyName: "Kiran Contractors", email: "kiran@kiranconst.com",    siteLocation: "Pal, Surat",         contactNumber: "9977665544", duration: "6 weeks",   workDescription: "Road construction project, require boom pump for foundation",   status: "contacted" },
      { companyName: "Delta Infra",       email: "delta@deltainfra.co.in",  siteLocation: "Udhna, Surat",       contactNumber: "9966554433", duration: "1 month",   workDescription: "Industrial shed construction — concrete slab work",             status: "closed"    },
    ],
  });
  console.log("  ✅ 3 customer queries");
}

async function seedQuotationCounter() {
  await prisma.quotationCounter.upsert({
    where:  { id: 1 },
    update: {},
    create: { id: 1, currentNumber: 4 },
  });
  console.log("  ✅ quotation counter (4)");
}

async function seedTermsConditions() {
  const existing = await prisma.termsCondition.count();
  if (existing > 0) {
    console.log("  ⏭  terms & conditions already present");
    return;
  }
  await prisma.termsCondition.createMany({
    data: [
      {
        title: "Standard Rental Terms",
        description:
          "1. The equipment shall be used only for the purpose for which it is rented.\n" +
          "2. The hirer shall be responsible for any loss or damage to the equipment during the rental period.\n" +
          "3. Fuel, lubricants and consumables are to be arranged by the hirer unless otherwise agreed.\n" +
          "4. The equipment shall be returned in the same condition as delivered, fair wear and tear excepted.\n" +
          "5. Rental charges commence from the date of dispatch and cease on the date of return to our yard.\n" +
          "6. GST as applicable shall be charged additionally on all amounts.\n" +
          "7. Payment is due within 15 days of invoice date. Interest @ 2% per month on delayed payments.",
        isDefault: true,
        displayOrder: 1,
      },
      {
        title: "Operator Terms",
        description:
          "1. Our operator will be deputed along with the machine.\n" +
          "2. Working hours: 8 hours per shift. Overtime @ ₹200/hr beyond 8 hours.\n" +
          "3. The hirer shall provide adequate rest facilities, drinking water, and site safety equipment.\n" +
          "4. Sunday / national holiday allowance at double the daily rate.\n" +
          "5. Any accident / injury on site shall be the sole responsibility of the hirer.",
        isDefault: false,
        displayOrder: 2,
      },
      {
        title: "Transportation & Mobilisation",
        description:
          "1. Transportation charges from our yard to site and back shall be borne by the hirer.\n" +
          "2. Mobilisation time to site (one way) is non-billable up to 30 km. Beyond 30 km, ₹50/km.\n" +
          "3. Any additional permits or route permissions required shall be arranged by the hirer.",
        isDefault: false,
        displayOrder: 3,
      },
    ],
  });
  console.log("  ✅ 3 terms & conditions templates");
}

async function seedServiceCategories() {
  const categories = [
    { name: "Engine Oil & Lubrication", description: "Engine oil change and lubrication points", hasSubServices: true,  displayOrder: 1,
      subItems: ["Engine oil top-up", "Engine oil full change", "Gearbox oil check", "Differential oil check", "Hydraulic oil check"] },
    { name: "Filters",                  description: "Air, oil, fuel and hydraulic filter checks",  hasSubServices: true,  displayOrder: 2,
      subItems: ["Air filter clean / replace", "Oil filter replace", "Fuel filter replace", "Hydraulic filter replace"] },
    { name: "Tyres & Wheels",           description: "Tyre pressure, wear, and wheel checks",       hasSubServices: true,  displayOrder: 3,
      subItems: ["Tyre pressure check all wheels", "Tyre wear inspection", "Wheel nut torque check", "Spare tyre check"] },
    { name: "Brakes",                   description: "Brake system inspection and adjustment",       hasSubServices: true,  displayOrder: 4,
      subItems: ["Brake fluid level check", "Brake pad/shoe inspection", "Brake adjustment", "Handbrake check"] },
    { name: "Drum & Mixing System",     description: "Concrete mixing drum inspection",             hasSubServices: true,  displayOrder: 5,
      subItems: ["Drum rotation speed check", "Blade wear inspection", "Drum seal check", "Water system flush"] },
    { name: "Electrical & Lights",      description: "Battery, lighting and electrical checks",     hasSubServices: false, displayOrder: 6,
      subItems: [] },
    { name: "General Inspection",       description: "Visual walk-around and general checks",       hasSubServices: false, displayOrder: 7,
      subItems: [] },
  ];

  const createdCats = [];
  for (const cat of categories) {
    const { subItems, ...catData } = cat;
    const sc = await prisma.serviceCategory.create({ data: catData }).catch(async () => {
      return prisma.serviceCategory.findFirst({ where: { name: catData.name } });
    });
    createdCats.push({ ...sc, subItems });
  }

  let subCount = 0;
  for (const cat of createdCats) {
    for (let i = 0; i < cat.subItems.length; i++) {
      await prisma.serviceSubItem.create({
        data: { categoryId: cat.id, name: cat.subItems[i], displayOrder: i + 1 },
      }).catch(() => {});
      subCount++;
    }
  }

  console.log(`  ✅ ${createdCats.length} service categories, ${subCount} sub-items`);
  return createdCats;
}

async function seedQuotations(customers, quotationMachines, adminUser) {
  const existingCount = await prisma.quotation.count();
  if (existingCount > 0) {
    console.log("  ⏭  quotations already present");
    return;
  }

  const qmByName = {};
  for (const qm of quotationMachines) {
    qmByName[qm.name] = qm;
  }

  const ajaxQM   = quotationMachines[0]; // Ajax 6cu.m
  const schwingQM = quotationMachines[1]; // Schwing 7cu.m
  const pumpQM   = quotationMachines[2]; // Boom pump
  const opQM     = quotationMachines[3]; // Operator

  const quotations = [
    {
      quotationNumber: "QT-2526-0001",
      customerName:    customers[0].contactPerson,
      customerContact: customers[0].phone,
      companyName:     customers[0].companyName,
      customerGstNumber: customers[0].gstNumber,
      customerId:      customers[0].id,
      quotationStatus: "accepted",
      deliveryStatus:  "delivered",
      createdBy:       adminUser.id,
      termsText:       "Standard Rental Terms apply. GST extra.",
      additionalNotes: "Delivery by 8 AM. Site contact: Rajan Mehta — 9876501010.",
      items: [
        { qm: ajaxQM,    durationType: "monthly",  qty: 2, unitPrice: 145000, gstPct: 18 },
        { qm: opQM,      durationType: "monthly",  qty: 2, unitPrice: 26000,  gstPct: 18 },
      ],
    },
    {
      quotationNumber: "QT-2526-0002",
      customerName:    customers[1].contactPerson,
      customerContact: customers[1].phone,
      companyName:     customers[1].companyName,
      customerGstNumber: customers[1].gstNumber,
      customerId:      customers[1].id,
      quotationStatus: "sent",
      deliveryStatus:  "pending",
      createdBy:       adminUser.id,
      termsText:       "Standard Rental Terms apply. 50% advance on confirmation.",
      additionalNotes: null,
      items: [
        { qm: schwingQM, durationType: "weekly",   qty: 3, unitPrice: 47000,  gstPct: 18 },
        { qm: opQM,      durationType: "weekly",   qty: 3, unitPrice: 7500,   gstPct: 18 },
      ],
    },
    {
      quotationNumber: "QT-2526-0003",
      customerName:    customers[2].contactPerson,
      customerContact: customers[2].phone,
      companyName:     customers[2].companyName,
      customerGstNumber: customers[2].gstNumber,
      customerId:      customers[2].id,
      quotationStatus: "draft",
      deliveryStatus:  "pending",
      createdBy:       adminUser.id,
      termsText:       "Standard Rental Terms apply.",
      additionalNotes: "Customer requested 7-cu.m capacity.",
      items: [
        { qm: pumpQM,    durationType: "daily",    qty: 5, unitPrice: 15000,  gstPct: 18 },
        { qm: opQM,      durationType: "daily",    qty: 5, unitPrice: 1200,   gstPct: 18 },
      ],
    },
    {
      quotationNumber: "QT-2526-0004",
      customerName:    customers[3].contactPerson,
      customerContact: customers[3].phone,
      companyName:     customers[3].companyName,
      customerGstNumber: null,
      customerId:      customers[3].id,
      quotationStatus: "rejected",
      deliveryStatus:  "pending",
      createdBy:       adminUser.id,
      termsText:       "Standard Rental Terms apply.",
      additionalNotes: "Customer chose a competitor. Follow up next quarter.",
      items: [
        { qm: ajaxQM,   durationType: "monthly",  qty: 1, unitPrice: 145000, gstPct: 18 },
      ],
    },
  ];

  for (const q of quotations) {
    const { items, ...qData } = q;

    // compute totals
    let subtotal = 0;
    const lineItems = items.map((item, idx) => {
      const lineTotal = item.qty * item.unitPrice;
      const gstAmt   = parseFloat(((lineTotal * item.gstPct) / 100).toFixed(2));
      subtotal += lineTotal;
      return {
        quotationMachineId: item.qm.id,
        itemType:     "machine",
        description:  item.qm.name,
        durationType: item.durationType,
        quantity:     item.qty,
        unitPrice:    item.unitPrice,
        gstPercentage: item.gstPct,
        gstAmount:    gstAmt,
        totalAmount:  parseFloat((lineTotal + gstAmt).toFixed(2)),
        sortOrder:    idx,
      };
    });

    const totalGst   = parseFloat(lineItems.reduce((s, i) => s + i.gstAmount, 0).toFixed(2));
    const grandTotal = parseFloat((subtotal + totalGst).toFixed(2));

    await prisma.quotation.create({
      data: {
        ...qData,
        subtotal,
        totalGstAmount: totalGst,
        grandTotal,
        items: { create: lineItems },
      },
    });
  }
  console.log(`  ✅ ${quotations.length} quotations with line items`);
}

async function seedServiceRecords(machines, serviceCategories) {
  const existing = await prisma.serviceRecord.count();
  if (existing > 0) {
    console.log("  ⏭  service records already present");
    return;
  }

  // Flatten sub-items for easy lookup
  const catById = {};
  for (const cat of serviceCategories) {
    const subs = await prisma.serviceSubItem.findMany({ where: { categoryId: cat.id } });
    catById[cat.id] = { ...cat, subs };
  }

  const records = [
    {
      machine:     machines[0],
      serviceDate: d(-30),
      engineHours: 1245.5,
      siteLocation: "Palanpur Patia, Surat",
      operator:    "Ramesh Chauhan",
      generalNotes: "Routine 250 hr service. Replaced oil and air filter.",
      serviceChecks: [
        { catIdx: 0, performed: true,  notes: "Changed to 15W40 — 7 litres", subPerformed: [true, true, false, false, false] },
        { catIdx: 1, performed: true,  notes: "Air & oil filter replaced",   subPerformed: [true, true, false, false] },
        { catIdx: 2, performed: true,  notes: "All tyres at 120 PSI",        subPerformed: [true, true, false, false] },
        { catIdx: 5, performed: false, notes: null,                          subPerformed: [] },
      ],
    },
    {
      machine:     machines[2],
      serviceDate: d(-14),
      engineHours: 890.0,
      siteLocation: "Katargam, Surat",
      operator:    "Suresh Parmar",
      generalNotes: "Brake adjustment done. Drum blades showing normal wear.",
      serviceChecks: [
        { catIdx: 3, performed: true,  notes: "Brake adjusted — front axle", subPerformed: [true, false, true, true] },
        { catIdx: 4, performed: true,  notes: "Drum rotation normal",        subPerformed: [true, true, false, false] },
        { catIdx: 6, performed: true,  notes: "No leaks found",              subPerformed: [] },
      ],
    },
    {
      machine:     machines[4],
      serviceDate: d(-7),
      engineHours: 2105.0,
      siteLocation: "Dindoli, Surat",
      operator:    "Dinesh Tadvi",
      generalNotes: "500 hr major service. Full oil change, all filters replaced, tyre rotation.",
      serviceChecks: [
        { catIdx: 0, performed: true,  notes: "Full oil change — 12 litres 20W50", subPerformed: [false, true, true, true, true] },
        { catIdx: 1, performed: true,  notes: "All 4 filters replaced",            subPerformed: [true, true, true, true] },
        { catIdx: 2, performed: true,  notes: "Tyre rotation done, all at 110 PSI",subPerformed: [true, true, true, true] },
        { catIdx: 3, performed: false, notes: null,                                 subPerformed: [false, false, false, false] },
        { catIdx: 5, performed: true,  notes: "Battery water topped up",           subPerformed: [] },
        { catIdx: 6, performed: true,  notes: "Walk-around OK — no issues",        subPerformed: [] },
      ],
    },
  ];

  const flatCats = serviceCategories;

  for (const rec of records) {
    const sr = await prisma.serviceRecord.create({
      data: {
        machineId:    rec.machine.id,
        serviceDate:  rec.serviceDate,
        engineHours:  rec.engineHours,
        siteLocation: rec.siteLocation,
        operator:     rec.operator,
        generalNotes: rec.generalNotes,
      },
    });

    for (const check of rec.serviceChecks) {
      const cat = flatCats[check.catIdx];
      const srs = await prisma.serviceRecordService.create({
        data: {
          serviceRecordId:   sr.id,
          serviceCategoryId: cat.id,
          wasPerformed:      check.performed,
          serviceNotes:      check.notes,
        },
      });

      const subs = catById[cat.id]?.subs || [];
      for (let si = 0; si < subs.length; si++) {
        await prisma.serviceRecordSubService.create({
          data: {
            serviceRecordServiceId: srs.id,
            subServiceId:           subs[si].id,
            wasPerformed:           check.subPerformed[si] ?? false,
          },
        });
      }
    }
  }
  console.log(`  ✅ ${records.length} service records with checks`);
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱 Seeding database…\n");

  const users            = await seedUsers();
  const adminUser        = users[0];

  await seedCompany();
  await seedTermsConditions();

  const machines         = await seedMachines();
  await seedMachineDocuments(machines);
  await seedDocumentNotifications(machines);
  await seedNotificationDefaults(adminUser);

  const quotationMachines = await seedQuotationMachines();
  const customers         = await seedCustomers();
  await seedCustomerQueries();
  await seedQuotationCounter();
  await seedQuotations(customers, quotationMachines, adminUser);

  const serviceCategories = await seedServiceCategories();
  await seedServiceRecords(machines, serviceCategories);

  console.log("\n✅ Seed complete.\n");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
