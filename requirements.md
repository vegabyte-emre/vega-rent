# FleetEase - Kurumsal Rent a Car Platform

## Orijinal Problem Statement
Çok firmalı (multi-tenant), merkezi yönetilen, NFC destekli kimlik doğrulama, online ödeme ve provizyon altyapısı bulunan, e-Arşiv / e-Fatura, GPS araç takip, HGS/OGS ve ceza entegrasyonları içeren kurumsal bir Rent a Car yazılım platformu.

## Tamamlanan Görevler

### Backend (FastAPI + MongoDB)
- [x] Multi-tenant mimari altyapısı
- [x] JWT tabanlı kimlik doğrulama sistemi
- [x] Rol bazlı yetkilendirme (SuperAdmin, FirmaAdmin, Operasyon, Muhasebe, Personel)
- [x] Firma yönetimi (CRUD)
- [x] Araç yönetimi (CRUD + durum takibi)
- [x] Müşteri yönetimi (CRUD)
- [x] Rezervasyon sistemi (state machine: CREATED → CONFIRMED → DELIVERED → RETURNED → CLOSED)
- [x] Teslim/İade iş akışları
- [x] Ödeme modülü (iyzico entegrasyonu hazır - mock)
- [x] GPS takip (mock data)
- [x] Dashboard istatistikleri
- [x] Audit log altyapısı

### Frontend (React + Tailwind + Shadcn)
- [x] Login/Register sayfaları
- [x] Dashboard (istatistik kartları, grafikler, hızlı işlemler)
- [x] Araçlar sayfası (liste, arama, filtreleme, ekleme)
- [x] Müşteriler sayfası (liste, arama, ekleme)
- [x] Rezervasyonlar sayfası (liste, durum güncelleme, yeni rezervasyon)
- [x] GPS Takip sayfası (harita, araç listesi)
- [x] Ödemeler sayfası (işlem geçmişi)
- [x] Raporlar sayfası (gelir trendi, segment dağılımı, performans)
- [x] Firmalar sayfası (SuperAdmin için)
- [x] Ayarlar sayfası (profil, tema, bildirimler, entegrasyonlar)
- [x] Responsive sidebar navigasyonu
- [x] Koyu/Açık tema desteği

## Sonraki Adımlar (Next Tasks)

### Faz 2 - Entegrasyonlar
- [ ] iyzico canlı entegrasyonu (API keys gerekli)
- [ ] EDM e-Fatura/e-Arşiv entegrasyonu
- [ ] Gerçek GPS cihaz entegrasyonu
- [ ] HGS/OGS sorgu entegrasyonu
- [ ] SMS bildirim servisi (Twilio/Netgsm)

### Faz 3 - Gelişmiş Özellikler
- [ ] NFC kimlik okuma (mobil app)
- [ ] Sözleşme oluşturma ve PDF export
- [ ] Hasar takip sistemi (fotoğraf/video)
- [ ] Provizyon (pre-authorization) yönetimi
- [ ] Trafik cezası sorgu entegrasyonu
- [ ] Otomatik faturalama

### Faz 4 - Mobil Uygulama
- [ ] React Native mobil app
- [ ] NFC kimlik doğrulama
- [ ] Teslim/iade işlemleri
- [ ] Hasar kayıt modülü

## Demo Hesapları
- SuperAdmin: admin@fleetease.com / admin123
- Firma Admin: firma@fleetease.com / firma123

## Tech Stack
- Backend: FastAPI, MongoDB, Motor, JWT
- Frontend: React, Tailwind CSS, Shadcn UI, Recharts
- Ödeme: iyzico (hazır - mock modunda)
- GPS: Mock data (canlı entegrasyon hazır)
