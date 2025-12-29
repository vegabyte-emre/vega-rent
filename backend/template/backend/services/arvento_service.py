"""
Arvento GPS Integration Service - SOAP API
Arvento WSDL: https://ws.arvento.com/v1/report.asmx?WSDL

Bu servis Arvento'nun SOAP web servisini kullanarak araç takip verilerini alır.
"""
import httpx
import logging
import xml.etree.ElementTree as ET
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
import os

logger = logging.getLogger(__name__)

class ArventoService:
    """
    Arvento GPS Tracking Integration via SOAP API
    
    Required credentials:
    - username: Arvento kullanıcı adı
    - pin1: Birinci şifre (PIN1)
    - pin2: İkinci şifre (PIN2) - genelde boş bırakılabilir
    - language: Dil kodu (tr/en)
    """
    
    WSDL_URL = "https://ws.arvento.com/v1/report.asmx"
    NAMESPACE = "http://www.arvento.com/"
    
    def __init__(self, username: str = None, pin1: str = None, pin2: str = None, language: str = "tr"):
        self.username = username or os.environ.get('ARVENTO_USERNAME', '')
        self.pin1 = pin1 or os.environ.get('ARVENTO_PIN1', '')
        self.pin2 = pin2 or os.environ.get('ARVENTO_PIN2', '')
        self.language = language
        self.is_configured = bool(self.username and self.pin1)
    
    def _create_soap_envelope(self, operation: str, params: Dict[str, str]) -> str:
        """SOAP envelope oluştur"""
        params_xml = "\n".join([f"<{k}>{v}</{k}>" for k, v in params.items()])
        
        return f'''<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <{operation} xmlns="{self.NAMESPACE}">
      {params_xml}
    </{operation}>
  </soap:Body>
</soap:Envelope>'''
    
    async def _send_soap_request(self, operation: str, params: Dict[str, str]) -> Optional[str]:
        """SOAP isteği gönder ve yanıtı al"""
        envelope = self._create_soap_envelope(operation, params)
        
        headers = {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': f'{self.NAMESPACE}{operation}'
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0, verify=True) as client:
                response = await client.post(
                    self.WSDL_URL,
                    content=envelope.encode('utf-8'),
                    headers=headers
                )
                
                if response.status_code == 200:
                    return response.text
                else:
                    logger.error(f"Arvento SOAP error: {response.status_code} - {response.text[:500]}")
                    return None
                    
        except Exception as e:
            logger.error(f"Arvento connection error: {str(e)}")
            return None
    
    def _parse_vehicle_status_xml(self, xml_response: str) -> List[Dict]:
        """GetVehicleStatusReturnObject yanıtını parse et"""
        vehicles = []
        
        try:
            # Remove namespaces for easier parsing
            xml_clean = xml_response.replace('xmlns=', 'xmlns_orig=')
            root = ET.fromstring(xml_clean)
            
            # Find all vehicle elements (structure may vary)
            # Try different paths based on Arvento's XML structure
            for vehicle_elem in root.iter():
                if 'Vehicle' in vehicle_elem.tag or 'Row' in vehicle_elem.tag:
                    vehicle = {}
                    for child in vehicle_elem:
                        tag = child.tag.split('}')[-1] if '}' in child.tag else child.tag
                        vehicle[tag.lower()] = child.text
                    
                    if vehicle.get('plate') or vehicle.get('licenseplate') or vehicle.get('plaka'):
                        vehicles.append(self._normalize_vehicle(vehicle))
            
            # If no vehicles found with above method, try direct parsing
            if not vehicles:
                # Parse the inner XML from GetVehicleStatusReturnObjectResult
                result_elem = root.find('.//{http://www.arvento.com/}GetVehicleStatusReturnObjectResult')
                if result_elem is not None and result_elem.text:
                    inner_xml = result_elem.text
                    inner_root = ET.fromstring(inner_xml)
                    for row in inner_root.findall('.//Row'):
                        vehicle = {}
                        for child in row:
                            vehicle[child.tag.lower()] = child.text
                        if vehicle:
                            vehicles.append(self._normalize_vehicle(vehicle))
                            
        except ET.ParseError as e:
            logger.error(f"XML parse error: {e}")
        except Exception as e:
            logger.error(f"Vehicle parsing error: {e}")
        
        return vehicles
    
    def _normalize_vehicle(self, raw: Dict) -> Dict:
        """Ham veriyi standart formata dönüştür"""
        # Arvento field mapping (may vary based on actual response)
        plate = raw.get('plate') or raw.get('licenseplate') or raw.get('plaka') or raw.get('licenseplatetext') or ''
        
        lat = None
        lng = None
        
        # Try different field names for coordinates
        lat_fields = ['latitude', 'lat', 'enlem', 'y']
        lng_fields = ['longitude', 'lng', 'lon', 'boylam', 'x']
        
        for field in lat_fields:
            if raw.get(field):
                try:
                    lat = float(raw[field])
                    break
                except:
                    pass
        
        for field in lng_fields:
            if raw.get(field):
                try:
                    lng = float(raw[field])
                    break
                except:
                    pass
        
        # Speed
        speed = 0
        speed_fields = ['speed', 'hiz', 'velocity']
        for field in speed_fields:
            if raw.get(field):
                try:
                    speed = float(raw[field])
                    break
                except:
                    pass
        
        # Ignition/Engine status
        ignition = False
        ignition_fields = ['ignition', 'kontak', 'engine', 'motor']
        for field in ignition_fields:
            val = raw.get(field, '').lower()
            if val in ['true', '1', 'on', 'açık', 'yes']:
                ignition = True
                break
        
        return {
            'vehicle_id': raw.get('nodeid') or raw.get('deviceid') or raw.get('id') or plate,
            'plate': plate,
            'lat': lat,
            'lng': lng,
            'speed': speed,
            'heading': float(raw.get('heading') or raw.get('direction') or raw.get('yon') or 0),
            'ignition': ignition,
            'last_update': raw.get('datetime') or raw.get('tarih') or raw.get('lastupdate') or datetime.now(timezone.utc).isoformat(),
            'address': raw.get('address') or raw.get('adres') or raw.get('location') or '',
            'driver': raw.get('driver') or raw.get('surucu') or raw.get('drivername') or '',
            'status': raw.get('status') or raw.get('durum') or '',
            'odometer': float(raw.get('odometer') or raw.get('km') or 0),
            'raw_data': raw  # Keep raw data for debugging
        }
    
    async def get_all_vehicles(self) -> Dict[str, Any]:
        """
        Tüm araçların anlık konumlarını al
        SOAP Operation: GetVehicleStatusReturnObject
        """
        if not self.is_configured:
            return {
                'success': False,
                'source': 'not_configured',
                'message': 'Arvento API bilgileri yapılandırılmamış. Ayarlar > Entegrasyonlar bölümünden yapılandırın.',
                'vehicles': []
            }
        
        params = {
            'Username': self.username,
            'PIN1': self.pin1,
            'PIN2': self.pin2,
            'Language': self.language
        }
        
        response = await self._send_soap_request('GetVehicleStatusReturnObject', params)
        
        if response:
            vehicles = self._parse_vehicle_status_xml(response)
            return {
                'success': True,
                'source': 'arvento_api',
                'message': f'{len(vehicles)} araç bulundu',
                'vehicles': vehicles,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        
        return {
            'success': False,
            'source': 'arvento_api',
            'message': 'Arvento API yanıt vermedi',
            'vehicles': []
        }
    
    async def get_vehicle_history(self, plate: str, start_date: str, end_date: str) -> Dict[str, Any]:
        """
        Araç geçmiş rota bilgisi
        SOAP Operation: VehicleOperatingReportReturnObject
        """
        if not self.is_configured:
            return {'success': False, 'history': [], 'message': 'API yapılandırılmamış'}
        
        params = {
            'Username': self.username,
            'PIN1': self.pin1,
            'PIN2': self.pin2,
            'Language': self.language,
            'LicensePlate': plate,
            'StartDate': start_date,
            'EndDate': end_date,
            'ShowStops': 'true',
            'ShowSpeeding': 'true',
            'ShowIdling': 'true'
        }
        
        response = await self._send_soap_request('VehicleOperatingReportReturnObject', params)
        
        if response:
            # Parse history data
            history = self._parse_history_xml(response)
            return {
                'success': True,
                'history': history,
                'source': 'arvento_api'
            }
        
        return {'success': False, 'history': [], 'error': 'Geçmiş alınamadı'}
    
    def _parse_history_xml(self, xml_response: str) -> List[Dict]:
        """Araç geçmiş verisini parse et"""
        history = []
        try:
            xml_clean = xml_response.replace('xmlns=', 'xmlns_orig=')
            root = ET.fromstring(xml_clean)
            
            for row in root.iter():
                if 'Row' in row.tag or 'Point' in row.tag:
                    point = {}
                    for child in row:
                        tag = child.tag.split('}')[-1] if '}' in child.tag else child.tag
                        point[tag.lower()] = child.text
                    if point:
                        history.append(point)
                        
        except Exception as e:
            logger.error(f"History parse error: {e}")
        
        return history
    
    async def get_license_plate_mappings(self) -> Dict[str, Any]:
        """
        Plaka ve cihaz ID eşleştirmelerini al
        SOAP Operation: GetLicensePlateNodeMappings
        """
        if not self.is_configured:
            return {'success': False, 'mappings': [], 'message': 'API yapılandırılmamış'}
        
        params = {
            'Username': self.username,
            'PIN1': self.pin1,
            'PIN2': self.pin2,
            'Language': self.language
        }
        
        response = await self._send_soap_request('GetLicensePlateNodeMappings', params)
        
        if response:
            mappings = self._parse_mappings_xml(response)
            return {
                'success': True,
                'mappings': mappings,
                'source': 'arvento_api'
            }
        
        return {'success': False, 'mappings': [], 'error': 'Eşleştirmeler alınamadı'}
    
    def _parse_mappings_xml(self, xml_response: str) -> List[Dict]:
        """Plaka-node eşleştirmelerini parse et"""
        mappings = []
        try:
            xml_clean = xml_response.replace('xmlns=', 'xmlns_orig=')
            root = ET.fromstring(xml_clean)
            
            for row in root.iter():
                if 'Row' in row.tag or 'Mapping' in row.tag:
                    mapping = {}
                    for child in row:
                        tag = child.tag.split('}')[-1] if '}' in child.tag else child.tag
                        mapping[tag.lower()] = child.text
                    if mapping:
                        mappings.append(mapping)
                        
        except Exception as e:
            logger.error(f"Mappings parse error: {e}")
        
        return mappings
    
    async def test_connection(self) -> Dict[str, Any]:
        """
        API bağlantısını test et
        """
        if not self.is_configured:
            return {
                'success': False,
                'configured': False,
                'message': 'Arvento API bilgileri yapılandırılmamış. Username ve PIN1 gerekli.'
            }
        
        # Try to get vehicles - if it works, connection is OK
        result = await self.get_all_vehicles()
        
        if result.get('success'):
            return {
                'success': True,
                'configured': True,
                'message': f'Bağlantı başarılı! {len(result.get("vehicles", []))} araç bulundu.',
                'vehicle_count': len(result.get('vehicles', []))
            }
        
        return {
            'success': False,
            'configured': True,
            'message': result.get('message', 'Bağlantı kurulamadı. Kullanıcı adı ve şifreleri kontrol edin.'),
            'error': result.get('error')
        }


def create_arvento_service(settings: Dict) -> ArventoService:
    """
    Ayarlardan ArventoService oluştur
    settings: {
        'arvento_username': '...',
        'arvento_pin1': '...',
        'arvento_pin2': '...',
        'arvento_language': 'tr'
    }
    """
    return ArventoService(
        username=settings.get('arvento_username') or settings.get('username'),
        pin1=settings.get('arvento_pin1') or settings.get('pin1'),
        pin2=settings.get('arvento_pin2') or settings.get('pin2', ''),
        language=settings.get('arvento_language') or settings.get('language', 'tr')
    )
