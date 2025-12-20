# FleetEase - Personel Mobil Uygulaması Geliştirme Briefi

## 📋 Proje Özeti

**Proje Adı:** FleetEase - Kurumsal Rent a Car Platform  
**Mevcut Durum:** Web sitesi ve yönetim paneli tamamlandı  
**İstek:** Personel Mobil Uygulaması (React Native / Expo)

---

## 🌐 Mevcut Backend API

**Production API URL:**  
```
https://tenantfleet.preview.emergentagent.com/api
```

**API Dokümantasyonu:**  
```
https://tenantfleet.preview.emergentagent.com/docs
```

---

## 🔐 Kimlik Doğrulama

**Auth Tipi:** JWT Bearer Token

**Demo Hesaplar:**
| Rol | E-posta | Şifre |
|-----|---------|-------|
| SuperAdmin | admin@fleetease.com | admin123 |
| Firma Admin | firma@fleetease.com | firma123 |

**Login Endpoint:**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@fleetease.com",
  "password": "admin123"
}

# Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "admin@fleetease.com",
    "full_name": "Super Admin",
    "role": "superadmin"
  }
}
```

**Token Kullanımı:**
```
Authorization: Bearer {access_token}
```

---

## 📱 Mobil Uygulama Gereksinimleri

### Hedef Kullanıcılar
- Rent a car firması **personelleri**
- Araç teslim/iade işlemlerini sahada yapan çalışanlar

### Roller
- `personel` - Saha personeli
- `operasyon` - Operasyon sorumlusu
- `firma_admin` - Firma yöneticisi

---

## 🎯 İstenen Özellikler

### 1. Giriş Ekranı
- E-posta ve şifre ile giriş
- JWT token saklama (SecureStore)
- Otomatik giriş (token varsa)

### 2. Ana Sayfa / Dashboard
- Bugünkü teslimler listesi
- Bugünkü iadeler listesi
- Hızlı istatistikler

### 3. NFC Kimlik Okuma ⭐ (Kritik Özellik)
- Müşteri TC kimlik kartı okuma (NFC)
- Kimlik bilgilerini otomatik doldurma
- KVKK onay ekranı

### 4. Araç Teslim İşlemi
**Akış:**
1. Rezervasyon seçimi (QR kod veya liste)
2. NFC ile müşteri kimlik doğrulama
3. KVKK onayı alma (imza)
4. Sözleşme gösterimi
5. Ödeme/provizyon onayı
6. Araç hasar fotoğrafları çekme (min 4 fotoğraf: ön, arka, sol, sağ)
7. GPS'ten kilometre okuma
8. Yakıt seviyesi girişi
9. Teslim onayı

**API Endpoint:**
```bash
POST /api/deliveries
Authorization: Bearer {token}

{
  "reservation_id": "uuid",
  "delivery_mileage": 15000,
  "fuel_level": "full",
  "notes": "Hasar yok"
}
```

### 5. Araç İade İşlemi
**Akış:**
1. Kiralama seçimi (plaka veya QR)
2. GPS'ten konum ve kilometre kontrolü
3. Hasar kontrolü - fotoğraf/video çekimi
4. Teslim fotoğraflarıyla karşılaştırma
5. Yakıt seviyesi kontrolü
6. Ek masraf girişi (varsa)
7. HGS/OGS sorgusu (opsiyonel)
8. İade onayı

**API Endpoint:**
```bash
POST /api/returns
Authorization: Bearer {token}

{
  "reservation_id": "uuid",
  "return_mileage": 15500,
  "fuel_level": "3/4",
  "damage_notes": "Sol arka çamurlukta çizik",
  "extra_charges": 500
}
```

### 6. Hasar Kayıt Modülü
- Kamera ile fotoğraf çekimi
- Video kayıt (max 30 sn)
- Hasar bölgesi işaretleme (araç şeması üzerinde)
- Hasar açıklaması

### 7. Rezervasyon Listesi
- Bugünkü rezervasyonlar
- Duruma göre filtreleme (confirmed, delivered)
- Arama (plaka, müşteri adı)
- Detay görüntüleme

**API Endpoint:**
```bash
GET /api/reservations
GET /api/reservations/{id}
PATCH /api/reservations/{id}/status?status=delivered
```

### 8. GPS / Konum
- Anlık konum alma
- Araç konumu görüntüleme (haritada)
- Kilometre okuma

**API Endpoint:**
```bash
GET /api/gps/vehicles
```

### 9. Bildirimler
- Push notification desteği
- Yeni rezervasyon bildirimi
- İade hatırlatması

---

## 🗄️ Mevcut API Endpoints

### Auth
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/auth/login` | Giriş |
| POST | `/api/auth/register` | Kayıt |
| GET | `/api/auth/me` | Kullanıcı bilgisi |

