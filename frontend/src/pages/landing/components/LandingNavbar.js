import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown, Globe } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Button } from '../../../components/ui/button';

export const LandingNavbar = () => {
  const { t, language, setLanguage, languages } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '#features', label: t('nav.features') },
    { href: '#pricing', label: t('nav.pricing') },
    { href: '#testimonials', label: t('nav.testimonials') },
    { href: '#franchise', label: 'Bayilik' },
    { href: '#faq', label: t('nav.faq') },
    { href: '#contact', label: t('nav.contact') },
  ];

  const currentLang = languages.find(l => l.code === language);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-slate-950/95 backdrop-blur-xl shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">FleetEase</span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-4">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/10"
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm">{currentLang?.flag} {currentLang?.code.toUpperCase()}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              <AnimatePresence>
                {isLangOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden min-w-[150px]"
                  >
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setIsLangOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 hover:bg-slate-800 transition-colors ${
                          language === lang.code ? 'bg-slate-800 text-orange-500' : 'text-slate-300'
                        }`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <a
              href="/superadmin/login"
              className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
            >
              {t('nav.login')}
            </a>
            
            <Button
              asChild
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 py-2 text-sm font-semibold shadow-lg shadow-orange-500/20"
            >
              <a href="#contact">{t('nav.demo')}</a>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-white p-2"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-slate-900 border-t border-slate-800"
          >
            <div className="px-6 py-4 space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-slate-300 hover:text-white transition-colors py-2"
                >
                  {link.label}
                </a>
              ))}
              
              <div className="flex gap-2 pt-4 border-t border-slate-800">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      language === lang.code
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {lang.flag}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-4 pt-4">
                <a href="/superadmin/login" className="text-slate-300 hover:text-white">
                  {t('nav.login')}
                </a>
                <a href="#contact" className="text-orange-500 font-semibold">
                  {t('nav.demo')}
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};
