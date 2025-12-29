"""
SuperAdmin Panel Version Management
"""

# Current version of the SuperAdmin panel
VERSION = "1.0.0"

# Version history
CHANGELOG = {
    "1.0.0": {
        "date": "2024-12-28",
        "changes": [
            "Initial release",
            "Multi-tenant company management",
            "Portainer integration for container orchestration",
            "Mobile app build system (Customer & Operation)",
            "Template-based tenant deployment",
            "Version control system"
        ]
    }
}

def get_version():
    """Return current version string"""
    return VERSION

def get_version_info():
    """Return version with changelog"""
    return {
        "version": VERSION,
        "changelog": CHANGELOG.get(VERSION, {})
    }
