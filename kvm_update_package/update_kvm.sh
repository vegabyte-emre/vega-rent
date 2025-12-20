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

# Container isimleri - KVM'deki gerçek isimler
FRONTEND_CONTAINER="superadmin_frontend"
BACKEND_CONTAINER="superadmin_backend"

# Path'ler
BACKEND_PATH="/app"
FRONTEND_PATH="/usr/share/nginx/html"

# Kontroller
if [ ! -d "frontend_build" ] || [ ! -d "backend" ]; then
    echo "HATA: frontend_build veya backend klasörü bulunamadı!"
    echo "Lütfen scripti güncelleme paketinin içinde çalıştırın."
    exit 1
fi

echo "[1/6] Container'lar kontrol ediliyor..."
if ! docker ps | grep -q "$BACKEND_CONTAINER"; then
    echo "HATA: $BACKEND_CONTAINER bulunamadı!"
    exit 1
fi
if ! docker ps | grep -q "$FRONTEND_CONTAINER"; then
    echo "HATA: $FRONTEND_CONTAINER bulunamadı!"
    exit 1
fi
echo "  ✓ $BACKEND_CONTAINER çalışıyor"
echo "  ✓ $FRONTEND_CONTAINER çalışıyor"

echo ""
echo "[2/6] Backend dosyaları güncelleniyor..."
docker cp backend/server.py $BACKEND_CONTAINER:$BACKEND_PATH/server.py
echo "  ✓ server.py güncellendi"

# Services klasörünü oluştur (yoksa)
docker exec $BACKEND_CONTAINER mkdir -p $BACKEND_PATH/services 2>/dev/null || true

for file in backend/services/*.py; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        docker cp "$file" $BACKEND_CONTAINER:$BACKEND_PATH/services/$filename
        echo "  ✓ services/$filename güncellendi"
    fi
done

echo ""
echo "[3/6] Frontend dosyaları güncelleniyor..."
docker cp frontend_build/. $FRONTEND_CONTAINER:$FRONTEND_PATH/
echo "  ✓ Frontend build dosyaları güncellendi"

echo ""
echo "[4/6] Backend bağımlılıkları kuruluyor..."
docker exec $BACKEND_CONTAINER pip install iyzipay httpx --quiet 2>/dev/null && echo "  ✓ iyzipay, httpx kuruldu" || echo "  (zaten mevcut)"

echo ""
echo "[5/6] Cache temizleniyor..."
docker exec $BACKEND_CONTAINER find $BACKEND_PATH -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
echo "  ✓ __pycache__ temizlendi"

echo ""
echo "[6/6] Backend yeniden başlatılıyor..."
docker restart $BACKEND_CONTAINER
echo "  ✓ $BACKEND_CONTAINER yeniden başlatıldı"

echo ""
echo "============================================"
echo "  ✅ GÜNCELLEME TAMAMLANDI!"
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
echo "  ✓ Template Güncelleme Butonu"
echo "    - SuperAdmin > Firmalar > 'Template Güncelle'"
echo ""
echo "============================================"
echo "  📋 SIRADAKI ADIMLAR"
echo "============================================"
echo ""
echo "1. SuperAdmin paneline giriş yapın"
echo "2. Firmalar sayfasına gidin"
echo "3. 'Template Güncelle' butonuna tıklayın"
echo "4. 'Tümünü Güncelle' ile tenant'ları güncelleyin"
echo ""
