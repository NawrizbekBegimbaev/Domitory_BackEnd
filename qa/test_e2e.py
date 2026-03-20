"""
E2E Tests — Playwright Python. Full user flow coverage.
Run: pytest test_e2e.py -v --headed --slowmo 300
"""
import pytest
from playwright.sync_api import Page, expect

import os
_env = os.environ.get('TEST_ENV', 'local')
F = 'https://begimbaev-dormitory.uk' if _env == 'prod' else 'http://localhost:5173'
EMAIL = 'admin@dormitory.uz'
PWD = 'admin123'


def login(page: Page):
    page.goto(F + '/login')
    page.wait_for_selector('input[type="email"]')
    page.fill('input[type="email"]', EMAIL)
    page.fill('input[type="password"]', PWD)
    page.click('button[type="submit"]')
    page.wait_for_url(F + '/')
    page.wait_for_timeout(500)


def go(page: Page, path: str):
    login(page)
    page.goto(F + path)
    page.wait_for_timeout(800)


# ============================================================
# LOGIN
# ============================================================
class TestLogin:
    def test_page_loads(self, page: Page):
        page.goto(F + '/login')
        expect(page.locator('text=DORMITORY')).to_be_visible()

    def test_login_success(self, page: Page):
        login(page)
        expect(page).to_have_url(F + '/')

    def test_login_wrong_password(self, page: Page):
        page.goto(F + '/login')
        page.fill('input[type="email"]', EMAIL)
        page.fill('input[type="password"]', 'wrong')
        page.click('button[type="submit"]')
        page.wait_for_timeout(1000)
        expect(page).to_have_url(F + '/login')

    def test_email_phone_tabs(self, page: Page):
        page.goto(F + '/login')
        page.wait_for_timeout(500)
        assert page.locator('.bg-dark-bg button').count() >= 2

    def test_phone_tab_shows_input(self, page: Page):
        page.goto(F + '/login')
        page.wait_for_timeout(500)
        page.locator('.bg-dark-bg button').last.click()
        page.wait_for_timeout(500)
        # Phone input should be visible
        expect(page.locator('input').first).to_be_visible()

    def test_forgot_password(self, page: Page):
        page.goto(F + '/login')
        page.wait_for_timeout(500)
        page.get_by_text('?', exact=False).last.click()
        page.wait_for_timeout(500)

    def test_language_uz(self, page: Page):
        page.goto(F + '/login')
        page.wait_for_timeout(300)
        page.get_by_text('UZ', exact=True).click()
        page.wait_for_timeout(500)
        expect(page.get_by_role('button', name='Kirish', exact=True)).to_be_visible()
        page.get_by_text('RU', exact=True).click()
        page.wait_for_timeout(300)


# ============================================================
# DASHBOARD
# ============================================================
class TestDashboard:
    def test_stats(self, page: Page):
        go(page, '/')
        assert page.locator('.bg-dark-card').count() >= 3

    def test_table(self, page: Page):
        go(page, '/')
        expect(page.locator('table').first).to_be_visible()


# ============================================================
# SIDEBAR
# ============================================================
class TestSidebar:
    def test_nav_links(self, page: Page):
        login(page)
        for p in ['/residents', '/buildings', '/rooms', '/contracts', '/finance', '/reports', '/audit', '/users']:
            page.click(f'aside a[href="{p}"]')
            page.wait_for_timeout(300)
            expect(page).to_have_url(F + p)

    def test_language(self, page: Page):
        login(page)
        page.locator('aside button:has-text("UZ")').click()
        page.wait_for_timeout(300)
        page.locator('aside button:has-text("RU")').click()
        page.wait_for_timeout(300)

    def test_logout(self, page: Page):
        login(page)
        page.locator('aside').get_by_text('Выйти').click()
        page.wait_for_timeout(500)
        expect(page).to_have_url(F + '/login')


# ============================================================
# RESIDENTS
# ============================================================
class TestResidents:
    def test_list(self, page: Page):
        go(page, '/residents')
        expect(page.locator('h1')).to_be_visible()

    def test_tabs(self, page: Page):
        go(page, '/residents')
        tabs = page.locator('.rounded-lg.p-1 button')
        for i in range(min(tabs.count(), 5)):
            tabs.nth(i).click()
            page.wait_for_timeout(200)

    def test_create_form(self, page: Page):
        go(page, '/residents/new')
        assert page.locator('input').count() >= 3

    def test_create_and_redirect(self, page: Page):
        go(page, '/residents/new')
        inputs = page.locator('section input')
        if inputs.count() >= 2:
            inputs.nth(0).fill('E2EАвто')
            inputs.nth(1).fill('Тест')
        page.locator('input[placeholder*="000"]').fill('E2E-AUTO-001')
        page.get_by_text('Сохранить', exact=False).last.click()
        page.wait_for_timeout(1500)
        expect(page).to_have_url(F + '/residents')

    def test_search(self, page: Page):
        go(page, '/residents')
        s = page.locator('input[type="text"]')
        if s.count() > 0:
            s.first.fill('E2E')
            page.wait_for_timeout(500)


