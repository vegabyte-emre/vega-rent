"""
Tenant Panel Version Management
"""

VERSION = "1.1.0"

CHANGELOG = {
    "1.0.0": {
        "date": "2024-12-29",
        "changes": [
            "Initial tenant release",
            "Vehicle management",
            "Customer management", 
            "Reservation system",
            "Payment integration ready",
            "Mobile app integration"
        ]
    }
}

def get_version():
    return VERSION

def get_version_info():
    return {
        "version": VERSION,
        "changelog": CHANGELOG.get(VERSION, {})
    }
