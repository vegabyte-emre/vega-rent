#!/bin/bash
# KVM SuperAdmin Güncelleme Scripti v5
# Bayilik Sistemi + iyzico Entegrasyonu
# Tarih: 2024-12-20

set -e

echo "============================================"
echo "  SuperAdmin Panel Güncelleme v5"
echo "  Bayilik Sistemi + iyzico Entegrasyonu"
echo "============================================"
echo ""

# Değişkenler - KENDİ ORTAMINIZA GÖRE DÜZENLEYİN
CONTAINER_NAME="${CONTAINER_NAME:-superadmin-app}"
BACKEND_PATH="${BACKEND_PATH:-/app/backend}"
FRONTEND_PATH="${FRONTEND_PATH:-/app/frontend/build}"

# Kontroller
if [ ! -d "frontend_build" ] || [ ! -d "backend" ]; then
    echo "HATA: frontend_build veya backend klasörü bulunamadı!"
    echo "Lütfen scripti güncelleme paketinin içinde çalıştırın."
    exit 1
fi

echo "[1/5] Mevcut container kontrol ediliyor..."
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "UYARI: $CONTAINER_NAME container'ı çalışmıyor."
    echo "Container adını CONTAINER_NAME değişkeni ile belirtin."
    read -p "Devam etmek istiyor musunuz? (e/h): " confirm
    if [ "$confirm" != "e" ]; then
        exit 1
    fi
fi

echo "[2/5] Backend dosyaları güncelleniyor..."
docker cp backend/server.py $CONTAINER_NAME:$BACKEND_PATH/server.py
docker cp backend/services/iyzico_service.py $CONTAINER_NAME:$BACKEND_PATH/services/iyzico_service.py
echo "  ✓ server.py güncellendi"
echo "  ✓ iyzico_service.py eklendi"

echo "[3/5] Frontend dosyaları güncelleniyor..."
docker cp frontend_build/. $CONTAINER_NAME:$FRONTEND_PATH/
echo "  ✓ Frontend build dosyaları güncellendi"

echo "[4/5] Backend bağımlılıkları kontrol ediliyor..."
docker exec $CONTAINER_NAME pip install iyzipay httpx --quiet 2>/dev/null || echo "  (pip install atlandı)"

echo "[5/5] Servisler yeniden başlatılıyor..."
docker exec $CONTAINER_NAME supervisorctl restart backend 2>/dev/null || docker restart $CONTAINER_NAME

echo ""
echo "============================================"
echo "  GÜNCELLEME TAMAMLANDI!"
echo "============================================"
echo ""
echo "Yeni Özellikler:"
echo "  ✓ Bayilik Yönetim Sistemi"
echo "    - Landing page'de bayilik başvuru formu"
echo "    - SuperAdmin panelinde bayilik yönetimi"
echo "  ✓ iyzico Ödeme Entegrasyonu"
echo "    - Abonelik ödemeleri için hazır"
echo ""
echo "iyzico Yapılandırması (opsiyonel):"
echo "  Backend .env dosyasına ekleyin:"
echo "    IYZICO_API_KEY=your_api_key"
echo "    IYZICO_SECRET_KEY=your_secret_key"
echo "    IYZICO_BASE_URL=https://sandbox-api.iyzipay.com"
echo ""
echo "Test için: https://your-domain.com/superadmin/franchises"
echo ""