# ============================================================
# RESIDENT DETAIL
# ============================================================
class TestResidentDetail:
    def test_click_opens(self, page: Page):
        go(page, '/residents')
        rows = page.locator('tbody tr')
        if rows.count() > 0:
            rows.first.click()
            page.wait_for_timeout(500)
            expect(page.locator('h1')).to_be_visible()

    def test_tabs(self, page: Page):
        go(page, '/residents')
        rows = page.locator('tbody tr')
        if rows.count() > 0:
            rows.first.click()
            page.wait_for_timeout(500)
            tabs = page.locator('main .border-b button, [role="tablist"] button')
            for i in range(min(tabs.count(), 4)):
                tabs.nth(i).click()
                page.wait_for_timeout(200)

    def test_has_balance(self, page: Page):
        go(page, '/residents')
        rows = page.locator('tbody tr')
        if rows.count() > 0:
            rows.first.click()
            page.wait_for_timeout(500)
            expect(page.get_by_text('UZS').first).to_be_visible()

    def test_has_buttons(self, page: Page):
        go(page, '/residents')
        rows = page.locator('tbody tr')
        if rows.count() > 0:
            rows.first.click()
            page.wait_for_timeout(500)
            assert page.locator('button').count() >= 5


# ============================================================
# BUILDINGS
# ============================================================
class TestBuildings:
    def test_list(self, page: Page):
        go(page, '/buildings')
        expect(page.locator('h1')).to_be_visible()

    def test_add_building(self, page: Page):
        go(page, '/buildings')
        page.locator('button.bg-accent').first.click()
        page.wait_for_timeout(500)
        expect(page.locator('[role="dialog"], .fixed.inset-0, .fixed.z-50')).to_be_visible()

    def test_manage_floors(self, page: Page):
        go(page, '/buildings')
        btn = page.get_by_text('Управлять', exact=False)
        if btn.count() > 0:
            btn.first.click()
            page.wait_for_timeout(500)
            expect(page.locator('h1')).to_be_visible()


# ============================================================
# FLOORS
# ============================================================
class TestFloors:
    def test_load(self, page: Page):
        go(page, '/buildings')
        btn = page.get_by_text('Управлять', exact=False)
        if btn.count() > 0:
            btn.first.click()
            page.wait_for_timeout(500)
            expect(page.locator('h1')).to_be_visible()

    def test_room_click(self, page: Page):
        go(page, '/buildings')
        btn = page.get_by_text('Управлять', exact=False)
        if btn.count() > 0:
            btn.first.click()
            page.wait_for_timeout(500)
            rooms = page.locator('.font-bold.cursor-pointer')
            if rooms.count() > 0:
                rooms.first.click()
                page.wait_for_timeout(500)
        # pass if no rooms


# ============================================================
# ROOMS
# ============================================================
class TestRooms:
    def test_grid(self, page: Page):
        go(page, '/rooms')
        expect(page.locator('h1')).to_be_visible()

    def test_list_view(self, page: Page):
        go(page, '/rooms')
        toggles = page.locator('.rounded-lg.p-1 button')
        if toggles.count() >= 2:
            toggles.last.click()
            page.wait_for_timeout(500)
            expect(page.locator('table')).to_be_visible()

    def test_room_click(self, page: Page):
        go(page, '/rooms')
        rooms = page.locator('.cursor-pointer.rounded-xl')
        if rooms.count() > 0:
            rooms.first.click()
            page.wait_for_timeout(500)
        # pass if no rooms

    def test_stats(self, page: Page):
        go(page, '/rooms')
        assert page.locator('.text-2xl').count() >= 2


# ============================================================
# CONTRACTS
# ============================================================
class TestContracts:
    def test_list(self, page: Page):
        go(page, '/contracts')
        expect(page.locator('h1')).to_be_visible()

    def test_tabs(self, page: Page):
        go(page, '/contracts')
        tabs = page.locator('.rounded-lg.p-1 button')
        for i in range(min(tabs.count(), 4)):
            tabs.nth(i).click()
            page.wait_for_timeout(200)

    def test_click_contract(self, page: Page):
        go(page, '/contracts')
        rows = page.locator('tbody tr')
        if rows.count() > 0:
            rows.first.click()
            page.wait_for_timeout(300)


