"""
QA Test Configuration
Run: pytest qa/ -v --headed (with browser visible)
Run: pytest qa/ -v (headless)
Run: pytest qa/test_api.py -v (API only)
Run: pytest qa/test_e2e.py -v --headed (E2E only)

Environments:
  Local:  TEST_ENV=local (default) — localhost:8000 / localhost:5173
  Prod:   TEST_ENV=prod — begimbaev-dormitory.uk

Requirements:
  - Admin user: admin@dormitory.uz / admin123
"""
import os
import pytest
import requests

TEST_ENV = os.environ.get('TEST_ENV', 'local')

if TEST_ENV == 'prod':
    API_BASE = 'https://begimbaev-dormitory.uk/api/v1'
    FRONTEND_URL = 'https://begimbaev-dormitory.uk'
else:
    API_BASE = 'http://127.0.0.1:8000/api/v1'
    FRONTEND_URL = 'http://127.0.0.1:5173'

ADMIN_EMAIL = os.environ.get('QA_ADMIN_EMAIL', 'admin@dormitory.uz')
ADMIN_PASSWORD = os.environ.get('QA_ADMIN_PASSWORD', 'admin123')


@pytest.fixture(scope='session')
def api_base():
    return API_BASE


@pytest.fixture(scope='session')
def frontend_url():
    return FRONTEND_URL


@pytest.fixture(scope='session')
def admin_token(api_base):
    """Get JWT token for admin user."""
    resp = requests.post(f'{api_base}/auth/login/', json={
        'email': ADMIN_EMAIL,
        'password': ADMIN_PASSWORD,
    })
    assert resp.status_code == 200, f'Admin login failed: {resp.text}'
    return resp.json()['access']


@pytest.fixture(scope='session')
def auth_headers(admin_token):
    """Auth headers for API requests."""
    return {'Authorization': f'Bearer {admin_token}'}


@pytest.fixture(scope='session')
def api(api_base, auth_headers):
    """Helper for authenticated API requests."""
    class ApiClient:
        def get(self, path, **kw):
            return requests.get(f'{api_base}{path}', headers=auth_headers, **kw)
        def post(self, path, **kw):
            return requests.post(f'{api_base}{path}', headers=auth_headers, **kw)
        def patch(self, path, **kw):
            return requests.patch(f'{api_base}{path}', headers=auth_headers, **kw)
        def delete(self, path, **kw):
            return requests.delete(f'{api_base}{path}', headers=auth_headers, **kw)
    return ApiClient()


@pytest.fixture(scope='session')
def ids():
    """Shared test state between all API test classes."""
    return {}
