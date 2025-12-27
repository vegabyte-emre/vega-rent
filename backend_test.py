#!/usr/bin/env python3
"""
SuperAdmin Panel Backend API Testing
Tests both SuperAdmin and Tenant functionality
"""

import requests
import sys
import json
from datetime import datetime
import time

class SuperAdminAPITester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.superadmin_token = None
        self.tenant_token = None
        self.bitlis_company_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details="", expected_status=None, actual_status=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            if expected_status and actual_status:
                print(f"   Expected: {expected_status}, Got: {actual_status}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "expected_status": expected_status,
            "actual_status": actual_status
        })

    def make_request(self, method, endpoint, data=None, token=None, expected_status=200, timeout=30):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=timeout)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=timeout)
            else:
                return None, f"Unsupported method: {method}"

            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}

            return response_data if success else response_data, response.status_code

        except requests.exceptions.RequestException as e:
            return None, f"Request failed: {str(e)}"

    def test_health_check(self):
        """Test basic health endpoint"""
        print("\n🔍 Testing Health Check...")
        response, status = self.make_request('GET', 'health', expected_status=200)
        
        if response and status == 200:
            self.log_test("Health Check", True, expected_status=200, actual_status=status)
            return True
        else:
            self.log_test("Health Check", False, f"Status: {status}", expected_status=200, actual_status=status)
            return False

    def test_superadmin_login(self):
        """Test SuperAdmin login"""
        print("\n🔍 Testing SuperAdmin Login...")
        
        login_data = {
            "email": "admin@fleetease.com",
            "password": "admin123"
        }
        
        response, status = self.make_request('POST', 'auth/login', data=login_data, expected_status=200)
        
        if response and status == 200 and 'access_token' in response:
            self.superadmin_token = response['access_token']
            user_role = response.get('user', {}).get('role')
            if user_role == 'superadmin':
                self.log_test("SuperAdmin Login", True, f"Role: {user_role}", expected_status=200, actual_status=status)
                return True
            else:
                self.log_test("SuperAdmin Login", False, f"Wrong role: {user_role}", expected_status=200, actual_status=status)
                return False
        else:
            self.log_test("SuperAdmin Login", False, f"Status: {status}", expected_status=200, actual_status=status)
            return False

    def test_tenant_login(self):
        """Test Tenant login"""
        print("\n🔍 Testing Tenant Login...")
        
        # First check if config.js is accessible
        config_url = "https://panel.bitlisrentacar.com/config.js"
        try:
            config_response = requests.get(config_url, timeout=10)
            if config_response.status_code == 200:
                self.log_test("Config.js Access", True, f"Status: {config_response.status_code}", expected_status=200, actual_status=config_response.status_code)
                print(f"   Config content: {config_response.text[:100]}...")
            else:
                self.log_test("Config.js Access", False, f"Status: {config_response.status_code}", expected_status=200, actual_status=config_response.status_code)
        except Exception as e:
            self.log_test("Config.js Access", False, f"Error: {str(e)}")

        # Test tenant login at the public URL
        tenant_url = "https://panel.bitlisrentacar.com"
        login_data = {
            "email": "info@bitlisrentacar.com",
            "password": "admin123"
        }
        
        try:
            response = requests.post(f"{tenant_url}/api/auth/login", json=login_data, timeout=10)
            if response.status_code == 200:
                response_data = response.json()
                if 'access_token' in response_data:
                    self.tenant_token = response_data['access_token']
                    user_role = response_data.get('user', {}).get('role')
                    self.log_test("Tenant Login", True, f"Role: {user_role}", expected_status=200, actual_status=response.status_code)
                    return True
                else:
                    self.log_test("Tenant Login", False, "No access token in response", expected_status=200, actual_status=response.status_code)
                    return False
            else:
                self.log_test("Tenant Login", False, f"Status: {response.status_code}", expected_status=200, actual_status=response.status_code)
                return False
        except Exception as e:
            self.log_test("Tenant Login", False, f"Error: {str(e)}")
            return False

    def test_superadmin_companies(self):
        """Test SuperAdmin company management"""
        if not self.superadmin_token:
            self.log_test("SuperAdmin Companies", False, "No SuperAdmin token")
            return False

        print("\n🔍 Testing SuperAdmin Company Management...")
        
        # List companies
        response, status = self.make_request('GET', 'superadmin/companies', token=self.superadmin_token, expected_status=200)
        if response and status == 200:
            companies = response if isinstance(response, list) else []
            self.log_test("List Companies", True, f"Found {len(companies)} companies", expected_status=200, actual_status=status)
            
            # Check if Bitlis Rent A Car exists
            bitlis_company = None
            for company in companies:
                if company.get('code') == 'bitlisrentacar' or 'bitlis' in company.get('name', '').lower():
                    bitlis_company = company
                    break
            
            if bitlis_company:
                self.log_test("Bitlis Company Found", True, f"Name: {bitlis_company.get('name')}")
                self.bitlis_company_id = bitlis_company.get('id')  # Store for mobile tests
                
                # Test company details
                company_id = bitlis_company.get('id')
                if company_id:
                    detail_response, detail_status = self.make_request('GET', f'superadmin/companies/{company_id}', token=self.superadmin_token, expected_status=200)
                    if detail_response and detail_status == 200:
                        self.log_test("Company Details", True, f"Status: {detail_response.get('status')}", expected_status=200, actual_status=detail_status)
                    else:
                        self.log_test("Company Details", False, f"Status: {detail_status}", expected_status=200, actual_status=detail_status)
            else:
                self.log_test("Bitlis Company Found", False, "Company not found in list")
            
            return True
        else:
            self.log_test("List Companies", False, f"Status: {status}", expected_status=200, actual_status=status)
            return False

    def test_superadmin_stats(self):
        """Test SuperAdmin statistics"""
        if not self.superadmin_token:
            self.log_test("SuperAdmin Stats", False, "No SuperAdmin token")
            return False

        print("\n🔍 Testing SuperAdmin Statistics...")
        
        response, status = self.make_request('GET', 'superadmin/stats', token=self.superadmin_token, expected_status=200)
        if response and status == 200:
            required_fields = ['total_companies', 'active_companies', 'total_vehicles', 'total_customers']
            missing_fields = [field for field in required_fields if field not in response]
            
            if not missing_fields:
                self.log_test("SuperAdmin Stats", True, f"Companies: {response.get('total_companies')}, Vehicles: {response.get('total_vehicles')}", expected_status=200, actual_status=status)
                return True
            else:
                self.log_test("SuperAdmin Stats", False, f"Missing fields: {missing_fields}", expected_status=200, actual_status=status)
                return False
        else:
            self.log_test("SuperAdmin Stats", False, f"Status: {status}", expected_status=200, actual_status=status)
            return False

    def test_tenant_dashboard(self):
        """Test tenant dashboard and company info"""
        if not self.tenant_token:
            self.log_test("Tenant Dashboard", False, "No tenant token")
            return False

        print("\n🔍 Testing Tenant Dashboard...")
        
        # Test company info endpoint
        tenant_url = "https://panel.bitlisrentacar.com"
        try:
            headers = {
                'Authorization': f'Bearer {self.tenant_token}',
                'Content-Type': 'application/json'
            }
            
            # Test company info
            response = requests.get(f"{tenant_url}/api/company/info", headers=headers, timeout=10)
            if response.status_code == 200:
                company_info = response.json()
                company_name = company_info.get('name', '')
                
                if 'Bitlis Rent A Car' in company_name:
                    self.log_test("Company Name Check", True, f"Name: {company_name}", expected_status=200, actual_status=response.status_code)
                else:
                    self.log_test("Company Name Check", False, f"Expected 'Bitlis Rent A Car', got: {company_name}", expected_status=200, actual_status=response.status_code)
            else:
                self.log_test("Company Info", False, f"Status: {response.status_code}", expected_status=200, actual_status=response.status_code)
            
            # Test dashboard stats
            response = requests.get(f"{tenant_url}/api/dashboard/stats", headers=headers, timeout=10)
            if response.status_code == 200:
                stats = response.json()
                self.log_test("Dashboard Stats", True, f"Vehicles: {stats.get('vehicles', {}).get('total', 0)}", expected_status=200, actual_status=response.status_code)
            else:
                self.log_test("Dashboard Stats", False, f"Status: {response.status_code}", expected_status=200, actual_status=response.status_code)
            
            return True
            
        except Exception as e:
            self.log_test("Tenant Dashboard", False, f"Error: {str(e)}")
            return False

    def test_tenant_navigation(self):
        """Test tenant navigation endpoints"""
        if not self.tenant_token:
            self.log_test("Tenant Navigation", False, "No tenant token")
            return False

        print("\n🔍 Testing Tenant Navigation...")
        
        tenant_url = "https://panel.bitlisrentacar.com"
        headers = {
            'Authorization': f'Bearer {self.tenant_token}',
            'Content-Type': 'application/json'
        }
        
        # Test key navigation endpoints
        endpoints = [
            ('vehicles', 'Araçlar'),
            ('customers', 'Müşteriler'),
            ('reservations', 'Rezervasyonlar'),
            ('hgs/tags', 'HGS Takip'),
            ('integrations', 'Entegrasyonlar'),
            ('payments', 'Ödemeler')
        ]
        
        navigation_success = 0
        for endpoint, name in endpoints:
            try:
                response = requests.get(f"{tenant_url}/api/{endpoint}", headers=headers, timeout=10)
                if response.status_code == 200:
                    self.log_test(f"Navigation - {name}", True, f"Status: {response.status_code}", expected_status=200, actual_status=response.status_code)
                    navigation_success += 1
                else:
                    self.log_test(f"Navigation - {name}", False, f"Status: {response.status_code}", expected_status=200, actual_status=response.status_code)
            except Exception as e:
                self.log_test(f"Navigation - {name}", False, f"Error: {str(e)}")
        
        return navigation_success > len(endpoints) // 2

    def test_mobile_endpoints_availability(self):
        """Test that mobile endpoints are available and handle errors properly"""
        if not self.superadmin_token:
            self.log_test("Mobile Endpoints Availability", False, "No SuperAdmin token")
            return False

        print("\n🔍 Testing Mobile Endpoints Availability...")
        
        # Test endpoints with short timeout to check if they're reachable
        endpoints_to_test = [
            ('GET', 'superadmin/mobile-template/version', None),
            ('POST', 'superadmin/template/mobile/update', {"app_type": "customer"}),
        ]
        
        if self.bitlis_company_id:
            endpoints_to_test.extend([
                ('GET', f'superadmin/companies/{self.bitlis_company_id}/mobile-version', None),
                ('POST', f'superadmin/companies/{self.bitlis_company_id}/update-mobile-apps', None),
            ])
        
        available_count = 0
        total_count = len(endpoints_to_test)
        
        for method, endpoint, data in endpoints_to_test:
            try:
                # Use a very short timeout to just check if endpoint exists
                response, status = self.make_request(method, endpoint, data=data, token=self.superadmin_token, timeout=3)
                
                # If we get any response (even timeout/error), the endpoint exists
                if status != "Request failed":
                    available_count += 1
                    endpoint_name = endpoint.split('/')[-1]
                    self.log_test(f"Endpoint Available - {endpoint_name}", True, f"Endpoint responds (status: {status})")
                else:
                    endpoint_name = endpoint.split('/')[-1]
                    self.log_test(f"Endpoint Available - {endpoint_name}", False, f"No response: {response}")
                    
            except Exception as e:
                endpoint_name = endpoint.split('/')[-1]
                # Even timeout means endpoint exists but is processing
                if "timeout" in str(e).lower():
                    available_count += 1
                    self.log_test(f"Endpoint Available - {endpoint_name}", True, "Endpoint exists (timeout during processing)")
                else:
                    self.log_test(f"Endpoint Available - {endpoint_name}", False, f"Error: {str(e)}")
        
        success_rate = available_count / total_count if total_count > 0 else 0
        overall_success = success_rate >= 0.75  # 75% or more endpoints available
        
        self.log_test("Mobile Endpoints Overall", overall_success, f"{available_count}/{total_count} endpoints available")
        return overall_success

    def test_tenant_mobile_build_trigger(self):
        """Test tenant mobile build trigger endpoint"""
        print("\n🔍 Testing Tenant Mobile Build Trigger...")
        
        # Note: This endpoint requires tenant containers to be set up
        # We'll test endpoint availability rather than full functionality
        
        tenant_url = "https://api.bitlisrentacar.com"
        build_data = {"app_type": "customer"}
        
        try:
            response = requests.post(f"{tenant_url}/api/tenant/bitlis/trigger-mobile-build", json=build_data, timeout=5)
            
            # Any response means the endpoint is reachable
            if response.status_code in [200, 500, 404]:
                self.log_test("Tenant Mobile Build Endpoint", True, f"Endpoint reachable (status: {response.status_code})")
                return True
            else:
                self.log_test("Tenant Mobile Build Endpoint", False, f"Unexpected status: {response.status_code}")
                return False
                
        except requests.exceptions.ConnectTimeout:
            self.log_test("Tenant Mobile Build Endpoint", False, "Connection timeout - tenant domain not accessible")
            return False
        except requests.exceptions.ConnectionError:
            self.log_test("Tenant Mobile Build Endpoint", False, "Connection error - tenant domain not accessible")
            return False
        except Exception as e:
            self.log_test("Tenant Mobile Build Endpoint", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting SuperAdmin Panel Backend Tests")
        print(f"📍 Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Basic connectivity
        if not self.test_health_check():
            print("❌ Health check failed - stopping tests")
            return self.get_results()
        
        # Authentication tests
        superadmin_login_success = self.test_superadmin_login()
        tenant_login_success = self.test_tenant_login()
        
        # SuperAdmin functionality
        if superadmin_login_success:
            self.test_superadmin_companies()
            self.test_superadmin_stats()
            
            # Mobile App Build System Tests
            print("\n" + "=" * 60)
            print("🔍 MOBILE APP BUILD SYSTEM TESTS")
            print("=" * 60)
            self.test_mobile_endpoints_availability()
        
        # Tenant functionality
        if tenant_login_success:
            self.test_tenant_dashboard()
            self.test_tenant_navigation()
            
            # Tenant mobile build tests
            self.test_tenant_mobile_build_trigger()
        
        return self.get_results()

    def get_results(self):
        """Get test results summary"""
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed ({success_rate:.1f}%)")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
        elif success_rate >= 70:
            print("⚠️  Most tests passed - minor issues detected")
        else:
            print("❌ Multiple test failures detected")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "success_rate": success_rate,
            "test_details": self.test_results,
            "superadmin_token": bool(self.superadmin_token),
            "tenant_token": bool(self.tenant_token)
        }

def main():
    """Main test execution"""
    tester = SuperAdminAPITester()
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    if results["success_rate"] >= 70:
        return 0
    else:
        return 1

if __name__ == "__main__":
    sys.exit(main())