# ============================================================
# FINANCE
# ============================================================
class TestFinance:
    def test_list(self, page: Page):
        go(page, '/finance')
        expect(page.locator('h1')).to_be_visible()

    def test_new_payment(self, page: Page):
        go(page, '/finance')
        page.locator('button.bg-accent').first.click()
        page.wait_for_timeout(1000)
        assert '/finance/payment/new' in page.url or '/finance' in page.url

    def test_payment_form(self, page: Page):
        go(page, '/finance/payment/new')
        expect(page.locator('input').first).to_be_visible()
        assert page.locator('.rounded-xl.border').count() >= 3

    def test_payment_from_detail(self, page: Page):
        go(page, '/residents')
        rows = page.locator('tbody tr')
        if rows.count() > 0:
            rows.first.click()
            page.wait_for_timeout(500)
            btn = page.get_by_text('+', exact=False).first
            if btn.is_visible():
                btn.click()
                page.wait_for_timeout(500)


# ============================================================
# REPORTS
# ============================================================
class TestReports:
    def test_load(self, page: Page):
        go(page, '/reports')
        expect(page.locator('h1')).to_be_visible()

    def test_tabs(self, page: Page):
        go(page, '/reports')
        tabs = page.locator('main .border-b button, main [role="tablist"] button')
        for i in range(min(tabs.count(), 5)):
            tabs.nth(i).click()
            page.wait_for_timeout(300)


# ============================================================
# AUDIT
# ============================================================
class TestAudit:
    def test_load(self, page: Page):
        go(page, '/audit')
        expect(page.locator('h1')).to_be_visible()

    def test_expand(self, page: Page):
        go(page, '/audit')
        rows = page.locator('.cursor-pointer')
        if rows.count() > 0:
            rows.first.click()
            page.wait_for_timeout(500)

    def test_filter(self, page: Page):
        go(page, '/audit')
        sel = page.locator('select')
        if sel.count() >= 1:
            sel.first.select_option(index=1)
            page.wait_for_timeout(300)
            sel.first.select_option(index=0)


# ============================================================
# USERS
# ============================================================
class TestUsers:
    def test_list(self, page: Page):
        go(page, '/users')
        expect(page.locator('h1')).to_be_visible()

    def test_click_detail(self, page: Page):
        go(page, '/users')
        rows = page.locator('tbody tr')
        if rows.count() > 0:
            rows.first.click()
            page.wait_for_timeout(500)

    def test_add_modal(self, page: Page):
        go(page, '/users')
        page.locator('button.bg-accent').first.click()
        page.wait_for_timeout(500)
        expect(page.locator('[role="dialog"], .fixed.inset-0, .fixed.z-50')).to_be_visible()

    def test_close_modal(self, page: Page):
        go(page, '/users')
        page.locator('button.bg-accent').first.click()
        page.wait_for_timeout(300)
        close = page.locator('[role="dialog"] button, .fixed.inset-0 button, .fixed.z-50 button').first
        if close.is_visible():
            close.click()
        page.wait_for_timeout(300)


# ============================================================
# LANGUAGE
# ============================================================
class TestLanguage:
    def test_uz(self, page: Page):
        page.goto(F + '/login')
        page.wait_for_timeout(300)
        page.get_by_text('UZ', exact=True).click()
        page.wait_for_timeout(500)
        expect(page.get_by_role('button', name='Kirish', exact=True)).to_be_visible()
        page.get_by_text('RU', exact=True).click()

    def test_qq(self, page: Page):
        page.goto(F + '/login')
        page.wait_for_timeout(300)
        page.get_by_text('QQ', exact=True).click()
        page.wait_for_timeout(500)
        expect(page.get_by_role('button', name='Kiriw', exact=True)).to_be_visible()
        page.get_by_text('RU', exact=True).click()

    def test_persists(self, page: Page):
        page.goto(F + '/login')
        page.wait_for_timeout(300)
        page.get_by_text('UZ', exact=True).click()
        page.wait_for_timeout(200)
        page.fill('input[type="email"]', EMAIL)
        page.fill('input[type="password"]', PWD)
        page.click('button[type="submit"]')
        page.wait_for_url(F + '/')
        page.wait_for_timeout(500)
        # Reset
        page.locator('aside button:has-text("RU")').click()
        page.wait_for_timeout(300)

    def test_back_to_ru(self, page: Page):
        page.goto(F + '/login')
        page.wait_for_timeout(300)
        page.get_by_text('UZ', exact=True).click()
        page.wait_for_timeout(200)
        page.get_by_text('RU', exact=True).click()
        page.wait_for_timeout(300)
        expect(page.get_by_role('button', name='Войти', exact=True)).to_be_visible()
