# FleetEase - Kurumsal Rent a Car Platform

## Orijinal Problem Statement
Çok firmalı (multi-tenant), merkezi yönetilen, NFC destekli kimlik doğrulama, online ödeme ve provizyon altyapısı bulunan, e-Arşiv / e-Fatura, GPS araç takip, HGS/OGS ve ceza entegrasyonları içeren kurumsal bir Rent a Car yazılım platformu.

## Tamamlanan Görevler

### Müşteri Sitesi (Public Website)
- [x] Ana sayfa (Landing) - hero section, araç arama kutusu, istatistikler
- [x] Araçlar sayfası - filtreler (segment, vites, yakıt, fiyat), arama, araç kartları
- [x] Araç detay sayfası - büyük görsel, özellikler, rezervasyon kartı
- [x] Müşteri giriş/kayıt sayfaları
- [x] Müşteri hesap paneli (rezervasyonlarım)
- [x] Rezervasyon formu - kişisel bilgiler, KVKK onayı, ödeme onayı
- [x] Header/Footer navigasyonu

### Yönetim Paneli (Admin Dashboard)
- [x] Auth sistemi (JWT tabanlı, rol bazlı yetkilendirme)
- [x] Dashboard (istatistik kartları, grafikler)
- [x] Araç yönetimi (CRUD, durum takibi)
- [x] Müşteri yönetimi (CRUD)
- [x] Rezervasyon sistemi (state machine)
- [x] GPS takip (mock)
- [x] Ödemeler
- [x] Raporlar
- [x] Firmalar (SuperAdmin)
- [x] Ayarlar

### Backend API
- [x] Public API (authentication gerektirmeyen): /api/public/vehicles
- [x] Auth API: login, register, me
- [x] CRUD endpoints: companies, vehicles, customers, reservations
- [x] Dashboard stats, GPS mock, payments

## Demo Hesapları
- SuperAdmin: admin@fleetease.com / admin123
- Firma Admin: firma@fleetease.com / firma123

## URL Yapısı
- `/` - Müşteri ana sayfa
- `/araclar` - Araç listesi (müşteri)
- `/arac/:id` - Araç detay (müşteri)
- `/rezervasyon` - Rezervasyon formu
- `/musteri/giris` - Müşteri giriş
- `/musteri/kayit` - Müşteri kayıt
- `/hesabim` - Müşteri dashboard
- `/login` - Admin giriş
- `/dashboard` - Admin dashboard
- `/vehicles`, `/customers`, `/reservations` vb. - Admin paneli

## Sonraki Adımlar (Next Tasks)

### Faz 2 - Entegrasyonlar
- [ ] iyzico canlı ödeme entegrasyonu
- [ ] EDM e-Fatura/e-Arşiv entegrasyonu
- [ ] Gerçek GPS cihaz entegrasyonu
- [ ] SMS bildirim servisi

### Faz 3 - Gelişmiş Özellikler
- [ ] NFC kimlik okuma (mobil)
- [ ] Sözleşme PDF oluşturma
- [ ] Hasar takip sistemi
- [ ] HGS/OGS sorgu
- [ ] Trafik cezası sorgu

## Tech Stack
- Backend: FastAPI, MongoDB, Motor, JWT
- Frontend: React, Tailwind CSS, Shadcn UI, Recharts
- Ödeme: iyzico (mock modunda)
