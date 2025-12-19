#!/usr/bin/env python3
"""
FleetEase Portainer Integration Backend Test Suite
Tests SuperAdmin Portainer integration endpoints
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class PortainerBackendTester:
    def __init__(self, base_url: str = "https://car-host.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.test_company_id = None
        self.test_company_name = "Test Portainer Company"

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

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> tuple:
        """Make HTTP request with admin auth"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.admin_token:
            headers['Authorization'] = f'Bearer {self.admin_token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=60)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=60)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=60)
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
        
        login_data = {
            "email": "admin@fleetease.com",
            "password": "admin123"
        }
        
        status, data = self.make_request('POST', 'auth/login', login_data)
        success = status == 200 and "access_token" in data
        
        if success:
            self.admin_token = data["access_token"]
            user_role = data.get("user", {}).get("role", "unknown")
            self.log_test("SuperAdmin login", True, f"Role: {user_role}")
            
            # Verify SuperAdmin role
            if user_role == "superadmin":
                self.log_test("SuperAdmin role verification", True)
            else:
                self.log_test("SuperAdmin role verification", False, f"Expected superadmin, got {user_role}")
        else:
            self.log_test("SuperAdmin login", False, f"Status: {status}, Response: {data}")

    def test_portainer_status(self):
        """Test Portainer connection status endpoint"""
        if not self.admin_token:
            self.log_test("Portainer status check", False, "No admin token available")
            return
            
        print("\n🔍 Testing Portainer Status Endpoint...")
        
        status, data = self.make_request('GET', 'superadmin/portainer/status')
        success = status == 200 and "connected" in data
        
        if success:
            connected = data.get("connected", False)
            url = data.get("url", "")
            stack_count = data.get("stack_count", 0)
            
            self.log_test("Portainer status endpoint", True, 
                         f"Connected: {connected}, URL: {url}, Stacks: {stack_count}")
            
            # Verify connection details
            if connected:
                self.log_test("Portainer connection active", True)
                if "72.61.158.147:9443" in url:
                    self.log_test("Portainer URL correct", True)
                else:
                    self.log_test("Portainer URL correct", False, f"Expected 72.61.158.147:9443, got {url}")
            else:
                error_msg = data.get("error", "Unknown error")
                self.log_test("Portainer connection active", False, f"Connection failed: {error_msg}")
        else:
            self.log_test("Portainer status endpoint", False, f"Status: {status}, Response: {data}")

    def test_portainer_stacks_list(self):
        """Test Portainer stacks listing endpoint"""
        if not self.admin_token:
            self.log_test("Portainer stacks list", False, "No admin token available")
            return
            
        print("\n🔍 Testing Portainer Stacks List...")
        
        status, data = self.make_request('GET', 'superadmin/portainer/stacks')
        success = status == 200 and "stacks" in data
        
        if success:
            stacks = data.get("stacks", [])
            stack_count = len(stacks) if isinstance(stacks, list) else 0
            self.log_test("Portainer stacks list", True, f"Found {stack_count} stacks")
            
            # Check for ABC Rent A Car stack (Stack #1)
            abc_stack_found = False
            for stack in stacks:
                if isinstance(stack, dict):
                    stack_name = stack.get("Name", "")
                    if "abc" in stack_name.lower() or "rentacar_abc" in stack_name.lower():
                        abc_stack_found = True
                        stack_id = stack.get("Id", "unknown")
                        self.log_test("ABC Rent A Car stack found", True, f"Stack ID: {stack_id}, Name: {stack_name}")
                        break
            
            if not abc_stack_found and stack_count > 0:
                self.log_test("ABC Rent A Car stack found", False, "ABC stack not found in stack list")
        else:
            self.log_test("Portainer stacks list", False, f"Status: {status}, Response: {data}")

    def test_companies_list_with_portainer_info(self):
        """Test companies list to verify Portainer deployment info"""
        if not self.admin_token:
            self.log_test("Companies list with Portainer info", False, "No admin token available")
            return
            
        print("\n🔍 Testing Companies List with Portainer Info...")
        
        status, data = self.make_request('GET', 'superadmin/companies')
        success = status == 200 and isinstance(data, list)
        
        if success:
            companies = data
            company_count = len(companies)
            self.log_test("Companies list retrieval", True, f"Found {company_count} companies")
            
            # Look for deployed companies
            deployed_companies = []
            abc_company_found = False
            
            for company in companies:
                if isinstance(company, dict):
                    company_name = company.get("name", "")
                    stack_id = company.get("portainer_stack_id")
                    ports = company.get("ports", {})
                    
                    if stack_id:
                        deployed_companies.append({
                            "name": company_name,
                            "stack_id": stack_id,
                            "mongodb_port": ports.get("mongodb") if isinstance(ports, dict) else None
                        })
                        
                        # Check for ABC Rent A Car specifically
                        if "abc" in company_name.lower():
                            abc_company_found = True
                            mongodb_port = ports.get("mongodb") if isinstance(ports, dict) else None
                            self.log_test("ABC Rent A Car company found", True, 
                                         f"Stack ID: {stack_id}, MongoDB Port: {mongodb_port}")
                            
                            # Verify MongoDB port is 12001
                            if mongodb_port == 12001:
                                self.log_test("ABC MongoDB port verification", True, "Port 12001 confirmed")
                            else:
                                self.log_test("ABC MongoDB port verification", False, 
                                             f"Expected 12001, got {mongodb_port}")
            
            deployed_count = len(deployed_companies)
            self.log_test("Deployed companies found", deployed_count > 0, 
                         f"Found {deployed_count} deployed companies")
            
            if not abc_company_found:
                self.log_test("ABC Rent A Car company found", False, "ABC company not found in companies list")
                
        else:
            self.log_test("Companies list retrieval", False, f"Status: {status}, Response: {data}")

    def test_company_provision_workflow(self):
        """Test company provisioning workflow (create company, then provision)"""
        if not self.admin_token:
            self.log_test("Company provision workflow", False, "No admin token available")
            return
            
        print("\n🔍 Testing Company Provision Workflow...")
        
        # First create a test company
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        company_data = {
            "name": f"Test Portainer Company {timestamp}",
            "code": f"TEST{timestamp[-6:]}",
            "subdomain": f"test{timestamp[-6:]}",
            "subscription_plan": "free",
            "admin_email": f"admin{timestamp[-6:]}@testcompany.com",
            "admin_password": "testpass123",
            "admin_full_name": "Test Admin"
        }
        
        status, data = self.make_request('POST', 'superadmin/companies', company_data)
        success = status == 200 and "id" in data
        
        if success:
            self.test_company_id = data["id"]
            company_name = data.get("name", "Unknown")
            self.log_test("Test company creation", True, f"Company ID: {self.test_company_id}")
            
            # Now test provisioning
            status, provision_data = self.make_request('POST', f'superadmin/companies/{self.test_company_id}/provision')
            provision_success = status == 200 and "stack_id" in provision_data
            
            if provision_success:
                stack_id = provision_data.get("stack_id")
                ports = provision_data.get("ports", {})
                mongodb_port = ports.get("mongodb") if isinstance(ports, dict) else None
                
                self.log_test("Company provisioning", True, 
                             f"Stack ID: {stack_id}, MongoDB Port: {mongodb_port}")
                
                # Verify port allocation
                if mongodb_port and mongodb_port >= 12000:
                    self.log_test("MongoDB port allocation", True, f"Port {mongodb_port} in valid range")
                else:
                    self.log_test("MongoDB port allocation", False, f"Invalid port: {mongodb_port}")
                
                # Test deprovisioning
                status, deprovision_data = self.make_request('DELETE', f'superadmin/companies/{self.test_company_id}/provision')
                deprovision_success = status == 200
                
                if deprovision_success:
                    self.log_test("Company deprovisioning", True)
                else:
                    self.log_test("Company deprovisioning", False, f"Status: {status}")
                    
            else:
                error_msg = provision_data.get("detail", "Unknown error")
                self.log_test("Company provisioning", False, f"Status: {status}, Error: {error_msg}")
                
        else:
            self.log_test("Test company creation", False, f"Status: {status}, Response: {data}")

    def test_error_handling(self):
        """Test error handling for Portainer endpoints"""
        if not self.admin_token:
            self.log_test("Portainer error handling", False, "No admin token available")
            return
            
        print("\n🔍 Testing Portainer Error Handling...")
        
        # Test provision non-existent company
        status, data = self.make_request('POST', 'superadmin/companies/invalid-id/provision')
        success = status == 404
        self.log_test("Provision non-existent company returns 404", success, f"Status: {status}")
        
        # Test deprovision non-existent company
        status, data = self.make_request('DELETE', 'superadmin/companies/invalid-id/provision')
        success = status == 404
        self.log_test("Deprovision non-existent company returns 404", success, f"Status: {status}")
        
        # Test unauthorized access (without admin token)
        old_token = self.admin_token
        self.admin_token = None
        
        status, data = self.make_request('GET', 'superadmin/portainer/status')
        success = status in [401, 403]
        self.log_test("Unauthorized Portainer access blocked", success, f"Status: {status}")
        
        self.admin_token = old_token

    def run_all_tests(self):
        """Run all Portainer integration tests"""
        print("🚀 Starting FleetEase Portainer Integration Tests...")
        print(f"🌐 Testing against: {self.base_url}")
        print("🐳 Portainer URL: https://72.61.158.147:9443")
        
        try:
            # Authentication
            self.test_superadmin_login()
            
            # Portainer integration tests
            self.test_portainer_status()
            self.test_portainer_stacks_list()
            self.test_companies_list_with_portainer_info()
            
            # Provisioning workflow tests
            self.test_company_provision_workflow()
            
            # Error handling tests
            self.test_error_handling()
            
        except Exception as e:
            print(f"❌ Test suite failed with error: {str(e)}")
            self.log_test("Test suite execution", False, str(e))
        
        # Print summary
        print(f"\n📊 Portainer Integration Test Results:")
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
                "test_focus": "Portainer Integration"
            },
            "test_results": self.test_results
        }
        
        with open('/app/test_reports/portainer_backend_test_results.json', 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = PortainerBackendTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All Portainer integration tests passed!")
        return 0
    else:
        print(f"\n⚠️  Some Portainer tests failed. Check results above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())