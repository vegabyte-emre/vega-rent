#!/usr/bin/env python3
"""
FleetEase SuperAdmin Backend API Test Suite
Tests SuperAdmin specific functionality including company management
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class SuperAdminAPITester:
    def __init__(self, base_url: str = "https://carfleet-hub-5.preview.emergentagent.com"):
        self.base_url = base_url
        self.superadmin_token = None
        self.firma_admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.created_company_id = None
        self.created_admin_email = None

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
                    use_superadmin_auth: bool = False, use_firma_auth: bool = False) -> tuple:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if use_superadmin_auth and self.superadmin_token:
            headers['Authorization'] = f'Bearer {self.superadmin_token}'
        elif use_firma_auth and self.firma_admin_token:
            headers['Authorization'] = f'Bearer {self.firma_admin_token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, headers=headers, timeout=30)
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

    def test_superadmin_login(self):
        """Test SuperAdmin authentication"""
        print("\n🔍 Testing SuperAdmin Authentication...")
        
        # Test SuperAdmin login with provided credentials
        login_data = {
            "email": "admin@fleetease.com",
            "password": "admin123"
        }
        
        status, data = self.make_request('POST', 'auth/login', login_data)
        success = status == 200 and "access_token" in data
        
        if success:
            self.superadmin_token = data["access_token"]
            user_role = data.get("user", {}).get("role")
            if user_role == "superadmin":
                self.log_test("SuperAdmin login", True, f"Role: {user_role}")
                
                # Test get current user
                status, user_data = self.make_request('GET', 'auth/me', use_superadmin_auth=True)
                success = status == 200 and user_data.get("role") == "superadmin"
                self.log_test("Get current SuperAdmin user", success, f"Role: {user_data.get('role', 'unknown')}")
            else:
                self.log_test("SuperAdmin login", False, f"Expected superadmin role, got: {user_role}")
        else:
            self.log_test("SuperAdmin login", False, f"Status: {status}, Response: {data}")

    def test_superadmin_stats(self):
        """Test SuperAdmin platform statistics"""
        if not self.superadmin_token:
            self.log_test("SuperAdmin stats", False, "No SuperAdmin token available")
            return
            
        print("\n🔍 Testing SuperAdmin Platform Statistics...")
        
        status, data = self.make_request('GET', 'superadmin/stats', use_superadmin_auth=True)
        success = status == 200 and isinstance(data, dict)
        
        if success:
            required_fields = ['total_companies', 'active_companies', 'pending_companies', 
                             'total_vehicles', 'total_customers', 'total_reservations', 'total_users']
            
            all_fields_present = all(field in data for field in required_fields)
            
            if all_fields_present:
                self.log_test("SuperAdmin stats API", True, 
                             f"Companies: {data.get('total_companies', 0)}, "
                             f"Active: {data.get('active_companies', 0)}, "
                             f"Users: {data.get('total_users', 0)}")
            else:
                missing_fields = [field for field in required_fields if field not in data]
                self.log_test("SuperAdmin stats API", False, f"Missing fields: {missing_fields}")
        else:
            self.log_test("SuperAdmin stats API", False, f"Status: {status}, Response: {data}")

    def test_company_creation(self):
        """Test company creation via SuperAdmin"""
        if not self.superadmin_token:
            self.log_test("Company creation", False, "No SuperAdmin token available")
            return
            
        print("\n🔍 Testing Company Creation...")
        
        # Generate unique company data
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        self.created_admin_email = f"admin@testcompany{timestamp}.com"
        
        company_data = {
            "name": f"Test Company {timestamp}",
            "code": f"test{timestamp}",
            "subdomain": f"test{timestamp}",
            "domain": f"testcompany{timestamp}.com",
            "address": "Test Address, Istanbul",
            "phone": "0212 123 4567",
            "email": f"info@testcompany{timestamp}.com",
            "tax_number": f"123456789{timestamp[-1]}",
            "subscription_plan": "free",
            "admin_email": self.created_admin_email,
            "admin_password": "testadmin123",
            "admin_full_name": "Test Admin User"
        }
        
        status, data = self.make_request('POST', 'superadmin/companies', company_data, use_superadmin_auth=True)
        success = status == 200 and "id" in data
        
        if success:
            self.created_company_id = data["id"]
            self.log_test("Create company", True, f"Company ID: {self.created_company_id}")
            
            # Verify company data
            expected_fields = ['id', 'name', 'code', 'subdomain', 'status', 'subscription_plan', 'admin_email']
            all_fields_present = all(field in data for field in expected_fields)
            
            if all_fields_present:
                self.log_test("Company data structure", True, f"Status: {data.get('status')}")
            else:
                missing_fields = [field for field in expected_fields if field not in data]
                self.log_test("Company data structure", False, f"Missing fields: {missing_fields}")
                
        else:
            self.log_test("Create company", False, f"Status: {status}, Response: {data}")

    def test_company_listing(self):
        """Test company listing via SuperAdmin"""
        if not self.superadmin_token:
            self.log_test("Company listing", False, "No SuperAdmin token available")
            return
            
        print("\n🔍 Testing Company Listing...")
        
        status, data = self.make_request('GET', 'superadmin/companies', use_superadmin_auth=True)
        success = status == 200 and isinstance(data, list)
        
        if success:
            company_count = len(data)
            self.log_test("List companies", True, f"Found {company_count} companies")
            
            # Check if our created company is in the list
            if self.created_company_id and company_count > 0:
                created_company_found = any(c.get("id") == self.created_company_id for c in data)
                self.log_test("Created company in list", created_company_found)
                
                # Verify company data structure
                if data:
                    sample_company = data[0]
                    required_fields = ['id', 'name', 'code', 'status', 'created_at', 'vehicle_count', 'customer_count']
                    all_fields_present = all(field in sample_company for field in required_fields)
                    self.log_test("Company list data structure", all_fields_present)
            
        else:
            self.log_test("List companies", False, f"Status: {status}, Response: {data}")

    def test_company_details(self):
        """Test getting company details"""
        if not self.superadmin_token or not self.created_company_id:
            self.log_test("Company details", False, "No SuperAdmin token or company ID available")
            return
            
        print("\n🔍 Testing Company Details...")
        
        status, data = self.make_request('GET', f'superadmin/companies/{self.created_company_id}', use_superadmin_auth=True)
        success = status == 200 and data.get("id") == self.created_company_id
        
        if success:
            self.log_test("Get company details", True, f"Name: {data.get('name')}")
            
            # Verify detailed data structure
            required_fields = ['id', 'name', 'code', 'subdomain', 'status', 'subscription_plan', 
                             'vehicle_count', 'customer_count', 'admin_email', 'created_at']
            all_fields_present = all(field in data for field in required_fields)
            self.log_test("Company details data structure", all_fields_present)
            
        else:
            self.log_test("Get company details", False, f"Status: {status}, Response: {data}")

    def test_company_status_change(self):
        """Test company status management"""
        if not self.superadmin_token or not self.created_company_id:
            self.log_test("Company status change", False, "No SuperAdmin token or company ID available")
            return
            
        print("\n🔍 Testing Company Status Management...")
        
        # Test activate company
        status, data = self.make_request('PATCH', f'superadmin/companies/{self.created_company_id}/status?status=active', 
                                       use_superadmin_auth=True)
        success = status == 200 and data.get("status") == "active"
        self.log_test("Activate company", success, f"Response: {data}")
        
        # Test suspend company
        status, data = self.make_request('PATCH', f'superadmin/companies/{self.created_company_id}/status?status=suspended', 
                                       use_superadmin_auth=True)
        success = status == 200 and data.get("status") == "suspended"
        self.log_test("Suspend company", success, f"Response: {data}")
        
        # Reactivate for further tests
        status, data = self.make_request('PATCH', f'superadmin/companies/{self.created_company_id}/status?status=active', 
                                       use_superadmin_auth=True)
        success = status == 200 and data.get("status") == "active"
        self.log_test("Reactivate company", success)

    def test_firma_admin_login(self):
        """Test auto-created Firma Admin login"""
        if not self.created_admin_email:
            self.log_test("Firma Admin login", False, "No admin email available")
            return
            
        print("\n🔍 Testing Auto-Created Firma Admin Login...")
        
        # Test login with auto-created admin credentials
        login_data = {
            "email": self.created_admin_email,
            "password": "testadmin123"
        }
        
        status, data = self.make_request('POST', 'auth/login', login_data)
        success = status == 200 and "access_token" in data
        
        if success:
            self.firma_admin_token = data["access_token"]
            user_role = data.get("user", {}).get("role")
            company_id = data.get("user", {}).get("company_id")
            
            if user_role == "firma_admin" and company_id == self.created_company_id:
                self.log_test("Firma Admin login", True, f"Role: {user_role}, Company: {company_id}")
                
                # Test get current user
                status, user_data = self.make_request('GET', 'auth/me', use_firma_auth=True)
                success = status == 200 and user_data.get("role") == "firma_admin"
                self.log_test("Get current Firma Admin user", success, f"Company ID: {user_data.get('company_id')}")
            else:
                self.log_test("Firma Admin login", False, f"Expected firma_admin role with company {self.created_company_id}, got: {user_role}, {company_id}")
        else:
            self.log_test("Firma Admin login", False, f"Status: {status}, Response: {data}")

    def test_role_based_access_control(self):
        """Test role-based access control"""
        print("\n🔍 Testing Role-Based Access Control...")
        
        # Test Firma Admin cannot access SuperAdmin endpoints
        if self.firma_admin_token:
            status, data = self.make_request('GET', 'superadmin/stats', use_firma_auth=True)
            success = status == 403  # Should be forbidden
            self.log_test("Firma Admin blocked from SuperAdmin stats", success, f"Status: {status}")
            
            status, data = self.make_request('GET', 'superadmin/companies', use_firma_auth=True)
            success = status == 403  # Should be forbidden
            self.log_test("Firma Admin blocked from SuperAdmin companies", success, f"Status: {status}")
        
        # Test unauthenticated access to SuperAdmin endpoints
        status, data = self.make_request('GET', 'superadmin/stats')
        success = status == 401  # Should be unauthorized
        self.log_test("Unauthenticated access blocked from SuperAdmin stats", success, f"Status: {status}")

    def test_company_deletion(self):
        """Test company deletion (soft delete)"""
        if not self.superadmin_token or not self.created_company_id:
            self.log_test("Company deletion", False, "No SuperAdmin token or company ID available")
            return
            
        print("\n🔍 Testing Company Deletion...")
        
        status, data = self.make_request('DELETE', f'superadmin/companies/{self.created_company_id}', 
                                       use_superadmin_auth=True)
        success = status == 200 and "deleted" in data.get("message", "").lower()
        self.log_test("Delete company", success, f"Response: {data}")
        
        # Verify company is marked as deleted
        status, data = self.make_request('GET', f'superadmin/companies/{self.created_company_id}', 
                                       use_superadmin_auth=True)
        if status == 200:
            is_deleted = data.get("status") == "deleted" or not data.get("is_active", True)
            self.log_test("Company marked as deleted", is_deleted, f"Status: {data.get('status')}, Active: {data.get('is_active')}")
        else:
            # Company might be completely removed from listing
            self.log_test("Company removed from system", status == 404, f"Status: {status}")

    def test_portainer_status(self):
        """Test Portainer connection status"""
        if not self.superadmin_token:
            self.log_test("Portainer status", False, "No SuperAdmin token available")
            return
            
        print("\n🔍 Testing Portainer Connection Status...")
        
        status, data = self.make_request('GET', 'superadmin/portainer/status', use_superadmin_auth=True)
        success = status == 200 and isinstance(data, dict)
        
        if success:
            connected = data.get('connected', False)
            stack_count = data.get('stack_count', 0)
            url = data.get('url', '')
            
            self.log_test("Portainer status API", True, 
                         f"Connected: {connected}, Stacks: {stack_count}, URL: {url}")
            
            # Check required fields
            required_fields = ['connected', 'url', 'endpoint_id']
            all_fields_present = all(field in data for field in required_fields)
            self.log_test("Portainer status data structure", all_fields_present)
        else:
            self.log_test("Portainer status API", False, f"Status: {status}, Response: {data}")

    def test_provision_endpoint(self):
        """Test company provisioning endpoint"""
        if not self.superadmin_token or not self.created_company_id:
            self.log_test("Company provision", False, "No SuperAdmin token or company ID available")
            return
            
        print("\n🔍 Testing Company Provisioning Endpoint...")
        
        # First check if company already has a stack
        status, company_data = self.make_request('GET', f'superadmin/companies/{self.created_company_id}', use_superadmin_auth=True)
        
        if status == 200 and company_data.get('portainer_stack_id'):
            # Company already provisioned, test deprovision first
            status, data = self.make_request('DELETE', f'superadmin/companies/{self.created_company_id}/provision', 
                                           use_superadmin_auth=True)
            self.log_test("Deprovision existing stack", status == 200, f"Status: {status}")
        
        # Test provision endpoint
        status, data = self.make_request('POST', f'superadmin/companies/{self.created_company_id}/provision', 
                                       use_superadmin_auth=True)
        success = status == 200 and isinstance(data, dict)
        
        if success:
            # Check for required response fields
            required_fields = ['message', 'stack_id', 'stack_name', 'ports']
            all_fields_present = all(field in data for field in required_fields)
            
            auto_deploy_started = data.get('auto_deploy_started', False)
            stack_id = data.get('stack_id')
            ports = data.get('ports', {})
            
            self.log_test("Company provision API", True, 
                         f"Stack ID: {stack_id}, Auto Deploy: {auto_deploy_started}")
            self.log_test("Provision response structure", all_fields_present)
            
            # Verify ports are assigned
            if ports:
                mongodb_port = ports.get('mongodb')
                self.log_test("MongoDB port assigned", mongodb_port is not None, f"Port: {mongodb_port}")
        else:
            self.log_test("Company provision API", False, f"Status: {status}, Response: {data}")

    def test_tenant_login_credentials(self):
        """Test existing tenant login credentials"""
        print("\n🔍 Testing Existing Tenant Login (Bitlis Rent A Car)...")
        
        # Test login with existing tenant credentials
        login_data = {
            "email": "admin@bitlisrentacar.com",
            "password": "admin123"
        }
        
        status, data = self.make_request('POST', 'auth/login', login_data)
        success = status == 200 and "access_token" in data
        
        if success:
            user_role = data.get("user", {}).get("role")
            company_id = data.get("user", {}).get("company_id")
            
            self.log_test("Bitlis tenant admin login", True, 
                         f"Role: {user_role}, Company: {company_id}")
            
            # Test get current user for tenant
            tenant_token = data["access_token"]
            headers = {'Authorization': f'Bearer {tenant_token}', 'Content-Type': 'application/json'}
            
            try:
                response = requests.get(f"{self.base_url}/api/auth/me", headers=headers, timeout=30)
                if response.status_code == 200:
                    user_data = response.json()
                    self.log_test("Tenant user profile access", True, 
                                 f"Email: {user_data.get('email')}")
                else:
                    self.log_test("Tenant user profile access", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_test("Tenant user profile access", False, f"Error: {str(e)}")
        else:
            self.log_test("Bitlis tenant admin login", False, f"Status: {status}, Response: {data}")

    def test_error_handling(self):
        """Test error handling for SuperAdmin endpoints"""
        print("\n🔍 Testing SuperAdmin Error Handling...")
        
        if self.superadmin_token:
            # Test invalid company ID
            status, data = self.make_request('GET', 'superadmin/companies/invalid-id', use_superadmin_auth=True)
            success = status == 404
            self.log_test("Invalid company ID returns 404", success, f"Status: {status}")
            
            # Test duplicate company code
            duplicate_company_data = {
                "name": "Duplicate Test Company",
                "code": "duplicate-test",
                "subdomain": "duplicate-test",
                "admin_email": "duplicate@test.com",
                "admin_password": "test123",
                "admin_full_name": "Duplicate Admin"
            }
            
            # Create first company
            status1, data1 = self.make_request('POST', 'superadmin/companies', duplicate_company_data, use_superadmin_auth=True)
            
            # Try to create duplicate
            status2, data2 = self.make_request('POST', 'superadmin/companies', duplicate_company_data, use_superadmin_auth=True)
            success = status2 == 400  # Should return bad request for duplicate
            self.log_test("Duplicate company code blocked", success, f"Status: {status2}")

    def run_all_tests(self):
        """Run all SuperAdmin test suites"""
        print("🚀 Starting FleetEase SuperAdmin Backend API Tests...")
        print(f"🌐 Testing against: {self.base_url}")
        
        try:
            # Authentication tests
            self.test_superadmin_login()
            
            # SuperAdmin functionality tests
            self.test_superadmin_stats()
            self.test_portainer_status()
            self.test_company_creation()
            self.test_company_listing()
            self.test_company_details()
            self.test_company_status_change()
            
            # Provisioning tests
            self.test_provision_endpoint()
            
            # Auto-created admin tests
            self.test_firma_admin_login()
            
            # Tenant login tests
            self.test_tenant_login_credentials()
            
            # Security tests
            self.test_role_based_access_control()
            
            # Cleanup tests
            self.test_company_deletion()
            
            # Error handling tests
            self.test_error_handling()
            
        except Exception as e:
            print(f"❌ Test suite failed with error: {str(e)}")
            self.log_test("Test suite execution", False, str(e))
        
        # Print summary
        print(f"\n📊 SuperAdmin Test Results Summary:")
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
                "test_timestamp": datetime.now().isoformat(),
                "test_type": "SuperAdmin Backend API"
            },
            "test_results": self.test_results
        }
        
        with open('/app/test_reports/superadmin_backend_test_results.json', 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = SuperAdminAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All SuperAdmin tests passed!")
        return 0
    else:
        print(f"\n⚠️  Some SuperAdmin tests failed. Check results above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())