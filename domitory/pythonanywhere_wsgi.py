"""
PythonAnywhere WSGI configuration.

Copy this content into the WSGI file on PythonAnywhere:
Web tab -> WSGI configuration file -> click link -> replace content.

IMPORTANT: Replace <USERNAME> with your actual PythonAnywhere username.
"""
import os
import sys

# Add project directory to path
# Replace <USERNAME> with your PythonAnywhere username
path = '/home/<USERNAME>/Domitory_BackEnd/domitory'
if path not in sys.path:
    sys.path.append(path)

# Set environment variables
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.pythonanywhere'

# Load .env file
from pathlib import Path
from dotenv import load_dotenv
env_path = Path(path) / '.env'
load_dotenv(env_path)

# Get WSGI application
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
