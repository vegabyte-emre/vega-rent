#!/usr/bin/env python3
"""
FleetEase Theme Store API Test Suite
Tests theme management and settings endpoints
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class ThemeStoreAPITester:
    def __init__(self, base_url: str = "https://car-host.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

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
                    use_admin_auth: bool = False) -> tuple:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if use_admin_auth and self.admin_token:
            headers['Authorization'] = f'Bearer {self.admin_token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}

            return response.status_code, response_data
        except Exception as e:
            return 0, {"error": str(e)}

    def test_admin_login(self):
        """Test admin authentication for theme management"""
        print("\n🔍 Testing Admin Authentication...")
        
        login_data = {
            "email": "admin@fleetease.com",
            "password": "admin123"
        }
        
        status, data = self.make_request('POST', 'auth/login', login_data)
        success = status == 200 and "access_token" in data
        
        if success:
            self.admin_token = data["access_token"]
            self.log_test("Admin login for theme management", True)
        else:
            self.log_test("Admin login for theme management", False, f"Status: {status}, Response: {data}")

    def test_themes_api(self):
        """Test GET /api/themes endpoint"""
        if not self.admin_token:
            self.log_test("Themes API", False, "No admin token available")
            return
            
        print("\n🔍 Testing Themes API...")
        
        status, data = self.make_request('GET', 'themes', use_admin_auth=True)
        success = status == 200 and isinstance(data, list) and len(data) == 6
        
        if success:
            # Check if all expected themes are present
            theme_ids = [theme.get("id") for theme in data]
            expected_themes = ["classic-blue", "elegant-dark", "fresh-green", "royal-purple", "sunset-orange", "minimalist-gray"]
            
            all_themes_present = all(theme_id in theme_ids for theme_id in expected_themes)
            
            if all_themes_present:
                self.log_test("GET /api/themes - All 6 themes present", True, f"Found themes: {theme_ids}")
                
                # Test theme structure
                first_theme = data[0]
                required_fields = ["id", "name", "description", "colors", "hero_image", "is_premium"]
                has_required_fields = all(field in first_theme for field in required_fields)
                
                self.log_test("Theme structure validation", has_required_fields, 
                             f"Required fields present: {has_required_fields}")
                
                # Check premium theme
                premium_themes = [t for t in data if t.get("is_premium")]
                self.log_test("Premium theme present", len(premium_themes) > 0, 
                             f"Found {len(premium_themes)} premium themes")
            else:
                self.log_test("GET /api/themes - All 6 themes present", False, 
                             f"Missing themes. Found: {theme_ids}")
        else:
            self.log_test("GET /api/themes", False, f"Status: {status}, Response: {data}")

    def test_theme_settings_get(self):
        """Test GET /api/theme-settings endpoint"""
        if not self.admin_token:
            self.log_test("Theme Settings GET", False, "No admin token available")
            return
            
        print("\n🔍 Testing Theme Settings GET API...")
        
        status, data = self.make_request('GET', 'theme-settings', use_admin_auth=True)
        success = status == 200 and isinstance(data, dict)
        
        if success:
            # Check required fields
            required_fields = ["active_theme_id", "custom_hero_title", "custom_hero_subtitle", 
                             "show_stats", "show_features", "show_popular_vehicles"]
            has_required_fields = all(field in data for field in required_fields)
            
            self.log_test("GET /api/theme-settings", True, 
                         f"Active theme: {data.get('active_theme_id')}")
            self.log_test("Theme settings structure", has_required_fields,
                         f"Required fields present: {has_required_fields}")
        else:
            self.log_test("GET /api/theme-settings", False, f"Status: {status}, Response: {data}")

    def test_theme_settings_update(self):
        """Test PUT /api/theme-settings endpoint"""
        if not self.admin_token:
            self.log_test("Theme Settings UPDATE", False, "No admin token available")
            return
            
        print("\n🔍 Testing Theme Settings UPDATE API...")
        
        # Test updating theme settings
        update_data = {
            "active_theme_id": "elegant-dark",
            "custom_hero_title": "Test Hero Title",
            "custom_hero_subtitle": "Test Hero Subtitle",
            "show_stats": True,
            "show_features": True,
            "show_popular_vehicles": True,
            "contact_phone": "0850 999 8877",
            "contact_email": "test@fleetease.com"
        }
        
        status, data = self.make_request('PUT', 'theme-settings', update_data, use_admin_auth=True)
        success = status == 200 and "message" in data
        
        if success:
            self.log_test("PUT /api/theme-settings", True, "Theme settings updated successfully")
            
            # Verify the update by getting settings again
            status, get_data = self.make_request('GET', 'theme-settings', use_admin_auth=True)
            if status == 200:
                updated_theme = get_data.get("active_theme_id")
                updated_title = get_data.get("custom_hero_title")
                
                theme_updated = updated_theme == "elegant-dark"
                title_updated = updated_title == "Test Hero Title"
                
                self.log_test("Theme activation verification", theme_updated,
                             f"Active theme: {updated_theme}")
                self.log_test("Custom content update verification", title_updated,
                             f"Hero title: {updated_title}")
            else:
                self.log_test("Theme settings verification", False, "Could not verify update")
        else:
            self.log_test("PUT /api/theme-settings", False, f"Status: {status}, Response: {data}")

    def test_public_theme_settings(self):
        """Test GET /api/public/theme-settings endpoint (no auth required)"""
        print("\n🔍 Testing Public Theme Settings API...")
        
        status, data = self.make_request('GET', 'public/theme-settings')
        success = status == 200 and isinstance(data, dict)
        
        if success:
            # Check structure
            has_settings = "settings" in data
            has_theme = "theme" in data
            
            self.log_test("GET /api/public/theme-settings", True, 
                         f"Has settings: {has_settings}, Has theme: {has_theme}")
            
            if has_theme and data["theme"]:
                theme = data["theme"]
                has_colors = "colors" in theme
                has_hero_image = "hero_image" in theme
                
                self.log_test("Public theme structure", has_colors and has_hero_image,
                             f"Theme ID: {theme.get('id')}")
        else:
            self.log_test("GET /api/public/theme-settings", False, f"Status: {status}, Response: {data}")

    def test_theme_activation_flow(self):
        """Test complete theme activation flow"""
        if not self.admin_token:
            self.log_test("Theme Activation Flow", False, "No admin token available")
            return
            
        print("\n🔍 Testing Theme Activation Flow...")
        
        # Test activating different themes
        themes_to_test = ["classic-blue", "fresh-green", "royal-purple"]
        
        for theme_id in themes_to_test:
            update_data = {
                "active_theme_id": theme_id,
                "custom_hero_title": f"Testing {theme_id} Theme",
                "custom_hero_subtitle": "Theme activation test",
                "show_stats": True,
                "show_features": True,
                "show_popular_vehicles": True
            }
            
            # Update theme
            status, data = self.make_request('PUT', 'theme-settings', update_data, use_admin_auth=True)
            
            if status == 200:
                # Verify via public endpoint
                status, public_data = self.make_request('GET', 'public/theme-settings')
                
                if status == 200 and public_data.get("theme", {}).get("id") == theme_id:
                    self.log_test(f"Activate {theme_id} theme", True)
                else:
                    self.log_test(f"Activate {theme_id} theme", False, "Public endpoint not reflecting change")
            else:
                self.log_test(f"Activate {theme_id} theme", False, f"Update failed: {status}")

    def test_content_management(self):
        """Test content tab functionality"""
        if not self.admin_token:
            self.log_test("Content Management", False, "No admin token available")
            return
            
        print("\n🔍 Testing Content Management...")
        
        # Test updating various content fields
        content_updates = {
            "active_theme_id": "classic-blue",
            "custom_hero_title": "Özel Hero Başlığı",
            "custom_hero_subtitle": "Özel hero alt başlığı içeriği",
            "custom_logo_url": "https://example.com/logo.png",
            "contact_phone": "0850 555 1234",
            "contact_email": "iletisim@fleetease.com",
            "social_facebook": "https://facebook.com/fleetease",
            "social_instagram": "https://instagram.com/fleetease",
            "show_stats": True,
            "show_features": True,
            "show_popular_vehicles": True
        }
        
        status, data = self.make_request('PUT', 'theme-settings', content_updates, use_admin_auth=True)
        
        if status == 200:
            # Verify content updates
            status, get_data = self.make_request('GET', 'theme-settings', use_admin_auth=True)
            
            if status == 200:
                title_match = get_data.get("custom_hero_title") == content_updates["custom_hero_title"]
                subtitle_match = get_data.get("custom_hero_subtitle") == content_updates["custom_hero_subtitle"]
                phone_match = get_data.get("contact_phone") == content_updates["contact_phone"]
                
                self.log_test("Hero content update", title_match and subtitle_match,
                             f"Title: {title_match}, Subtitle: {subtitle_match}")
                self.log_test("Contact info update", phone_match,
                             f"Phone updated: {phone_match}")
            else:
                self.log_test("Content verification", False, "Could not verify content updates")
        else:
            self.log_test("Content Management", False, f"Status: {status}, Response: {data}")

    def test_settings_toggles(self):
        """Test settings tab toggle functionality"""
        if not self.admin_token:
            self.log_test("Settings Toggles", False, "No admin token available")
            return
            
        print("\n🔍 Testing Settings Toggles...")
        
        # Test different toggle combinations
        toggle_tests = [
            {"show_stats": False, "show_features": True, "show_popular_vehicles": True},
            {"show_stats": True, "show_features": False, "show_popular_vehicles": True},
            {"show_stats": True, "show_features": True, "show_popular_vehicles": False},
            {"show_stats": False, "show_features": False, "show_popular_vehicles": False}
        ]
        
        for i, toggles in enumerate(toggle_tests):
            update_data = {
                "active_theme_id": "classic-blue",
                **toggles
            }
            
            status, data = self.make_request('PUT', 'theme-settings', update_data, use_admin_auth=True)
            
            if status == 200:
                # Verify toggles
                status, get_data = self.make_request('GET', 'theme-settings', use_admin_auth=True)
                
                if status == 200:
                    toggles_match = all(
                        get_data.get(key) == value for key, value in toggles.items()
                    )
                    self.log_test(f"Toggle combination {i+1}", toggles_match,
                                 f"Settings: {toggles}")
                else:
                    self.log_test(f"Toggle combination {i+1}", False, "Could not verify toggles")
            else:
                self.log_test(f"Toggle combination {i+1}", False, f"Update failed: {status}")

    def run_all_tests(self):
        """Run all theme store test suites"""
        print("🎨 Starting FleetEase Theme Store API Tests...")
        print(f"🌐 Testing against: {self.base_url}")
        
        try:
            # Authentication
            self.test_admin_login()
            
            # Core theme APIs
            self.test_themes_api()
            self.test_theme_settings_get()
            self.test_theme_settings_update()
            self.test_public_theme_settings()
            
            # Theme functionality
            self.test_theme_activation_flow()
            self.test_content_management()
            self.test_settings_toggles()
            
        except Exception as e:
            print(f"❌ Test suite failed with error: {str(e)}")
            self.log_test("Test suite execution", False, str(e))
        
        # Print summary
        print(f"\n📊 Theme Store Test Results Summary:")
        print(f"   Total Tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "   Success Rate: 0%")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = ThemeStoreAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All theme store tests passed!")
        return 0
    else:
        print(f"\n⚠️  Some theme store tests failed. Check results above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())