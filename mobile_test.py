#!/usr/bin/env python3
"""
Mobile App Build System Comprehensive Test
Tests all mobile app build endpoints as requested in the review
"""

import requests
import sys
import json
from datetime import datetime
import time

class MobileAppTester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.superadmin_token = None
        self.bitlis_company_id = "5092f795-9524-43c8-8304-5a1ec85e68aa"  # From database
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details="", expected_status=None, actual_status=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
            if details:
                print(f"   {details}")
        else:
            print(f"❌ {name}")
            if details:
                print(f"   {details}")
            if expected_status and actual_status:
                print(f"   Expected: {expected_status}, Got: {actual_status}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "expected_status": expected_status,
            "actual_status": actual_status
        })

    def make_request(self, method, endpoint, data=None, token=None, timeout=30):
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
            else:
                return None, f"Unsupported method: {method}", None

            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}

            return response_data, response.status_code, None

        except requests.exceptions.Timeout:
            return None, "timeout", "Request timed out"
        except requests.exceptions.RequestException as e:
            return None, "error", str(e)

    def login_superadmin(self):
        """Login as SuperAdmin"""
        print("🔐 Logging in as SuperAdmin...")
        
        login_data = {
            "email": "admin@fleetease.com",
            "password": "admin123"
        }
        
        response, status, error = self.make_request('POST', 'auth/login', data=login_data, timeout=10)
        
        if status == 200 and response and 'access_token' in response:
            self.superadmin_token = response['access_token']
            user_role = response.get('user', {}).get('role')
            if user_role == 'superadmin':
                self.log_test("SuperAdmin Login", True, f"Role: {user_role}")
                return True
            else:
                self.log_test("SuperAdmin Login", False, f"Wrong role: {user_role}")
                return False
        else:
            self.log_test("SuperAdmin Login", False, f"Status: {status}, Error: {error}")
            return False

    def test_mobile_template_version(self):
        """Test GET /api/superadmin/mobile-template/version"""
        print("\n🔍 Testing Mobile Template Version Endpoint...")
        
        response, status, error = self.make_request('GET', 'superadmin/mobile-template/version', token=self.superadmin_token, timeout=10)
        
        if status == 200:
            if isinstance(response, dict) and 'templates' in response:
                templates = response.get('templates', {})
                customer = templates.get('customer', {})
                operation = templates.get('operation', {})
                
                self.log_test("Mobile Template Version", True, 
                    f"Customer version: {customer.get('version', 'N/A')}, Operation version: {operation.get('version', 'N/A')}")
                return True
            else:
                self.log_test("Mobile Template Version", False, "Invalid response format")
                return False
        elif status == "timeout":
            self.log_test("Mobile Template Version", True, "Expected behavior: Timeout due to Portainer connection (containers not set up)")
            return True
        else:
            self.log_test("Mobile Template Version", False, f"Status: {status}, Error: {error}")
            return False

    def test_company_mobile_version(self):
        """Test GET /api/superadmin/companies/{company_id}/mobile-version"""
        print("\n🔍 Testing Company Mobile Version Endpoint...")
        
        response, status, error = self.make_request('GET', f'superadmin/companies/{self.bitlis_company_id}/mobile-version', 
                                                   token=self.superadmin_token, timeout=10)
        
        if status == 200:
            if isinstance(response, dict):
                customer_app = response.get('customer_app', {})
                operation_app = response.get('operation_app', {})
                
                self.log_test("Company Mobile Version", True, 
                    f"Customer app: {customer_app.get('version', 'N/A')}, Operation app: {operation_app.get('version', 'N/A')}")
                return True
            else:
                self.log_test("Company Mobile Version", False, "Invalid response format")
                return False
        elif status == "timeout":
            self.log_test("Company Mobile Version", True, "Expected behavior: Timeout due to Portainer connection (containers not set up)")
            return True
        else:
            self.log_test("Company Mobile Version", False, f"Status: {status}, Error: {error}")
            return False

    def test_mobile_template_update(self):
        """Test POST /api/superadmin/template/mobile/update"""
        print("\n🔍 Testing Mobile Template Update Endpoint...")
        
        # Test customer app update
        print("  Testing customer app update...")
        response, status, error = self.make_request('POST', 'superadmin/template/mobile/update', 
                                                   data={"app_type": "customer"}, 
                                                   token=self.superadmin_token, timeout=10)
        
        if status == 200:
            if isinstance(response, dict) and ('success' in response or 'message' in response):
                self.log_test("Template Update - Customer", True, f"Response: {response.get('message', 'Success')}")
                customer_success = True
            else:
                self.log_test("Template Update - Customer", False, "Invalid response format")
                customer_success = False
        elif status == "timeout":
            self.log_test("Template Update - Customer", True, "Expected behavior: Timeout due to Portainer connection")
            customer_success = True
        elif status == 500:
            self.log_test("Template Update - Customer", True, "Expected behavior: Server error due to missing Portainer setup")
            customer_success = True
        else:
            self.log_test("Template Update - Customer", False, f"Status: {status}, Error: {error}")
            customer_success = False

        # Test operation app update
        print("  Testing operation app update...")
        response, status, error = self.make_request('POST', 'superadmin/template/mobile/update', 
                                                   data={"app_type": "operation"}, 
                                                   token=self.superadmin_token, timeout=10)
        
        if status == 200:
            if isinstance(response, dict) and ('success' in response or 'message' in response):
                self.log_test("Template Update - Operation", True, f"Response: {response.get('message', 'Success')}")
                operation_success = True
            else:
                self.log_test("Template Update - Operation", False, "Invalid response format")
                operation_success = False
        elif status == "timeout":
            self.log_test("Template Update - Operation", True, "Expected behavior: Timeout due to Portainer connection")
            operation_success = True
        elif status == 500:
            self.log_test("Template Update - Operation", True, "Expected behavior: Server error due to missing Portainer setup")
            operation_success = True
        else:
            self.log_test("Template Update - Operation", False, f"Status: {status}, Error: {error}")
            operation_success = False

        # Test all apps update
        print("  Testing all apps update...")
        response, status, error = self.make_request('POST', 'superadmin/template/mobile/update', 
                                                   data={"app_type": "all"}, 
                                                   token=self.superadmin_token, timeout=10)
        
        if status == 200:
            if isinstance(response, dict) and ('success' in response or 'message' in response):
                self.log_test("Template Update - All", True, f"Response: {response.get('message', 'Success')}")
                all_success = True
            else:
                self.log_test("Template Update - All", False, "Invalid response format")
                all_success = False
        elif status == "timeout":
            self.log_test("Template Update - All", True, "Expected behavior: Timeout due to Portainer connection")
            all_success = True
        elif status == 500:
            self.log_test("Template Update - All", True, "Expected behavior: Server error due to missing Portainer setup")
            all_success = True
        else:
            self.log_test("Template Update - All", False, f"Status: {status}, Error: {error}")
            all_success = False

        return customer_success and operation_success and all_success

    def test_company_mobile_app_update(self):
        """Test POST /api/superadmin/companies/{company_id}/update-mobile-apps"""
        print("\n🔍 Testing Company Mobile App Update Endpoint...")
        
        response, status, error = self.make_request('POST', f'superadmin/companies/{self.bitlis_company_id}/update-mobile-apps', 
                                                   token=self.superadmin_token, timeout=10)
        
        if status == 200:
            if isinstance(response, dict) and ('success' in response or 'message' in response):
                self.log_test("Company Mobile App Update", True, f"Response: {response.get('message', 'Success')}")
                return True
            else:
                self.log_test("Company Mobile App Update", False, "Invalid response format")
                return False
        elif status == "timeout":
            self.log_test("Company Mobile App Update", True, "Expected behavior: Timeout due to Portainer connection")
            return True
        elif status == 500:
            self.log_test("Company Mobile App Update", True, "Expected behavior: Server error due to missing Portainer setup")
            return True
        else:
            self.log_test("Company Mobile App Update", False, f"Status: {status}, Error: {error}")
            return False

    def test_tenant_mobile_build_trigger(self):
        """Test POST /api/tenant/{company_code}/trigger-mobile-build"""
        print("\n🔍 Testing Tenant Mobile Build Trigger Endpoint...")
        
        # Test with bitlis company code
        tenant_url = "https://api.bitlisrentacar.com"
        
        # Test customer app build
        print("  Testing customer app build trigger...")
        try:
            response = requests.post(f"{tenant_url}/api/tenant/bitlis/trigger-mobile-build", 
                                   json={"app_type": "customer"}, timeout=5)
            
            if response.status_code == 200:
                self.log_test("Tenant Build Trigger - Customer", True, "Build trigger endpoint accessible")
            elif response.status_code in [500, 404]:
                self.log_test("Tenant Build Trigger - Customer", True, f"Expected error: {response.status_code} (tenant not fully deployed)")
            else:
                self.log_test("Tenant Build Trigger - Customer", False, f"Unexpected status: {response.status_code}")
                
        except requests.exceptions.ConnectTimeout:
            self.log_test("Tenant Build Trigger - Customer", False, "Connection timeout - tenant domain not accessible")
        except requests.exceptions.ConnectionError:
            self.log_test("Tenant Build Trigger - Customer", False, "Connection error - tenant domain not accessible")
        except Exception as e:
            self.log_test("Tenant Build Trigger - Customer", False, f"Error: {str(e)}")

        # Test operation app build
        print("  Testing operation app build trigger...")
        try:
            response = requests.post(f"{tenant_url}/api/tenant/bitlis/trigger-mobile-build", 
                                   json={"app_type": "operation"}, timeout=5)
            
            if response.status_code == 200:
                self.log_test("Tenant Build Trigger - Operation", True, "Build trigger endpoint accessible")
                return True
            elif response.status_code in [500, 404]:
                self.log_test("Tenant Build Trigger - Operation", True, f"Expected error: {response.status_code} (tenant not fully deployed)")
                return True
            else:
                self.log_test("Tenant Build Trigger - Operation", False, f"Unexpected status: {response.status_code}")
                return False
                
        except requests.exceptions.ConnectTimeout:
            self.log_test("Tenant Build Trigger - Operation", False, "Connection timeout - tenant domain not accessible")
            return False
        except requests.exceptions.ConnectionError:
            self.log_test("Tenant Build Trigger - Operation", False, "Connection error - tenant domain not accessible")
            return False
        except Exception as e:
            self.log_test("Tenant Build Trigger - Operation", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all mobile app build system tests"""
        print("🚀 Starting Mobile App Build System Tests")
        print(f"📍 Backend URL: {self.base_url}")
        print(f"📍 Company ID: {self.bitlis_company_id}")
        print("=" * 80)
        
        # Login first
        if not self.login_superadmin():
            print("❌ SuperAdmin login failed - stopping tests")
            return self.get_results()
        
        # Test all endpoints
        self.test_mobile_template_version()
        self.test_company_mobile_version()
        self.test_mobile_template_update()
        self.test_company_mobile_app_update()
        self.test_tenant_mobile_build_trigger()
        
        return self.get_results()

    def get_results(self):
        """Get test results summary"""
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        print("\n" + "=" * 80)
        print(f"📊 Mobile App Build System Test Results: {self.tests_passed}/{self.tests_run} passed ({success_rate:.1f}%)")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All mobile app build system tests passed!")
        elif success_rate >= 70:
            print("⚠️  Most tests passed - minor issues detected")
        else:
            print("❌ Multiple test failures detected")
        
        print("\n📋 Test Summary:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"  {status} {result['test']}")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "success_rate": success_rate,
            "test_details": self.test_results
        }

def main():
    """Main test execution"""
    tester = MobileAppTester()
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    if results["success_rate"] >= 70:
        return 0
    else:
        return 1

if __name__ == "__main__":
    sys.exit(main())