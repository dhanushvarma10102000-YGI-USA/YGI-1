"use client";
import { Nav } from "@/components/ds/Nav";
import { Footer } from "@/components/ds/Footer";
import { AnimatedGradientBg, GlassCard } from "@/components/ds/AnimatedGradient";

const SECTIONS = [
  {title:"1. Information We Collect",content:`We collect information you provide when you create an account (name, email, password), sign in with Google, post in community groups, contact us, or use our guide.\n\nWe also automatically collect usage data, IP address, and cookies to keep you signed in and improve the site.`},
  {title:"2. How We Use Your Information",content:`We use your information to provide our services, manage your account, enable community features, send account emails, analyze site usage, display ads through Google AdSense, and respond to support requests.\n\nWe do NOT sell your data or share it with advertisers beyond what Google AdSense requires.`},
  {title:"3. Google AdSense & Advertising",content:`We use Google AdSense to display advertisements. Google may use cookies to show personalized ads based on your browsing history.\n\nYou can opt out at adssettings.google.com or aboutads.info.`},
  {title:"4. Cookies",content:`We use essential cookies (login sessions), analytics cookies (Google Analytics), and advertising cookies (Google AdSense). You can control cookies through your browser settings.`},
  {title:"5. Data Storage & Security",content:`Your data is stored securely using Supabase (SOC 2 compliant). We use HTTPS encryption, secure password hashing, and row-level security on all database tables.`},
  {title:"6. Anonymous Posting",content:`When you post anonymously, your display name is hidden from other users. Your account is still linked to the post in our database for moderation. Administrators can see the account behind anonymous posts if required for safety or legal reasons.`},
  {title:"7. Third-Party Services",content:`We use Google Analytics, Google AdSense, Google OAuth, Supabase, Google Maps, and Pexels. Each has their own privacy policy.`},
  {title:"8. Your Rights",content:`You have the right to access, correct, delete, or export your personal data. Contact us at hello@yourguideinusa.com to exercise these rights. We respond within 30 days.`},
  {title:"9. Children's Privacy",content:`YourGuideInUSA is for users 18 and older. We do not knowingly collect data from children under 13. Contact us immediately if you believe we have.`},
  {title:"10. Contact Us",content:`Email: hello@yourguideinusa.com\nWebsite: yourguideinusa.com/contact\nLocation: Phoenix, Arizona, USA\n\nWe respond to all privacy inquiries within 2 business days.`},
];

export default function PrivacyPage() {
  return(
    <div className="min-h-screen bg-[#e9e8e4] font-[Inter,sans-serif]">
      <div className="absolute inset-x-0 top-0 overflow-hidden rounded-b-[48px]" style={{height:"280px"}}>
        <AnimatedGradientBg rounded="rounded-b-[48px]"/>
        <div className="absolute inset-0 rounded-b-[48px] bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none"/>
      </div>
      <div className="relative z-10">
        <Nav/>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-20">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold tracking-widest text-[#5d5a52] uppercase mb-2">Legal</p>
            <h1 className="text-4xl font-bold text-[#1a1916] drop-shadow-lg mb-2">Privacy Policy</h1>
            <p className="text-[#5d5a52] text-sm">Last updated: May 23, 2026</p>
          </div>
          <GlassCard className="p-6 sm:p-8 mb-6">
            <p className="text-sm text-gray-600 leading-relaxed"><strong className="text-gray-900">Your privacy matters to us.</strong> YourGuideInUSA is committed to protecting your personal information. This policy explains what data we collect, how we use it, and your rights.</p>
          </GlassCard>
          <div className="space-y-5">
            {SECTIONS.map((s,i)=>(
              <GlassCard key={i} className="p-6">
                <h2 className="text-base font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">{s.title}</h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{s.content}</p>
              </GlassCard>
            ))}
          </div>
        </div>
        <Footer/>
      </div>
    </div>
  );
}