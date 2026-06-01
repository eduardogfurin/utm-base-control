import { PrismaClient, VehicleCategory, Status } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  // ─── Check if admin already exists ────────────────────────────────────────
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@linkops.com" },
  });

  if (existingAdmin) {
    console.log("✅ Admin already exists — skipping seed.");
    return;
  }

  // ─── 1. Create admin user ─────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@linkops.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log(`👤 Admin created: ${admin.email}`);

  // ─── 2. Create vehicles ───────────────────────────────────────────────────
  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        name: "Flow Podcast",
        slug: "flow-podcast",
        category: VehicleCategory.PODCAST,
        description: "Veículo de podcast Flow",
        status: Status.ACTIVE,
        createdById: admin.id,
      },
    }),
    prisma.vehicle.create({
      data: {
        name: "Meta Ads",
        slug: "meta-ads",
        category: VehicleCategory.META_ADS,
        description: "Campanhas pagas no Meta (Facebook/Instagram)",
        status: Status.ACTIVE,
        createdById: admin.id,
      },
    }),
    prisma.vehicle.create({
      data: {
        name: "Google Ads",
        slug: "google-ads",
        category: VehicleCategory.GOOGLE_ADS,
        description: "Campanhas pagas no Google Ads",
        status: Status.ACTIVE,
        createdById: admin.id,
      },
    }),
  ]);

  console.log(`🚗 ${vehicles.length} vehicles created: ${vehicles.map((v) => v.name).join(", ")}`);

  // ─── 3. Create campaigns ──────────────────────────────────────────────────
  const campaigns = await Promise.all([
    prisma.campaign.create({
      data: {
        name: "G4 Gestão e Estratégia",
        slug: "g4-gestao-e-estrategia",
        description: "Campanha do curso G4 Gestão e Estratégia",
        status: Status.ACTIVE,
        createdById: admin.id,
      },
    }),
    prisma.campaign.create({
      data: {
        name: "G4 Valley",
        slug: "g4-valley",
        description: "Campanha do evento G4 Valley",
        status: Status.ACTIVE,
        createdById: admin.id,
      },
    }),
  ]);

  console.log(
    `📣 ${campaigns.length} campaigns created: ${campaigns.map((c) => c.name).join(", ")}`
  );

  // ─── 4. Create UTM templates ──────────────────────────────────────────────
  const [flowVehicle, metaVehicle, googleVehicle] = vehicles;

  const templates = await Promise.all([
    prisma.utmTemplate.create({
      data: {
        name: "Flow Podcast — Padrão",
        source: "flow-podcast",
        medium: "podcast",
        campaign: "{{campaign_slug}}",
        vehicleId: flowVehicle.id,
      },
    }),
    prisma.utmTemplate.create({
      data: {
        name: "Meta Ads — Padrão",
        source: "meta",
        medium: "cpc",
        campaign: "{{campaign_slug}}",
        content: "{{ad_id}}",
        vehicleId: metaVehicle.id,
      },
    }),
    prisma.utmTemplate.create({
      data: {
        name: "Google Ads — Padrão",
        source: "google",
        medium: "cpc",
        campaign: "{{campaign_slug}}",
        term: "{{keyword}}",
        vehicleId: googleVehicle.id,
      },
    }),
  ]);

  console.log(
    `📋 ${templates.length} UTM templates created: ${templates.map((t) => t.name).join(", ")}`
  );

  // ─── 5. Create AppSettings ────────────────────────────────────────────────
  await prisma.appSettings.create({
    data: {
      rebrandlyStatus: false,
    },
  });

  console.log("⚙️  AppSettings initialized");

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log("\n✅ Seed completed successfully!");
  console.log("─────────────────────────────────────");
  console.log("  Admin email   : admin@linkops.com");
  console.log("  Admin password: admin123");
  console.log("─────────────────────────────────────");
  console.log(`  Vehicles  : ${vehicles.length}`);
  console.log(`  Campaigns : ${campaigns.length}`);
  console.log(`  Templates : ${templates.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
