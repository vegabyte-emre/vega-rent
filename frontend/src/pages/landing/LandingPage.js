import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage, LanguageProvider } from '../../contexts/LanguageContext';
import { LandingNavbar } from './components/LandingNavbar';
import { HeroSection } from './components/HeroSection';
import { FeaturesSection } from './components/FeaturesSection';
import { PricingSection } from './components/PricingSection';
import { TestimonialsSection } from './components/TestimonialsSection';
import { FAQSection } from './components/FAQSection';
import { FranchiseSection } from './components/FranchiseSection';
import { ContactSection } from './components/ContactSection';
import { FooterSection } from './components/FooterSection';

const LandingContent = () => {
  return (
    <div className="min-h-screen bg-slate-950">
      <LandingNavbar />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <ContactSection />
      <FooterSection />
    </div>
  );
};

export const LandingPage = () => {
  return (
    <LanguageProvider>
      <LandingContent />
    </LanguageProvider>
  );
};

export default LandingPage;
