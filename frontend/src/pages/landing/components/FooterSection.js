import React from 'react';
import { motion } from 'framer-motion';
import { Facebook, Twitter, Instagram, Linkedin, Youtube, Mail, Phone, MapPin } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

export const FooterSection = () => {
  const { t } = useLanguage();

  const socialLinks = [
    { icon: Facebook, href: '#' },
    { icon: Twitter, href: '#' },
    { icon: Instagram, href: '#' },
    { icon: Linkedin, href: '#' },
    { icon: Youtube, href: '#' }
  ];

  const footer = t('footer') || {};
  const links = footer.links || {};

  return (
    <footer className="bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <a href="#" className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">F</span>
              </div>
              <span className="text-white font-bold text-xl tracking-tight">FleetEase</span>
            </a>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              {footer.description}
            </p>
            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className="w-10 h-10 bg-slate-800 hover:bg-orange-500 rounded-lg flex items-center justify-center transition-colors"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold mb-4">{footer.product || 'Ürün'}</h4>
            <ul className="space-y-3">
              <li><a href="#features" className="text-slate-400 hover:text-white transition-colors text-sm">{links.features}</a></li>
              <li><a href="#pricing" className="text-slate-400 hover:text-white transition-colors text-sm">{links.pricing}</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">{links.integrations}</a></li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold mb-4">{footer.company || 'Şirket'}</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">{links.about}</a></li>
              <li><a href="#contact" className="text-slate-400 hover:text-white transition-colors text-sm">{links.contact}</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">{links.careers}</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4">İletişim</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-slate-400 text-sm">
                <Mail className="w-4 h-4 text-orange-500" />
                info@fleetease.com.tr
              </li>
              <li className="flex items-center gap-3 text-slate-400 text-sm">
                <Phone className="w-4 h-4 text-orange-500" />
                +90 (212) 123 45 67
              </li>
              <li className="flex items-start gap-3 text-slate-400 text-sm">
                <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                İstanbul, Türkiye
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
            {footer.copyright}
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-slate-500 hover:text-white transition-colors text-sm">
              {links.privacy || 'Gizlilik Politikası'}
            </a>
            <a href="#" className="text-slate-500 hover:text-white transition-colors text-sm">
              {links.terms || 'Kullanım Koşulları'}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
