#!/usr/bin/env python3
"""
FleetEase Backend API Test Suite
Tests both admin and public endpoints
"""

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class FleetEaseAPITester:
    def __init__(self, base_url: str = "https://car-host.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.customer_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.created_company_id = None
        self.created_vehicle_id = None
        self.created_customer_id = None
        self.created_reservation_id = None

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    use_admin_auth: bool = False, use_customer_auth: bool = False) -> tuple:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if use_admin_auth and self.admin_token:
            headers['Authorization'] = f'Bearer {self.admin_token}'
        elif use_customer_auth and self.customer_token:
            headers['Authorization'] = f'Bearer {self.customer_token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}

            return response.status_code, response_data
        except Exception as e:
            return 0, {"error": str(e)}

    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        
        # Test root endpoint
        status, data = self.make_request('GET', '')
        success = status == 200 and "FleetEase API" in str(data)
        self.log_test("Root endpoint", success, f"Status: {status}")
        
        # Test health endpoint
        status, data = self.make_request('GET', 'health')
        success = status == 200 and data.get("status") == "healthy"
        self.log_test("Health endpoint", success, f"Status: {status}")

    def test_admin_auth(self):
        """Test admin authentication"""
        print("\n🔍 Testing Admin Authentication...")
        
        # Test admin login with provided credentials
        login_data = {
            "email": "admin@fleetease.com",
            "password": "admin123"
        }
        
        status, data = self.make_request('POST', 'auth/login', login_data)
        success = status == 200 and "access_token" in data
        
        if success:
            self.admin_token = data["access_token"]
            self.log_test("Admin login", True)
            
            # Test get current user
            status, user_data = self.make_request('GET', 'auth/me', use_admin_auth=True)
            success = status == 200 and user_data.get("role") in ["superadmin", "firma_admin"]
            self.log_test("Get current admin user", success, f"Role: {user_data.get('role', 'unknown')}")
        else:
            self.log_test("Admin login", False, f"Status: {status}, Response: {data}")

    def test_public_vehicles_api(self):
        """Test public vehicle endpoints (no auth required)"""
        print("\n🔍 Testing Public Vehicle APIs...")
        
        # Test list public vehicles
        status, data = self.make_request('GET', 'public/vehicles')
        success = status == 200 and isinstance(data, list)
        vehicle_count = len(data) if isinstance(data, list) else 0
        self.log_test("List public vehicles", success, f"Found {vehicle_count} vehicles")
        
        # Test with limit parameter
        status, data = self.make_request('GET', 'public/vehicles?limit=3')
        success = status == 200 and isinstance(data, list) and len(data) <= 3
        self.log_test("List public vehicles with limit", success)
        
        # Test get single vehicle (if vehicles exist)
        if vehicle_count > 0 and isinstance(data, list) and len(data) > 0:
            vehicle_id = data[0].get("id")
            if vehicle_id:
                status, vehicle_data = self.make_request('GET', f'public/vehicles/{vehicle_id}')
                success = status == 200 and vehicle_data.get("id") == vehicle_id
                self.log_test("Get single public vehicle", success)
            else:
                self.log_test("Get single public vehicle", False, "No vehicle ID found")
        else:
            self.log_test("Get single public vehicle", False, "No vehicles available to test")

    def test_admin_vehicle_management(self):
        """Test admin vehicle management"""
        if not self.admin_token:
            self.log_test("Admin vehicle management", False, "No admin token available")
            return
            
        print("\n🔍 Testing Admin Vehicle Management...")
        
        # Test create vehicle
        vehicle_data = {
            "plate": "34TEST123",
            "brand": "Toyota",
            "model": "Corolla",
            "year": 2023,
            "segment": "Ekonomi",
            "transmission": "otomatik",
            "fuel_type": "benzin",
            "seat_count": 5,
            "door_count": 4,
            "daily_rate": 250.0,
            "color": "Beyaz",
            "mileage": 15000
        }
        
        status, data = self.make_request('POST', 'vehicles', vehicle_data, use_admin_auth=True)
        success = status == 200 and "id" in data
        
        if success:
            self.created_vehicle_id = data["id"]
            self.log_test("Create vehicle", True)
            
            # Test list vehicles
            status, vehicles = self.make_request('GET', 'vehicles', use_admin_auth=True)
            success = status == 200 and isinstance(vehicles, list)
            self.log_test("List admin vehicles", success, f"Found {len(vehicles) if isinstance(vehicles, list) else 0} vehicles")
            
            # Test get single vehicle
            status, vehicle = self.make_request('GET', f'vehicles/{self.created_vehicle_id}', use_admin_auth=True)
            success = status == 200 and vehicle.get("id") == self.created_vehicle_id
            self.log_test("Get single admin vehicle", success)
            
        else:
            self.log_test("Create vehicle", False, f"Status: {status}, Response: {data}")

    def test_customer_management(self):
        """Test customer management"""
        if not self.admin_token:
            self.log_test("Customer management", False, "No admin token available")
            return
            
        print("\n🔍 Testing Customer Management...")
        
        # Test create customer
        customer_data = {
            "tc_no": "12345678901",
            "full_name": "Test Müşteri",
            "email": "test@customer.com",
            "phone": "0555 123 4567",
            "address": "Test Adres, İstanbul"
        }
        
        status, data = self.make_request('POST', 'customers', customer_data, use_admin_auth=True)
        success = status == 200 and "id" in data
        
        if success:
            self.created_customer_id = data["id"]
            self.log_test("Create customer", True)
            
            # Test list customers
            status, customers = self.make_request('GET', 'customers', use_admin_auth=True)
            success = status == 200 and isinstance(customers, list)
            self.log_test("List customers", success)
            
        else:
            self.log_test("Create customer", False, f"Status: {status}, Response: {data}")

    def test_customer_auth_flow(self):
        """Test customer registration and login"""
        print("\n🔍 Testing Customer Authentication Flow...")
        
        # Test customer registration
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        register_data = {
            "email": f"newcustomer{timestamp}@test.com",
            "password": "testpass123",
            "full_name": "Yeni Müşteri",
            "phone": "0555 987 6543",
            "role": "musteri"
        }
        
        status, data = self.make_request('POST', 'auth/register', register_data)
        success = status == 200 and "access_token" in data
        
        if success:
            self.customer_token = data["access_token"]
            self.log_test("Customer registration", True)
            
            # Test customer login
            login_data = {
                "email": register_data["email"],
                "password": register_data["password"]
            }
            
            status, login_response = self.make_request('POST', 'auth/login', login_data)
            success = status == 200 and "access_token" in login_response
            self.log_test("Customer login", success)
            
            if success:
                self.customer_token = login_response["access_token"]
                
        else:
            self.log_test("Customer registration", False, f"Status: {status}, Response: {data}")

    def test_reservation_flow(self):
        """Test reservation creation and management"""
        if not self.admin_token or not self.created_vehicle_id or not self.created_customer_id:
            self.log_test("Reservation flow", False, "Missing prerequisites (admin token, vehicle, or customer)")
            return
            
        print("\n🔍 Testing Reservation Flow...")
        
        # Test create reservation
        start_date = datetime.now() + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        
        reservation_data = {
            "vehicle_id": self.created_vehicle_id,
            "customer_id": self.created_customer_id,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "pickup_location": "İstanbul Havalimanı",
            "return_location": "Sabiha Gökçen Havalimanı",
            "notes": "Test rezervasyon"
        }
        
        status, data = self.make_request('POST', 'reservations', reservation_data, use_admin_auth=True)
        success = status == 200 and "id" in data
        
        if success:
            self.created_reservation_id = data["id"]
            self.log_test("Create reservation", True)
            
            # Test list reservations
            status, reservations = self.make_request('GET', 'reservations', use_admin_auth=True)
            success = status == 200 and isinstance(reservations, list)
            self.log_test("List reservations", success)
            
            # Test get single reservation
            status, reservation = self.make_request('GET', f'reservations/{self.created_reservation_id}', use_admin_auth=True)
            success = status == 200 and reservation.get("id") == self.created_reservation_id
            self.log_test("Get single reservation", success)
            
        else:
            self.log_test("Create reservation", False, f"Status: {status}, Response: {data}")

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        if not self.admin_token:
            self.log_test("Dashboard stats", False, "No admin token available")
            return
            
        print("\n🔍 Testing Dashboard Statistics...")
        
        status, data = self.make_request('GET', 'dashboard/stats', use_admin_auth=True)
        success = status == 200 and "total_vehicles" in data
        
        if success:
            stats = data
            self.log_test("Dashboard stats", True, 
                         f"Vehicles: {stats.get('total_vehicles', 0)}, "
                         f"Customers: {stats.get('total_customers', 0)}, "
                         f"Reservations: {stats.get('active_reservations', 0)}")
        else:
            self.log_test("Dashboard stats", False, f"Status: {status}")

    def test_error_handling(self):
        """Test error handling for invalid requests"""
        print("\n🔍 Testing Error Handling...")
        
        # Test invalid endpoint
        status, data = self.make_request('GET', 'invalid/endpoint')
        success = status == 404
        self.log_test("Invalid endpoint returns 404", success)
        
        # Test unauthorized access
        status, data = self.make_request('GET', 'vehicles')
        success = status == 401 or status == 403
        self.log_test("Unauthorized access blocked", success)
        
        # Test invalid vehicle ID
        status, data = self.make_request('GET', 'public/vehicles/invalid-id')
        success = status == 404
        self.log_test("Invalid vehicle ID returns 404", success)

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting FleetEase Backend API Tests...")
        print(f"🌐 Testing against: {self.base_url}")
        
        try:
            # Core functionality tests
            self.test_health_check()
            self.test_admin_auth()
            self.test_public_vehicles_api()
            
            # Admin functionality tests
            self.test_admin_vehicle_management()
            self.test_customer_management()
            self.test_reservation_flow()
            self.test_dashboard_stats()
            
            # Customer functionality tests
            self.test_customer_auth_flow()
            
            # Error handling tests
            self.test_error_handling()
            
        except Exception as e:
            print(f"❌ Test suite failed with error: {str(e)}")
            self.log_test("Test suite execution", False, str(e))
        
        # Print summary
        print(f"\n📊 Test Results Summary:")
        print(f"   Total Tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "   Success Rate: 0%")
        
        # Save detailed results
        results = {
            "summary": {
                "total_tests": self.tests_run,
                "passed_tests": self.tests_passed,
                "failed_tests": self.tests_run - self.tests_passed,
                "success_rate": (self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0,
                "test_timestamp": datetime.now().isoformat()
            },
            "test_results": self.test_results
        }
        
        with open('/app/test_reports/backend_test_results.json', 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = FleetEaseAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  Some tests failed. Check results above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())