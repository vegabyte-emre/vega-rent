#!/usr/bin/env python3
"""
Image Upload Backend API Test Suite
Tests MongoDB-based image storage functionality
"""

import requests
import sys
import json
import base64
import io
from datetime import datetime
from typing import Dict, Any, Optional

class ImageUploadAPITester:
    def __init__(self, base_url: str = "https://fleetease-dash.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.firma_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.uploaded_image_ids = []

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
                    files: Optional[Dict] = None, use_admin_auth: bool = False, 
                    use_firma_auth: bool = False) -> tuple:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {}
        
        if use_admin_auth and self.admin_token:
            headers['Authorization'] = f'Bearer {self.admin_token}'
        elif use_firma_auth and self.firma_token:
            headers['Authorization'] = f'Bearer {self.firma_token}'

        if not files:
            headers['Content-Type'] = 'application/json'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, headers=headers, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text, "content": response.content}

            return response.status_code, response_data
        except Exception as e:
            return 0, {"error": str(e)}

    def test_authentication(self):
        """Test admin and firma admin authentication"""
        print("\n🔍 Testing Authentication...")
        
        # Test SuperAdmin login
        admin_login_data = {
            "email": "admin@fleetease.com",
            "password": "admin123"
        }
        
        status, data = self.make_request('POST', 'auth/login', admin_login_data)
        success = status == 200 and "access_token" in data
        
        if success:
            self.admin_token = data["access_token"]
            self.log_test("SuperAdmin login", True, f"Role: {data.get('user', {}).get('role', 'unknown')}")
        else:
            self.log_test("SuperAdmin login", False, f"Status: {status}, Response: {data}")

        # Test Firma Admin login
        firma_login_data = {
            "email": "firma@fleetease.com",
            "password": "firma123"
        }
        
        status, data = self.make_request('POST', 'auth/login', firma_login_data)
        success = status == 200 and "access_token" in data
        
        if success:
            self.firma_token = data["access_token"]
            self.log_test("Firma Admin login", True, f"Role: {data.get('user', {}).get('role', 'unknown')}")
        else:
            self.log_test("Firma Admin login", False, f"Status: {status}, Response: {data}")

    def create_test_image(self, image_type: str = "logo") -> bytes:
        """Create a simple test image (PNG format)"""
        # Create a simple 100x50 PNG image
        import struct
        
        width, height = 100, 50
        
        # PNG signature
        png_signature = b'\x89PNG\r\n\x1a\n'
        
        # IHDR chunk
        ihdr_data = struct.pack('>2I5B', width, height, 8, 2, 0, 0, 0)
        ihdr_crc = 0x2144df1c  # Pre-calculated CRC for this specific IHDR
        ihdr_chunk = struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
        
        # Simple IDAT chunk with minimal image data
        if image_type == "logo":
            # Blue image for logo
            idat_data = b'\x08\x1d\x01\x02\x00\x01\xfd\xfe\x00\x00\x00\x02\x00\x01'
        else:
            # Red image for slider
            idat_data = b'\x08\x1d\x01\x02\x00\x01\xfd\xfe\x00\x00\x00\x02\x00\x01'
        
        idat_crc = 0x6cc5a7f0  # Pre-calculated CRC
        idat_chunk = struct.pack('>I', len(idat_data)) + b'IDAT' + idat_data + struct.pack('>I', idat_crc)
        
        # IEND chunk
        iend_chunk = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', 0xae426082)
        
        return png_signature + ihdr_chunk + idat_chunk + iend_chunk

    def test_image_upload_api(self):
        """Test image upload API endpoints"""
        if not self.admin_token:
            self.log_test("Image upload API", False, "No admin token available")
            return
            
        print("\n🔍 Testing Image Upload API...")
        
        # Test logo upload
        logo_image = self.create_test_image("logo")
        files = {
            'file': ('test_logo.png', io.BytesIO(logo_image), 'image/png')
        }
        data = {'type': 'logo'}
        
        status, response = self.make_request('POST', 'upload/image', data=data, files=files, use_admin_auth=True)
        success = status == 200 and response.get("success") == True and "data_uri" in response
        
        if success:
            logo_id = response.get("id")
            self.uploaded_image_ids.append(logo_id)
            data_uri = response.get("data_uri")
            self.log_test("Logo upload API", True, f"ID: {logo_id}, Size: {response.get('size')} bytes")
            
            # Verify data_uri format
            data_uri_valid = data_uri and data_uri.startswith("data:image/png;base64,")
            self.log_test("Logo data_uri format", data_uri_valid, f"Format: {data_uri[:50]}..." if data_uri else "No data_uri")
            
        else:
            self.log_test("Logo upload API", False, f"Status: {status}, Response: {response}")

        # Test slider upload
        slider_image = self.create_test_image("slider")
        files = {
            'file': ('test_slider.png', io.BytesIO(slider_image), 'image/png')
        }
        data = {'type': 'slider'}
        
        status, response = self.make_request('POST', 'upload/image', data=data, files=files, use_admin_auth=True)
        success = status == 200 and response.get("success") == True and "data_uri" in response
        
        if success:
            slider_id = response.get("id")
            self.uploaded_image_ids.append(slider_id)
            self.log_test("Slider upload API", True, f"ID: {slider_id}, Size: {response.get('size')} bytes")
        else:
            self.log_test("Slider upload API", False, f"Status: {status}, Response: {response}")

        # Test file size limit (logo > 2MB should fail)
        large_image = b'\x89PNG\r\n\x1a\n' + b'x' * (3 * 1024 * 1024)  # 3MB fake PNG
        files = {
            'file': ('large_logo.png', io.BytesIO(large_image), 'image/png')
        }
        data = {'type': 'logo'}
        
        status, response = self.make_request('POST', 'upload/image', data=data, files=files, use_admin_auth=True)
        success = status == 400  # Should fail with 400
        self.log_test("Logo size limit (>2MB)", success, f"Status: {status}")

        # Test invalid file type
        files = {
            'file': ('test.txt', io.BytesIO(b'not an image'), 'text/plain')
        }
        data = {'type': 'logo'}
        
        status, response = self.make_request('POST', 'upload/image', data=data, files=files, use_admin_auth=True)
        success = status == 400  # Should fail with 400
        self.log_test("Invalid file type rejection", success, f"Status: {status}")

    def test_image_retrieval_api(self):
        """Test image retrieval API"""
        if not self.uploaded_image_ids:
            self.log_test("Image retrieval API", False, "No uploaded images to test")
            return
            
        print("\n🔍 Testing Image Retrieval API...")
        
        for image_id in self.uploaded_image_ids:
            status, response = self.make_request('GET', f'images/{image_id}')
            success = status == 200 and isinstance(response.get("content"), bytes)
            self.log_test(f"Retrieve image {image_id}", success, f"Status: {status}")

        # Test invalid image ID
        status, response = self.make_request('GET', 'images/invalid-id')
        success = status == 404
        self.log_test("Invalid image ID returns 404", success, f"Status: {status}")

    def test_theme_settings_integration(self):
        """Test theme settings API integration with uploaded images"""
        if not self.admin_token or not self.uploaded_image_ids:
            self.log_test("Theme settings integration", False, "Missing prerequisites")
            return
            
        print("\n🔍 Testing Theme Settings Integration...")
        
        # Get current theme settings
        status, settings = self.make_request('GET', 'theme-settings', use_admin_auth=True)
        success = status == 200
        self.log_test("Get theme settings", success, f"Status: {status}")
        
        if success and self.uploaded_image_ids:
            # Update theme settings with uploaded logo
            logo_data_uri = f"data:image/png;base64,{base64.b64encode(self.create_test_image('logo')).decode()}"
            
            update_data = {
                "active_theme_id": settings.get("active_theme_id", "classic-blue"),
                "logo_url": logo_data_uri,
                "slider_images": [
                    {
                        "url": f"data:image/png;base64,{base64.b64encode(self.create_test_image('slider')).decode()}",
                        "title": "Test Slider",
                        "subtitle": "Test Description"
                    }
                ]
            }
            
            status, response = self.make_request('PUT', 'theme-settings', update_data, use_admin_auth=True)
            success = status == 200
            self.log_test("Update theme settings with images", success, f"Status: {status}")

    def test_unauthorized_access(self):
        """Test unauthorized access to image upload"""
        print("\n🔍 Testing Unauthorized Access...")
        
        # Test upload without authentication
        logo_image = self.create_test_image("logo")
        files = {
            'file': ('test_logo.png', io.BytesIO(logo_image), 'image/png')
        }
        data = {'type': 'logo'}
        
        status, response = self.make_request('POST', 'upload/image', data=data, files=files)
        success = status in [401, 403]  # Should be unauthorized
        self.log_test("Upload without auth blocked", success, f"Status: {status}")

    def cleanup_uploaded_images(self):
        """Clean up uploaded test images"""
        if not self.admin_token:
            return
            
        print("\n🧹 Cleaning up uploaded images...")
        
        for image_id in self.uploaded_image_ids:
            status, response = self.make_request('DELETE', f'images/{image_id}', use_admin_auth=True)
            success = status == 200
            if success:
                print(f"   ✅ Deleted image {image_id}")
            else:
                print(f"   ❌ Failed to delete image {image_id}")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Image Upload Backend API Tests...")
        print(f"🌐 Testing against: {self.base_url}")
        
        try:
            self.test_authentication()
            self.test_image_upload_api()
            self.test_image_retrieval_api()
            self.test_theme_settings_integration()
            self.test_unauthorized_access()
            
        except Exception as e:
            print(f"❌ Test suite failed with error: {str(e)}")
            self.log_test("Test suite execution", False, str(e))
        finally:
            self.cleanup_uploaded_images()
        
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
        
        with open('/app/test_reports/image_upload_backend_test_results.json', 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = ImageUploadAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All image upload tests passed!")
        return 0
    else:
        print(f"\n⚠️  Some tests failed. Check results above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())