### Vehicles
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/vehicles` | Araç listesi |
| GET | `/api/vehicles/{id}` | Araç detay |
| POST | `/api/vehicles` | Araç ekle |
| PUT | `/api/vehicles/{id}` | Araç güncelle |
| PATCH | `/api/vehicles/{id}/status` | Durum güncelle |

### Customers
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/customers` | Müşteri listesi |
| GET | `/api/customers/{id}` | Müşteri detay |
| POST | `/api/customers` | Müşteri ekle |

### Reservations
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/reservations` | Rezervasyon listesi |
| GET | `/api/reservations/{id}` | Rezervasyon detay |
| POST | `/api/reservations` | Rezervasyon oluştur |
| PATCH | `/api/reservations/{id}/status` | Durum güncelle |

### Operations
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/deliveries` | Teslim kaydı |
| POST | `/api/returns` | İade kaydı |
| GET | `/api/gps/vehicles` | GPS konumları |

### Dashboard
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/dashboard/stats` | İstatistikler |

---

## 📊 Veri Modelleri

### Reservation Status (State Machine)
```
CREATED → CONFIRMED → DELIVERED → RETURNED → CLOSED
                ↓                      ↓
            CANCELLED              CANCELLED
```

### Vehicle Status
```
available | rented | service | reserved
```

### User Roles
```
superadmin | firma_admin | operasyon | muhasebe | personel | musteri
```

---

## 🎨 UI/UX Tercihleri

- **Tema:** Modern, minimalist, kurumsal
- **Renkler:** Mavi tonları (#3B82F6 primary)
- **Font:** System default (performans için)
- **Dark Mode:** Opsiyonel

### Önerilen Kütüphaneler
- `react-native-nfc-manager` - NFC okuma
- `expo-camera` - Fotoğraf/video
- `expo-location` - GPS
- `expo-secure-store` - Token saklama
- `@react-navigation/native` - Navigasyon
- `react-native-maps` - Harita

---

## 📁 Önerilen Dosya Yapısı

```
/app
├── /src
│   ├── /screens
│   │   ├── LoginScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── ReservationsScreen.js
│   │   ├── DeliveryScreen.js
│   │   ├── ReturnScreen.js
│   │   ├── NFCReadScreen.js
│   │   └── CameraScreen.js
│   ├── /components
│   │   ├── VehicleCard.js
│   │   ├── ReservationCard.js
│   │   ├── DamageMarker.js
│   │   └── SignaturePad.js
│   ├── /services
│   │   ├── api.js
│   │   ├── auth.js
│   │   └── nfc.js
│   ├── /contexts
│   │   └── AuthContext.js
│   └── /utils
│       └── helpers.js
├── App.js
└── app.json
```

---

## ⚠️ Önemli Notlar

1. **Backend hazır** - Tüm API'ler çalışıyor, sadece mobil UI gerekiyor
2. **NFC kritik** - Kimlik doğrulama için şart
3. **Offline mod** - İnternet olmadan temel işlemler yapılabilmeli (sonra senkronize)
4. **Fotoğraf sıkıştırma** - Upload öncesi fotoğrafları küçült
5. **Güvenlik** - Token'ı SecureStore'da sakla, Keychain kullan

---

## 🔗 Mevcut Web Uygulaması

- **Müşteri Sitesi:** https://tenantfleet.preview.emergentagent.com/
- **Admin Panel:** https://tenantfleet.preview.emergentagent.com/login
- **API Docs:** https://tenantfleet.preview.emergentagent.com/docs

---

## 📞 İletişim

Bu brief, E1 agent'ta geliştirilen FleetEase projesinin devamı için hazırlanmıştır.
Backend API'ler aktif ve kullanıma hazırdır.

---

**Hazırlayan:** E1 Agent  
**Tarih:** Aralık 2025  
**Versiyon:** 1.0
