"""
HGS (Hızlı Geçiş Sistemi) Manuel Takip Servisi
Araç bazlı HGS etiket takibi, bakiye ve geçiş kayıtları

NOT: Bu servis manuel takip içindir. 
PTT HGS API entegrasyonu için ayrı modül gereklidir.
"""
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
from uuid import uuid4

logger = logging.getLogger(__name__)


class HGSService:
    """
    HGS Manuel Takip Servisi
    
    Özellikler:
    - Araç bazlı HGS etiket kaydı
    - Bakiye takibi (manuel güncelleme)
    - Geçiş kayıtları
    - Bakiye uyarıları
    """
    
    def __init__(self, db=None):
        self.db = db
    
    def set_db(self, db):
        """Database bağlantısını ayarla"""
        self.db = db
    
    async def add_hgs_tag(self, vehicle_id: str, tag_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Araca HGS etiketi ekle
        
        Required fields:
        - tag_number: HGS etiket numarası
        - vehicle_plate: Araç plakası
        """
        if not self.db:
            return {'success': False, 'error': 'Database bağlantısı yok'}
        
        tag_id = str(uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        tag_doc = {
            'id': tag_id,
            'vehicle_id': vehicle_id,
            'vehicle_plate': tag_data.get('vehicle_plate', ''),
            'tag_number': tag_data.get('tag_number', ''),
            'provider': tag_data.get('provider', 'PTT'),  # PTT, Banka, vb.
            'balance': tag_data.get('balance', 0.0),
            'min_balance_alert': tag_data.get('min_balance_alert', 50.0),
            'is_active': True,
            'last_balance_update': now,
            'created_at': now,
            'updated_at': now
        }
        
        # Check if vehicle already has HGS
        existing = await self.db.hgs_tags.find_one({'vehicle_id': vehicle_id, 'is_active': True})
        if existing:
            return {
                'success': False,
                'error': 'Bu araca zaten aktif HGS etiketi tanımlı',
                'existing_tag': existing.get('tag_number')
            }
        
        await self.db.hgs_tags.insert_one(tag_doc)
        
        return {
            'success': True,
            'tag_id': tag_id,
            'message': 'HGS etiketi başarıyla eklendi'
        }
    
    async def update_balance(self, tag_id: str, new_balance: float, note: str = '') -> Dict[str, Any]:
        """
        HGS bakiyesini güncelle
        """
        if not self.db:
            return {'success': False, 'error': 'Database bağlantısı yok'}
        
        now = datetime.now(timezone.utc).isoformat()
        
        tag = await self.db.hgs_tags.find_one({'id': tag_id})
        if not tag:
            return {'success': False, 'error': 'HGS etiketi bulunamadı'}
        
        old_balance = tag.get('balance', 0)
        
        # Update tag balance
        await self.db.hgs_tags.update_one(
            {'id': tag_id},
            {'$set': {
                'balance': new_balance,
                'last_balance_update': now,
                'updated_at': now
            }}
        )
        
        # Create balance history record
        history_doc = {
            'id': str(uuid4()),
            'tag_id': tag_id,
            'vehicle_id': tag.get('vehicle_id'),
            'old_balance': old_balance,
            'new_balance': new_balance,
            'change': new_balance - old_balance,
            'type': 'manual_update',
            'note': note,
            'created_at': now
        }
        await self.db.hgs_balance_history.insert_one(history_doc)
        
        # Check for low balance alert
        alert = None
        min_alert = tag.get('min_balance_alert', 50)
        if new_balance < min_alert:
            alert = {
                'type': 'low_balance',
                'message': f"HGS bakiyesi düşük: {new_balance:.2f} TL (Minimum: {min_alert:.2f} TL)",
                'vehicle_plate': tag.get('vehicle_plate')
            }
        
        return {
            'success': True,
            'old_balance': old_balance,
            'new_balance': new_balance,
            'alert': alert
        }
    
    async def add_passage(self, tag_id: str, passage_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Geçiş kaydı ekle
        
        Required fields:
        - location: Geçiş noktası
        - amount: Geçiş ücreti
        - passage_time: Geçiş zamanı
        """
        if not self.db:
            return {'success': False, 'error': 'Database bağlantısı yok'}
        
        tag = await self.db.hgs_tags.find_one({'id': tag_id})
        if not tag:
            return {'success': False, 'error': 'HGS etiketi bulunamadı'}
        
        passage_id = str(uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        passage_doc = {
            'id': passage_id,
            'tag_id': tag_id,
            'vehicle_id': tag.get('vehicle_id'),
            'vehicle_plate': tag.get('vehicle_plate'),
            'location': passage_data.get('location', ''),
            'amount': passage_data.get('amount', 0.0),
            'passage_time': passage_data.get('passage_time', now),
            'direction': passage_data.get('direction', ''),  # Giriş/Çıkış
            'note': passage_data.get('note', ''),
            'created_at': now
        }
        
        await self.db.hgs_passages.insert_one(passage_doc)
        
        # Update balance
        new_balance = tag.get('balance', 0) - passage_data.get('amount', 0)
        await self.db.hgs_tags.update_one(
            {'id': tag_id},
            {'$set': {
                'balance': new_balance,
                'updated_at': now
            }}
        )
        
        return {
            'success': True,
            'passage_id': passage_id,
            'new_balance': new_balance
        }
    
    async def get_vehicle_hgs(self, vehicle_id: str) -> Dict[str, Any]:
        """
        Araç HGS bilgisini getir
        """
        if not self.db:
            return {'success': False, 'error': 'Database bağlantısı yok'}
        
        tag = await self.db.hgs_tags.find_one(
            {'vehicle_id': vehicle_id, 'is_active': True},
            {'_id': 0}
        )
        
        if not tag:
            return {
                'success': True,
                'has_hgs': False,
                'tag': None
            }
        
        # Get recent passages
        passages = await self.db.hgs_passages.find(
            {'tag_id': tag.get('id')},
            {'_id': 0}
        ).sort('passage_time', -1).limit(10).to_list(10)
        
        return {
            'success': True,
            'has_hgs': True,
            'tag': tag,
            'recent_passages': passages
        }
    
    async def get_all_tags(self, company_id: str = None) -> List[Dict[str, Any]]:
        """
        Tüm HGS etiketlerini listele
        """
        if not self.db:
            return []
        
        query = {'is_active': True}
        if company_id:
            query['company_id'] = company_id
        
        tags = await self.db.hgs_tags.find(query, {'_id': 0}).to_list(1000)
        
        # Add alert status
        for tag in tags:
            min_alert = tag.get('min_balance_alert', 50)
            tag['low_balance'] = tag.get('balance', 0) < min_alert
        
        return tags
    
    async def get_passages(self, tag_id: str = None, vehicle_id: str = None, 
                          start_date: str = None, end_date: str = None,
                          limit: int = 100) -> List[Dict[str, Any]]:
        """
        Geçiş kayıtlarını listele
        """
        if not self.db:
            return []
        
        query = {}
        if tag_id:
            query['tag_id'] = tag_id
        if vehicle_id:
            query['vehicle_id'] = vehicle_id
        if start_date:
            query['passage_time'] = {'$gte': start_date}
        if end_date:
            if 'passage_time' in query:
                query['passage_time']['$lte'] = end_date
            else:
                query['passage_time'] = {'$lte': end_date}
        
        passages = await self.db.hgs_passages.find(
            query, {'_id': 0}
        ).sort('passage_time', -1).limit(limit).to_list(limit)
        
        return passages
    
    async def get_summary(self, company_id: str = None) -> Dict[str, Any]:
        """
        HGS özet bilgisi
        """
        if not self.db:
            return {
                'total_tags': 0,
                'total_balance': 0,
                'low_balance_count': 0,
                'total_passages_this_month': 0
            }
        
        tags = await self.get_all_tags(company_id)
        
        total_balance = sum(t.get('balance', 0) for t in tags)
        low_balance = sum(1 for t in tags if t.get('low_balance'))
        
        # This month passages
        from datetime import datetime
        now = datetime.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        
        passages_count = await self.db.hgs_passages.count_documents({
            'passage_time': {'$gte': month_start}
        })
        
        return {
            'total_tags': len(tags),
            'total_balance': round(total_balance, 2),
            'low_balance_count': low_balance,
            'total_passages_this_month': passages_count
        }
    
    async def delete_tag(self, tag_id: str) -> Dict[str, Any]:
        """
        HGS etiketini sil (soft delete)
        """
        if not self.db:
            return {'success': False, 'error': 'Database bağlantısı yok'}
        
        result = await self.db.hgs_tags.update_one(
            {'id': tag_id},
            {'$set': {
                'is_active': False,
                'deleted_at': datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            'success': result.modified_count > 0,
            'message': 'HGS etiketi silindi' if result.modified_count > 0 else 'Etiket bulunamadı'
        }


# Singleton instance
hgs_service = HGSService()
