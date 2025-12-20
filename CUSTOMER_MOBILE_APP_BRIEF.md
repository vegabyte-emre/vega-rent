# FleetEase - Müşteri Mobil Uygulaması Geliştirme Briefi

## 📋 Proje Özeti

**Proje Adı:** FleetEase - Kurumsal Rent a Car Platform  
**Uygulama Türü:** Müşteri Mobil Uygulaması (Customer App)  
**Hedef Platform:** iOS & Android (React Native / Expo veya Flutter)  
**Mevcut Durum:** Web sitesi ve yönetim paneli tamamlandı, backend API aktif  

---

## 🎯 Hedef Kullanıcılar

- Bireysel araç kiralama müşterileri
- Kurumsal müşteri çalışanları
- İlk kez araç kiralayan kullanıcılar
- Sık seyahat eden iş insanları

---

## 🌐 Mevcut Backend API

**Production API URL:**  
```
https://tenantfleet.preview.emergentagent.com/api
```

**API Dokümantasyonu (Swagger):**  
```
https://tenantfleet.preview.emergentagent.com/docs
```

**Mevcut Web Sitesi:**  
```
https://tenantfleet.preview.emergentagent.com/
```

---

## 🔐 Kimlik Doğrulama

**Auth Tipi:** JWT Bearer Token

### Login Endpoint
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "musteri@example.com",
  "password": "sifre123"
}

# Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "musteri@example.com",
    "full_name": "Ahmet Yılmaz",
    "role": "musteri"
  }
}
```

### Register Endpoint
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "yeni@example.com",
  "password": "sifre123",
  "full_name": "Yeni Müşteri",
  "phone": "05551234567"
}
```

### Token Kullanımı
```
Authorization: Bearer {access_token}
```

---

## 📱 EKRANLAR VE ÖZELLİKLER

### 1. 🚀 Splash & Onboarding

| Ekran | Özellikler |
|-------|------------|
| Splash Screen | Logo animasyonu, auto-login kontrolü |
| Onboarding (3 ekran) | Uygulama tanıtımı, ilk açılışta göster |
| Welcome Screen | Giriş Yap / Kayıt Ol butonları |

---

### 2. 🔑 Auth Modülü

#### 2.1 Giriş Ekranı
- E-posta ve şifre girişi
- "Beni Hatırla" seçeneği
- "Şifremi Unuttum" linki
- Sosyal giriş butonları (opsiyonel: Google, Apple)
- Biometric login (Face ID / Touch ID) - Opsiyonel

#### 2.2 Kayıt Ekranı
- Ad Soyad
- E-posta
- Telefon numarası (ülke kodu seçimi ile)
- Şifre (güçlü şifre validasyonu)
- KVKK & Kullanım Koşulları onay checkbox
- SMS/E-posta doğrulama (OTP)

#### 2.3 Şifre Sıfırlama
- E-posta ile sıfırlama linki gönderimi
- OTP doğrulama
- Yeni şifre belirleme

**İlgili API'ler:**
```bash
POST /api/auth/login
POST /api/auth/register
POST /api/auth/forgot-password    # Backend'e eklenecek
POST /api/auth/verify-otp         # Backend'e eklenecek
```

---

### 3. 🏠 Ana Sayfa (Home)

#### 3.1 Header
- Konum seçici (şehir/havalimanı)
- Profil/bildirim ikonu
- Arama çubuğu

#### 3.2 Hızlı Arama Kartı
```
┌─────────────────────────────────────┐
│  📍 Alış Yeri: [İstanbul Havalimanı]│
│  📅 Alış Tarihi: [15 Ocak 2025]     │
│  ⏰ Alış Saati: [10:00]             │
│  📍 İade Yeri: [Aynı Yer ✓]         │
│  📅 İade Tarihi: [18 Ocak 2025]     │
│  ⏰ İade Saati: [10:00]             │
│                                     │
│  [        🔍 ARAÇ ARA        ]      │
└─────────────────────────────────────┘
```

#### 3.3 Bölümler
- **Öne Çıkan Araçlar:** Horizontal scroll, araç kartları
- **Kategoriler:** Ekonomik, Konfor, SUV, Lüks, Ticari
- **Kampanyalar:** Banner slider (opsiyonel)
- **Son Görüntülenen Araçlar**

**İlgili API'ler:**
```bash
GET /api/public/vehicles?featured=true
GET /api/public/vehicles/categories
GET /api/public/locations
```

