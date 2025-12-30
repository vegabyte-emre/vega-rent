"""
Arvento GPS Integration Service - SOAP API v2.0
Arvento WSDL: https://ws.arvento.com/v1/report.asmx?WSDL

Bu servis Arvento'nun SOAP web servisini kullanarak araç takip verilerini alır.
Kapsamlı entegrasyon: Araç takibi, raporlar, yakıt, bakım, alarmlar
"""
import httpx
import logging
import xml.etree.ElementTree as ET
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone, timedelta
import os
import re

logger = logging.getLogger(__name__)

class ArventoService:
    """
    Arvento GPS Tracking Integration via SOAP API
    
    Desteklenen Servisler:
    - Temel: GetVehicles, GetVehicleDetail, GetVehicleGroups, GetDrivers
    - Canlı Konum: GetLastKnownLocation, GetVehicleStatus, GetVehicleIOStatus
    - Geçmiş: GetHistoricalData, GetLocationsByDate, GetTripDetail, GetTripReport
    - Duruş/Hareket: GetStopReport, GetIdleReport
    - Hız: GetSpeedReport, GetSpeedViolations
    - Kilometre: GetOdometer, GetKilometerReport
    - Yakıt: GetFuelReport, GetFuelLevelByDate, GetFuelConsumption
    - Bakım: GetMaintenanceInfo, GetMaintenanceRecords, GetServiceReminders
    - Alarm: GetAlarms, GetAlarmTypes, GetAlarmHistory
    - Ek: GetEvents, GetPOIs, GetRoutes
    """
    
    WSDL_URL = "https://ws.arvento.com/v1/report.asmx"
    NAMESPACE = "http://www.arvento.com/"
    
    def __init__(self, username: str = None, pin1: str = None, pin2: str = None, language: str = "tr"):
        self.username = username or os.environ.get('ARVENTO_USERNAME', '')
        self.pin1 = pin1 or os.environ.get('ARVENTO_PIN1', '')
        self.pin2 = pin2 or os.environ.get('ARVENTO_PIN2', '')
        self.language = language
        self.is_configured = bool(self.username and self.pin1)
    
    def _get_base_params(self) -> Dict[str, str]:
        """Temel kimlik doğrulama parametreleri"""
        return {
            'Username': self.username,
            'PIN1': self.pin1,
            'PIN2': self.pin2 or '',
            'Language': self.language
        }
    
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
            async with httpx.AsyncClient(timeout=60.0, verify=True) as client:
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
    
    def _check_access_denied(self, xml_response: str) -> bool:
        """Access denied kontrolü"""
        return "Access denied" in xml_response or "access denied" in xml_response.lower()
    
    def _parse_xml_to_list(self, xml_response: str, row_tag: str = "Row") -> List[Dict]:
        """XML yanıtını liste olarak parse et"""
        results = []
        
        try:
            # Namespace temizle
            xml_clean = re.sub(r'xmlns[^"]*"[^"]*"', '', xml_response)
            root = ET.fromstring(xml_clean)
            
            # Tüm Row elementlerini bul
            for elem in root.iter():
                tag_name = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
                if tag_name == row_tag or 'Row' in tag_name:
                    item = {}
                    for child in elem:
                        child_tag = child.tag.split('}')[-1] if '}' in child.tag else child.tag
                        item[child_tag] = child.text
                    if item:
                        results.append(item)
            
            # Result içindeki XML'i de kontrol et
            if not results:
                for result_elem in root.iter():
                    if 'Result' in result_elem.tag and result_elem.text:
                        try:
                            inner_root = ET.fromstring(result_elem.text)
                            for row in inner_root.iter():
                                if 'Row' in row.tag:
                                    item = {}
                                    for child in row:
                                        child_tag = child.tag.split('}')[-1] if '}' in child.tag else child.tag
                                        item[child_tag] = child.text
                                    if item:
                                        results.append(item)
                        except:
                            pass
                            
        except ET.ParseError as e:
            logger.error(f"XML parse error: {e}")
        except Exception as e:
            logger.error(f"Parse error: {e}")
        
        return results

    def _normalize_vehicle(self, raw: Dict) -> Dict:
        """Ham araç verisini standart formata dönüştür"""
        # Plaka
        plate = (raw.get('Plate') or raw.get('plate') or raw.get('LicensePlate') or 
                raw.get('licensePlate') or raw.get('Plaka') or raw.get('LicensePlateText') or '')
        
        # Koordinatlar
        lat = None
        lng = None
        for field in ['Latitude', 'latitude', 'Lat', 'lat', 'Enlem', 'Y', 'y']:
            if raw.get(field):
                try:
                    lat = float(raw[field])
                    break
                except: pass
        
        for field in ['Longitude', 'longitude', 'Lng', 'lng', 'Lon', 'lon', 'Boylam', 'X', 'x']:
            if raw.get(field):
                try:
                    lng = float(raw[field])
                    break
                except: pass
        
        # Hız
        speed = 0
        for field in ['Speed', 'speed', 'Hiz', 'hiz', 'Velocity']:
            if raw.get(field):
                try:
                    speed = float(raw[field])
                    break
                except: pass
        
        # Kontak durumu
        ignition = False
        for field in ['Ignition', 'ignition', 'Kontak', 'kontak', 'Engine', 'Motor']:
            val = str(raw.get(field, '')).lower()
            if val in ['true', '1', 'on', 'açık', 'yes', 'evet']:
                ignition = True
                break
        
        # Tarih
        last_update = None
        for field in ['DateTime', 'datetime', 'LastUpdate', 'Tarih', 'GMTDateTime', 'LocalDateTime']:
            if raw.get(field):
                last_update = raw[field]
                break
        
        return {
            'vehicle_id': raw.get('NodeId') or raw.get('nodeId') or raw.get('DeviceId') or raw.get('Id') or plate,
            'node_id': raw.get('NodeId') or raw.get('nodeId') or raw.get('Node') or '',
            'plate': plate,
            'lat': lat,
            'lng': lng,
            'speed': speed,
            'heading': float(raw.get('Course') or raw.get('Heading') or raw.get('Direction') or raw.get('Yon') or 0),
            'ignition': ignition,
            'last_update': last_update or datetime.now(timezone.utc).isoformat(),
            'address': raw.get('Address') or raw.get('Adres') or raw.get('Location') or '',
            'driver': raw.get('Driver') or raw.get('DriverName') or raw.get('Surucu') or '',
            'status': raw.get('Status') or raw.get('Durum') or '',
            'odometer': float(raw.get('Odometer') or raw.get('Km') or raw.get('TotalKm') or 0),
            'altitude': float(raw.get('Altitude') or raw.get('Yukseklik') or 0),
            'fuel_level': raw.get('FuelLevel') or raw.get('YakitSeviyesi') or None,
            'group': raw.get('Group') or raw.get('GroupName') or raw.get('Grup') or '',
            'raw_data': raw
        }

    # ==================== TEMEL SERVİSLER ====================
    
    async def get_vehicles(self) -> Dict[str, Any]:
        """
        Tüm araçların listesini al
        Arvento: GetVehicleStatus / GetVehicleStatusReturnObject
        """
        if not self.is_configured:
            return self._not_configured_response()
        
        params = self._get_base_params()
        
        # Önce ReturnObject versiyonunu dene
        response = await self._send_soap_request('GetVehicleStatusReturnObject', params)
        
        if response:
            if self._check_access_denied(response):
                return {
                    'success': False,
                    'error': 'access_denied',
                    'message': 'API erişimi reddedildi. PIN1/PIN2 kodlarını kontrol edin.',
                    'vehicles': []
                }
            
            vehicles = self._parse_xml_to_list(response)
            normalized = [self._normalize_vehicle(v) for v in vehicles]
            
            return {
                'success': True,
                'source': 'arvento_api',
                'operation': 'GetVehicleStatusReturnObject',
                'message': f'{len(normalized)} araç bulundu',
                'vehicles': normalized,
                'count': len(normalized),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        
        return self._api_error_response('Araç listesi alınamadı')
    
    async def get_vehicle_detail(self, node_id: str = None, plate: str = None) -> Dict[str, Any]:
        """Tek araç detayı"""
        if not self.is_configured:
            return self._not_configured_response()
        
        params = self._get_base_params()
        if node_id:
            params['Node'] = node_id
        if plate:
            params['LicensePlate'] = plate
        
        response = await self._send_soap_request('GetVehicleInfo', params)
        
        if response and not self._check_access_denied(response):
            vehicles = self._parse_xml_to_list(response)
            if vehicles:
                return {
                    'success': True,
                    'vehicle': self._normalize_vehicle(vehicles[0]),
                    'raw': vehicles[0]
                }
        
        return {'success': False, 'message': 'Araç bulunamadı'}
    
    async def get_vehicle_groups(self) -> Dict[str, Any]:
        """Araç gruplarını al"""
        if not self.is_configured:
            return self._not_configured_response()
        
        response = await self._send_soap_request('GetGroupsReturnObject', self._get_base_params())
        
        if response and not self._check_access_denied(response):
            groups = self._parse_xml_to_list(response)
            return {
                'success': True,
                'groups': groups,
                'count': len(groups)
            }
        
        return {'success': False, 'groups': [], 'message': 'Gruplar alınamadı'}
    
    async def get_drivers(self) -> Dict[str, Any]:
        """Sürücü listesi"""
        if not self.is_configured:
            return self._not_configured_response()
        
        response = await self._send_soap_request('GetDriverNodeMappingsReturnObject', self._get_base_params())
        
        if response and not self._check_access_denied(response):
            drivers = self._parse_xml_to_list(response)
            return {
                'success': True,
                'drivers': drivers,
                'count': len(drivers)
            }
        
        return {'success': False, 'drivers': [], 'message': 'Sürücüler alınamadı'}

    # ==================== CANLI KONUM TAKİBİ ====================
    
    async def get_last_known_location(self, node_id: str = None, plate: str = None) -> Dict[str, Any]:
        """Son bilinen konum"""
        if not self.is_configured:
            return self._not_configured_response()
        
        params = self._get_base_params()
        if node_id:
            params['Node'] = node_id
        if plate:
            params['LicensePlate'] = plate
        
        response = await self._send_soap_request('GetVehicleStatusV4', params)
        
        if response and not self._check_access_denied(response):
            # V4 formatı farklı parse edilmeli
            try:
                xml_clean = re.sub(r'xmlns[^"]*"[^"]*"', '', response)
                root = ET.fromstring(xml_clean)
                
                location = {}
                for elem in root.iter():
                    tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
                    if tag in ['dLatitude', 'dLongitude', 'dSpeed', 'nCourse', 'dtLocalDateTime', 'strNode', 'dOdometer']:
                        location[tag.replace('d', '').replace('str', '').replace('n', '').replace('dt', '')] = elem.text
                
                if location:
                    return {
                        'success': True,
                        'location': {
                            'lat': float(location.get('Latitude') or 0),
                            'lng': float(location.get('Longitude') or 0),
                            'speed': float(location.get('Speed') or 0),
                            'course': float(location.get('Course') or 0),
                            'timestamp': location.get('LocalDateTime'),
                            'node': location.get('Node'),
                            'odometer': float(location.get('Odometer') or 0)
                        }
                    }
            except Exception as e:
                logger.error(f"Location parse error: {e}")
        
        return {'success': False, 'message': 'Konum alınamadı'}
    
    async def get_vehicle_status(self) -> Dict[str, Any]:
        """Tüm araçların anlık durumu - get_vehicles ile aynı"""
        return await self.get_vehicles()
    
    async def get_vehicle_io_status(self, node_id: str) -> Dict[str, Any]:
        """Araç I/O durumu (kapı, bağaj, vs.)"""
        if not self.is_configured:
            return self._not_configured_response()
        
        params = self._get_base_params()
        params['Node'] = node_id
        
        response = await self._send_soap_request('GetVehicleAlarmStatusV2ReturnObject', params)
        
        if response and not self._check_access_denied(response):
            statuses = self._parse_xml_to_list(response)
            return {
                'success': True,
                'io_status': statuses[0] if statuses else {},
                'raw': statuses
            }
        
        return {'success': False, 'message': 'I/O durumu alınamadı'}

    # ==================== GEÇMİŞ RAPORLARI ====================
    
    async def get_historical_data(self, node_id: str, start_date: str, end_date: str) -> Dict[str, Any]:
        """Geçmiş konum verileri"""
        if not self.is_configured:
            return self._not_configured_response()
        
        params = self._get_base_params()
        params.update({
            'Node': node_id,
            'StartDate': start_date,
            'EndDate': end_date
        })
        
        response = await self._send_soap_request('VehicleOperatingReportReturnObject', params)
        
        if response and not self._check_access_denied(response):
            data = self._parse_xml_to_list(response)
            return {
                'success': True,
                'history': data,
                'count': len(data),
                'period': {'start': start_date, 'end': end_date}
            }
        
        return {'success': False, 'history': [], 'message': 'Geçmiş veriler alınamadı'}
    
    async def get_locations_by_date(self, node_id: str, date: str) -> Dict[str, Any]:
        """Belirli tarihteki konumlar"""
        # Günün başı ve sonu
        start = f"{date} 00:00:00"
        end = f"{date} 23:59:59"
        return await self.get_historical_data(node_id, start, end)
    
    async def get_trip_detail(self, node_id: str, start_date: str, end_date: str) -> Dict[str, Any]:
        """Sefer detayları"""
        if not self.is_configured:
            return self._not_configured_response()
        
        params = self._get_base_params()
        params.update({
            'Node': node_id,
            'StartDate': start_date,
            'EndDate': end_date,
            'ShowStops': 'true',
            'ShowSpeeding': 'true',
            'ShowIdling': 'true'
        })
        
        response = await self._send_soap_request('TripReportReturnObject', params)
        
        if response and not self._check_access_denied(response):
            trips = self._parse_xml_to_list(response)
            return {
                'success': True,
                'trips': trips,
                'count': len(trips)
            }
        
        return {'success': False, 'trips': [], 'message': 'Sefer detayları alınamadı'}
    
    async def get_trip_report(self, node_id: str = None, group: str = None, 
                             start_date: str = None, end_date: str = None) -> Dict[str, Any]:
        """Sefer raporu"""
        if not self.is_configured:
            return self._not_configured_response()
        
        params = self._get_base_params()
        if node_id:
            params['Node'] = node_id
        if group:
            params['Group'] = group
        if start_date:
            params['StartDate'] = start_date
        if end_date:
            params['EndDate'] = end_date
        
        response = await self._send_soap_request('TripReportReturnObject', params)
        
        if response and not self._check_access_denied(response):
            trips = self._parse_xml_to_list(response)
            return {
                'success': True,
                'trips': trips,
                'count': len(trips)
            }
        
        return {'success': False, 'trips': [], 'message': 'Sefer raporu alınamadı'}

    # ==================== DURUŞ/HAREKET RAPORLARI ====================
    
    async def get_stop_report(self, node_id: str, start_date: str, end_date: str, 
                             min_duration_minutes: int = 5) -> Dict[str, Any]:
        """Duruş raporu"""
        if not self.is_configured:
            return self._not_configured_response()
        
        params = self._get_base_params()
        params.update({
            'Node': node_id,
            'StartDate': start_date,
            'EndDate': end_date,
            'MinDuration': str(min_duration_minutes)
        })
        
        response = await self._send_soap_request('StopReportReturnObject', params)
        
        if response and not self._check_access_denied(response):
            stops = self._parse_xml_to_list(response)
            return {
                'success': True,
                'stops': stops,
                'count': len(stops),
                'total_duration': sum(float(s.get('Duration', 0)) for s in stops if s.get('Duration'))
            }
        
        return {'success': False, 'stops': [], 'message': 'Duruş raporu alınamadı'}
    
    async def get_idle_report(self, node_id: str, start_date: str, end_date: str,
                             min_duration_minutes: int = 3) -> Dict[str, Any]:
        """Rölanti raporu (motor çalışıyor ama hareket yok)"""
        if not self.is_configured:
            return self._not_configured_response()
        
        params = self._get_base_params()
        params.update({
            'Node': node_id,
            'StartDate': start_date,
            'EndDate': end_date,
            'MinIdleDuration': str(min_duration_minutes)
        })
        
        response = await self._send_soap_request('IdleReportReturnObject', params)
        
        if response and not self._check_access_denied(response):
            idles = self._parse_xml_to_list(response)
            return {
                'success': True,
                'idle_events': idles,
                'count': len(idles)
            }
        
        return {'success': False, 'idle_events': [], 'message': 'Rölanti raporu alınamadı'}

    # ==================== HIZ RAPORLARI ====================
    
    async def get_speed_report(self, node_id: str, start_date: str, end_date: str) -> Dict[str, Any]:
        """Hız raporu"""
        if not self.is_configured:
            return self._not_configured_response()
        
        params = self._get_base_params()
        params.update({
            'Node': node_id,
            'StartDate': start_date,
            'EndDate': end_date
        })
        
        response = await self._send_soap_request('SpeedReportReturnObject', params)
        
        if response and not self._check_access_denied(response):
            data = self._parse_xml_to_list(response)
            return {
                'success': True,
                'speed_data': data,
                'count': len(data)
            }
        
        return {'success': False, 'speed_data': [], 'message': 'Hız raporu alınamadı'}
    
    async def get_speed_violations(self, node_id: str = None, group: str = None,
                                   start_date: str = None, end_date: str = None,
                                   speed_limit: int = 120) -> Dict[str, Any]:
        """Hız ihlalleri raporu"""
        if not self.is_configured:
            return self._not_configured_response()
        
        params = self._get_base_params()
        if node_id:
            params['Node'] = node_id
        if group:
            params['Group'] = group
        if start_date:
            params['StartDate'] = start_date
        if end_date:
            params['EndDate'] = end_date
        params['SpeedLimit'] = str(speed_limit)
        
        response = await self._send_soap_request('OverSpeedReportReturnObject', params)
        
        if response and not self._check_access_denied(response):
            violations = self._parse_xml_to_list(response)
            return {
                'success': True,
                'violations': violations,
                'count': len(violations),
                'speed_limit': speed_limit
            }
        
        return {'success': False, 'violations': [], 'message': 'Hız ihlalleri alınamadı'}

    # ==================== KİLOMETRE RAPORLARI ====================
    
    async def get_odometer(self, node_id: str) -> Dict[str, Any]:
        """Anlık kilometre değeri"""
        if not self.is_configured:
            return self._not_configured_response()
        
        params = self._get_base_params()
        params['Node'] = node_id
        
        response = await self._send_soap_request('GetVehicleStatusV4', params)
        
        if response and not self._check_access_denied(response):
            try:
                xml_clean = re.sub(r'xmlns[^"]*"[^"]*"', '', response)
                root = ET.fromstring(xml_clean)
                
                for elem in root.iter():
                    tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
                    if 'Odometer' in tag and elem.text:
                        return {
                            'success': True,
                            'odometer': float(elem.text),
                            'unit': 'km'
                        }
            except Exception as e:
                logger.error(f"Odometer parse error: {e}")
        
        return {'success': False, 'message': 'Kilometre bilgisi alınamadı'}
    
    async def get_kilometer_report(self, node_id: str = None, group: str = None,
                                   start_date: str = None, end_date: str = None) -> Dict[str, Any]:
        """Kilometre raporu"""
        if not self.is_configured:
            return self._not_configured_response()
        
        params = self._get_base_params()
        if node_id:
            params['Node'] = node_id
        if group:
            params['Group'] = group
        if start_date:
            params['StartDate'] = start_date
        if end_date:
            params['EndDate'] = end_date
        
        response = await self._send_soap_request('KilometerReportReturnObject', params)
        
        if response and not self._check_access_denied(response):
            data = self._parse_xml_to_list(response)
            total_km = sum(float(d.get('Distance', 0) or d.get('TotalKm', 0)) for d in data)
            return {
                'success': True,
                'report': data,
                'total_km': total_km,
                'count': len(data)
            }
        
        return {'success': False, 'report': [], 'message': 'Kilometre raporu alınamadı'}

    # ==================== YAKIT YÖNETİMİ ====================
    
    async def get_fuel_report(self, node_id: str, start_date: str, end_date: str) -> Dict[str, Any]:
        """Yakıt raporu"""
        if not self.is_configured:
            return self._not_configured_response()
        
        params = self._get_base_params()
        params.update({
            'Node': node_id,
            'StartDate': start_date,
            'EndDate': end_date
        })
        
        response = await self._send_soap_request('FuelReportReturnObject', params)
        
        if response and not self._check_access_denied(response):
            data = self._parse_xml_to_list(response)
            return {
                'success': True,
                'fuel_data': data,
                'count': len(data)
            }
        
        return {'success': False, 'fuel_data': [], 'message': 'Yakıt raporu alınamadı'}
    
    async def get_fuel_level_by_date(self, node_id: str, date: str) -> Dict[str, Any]:
        """Belirli tarihteki yakıt seviyesi"""
        start = f"{date} 00:00:00"
        end = f"{date} 23:59:59"
        return await self.get_fuel_report(node_id, start, end)
    
    async def get_fuel_consumption(self, node_id: str, start_date: str, end_date: str) -> Dict[str, Any]:
        """Yakıt tüketimi raporu"""
        if not self.is_configured:
            return self._not_configured_response()
        
        params = self._get_base_params()
        params.update({
            'Node': node_id,
            'StartDate': start_date,
            'EndDate': end_date
        })
        
        response = await self._send_soap_request('FuelConsumptionReportReturnObject', params)
        
        if response and not self._check_access_denied(response):
            data = self._parse_xml_to_list(response)
            total_consumption = sum(float(d.get('Consumption', 0) or d.get('FuelUsed', 0)) for d in data)
            return {
                'success': True,
                'consumption_data': data,
                'total_consumption': total_consumption,
                'unit': 'litre'
            }
        
        return {'success': False, 'consumption_data': [], 'message': 'Yakıt tüketimi alınamadı'}

    # ==================== BAKIM TAKİBİ ====================
    
    async def get_maintenance_info(self, node_id: str = None) -> Dict[str, Any]:
        """Bakım bilgileri"""
        if not self.is_configured:
            return self._not_configured_response()
        
        params = self._get_base_params()
        if node_id:
            params['Node'] = node_id
        
        response = await self._send_soap_request('MaintenanceReportReturnObject', params)
        
        if response and not self._check_access_denied(response):
            data = self._parse_xml_to_list(response)
            return {
                'success': True,
                'maintenance': data,
                'count': len(data)
            }
        
        return {'success': False, 'maintenance': [], 'message': 'Bakım bilgileri alınamadı'}
    
    async def get_maintenance_records(self, node_id: str, start_date: str = None, 
                                      end_date: str = None) -> Dict[str, Any]:
        """Bakım kayıtları"""
        return await self.get_maintenance_info(node_id)
    
    async def get_service_reminders(self, node_id: str = None) -> Dict[str, Any]:
        """Servis hatırlatmaları"""
        if not self.is_configured:
            return self._not_configured_response()
        
        params = self._get_base_params()
        if node_id:
            params['Node'] = node_id
        
        response = await self._send_soap_request('ServiceReminderReportReturnObject', params)
        
        if response and not self._check_access_denied(response):
            reminders = self._parse_xml_to_list(response)
            return {
                'success': True,
                'reminders': reminders,
                'count': len(reminders)
            }
        
        return {'success': False, 'reminders': [], 'message': 'Servis hatırlatmaları alınamadı'}

    # ==================== BİLDİRİM/ALARM SİSTEMİ ====================
    
    async def get_alarms(self, node_id: str = None, start_date: str = None, 
                        end_date: str = None) -> Dict[str, Any]:
        """Alarm listesi"""
        if not self.is_configured:
            return self._not_configured_response()
        
        params = self._get_base_params()
        if node_id:
            params['Node'] = node_id
        if start_date:
            params['StartDate'] = start_date
        if end_date:
            params['EndDate'] = end_date
        
        response = await self._send_soap_request('GetVehicleAlarmStatusReturnObject', params)
        
        if response and not self._check_access_denied(response):
            alarms = self._parse_xml_to_list(response)
            return {
                'success': True,
                'alarms': alarms,
                'count': len(alarms)
            }
        
        return {'success': False, 'alarms': [], 'message': 'Alarmlar alınamadı'}
    
    async def get_alarm_types(self) -> Dict[str, Any]:
        """Alarm türleri"""
        # Standart alarm türleri
        alarm_types = [
            {'id': 'overspeed', 'name': 'Hız Aşımı', 'description': 'Belirlenen hız limitinin aşılması'},
            {'id': 'geofence', 'name': 'Bölge İhlali', 'description': 'Tanımlı bölge dışına çıkış'},
            {'id': 'ignition', 'name': 'Kontak', 'description': 'Kontak açma/kapama'},
            {'id': 'sos', 'name': 'SOS', 'description': 'Acil durum butonu'},
            {'id': 'towing', 'name': 'Çekme', 'description': 'Araç çekilme tespiti'},
            {'id': 'low_battery', 'name': 'Düşük Akü', 'description': 'Akü voltajı düşük'},
            {'id': 'harsh_braking', 'name': 'Ani Fren', 'description': 'Ani frenleme tespiti'},
            {'id': 'harsh_acceleration', 'name': 'Ani Hızlanma', 'description': 'Ani hızlanma tespiti'},
        ]
        return {
            'success': True,
            'alarm_types': alarm_types,
            'count': len(alarm_types)
        }
    
    async def get_alarm_history(self, node_id: str = None, alarm_type: str = None,
                               start_date: str = None, end_date: str = None) -> Dict[str, Any]:
        """Alarm geçmişi"""
        return await self.get_alarms(node_id, start_date, end_date)

    # ==================== EK SERVİSLER ====================
    
    async def get_events(self, node_id: str = None, start_date: str = None, 
                        end_date: str = None) -> Dict[str, Any]:
        """Olay listesi"""
        if not self.is_configured:
            return self._not_configured_response()
        
        params = self._get_base_params()
        if node_id:
            params['Node'] = node_id
        if start_date:
            params['StartDate'] = start_date
        if end_date:
            params['EndDate'] = end_date
        
        response = await self._send_soap_request('EventReportReturnObject', params)
        
        if response and not self._check_access_denied(response):
            events = self._parse_xml_to_list(response)
            return {
                'success': True,
                'events': events,
                'count': len(events)
            }
        
        return {'success': False, 'events': [], 'message': 'Olaylar alınamadı'}
    
    async def get_pois(self) -> Dict[str, Any]:
        """İlgi noktaları (POI) listesi"""
        if not self.is_configured:
            return self._not_configured_response()
        
        response = await self._send_soap_request('GetPOIListReturnObject', self._get_base_params())
        
        if response and not self._check_access_denied(response):
            pois = self._parse_xml_to_list(response)
            return {
                'success': True,
                'pois': pois,
                'count': len(pois)
            }
        
        return {'success': False, 'pois': [], 'message': 'POI listesi alınamadı'}
    
    async def get_routes(self, node_id: str = None) -> Dict[str, Any]:
        """Rota listesi"""
        if not self.is_configured:
            return self._not_configured_response()
        
        params = self._get_base_params()
        if node_id:
            params['Node'] = node_id
        
        response = await self._send_soap_request('GetRouteListReturnObject', params)
        
        if response and not self._check_access_denied(response):
            routes = self._parse_xml_to_list(response)
            return {
                'success': True,
                'routes': routes,
                'count': len(routes)
            }
        
        return {'success': False, 'routes': [], 'message': 'Rotalar alınamadı'}

    # ==================== BAĞLANTI TESTİ ====================
    
    async def test_connection(self) -> Dict[str, Any]:
        """API bağlantısını test et"""
        if not self.is_configured:
            return {
                'success': False,
                'configured': False,
                'message': 'Arvento API bilgileri yapılandırılmamış. Username ve PIN1 gerekli.'
            }
        
        # GetNodes ile test et - en basit endpoint
        response = await self._send_soap_request('GetNodesReturnObject', self._get_base_params())
        
        if response:
            if self._check_access_denied(response):
                return {
                    'success': False,
                    'configured': True,
                    'message': 'API erişimi reddedildi. PIN1 ve PIN2 kodlarını kontrol edin. Not: Web portal şifresi API için geçerli değildir!',
                    'error': 'access_denied'
                }
            
            # Başarılı - araç sayısını kontrol et
            nodes = self._parse_xml_to_list(response)
            return {
                'success': True,
                'configured': True,
                'message': f'Bağlantı başarılı! {len(nodes)} cihaz/araç bulundu.',
                'node_count': len(nodes)
            }
        
        return {
            'success': False,
            'configured': True,
            'message': 'Arvento sunucusuna bağlanılamadı. İnternet bağlantınızı kontrol edin.',
            'error': 'connection_failed'
        }

    # ==================== YARDIMCI METODLAR ====================
    
    def _not_configured_response(self) -> Dict[str, Any]:
        """Yapılandırılmamış yanıtı"""
        return {
            'success': False,
            'source': 'not_configured',
            'message': 'Arvento API bilgileri yapılandırılmamış. Ayarlar > Entegrasyonlar bölümünden yapılandırın.',
            'vehicles': [],
            'data': []
        }
    
    def _api_error_response(self, message: str) -> Dict[str, Any]:
        """API hata yanıtı"""
        return {
            'success': False,
            'source': 'arvento_api',
            'message': message,
            'vehicles': [],
            'data': []
        }

    # ==================== ESKİ UYUMLULUK ====================
    
    async def get_all_vehicles(self) -> Dict[str, Any]:
        """Eski metod - get_vehicles'a yönlendir"""
        return await self.get_vehicles()
    
    async def get_vehicle_history(self, plate: str, start_date: str, end_date: str) -> Dict[str, Any]:
        """Eski metod - get_historical_data'ya yönlendir"""
        # Önce plate'den node_id bul
        vehicles = await self.get_vehicles()
        node_id = None
        for v in vehicles.get('vehicles', []):
            if v.get('plate') == plate:
                node_id = v.get('node_id') or v.get('vehicle_id')
                break
        
        if node_id:
            return await self.get_historical_data(node_id, start_date, end_date)
        
        return {'success': False, 'history': [], 'message': f'Plaka bulunamadı: {plate}'}
    
    async def get_license_plate_mappings(self) -> Dict[str, Any]:
        """Plaka-cihaz eşleştirmeleri"""
        if not self.is_configured:
            return self._not_configured_response()
        
        response = await self._send_soap_request('GetLicensePlateNodeMappingsReturnObject', self._get_base_params())
        
        if response and not self._check_access_denied(response):
            mappings = self._parse_xml_to_list(response)
            return {
                'success': True,
                'mappings': mappings,
                'count': len(mappings)
            }
        
        return {'success': False, 'mappings': [], 'message': 'Eşleştirmeler alınamadı'}


def create_arvento_service(settings: Dict) -> ArventoService:
    """
    Ayarlardan ArventoService oluştur
    """
    return ArventoService(
        username=settings.get('arvento_username') or settings.get('username'),
        pin1=settings.get('arvento_pin1') or settings.get('pin1'),
        pin2=settings.get('arvento_pin2') or settings.get('pin2', ''),
        language=settings.get('arvento_language') or settings.get('language', 'tr')
    )
