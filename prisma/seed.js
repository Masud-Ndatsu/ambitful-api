import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
const prisma = new PrismaClient();
async function main() {
    console.log("🌱 Starting seed process...");
    // Create admin user
    const adminEmail = "admin@destinn.com";
    const adminPassword = "Admin123!";
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail },
    });
    if (existingAdmin) {
        console.log("ℹ️  Admin user already exists, skipping creation");
        console.log(`📧 Admin email: ${adminEmail}`);
        return;
    }
    // Hash the admin password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
    // Create the admin user
    const adminUser = await prisma.user.create({
        data: {
            name: "System Administrator",
            email: adminEmail,
            password: hashedPassword,
            country: "United States",
            role: "ADMIN",
            verified: true,
            profilePicture: null,
        },
    });
    console.log("✅ Admin user created successfully!");
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log(`👤 User ID: ${adminUser.id}`);
    console.log(`🛡️  Role: ${adminUser.role}`);
    // Create some sample testimonials
    const testimonials = [
        {
            name: "Sarah Johnson",
            age: 28,
            location: "San Francisco, CA",
            opportunity: "Software Engineer at Google",
            testimonial: "Destinn helped me land my dream job at Google! The AI-powered recommendations were spot-on and the application tracking made the whole process so much easier.",
            image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400",
        },
        {
            name: "Michael Chen",
            age: 32,
            location: "New York, NY",
            opportunity: "Product Manager at Meta",
            testimonial: "The personalized career guidance and opportunity matching on Destinn was incredible. I found opportunities I never would have discovered on my own.",
            image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
        },
        {
            name: "Emily Rodriguez",
            age: 25,
            location: "Austin, TX",
            opportunity: "UX Designer at Airbnb",
            testimonial: "Destinn's AI chat feature gave me personalized advice that helped me transition from marketing to UX design. Now I'm living my dream at Airbnb!",
            image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
        },
    ];
    console.log("🌟 Creating sample testimonials...");
    for (const testimonial of testimonials) {
        await prisma.testimonial.create({
            data: testimonial,
        });
    }
    console.log(`✅ Created ${testimonials.length} sample testimonials`);
    console.log("🎉 Seed process completed successfully!");
}
main()
    .catch((e) => {
    console.error("❌ Error during seed process:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map