---

### 4. 🚗 Araç Listeleme

#### 4.1 Araç Listesi
- Grid veya Liste görünümü toggle
- Filtreleme butonu
- Sıralama: Fiyat (artan/azalan), Popülerlik, Yeni eklenen
- Pull-to-refresh
- Infinite scroll / Pagination

#### 4.2 Filtreler (Bottom Sheet veya Ayrı Ekran)
```
Araç Tipi:      [ ] Sedan  [ ] Hatchback  [ ] SUV  [ ] Minivan
Yakıt:          [ ] Benzin [ ] Dizel [ ] Hybrid [ ] Elektrik
Vites:          [ ] Manuel [ ] Otomatik
Marka:          [Dropdown - Çoklu seçim]
Fiyat Aralığı:  [───●────────] ₺200 - ₺800/gün
Koltuk Sayısı:  [ ] 2  [ ] 4-5  [ ] 7+
Yaş Sınırı:     [21+] [25+] [Fark etmez]

[Temizle]                    [Filtrele]
```

#### 4.3 Araç Kartı
```
┌─────────────────────────────────────┐
│  [Araç Fotoğrafı - 16:9]            │
│  ❤️ (favori ikonu sağ üst)          │
├─────────────────────────────────────┤
│  Renault Clio                       │
│  ⭐ 4.8 (124 değerlendirme)         │
│  🚗 Hatchback | ⚙️ Otomatik | ⛽ Benzin │
│                                     │
│  ₺450/gün        [İncele →]         │
└─────────────────────────────────────┘
```

**İlgili API'ler:**
```bash
GET /api/public/vehicles?category=suv&fuel=diesel&transmission=automatic&min_price=200&max_price=800
```

---

### 5. 📄 Araç Detay

#### 5.1 Galeri
- Swipeable fotoğraf galerisi
- Tam ekran görüntüleme
- Fotoğraf sayısı göstergesi

#### 5.2 Araç Bilgileri
```
Renault Clio 2024
⭐ 4.8 (124 değerlendirme)

Günlük Fiyat: ₺450

───────────────────────────────
📋 ÖZELLİKLER
───────────────────────────────
🚗 Araç Tipi:     Hatchback
⚙️ Vites:         Otomatik
⛽ Yakıt:         Benzin
👥 Koltuk:        5
🧳 Bagaj:         300L
🚪 Kapı:          5
❄️ Klima:         Var
📡 Bluetooth:     Var
🎥 Geri Görüş:    Var

───────────────────────────────
📍 ALIM/İADE NOKTALARI
───────────────────────────────
• İstanbul Havalimanı
• Sabiha Gökçen Havalimanı
• Kadıköy Ofis
• Taksim Ofis
```

#### 5.3 Fiyat Hesaplama
```
┌─────────────────────────────────────┐
│  Kiralama Özeti                     │
├─────────────────────────────────────┤
│  3 Gün x ₺450            ₺1,350     │
│  Tam Kasko               ₺150       │
│  Ek Sürücü               ₺100       │
│  Bebek Koltuğu           ₺50        │
├─────────────────────────────────────┤
│  TOPLAM                  ₺1,650     │
└─────────────────────────────────────┘

[    ♥️ Favorilere Ekle    ]
[    📅 HEMEN REZERVE ET   ]
```

#### 5.4 Yorumlar Bölümü
- Yıldız dağılımı grafiği
- Son yorumlar (3-5 adet)
- "Tüm yorumları gör" linki

#### 5.5 Kiralama Koşulları
- Yaş sınırı
- Ehliyet süresi
- Depozito tutarı
- Kilometre limiti
- İptal politikası

**İlgili API'ler:**
```bash
GET /api/public/vehicles/{id}
GET /api/vehicles/{id}/reviews        # Backend'e eklenecek
POST /api/favorites/{vehicle_id}      # Backend'e eklenecek
DELETE /api/favorites/{vehicle_id}    # Backend'e eklenecek
```

---

### 6. 📝 Rezervasyon Akışı

#### Adım 1: Tarih & Konum Seçimi
- Takvim görünümü ile tarih seçimi
- Saat picker
- Konum seçimi (harita veya liste)
- Farklı iade noktası seçeneği

