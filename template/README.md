# Rent A Car Template

Bu klasör, tenant (kiracı) uygulamaları için şablon dosyalarını içerir.

## 📁 Klasör Yapısı

```
/template
├── frontend/           # Tenant frontend kaynak kodları
│   ├── src/
│   │   ├── pages/     # Sayfa componentleri
│   │   ├── components/ # UI componentleri
│   │   ├── contexts/  # React context'leri
│   │   └── config/    # Konfigürasyon dosyaları
│   ├── public/        # Statik dosyalar
│   └── package.json   # Dependencies
│
├── backend/           # Tenant backend API
│   ├── server.py      # Ana API dosyası
│   ├── requirements.txt
│   └── Dockerfile
│
└── config/            # Template konfigürasyonları
    ├── template.json  # Template meta bilgileri
    └── docker-compose.template.yml
```

## 🔄 Güncelleme Akışı

```
1. GitHub'a kod push et
   ↓
2. "Save to GitHub" butonu (Emergent'te)
   ↓
3. SuperAdmin Panel → "Master Template Güncelle"
   ↓
4. Firmalar Sayfası → "Template Güncelle" (tek tek veya toplu)
```

## ⚠️ Önemli Notlar

### Korunan Veriler (Güncelleme sırasında değişmez):
- MongoDB veritabanı (müşteriler, araçlar, rezervasyonlar)
- Admin kullanıcı bilgileri
- Firma ayarları
- Tema tercihleri

### Güncellenen Öğeler:
- Frontend UI/UX
- Backend API endpoint'leri
- Yeni özellikler
- Bug fix'ler

## 🚀 Yeni Özellik Ekleme

1. `template/frontend/src/pages/` altına yeni sayfa ekle
2. `template/frontend/src/App.js`'te route tanımla
3. `template/backend/server.py`'ye API endpoint ekle
4. Build al: `cd frontend && yarn build`
5. GitHub'a push et
6. SuperAdmin'den template güncelle

## 📋 Template Versiyonlama

`config/template.json` dosyasındaki `version` alanını her güncellemede artır:

```json
{
  "version": "1.0.1",
  "lastUpdated": "2025-12-22"
}
```
