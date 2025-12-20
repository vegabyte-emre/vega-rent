#!/bin/bash
# KVM SuperAdmin Güncelleme Scripti v6
# Bayilik Sistemi + iyzico + Template Güncelleme Özelliği
# Tarih: 2024-12-20

set -e

echo "============================================"
echo "  SuperAdmin Panel Güncelleme v6"
echo "  + Bayilik Sistemi"
echo "  + iyzico Ödeme Entegrasyonu"  
echo "  + Template Güncelleme Butonu"
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

echo "[1/6] Mevcut container kontrol ediliyor..."
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "UYARI: $CONTAINER_NAME container'ı çalışmıyor veya bulunamadı."
    echo ""
    echo "Mevcut container'lar:"
    docker ps --format "table {{.Names}}\t{{.Status}}" | head -10
    echo ""
    read -p "Container adını girin (veya devam etmek için Enter): " custom_name
    if [ -n "$custom_name" ]; then
        CONTAINER_NAME="$custom_name"
    fi
fi

echo "[2/6] Backend dosyaları güncelleniyor..."
docker cp backend/server.py $CONTAINER_NAME:$BACKEND_PATH/server.py
echo "  ✓ server.py güncellendi"

# Services klasörünü oluştur (yoksa)
docker exec $CONTAINER_NAME mkdir -p $BACKEND_PATH/services 2>/dev/null || true

docker cp backend/services/. $CONTAINER_NAME:$BACKEND_PATH/services/
echo "  ✓ services/ klasörü güncellendi"
echo "    - iyzico_service.py"
echo "    - portainer_service.py"

echo "[3/6] Frontend dosyaları güncelleniyor..."
docker cp frontend_build/. $CONTAINER_NAME:$FRONTEND_PATH/
echo "  ✓ Frontend build dosyaları güncellendi"

echo "[4/6] Backend bağımlılıkları kontrol ediliyor..."
docker exec $CONTAINER_NAME pip install iyzipay httpx --quiet 2>/dev/null || echo "  (pip zaten güncel)"

echo "[5/6] __pycache__ temizleniyor..."
docker exec $CONTAINER_NAME find $BACKEND_PATH -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

echo "[6/6] Servisler yeniden başlatılıyor..."
docker exec $CONTAINER_NAME supervisorctl restart backend 2>/dev/null || docker restart $CONTAINER_NAME

echo ""
echo "============================================"
echo "  GÜNCELLEME TAMAMLANDI!"
echo "============================================"
echo ""
echo "Yeni Özellikler:"
echo "  ✓ Bayilik Yönetim Sistemi"
echo "    - Landing page'de bayilik başvuru formu"
echo "    - SuperAdmin > Bayilikler sayfası"
echo ""
echo "  ✓ iyzico Ödeme Entegrasyonu"
echo "    - SuperAdmin > Abonelikler > iyzico ile Ödeme"
echo ""
echo "  ✓ Template Güncelleme Butonu (YENİ!)"
echo "    - SuperAdmin > Firmalar > 'Template Güncelle'"
echo "    - Tüm tenant'ları tek tıkla güncelleyin"
echo ""
echo "============================================"
echo "  SIRADAKI ADIM"
echo "============================================"
echo ""
echo "1. SuperAdmin paneline giriş yapın"
echo "2. Firmalar sayfasına gidin"
echo "3. 'Template Güncelle' butonuna tıklayın"
echo "4. Sonra 'Tümünü Güncelle' ile tenant'ları güncelleyin"
echo ""
echo "iyzico Yapılandırması (opsiyonel):"
echo "  IYZICO_API_KEY=your_api_key"
echo "  IYZICO_SECRET_KEY=your_secret_key"
echo ""