#### Adım 2: Ek Hizmetler
```
┌─────────────────────────────────────┐
│  SİGORTA SEÇENEKLERİ                │
├─────────────────────────────────────┤
│  ○ Standart Sigorta (Dahil)   ₺0    │
│  ◉ Tam Kasko             +₺50/gün   │
│  ○ Mini Hasar Muafiyeti  +₺75/gün   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  EK HİZMETLER                       │
├─────────────────────────────────────┤
│  [ ] Ek Sürücü           +₺35/gün   │
│  [ ] Bebek Koltuğu       +₺15/gün   │
│  [ ] GPS Navigasyon      +₺25/gün   │
│  [ ] Kış Lastiği         +₺20/gün   │
│  [ ] Tam Depo Teslim     +₺200      │
└─────────────────────────────────────┘
```

#### Adım 3: Sürücü Bilgileri
- TC Kimlik No
- Ehliyet No
- Ehliyet veriliş tarihi
- Doğum tarihi
- İletişim bilgileri
- Ek sürücü bilgileri (seçildiyse)

#### Adım 4: Ödeme
- Kredi/Banka kartı
- Kayıtlı kartlar
- Kart ekleme (iyzico entegrasyonu)
- Provizyon tutarı bilgisi
- Kupon kodu girişi

#### Adım 5: Onay
- Rezervasyon özeti
- Koşullar onayı
- Rezervasyonu onayla butonu

**İlgili API'ler:**
```bash
POST /api/reservations
{
  "vehicle_id": "uuid",
  "customer_id": "uuid",
  "start_date": "2025-01-15T10:00:00",
  "end_date": "2025-01-18T10:00:00",
  "pickup_location": "istanbul_airport",
  "return_location": "istanbul_airport",
  "extras": ["full_insurance", "baby_seat"],
  "driver_info": {
    "tc_no": "12345678901",
    "license_no": "ABC123456",
    "license_date": "2015-05-20"
  }
}

POST /api/payments/initiate          # iyzico entegrasyonu
POST /api/payments/complete
```

---

### 7. 📋 Rezervasyonlarım

#### 7.1 Aktif Rezervasyonlar
```
┌─────────────────────────────────────┐
│  🟢 ONAYLANDI                       │
│  Renault Clio                       │
│  15-18 Ocak 2025 (3 gün)           │
│  📍 İstanbul Havalimanı             │
│                                     │
│  [Detay]  [QR Kod]  [İptal Et]     │
└─────────────────────────────────────┘
```

#### 7.2 Geçmiş Rezervasyonlar
- Tamamlanan kiralamalar
- İptal edilen rezervasyonlar
- Değerlendirme yapılmamış olanlar için "Değerlendir" butonu

#### 7.3 Rezervasyon Detay
- Araç bilgileri
- Tarih ve saat
- Alış/iade lokasyonu (harita ile)
- Ödeme özeti
- Sözleşme görüntüleme
- QR kod (teslimde gösterilecek)
- İletişim (firma telefonu)
- İptal Et butonu (koşullara göre)

#### 7.4 Rezervasyon Durumları
```
CREATED    → Oluşturuldu (Ödeme bekleniyor)
CONFIRMED  → Onaylandı
DELIVERED  → Teslim edildi (Araç müşteride)
RETURNED   → İade edildi
COMPLETED  → Tamamlandı
CANCELLED  → İptal edildi
```

**İlgili API'ler:**
```bash
GET /api/reservations/my
GET /api/reservations/{id}
PATCH /api/reservations/{id}/cancel
POST /api/reviews                     # Backend'e eklenecek
```

---

### 8. 👤 Profil

#### 8.1 Profil Bilgileri
- Profil fotoğrafı (kamera/galeri)
- Ad Soyad
- E-posta
- Telefon
- Doğum tarihi
- Adres bilgileri

#### 8.2 Belgelerim
- TC Kimlik (fotoğraf yükleme)
- Ehliyet (ön/arka yüz)
- Doğrulama durumu göstergesi

#### 8.3 Kayıtlı Kartlarım
- Kart listesi (masked)
- Kart ekleme/silme
- Varsayılan kart seçimi

#### 8.4 Favorilerim
- Favori araçlar listesi
- Hızlı rezervasyon

#### 8.5 Ayarlar
- Bildirim tercihleri
- Dil seçimi
- Tema (Açık/Koyu)
- Biyometrik giriş açma/kapama

#### 8.6 Diğer
- Yardım & SSS
- Bize Ulaşın
- Kullanım Koşulları
- KVKK Aydınlatma Metni
- Uygulama versiyonu
- Çıkış Yap
- Hesabı Sil

