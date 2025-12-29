"""
Tenant Panel Version Management
"""

VERSION = "1.1.0"

CHANGELOG = {
    "1.1.0": {
        "date": "2024-12-29",
        "changes": [
            "Arvento GPS entegrasyonu eklendi",
            "Public theme-settings endpoint eklendi",
            "Destek talepleri SuperAdmin senkronizasyonu",
            "Version kontrol sistemi"
        ]
    },
    "1.0.0": {
        "date": "2024-12-28",
        "changes": [
            "Initial tenant release"
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
