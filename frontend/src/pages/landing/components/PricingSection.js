import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Button } from '../../../components/ui/button';
import { Switch } from '../../../components/ui/switch';

export const PricingSection = () => {
  const { t } = useLanguage();
  const [isYearly, setIsYearly] = useState(false);

  const packages = t('pricing.packages') || [];

  return (
    <section id="pricing" className="py-20 md:py-32 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {t('pricing.title')}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
            {t('pricing.subtitle')}
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm font-medium ${!isYearly ? 'text-slate-900' : 'text-slate-500'}`}>
              {t('pricing.monthly')}
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
              className="data-[state=checked]:bg-orange-500"
            />
            <span className={`text-sm font-medium ${isYearly ? 'text-slate-900' : 'text-slate-500'}`}>
              {t('pricing.yearly')}
            </span>
            {isYearly && (
              <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                {t('pricing.yearlyDiscount')}
              </span>
            )}
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {Array.isArray(packages) && packages.map((pkg, index) => {
            const isFeatured = index === 1; // Middle package is featured
            const price = isYearly ? pkg.priceYearly : pkg.priceMonthly;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`relative flex flex-col p-8 rounded-3xl transition-all duration-300 hover:-translate-y-2 ${
                  isFeatured
                    ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/20 scale-105 z-10 border-2 border-orange-500'
                    : 'bg-white border border-slate-200 shadow-sm hover:shadow-xl'
                }`}
              >
                {/* Featured Badge */}
                {isFeatured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 bg-orange-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full">
                      <Sparkles className="w-3 h-3" />
                      {t('pricing.popular')}
                    </span>
                  </div>
                )}

                {/* Package Info */}
                <div className="mb-6">
                  <h3 className={`text-xl font-bold mb-2 ${isFeatured ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {pkg.name}
                  </h3>
                  <p className={`text-sm ${isFeatured ? 'text-slate-400' : 'text-slate-600'}`}>
                    {pkg.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-bold ${isFeatured ? 'text-white' : 'text-slate-900'}`}>
                      {t('pricing.currency')}{price?.toLocaleString()}
                    </span>
                    <span className={`text-sm ${isFeatured ? 'text-slate-400' : 'text-slate-500'}`}>
                      {t('pricing.perMonth')}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${isFeatured ? 'text-orange-400' : 'text-orange-600'} font-medium`}>
                    {pkg.vehicles}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-grow">
                  {pkg.features?.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isFeatured ? 'text-orange-400' : 'text-green-500'}`} />
                      <span className={`text-sm ${isFeatured ? 'text-slate-300' : 'text-slate-600'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  asChild
                  className={`w-full rounded-full py-6 font-semibold transition-all ${
                    isFeatured
                      ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <a href="#contact">
                    {index === 2 ? t('pricing.ctaEnterprise') : t('pricing.cta')}
                  </a>
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