**İlgili API'ler:**
```bash
GET /api/auth/me
PUT /api/users/profile
POST /api/users/documents/upload
GET /api/favorites
DELETE /api/users/account            # Backend'e eklenecek
```

---

### 9. 🔔 Bildirimler

#### Bildirim Türleri
- Rezervasyon onayı
- Teslim hatırlatması (1 gün önce)
- İade hatırlatması (1 gün önce)
- Ödeme başarılı
- Kampanya bildirimleri
- Fiyat düşüşü (favori araçlarda)

#### Push Notification Payload
```json
{
  "type": "reservation_confirmed",
  "title": "Rezervasyonunuz Onaylandı!",
  "body": "Renault Clio için 15 Ocak tarihli rezervasyonunuz onaylandı.",
  "data": {
    "reservation_id": "uuid",
    "action": "open_reservation"
  }
}
```

**İlgili API'ler:**
```bash
GET /api/notifications               # Backend'e eklenecek
PATCH /api/notifications/{id}/read   # Backend'e eklenecek
POST /api/users/fcm-token            # Backend'e eklenecek
```

---

### 10. 🗺️ Lokasyonlar (Harita)

- Alış/iade noktalarını haritada gösterme
- En yakın lokasyonu bulma (GPS ile)
- Lokasyon detayı (adres, çalışma saatleri, telefon)
- Yol tarifi (native harita uygulamasına yönlendirme)

**İlgili API'ler:**
```bash
GET /api/public/locations
GET /api/public/locations/{id}
GET /api/public/locations/nearest?lat=41.0082&lng=28.9784
```

---

## 🗄️ VERİ MODELLERİ

### User (Müşteri)
```json
{
  "id": "uuid",
  "email": "musteri@example.com",
  "full_name": "Ahmet Yılmaz",
  "phone": "05551234567",
  "role": "musteri",
  "profile_image": "url",
  "birth_date": "1990-05-15",
  "tc_no": "12345678901",
  "license_no": "ABC123456",
  "license_date": "2015-05-20",
  "documents_verified": true,
  "created_at": "2025-01-01T10:00:00Z"
}
```

### Vehicle
```json
{
  "id": "uuid",
  "brand": "Renault",
  "model": "Clio",
  "year": 2024,
  "plate": "34 ABC 123",
  "category": "hatchback",
  "transmission": "automatic",
  "fuel_type": "gasoline",
  "seats": 5,
  "doors": 5,
  "luggage_capacity": 300,
  "daily_rate": 450,
  "features": ["klima", "bluetooth", "geri_gorus_kamerasi"],
  "images": ["url1", "url2", "url3"],
  "status": "available",
  "rating": 4.8,
  "review_count": 124
}
```

### Reservation
```json
{
  "id": "uuid",
  "vehicle_id": "uuid",
  "customer_id": "uuid",
  "start_date": "2025-01-15T10:00:00Z",
  "end_date": "2025-01-18T10:00:00Z",
  "pickup_location": "istanbul_airport",
  "return_location": "istanbul_airport",
  "status": "confirmed",
  "total_price": 1650,
  "extras": ["full_insurance", "baby_seat"],
  "qr_code": "base64_or_url",
  "created_at": "2025-01-10T14:30:00Z"
}
```

### Location
```json
{
  "id": "uuid",
  "name": "İstanbul Havalimanı",
  "type": "airport",
  "address": "İstanbul Havalimanı, Arnavutköy",
  "city": "İstanbul",
  "latitude": 41.2615,
  "longitude": 28.7429,
  "phone": "0212 123 45 67",
  "working_hours": {
    "monday": "00:00-24:00",
    "tuesday": "00:00-24:00"
  }
}
```

---

## 🎨 UI/UX GEREKSİNİMLERİ

### Tema & Renkler
```
Primary:     #3B82F6 (Mavi)
Secondary:   #10B981 (Yeşil - Başarı)
Accent:      #F59E0B (Turuncu - Dikkat)
Error:       #EF4444 (Kırmızı)
Background:  #FFFFFF (Açık) / #1F2937 (Koyu)
Text:        #111827 (Açık) / #F9FAFB (Koyu)
```

### Tipografi
- **Başlıklar:** Bold, 18-24px
- **Body:** Regular, 14-16px
- **Caption:** Regular, 12px
- Font: System Default (performans için)

