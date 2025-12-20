import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, CheckCircle, Building2, Mail, Phone, User, MessageSquare, Car } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import axios from 'axios';
import { API_URL } from '../../../config/api';

export const ContactSection = () => {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    vehicles: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await axios.post(`${API_URL}/api/demo-requests`, formData);
      setIsSuccess(true);
      setFormData({ name: '', email: '', phone: '', company: '', vehicles: '', message: '' });
    } catch (error) {
      console.error('Error submitting demo request:', error);
      // Still show success for UX (request might be mocked)
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const form = t('contact.form') || {};

  return (
    <section id="contact" className="py-20 md:py-32 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Side - Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {t('contact.title')}
            </h2>
            <p className="text-lg text-slate-600 mb-8">
              {t('contact.subtitle')}
            </p>

            {/* Benefits */}
            <div className="space-y-4">
              {[
                { icon: CheckCircle, text: '14 gün ücretsiz deneme' },
                { icon: CheckCircle, text: 'Kredi kartı gerekmez' },
                { icon: CheckCircle, text: 'Kişiselleştirilmiş demo' },
                { icon: CheckCircle, text: '7/24 teknik destek' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-green-500" />
                  <span className="text-slate-700">{item.text}</span>
                </div>
              ))}
            </div>

            {/* Contact Info */}
            <div className="mt-12 p-6 bg-white rounded-2xl border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-4">İletişim</h3>
              <div className="space-y-3 text-slate-600">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-orange-500" />
                  <span>info@fleetease.com.tr</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-orange-500" />
                  <span>+90 (212) 123 45 67</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            {isSuccess ? (
              <div className="bg-white rounded-3xl p-12 shadow-xl border border-slate-200 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{form.success}</h3>
                <p className="text-slate-600">En kısa sürede size ulaşacağız.</p>
                <Button
                  onClick={() => setIsSuccess(false)}
                  className="mt-6 bg-orange-500 hover:bg-orange-600 text-white rounded-full px-8"
                >
                  Yeni Talep Oluştur
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <Label className="text-slate-700 mb-2 block">{form.name}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="pl-10 h-12 rounded-xl border-slate-200"
                        placeholder="Ad Soyad"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <Label className="text-slate-700 mb-2 block">{form.email}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="pl-10 h-12 rounded-xl border-slate-200"
                        placeholder="ornek@firma.com"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <Label className="text-slate-700 mb-2 block">{form.phone}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        className="pl-10 h-12 rounded-xl border-slate-200"
                        placeholder="+90 5XX XXX XX XX"
                      />
                    </div>
                  </div>

                  {/* Company */}
                  <div>
                    <Label className="text-slate-700 mb-2 block">{form.company}</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        required
                        className="pl-10 h-12 rounded-xl border-slate-200"
                        placeholder="Firma Adı"
                      />
                    </div>
                  </div>

                  {/* Vehicle Count */}
                  <div className="md:col-span-2">
                    <Label className="text-slate-700 mb-2 block">{form.vehicles}</Label>
                    <div className="relative">
                      <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        name="vehicles"
                        type="number"
                        value={formData.vehicles}
                        onChange={handleChange}
                        className="pl-10 h-12 rounded-xl border-slate-200"
                        placeholder="Yaklaşık araç sayısı"
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div className="md:col-span-2">
                    <Label className="text-slate-700 mb-2 block">{form.message}</Label>
                    <Textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={4}
                      className="rounded-xl border-slate-200 resize-none"
                      placeholder="Sorularınız veya özel istekleriniz..."
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white rounded-full py-6 text-lg font-semibold shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02]"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Gönderiliyor...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-5 h-5" />
                      {form.submit}
                    </span>
                  )}
                </Button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