### Genel Prensipler
- Modern ve minimalist tasarım
- Bottom navigation (5 tab max)
- Pull-to-refresh tüm listelerde
- Skeleton loading states
- Empty states tasarımları
- Error states
- Haptic feedback (butonlarda)
- Safe area handling (iOS notch, Android navigation bar)

### Bottom Navigation Tabs
```
🏠 Ana Sayfa | 🚗 Araçlar | 📋 Rezervasyonlarım | ❤️ Favoriler | 👤 Profil
```

---

## 📦 ÖNERILEN TEKNOLOJİLER

### React Native / Expo
```json
{
  "dependencies": {
    "expo": "~50.0.0",
    "@react-navigation/native": "^6.x",
    "@react-navigation/bottom-tabs": "^6.x",
    "@react-navigation/stack": "^6.x",
    "expo-secure-store": "~12.x",
    "expo-image-picker": "~14.x",
    "expo-location": "~16.x",
    "expo-notifications": "~0.27.x",
    "react-native-maps": "^1.x",
    "axios": "^1.x",
    "@tanstack/react-query": "^5.x",
    "react-hook-form": "^7.x",
    "zustand": "^4.x"
  }
}
```

### Flutter Alternatifi
```yaml
dependencies:
  flutter_secure_storage: ^9.0.0
  dio: ^5.4.0
  go_router: ^13.0.0
  flutter_riverpod: ^2.4.0
  google_maps_flutter: ^2.5.0
  image_picker: ^1.0.0
  firebase_messaging: ^14.7.0
```

---

## 📁 DOSYA YAPISI (React Native)

```
/src
├── /screens
│   ├── /auth
│   │   ├── LoginScreen.js
│   │   ├── RegisterScreen.js
│   │   └── ForgotPasswordScreen.js
│   ├── /home
│   │   └── HomeScreen.js
│   ├── /vehicles
│   │   ├── VehicleListScreen.js
│   │   ├── VehicleDetailScreen.js
│   │   └── FiltersScreen.js
│   ├── /reservation
│   │   ├── ReservationFlowScreen.js
│   │   ├── DatePickerScreen.js
│   │   ├── ExtrasScreen.js
│   │   ├── PaymentScreen.js
│   │   └── ConfirmationScreen.js
│   ├── /my-reservations
│   │   ├── ReservationsListScreen.js
│   │   └── ReservationDetailScreen.js
│   ├── /favorites
│   │   └── FavoritesScreen.js
│   ├── /profile
│   │   ├── ProfileScreen.js
│   │   ├── EditProfileScreen.js
│   │   ├── DocumentsScreen.js
│   │   ├── SavedCardsScreen.js
│   │   └── SettingsScreen.js
│   └── /common
│       ├── NotificationsScreen.js
│       ├── LocationsMapScreen.js
│       └── WebViewScreen.js
├── /components
│   ├── /common
│   │   ├── Button.js
│   │   ├── Input.js
│   │   ├── Card.js
│   │   ├── LoadingSpinner.js
│   │   └── EmptyState.js
│   ├── /vehicle
│   │   ├── VehicleCard.js
│   │   ├── VehicleGallery.js
│   │   └── VehicleFeatures.js
│   ├── /reservation
│   │   ├── DateSelector.js
│   │   ├── LocationPicker.js
│   │   └── PriceSummary.js
│   └── /home
│       ├── SearchCard.js
│       ├── CategoryList.js
│       └── FeaturedVehicles.js
├── /services
│   ├── api.js              # Axios instance
│   ├── authService.js
│   ├── vehicleService.js
│   ├── reservationService.js
│   └── notificationService.js
├── /hooks
│   ├── useAuth.js
│   ├── useVehicles.js
│   └── useReservations.js
├── /store
│   └── store.js            # Zustand store
├── /navigation
│   ├── RootNavigator.js
│   ├── AuthNavigator.js
│   └── MainNavigator.js
├── /utils
│   ├── constants.js
│   ├── helpers.js
│   └── validators.js
├── /assets
│   ├── /images
│   └── /icons
└── /theme
    ├── colors.js
    ├── typography.js
    └── spacing.js
```

---

## ⚠️ BACKEND'E EKLENMESİ GEREKEN API'LER

Müşteri uygulaması için backend'de aşağıdaki endpoint'lerin eklenmesi gerekecek:

### Auth
```bash
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/verify-otp
POST /api/auth/resend-otp
```

### User
```bash
PUT /api/users/profile
POST /api/users/documents/upload
POST /api/users/fcm-token
DELETE /api/users/account
```

### Favorites
```bash
GET /api/favorites
POST /api/favorites/{vehicle_id}
DELETE /api/favorites/{vehicle_id}
```

### Reviews
```bash
GET /api/vehicles/{id}/reviews
POST /api/reviews
```

### Notifications
```bash
GET /api/notifications
PATCH /api/notifications/{id}/read
PATCH /api/notifications/read-all
```

### Payments (iyzico)
```bash
POST /api/payments/initiate
POST /api/payments/complete
GET /api/payments/cards
POST /api/payments/cards
DELETE /api/payments/cards/{id}
```

### Locations
```bash
GET /api/public/locations
GET /api/public/locations/{id}
GET /api/public/locations/nearest
```

---

## 🔒 GÜVENLİK GEREKSİNİMLERİ

1. **Token Saklama:** SecureStore (Expo) veya Keychain (iOS) / Keystore (Android)
2. **SSL Pinning:** Production'da aktif olmalı
3. **Biometric Auth:** Face ID / Touch ID desteği
4. **Input Validation:** Tüm form inputları validate edilmeli
5. **Session Timeout:** 30 dakika inaktivite sonrası logout
6. **KVKK Uyumu:** Açık rıza metinleri, veri silme hakkı

---

## 📊 ANALİTİK & TRACKING

### Event'ler
- `app_opened`
- `search_performed`
- `vehicle_viewed`
- `vehicle_favorited`
- `reservation_started`
- `reservation_completed`
- `payment_successful`
- `payment_failed`

### Önerilen Araçlar
- Firebase Analytics
- Mixpanel (opsiyonel)
- Crashlytics

---

## 🧪 TEST GEREKSİNİMLERİ

### Unit Tests
- Service fonksiyonları
- Utility fonksiyonları
- Form validasyonları

### Integration Tests
- Auth flow
- Reservation flow
- Payment flow

### E2E Tests
- Detox (React Native)
- Maestro

---

## 📱 PLATFORM SPESİFİK

### iOS
- Minimum iOS 14+
- App Store Guidelines uyumu
- Push notification entitlements
- Apple Pay (opsiyonel)

### Android
- Minimum Android 8 (API 26)
- Google Play Store politikaları
- FCM entegrasyonu
- Google Pay (opsiyonel)

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-release
- [ ] Tüm API endpoint'leri test edildi
- [ ] Error handling tamamlandı
- [ ] Loading state'leri eklendi
- [ ] Offline desteği (temel)
- [ ] Deep linking kuruldu
- [ ] Push notifications test edildi
- [ ] Analytics entegre edildi
- [ ] Performance optimize edildi (bundle size < 15MB)

### Store Submissions
- [ ] App icons (tüm boyutlar)
- [ ] Screenshots (farklı cihazlar)
- [ ] App Store/Play Store açıklamaları
- [ ] Privacy policy URL
- [ ] Terms of service URL

---

## 📞 İLETİŞİM & DESTEK

**Backend API:** Aktif ve çalışıyor  
**API Docs:** https://tenantfleet.preview.emergentagent.com/docs  
**Web App:** https://tenantfleet.preview.emergentagent.com/

---

**Hazırlayan:** E1 Agent  
**Tarih:** Aralık 2025  
**Versiyon:** 1.0

---

## 📝 NOTLAR

1. Bu brief, mevcut web uygulamasının müşteri deneyimini mobil platforma taşımak için hazırlanmıştır.
2. Backend API'nin bir kısmı mevcuttur, eksik olanlar yukarıda listelenmiştir.
3. iyzico ödeme entegrasyonu backend'de yapılandırılacaktır.
4. Push notification için Firebase Cloud Messaging kullanılması önerilir.
5. Uygulama önce MVP olarak temel özelliklerle çıkabilir, sonra genişletilebilir.

### MVP Kapsamı (İlk Sürüm)
- Auth (Giriş/Kayıt)
- Ana sayfa + Araç listesi
- Araç detay
- Basit rezervasyon akışı
- Rezervasyonlarım
- Profil (temel)

### Sonraki Sürümler
- Favoriler
- Bildirimler
- Harita entegrasyonu
- Kampanyalar
- Değerlendirme sistemi
- Dark mode
