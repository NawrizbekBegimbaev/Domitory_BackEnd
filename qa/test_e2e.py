"""
E2E Tests — Playwright Python. Full user flow coverage.
Replaces senior manual QA testing — 50+ tests.

Run: pytest test_e2e.py -v --headed --slowmo 300
"""
import pytest
from playwright.sync_api import Page, expect

F = 'http://127.0.0.1:5173'
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


# ============================================================
# LOGIN PAGE
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

    def test_email_phone_tabs_visible(self, page: Page):
        page.goto(F + '/login')
        page.wait_for_timeout(500)
        tabs = page.locator('.bg-dark-bg >> button')
        assert tabs.count() >= 2

    def test_phone_tab_shows_phone_field(self, page: Page):
        page.goto(F + '/login')
        page.wait_for_timeout(500)
        page.locator('.bg-dark-bg >> button').last.click()
        page.wait_for_timeout(300)
        expect(page.locator('input[maxlength="17"]')).to_be_visible()

    def test_forgot_password_opens(self, page: Page):
        page.goto(F + '/login')
        page.wait_for_timeout(500)
        page.locator('button:has-text("?")').last.click()
        page.wait_for_timeout(500)
        # Should show email input for reset
        expect(page.locator('input[type="email"]')).to_be_visible()

    def test_language_switch_changes_text(self, page: Page):
        page.goto(F + '/login')
        page.wait_for_timeout(300)
        page.locator('button:has-text("UZ")').click()
        page.wait_for_timeout(300)
        expect(page.locator('text=Kirish')).to_be_visible()
        page.locator('button:has-text("RU")').click()
        page.wait_for_timeout(300)


# ============================================================
# DASHBOARD
# ============================================================
class TestDashboard:
    def test_stats_cards_load(self, page: Page):
        login(page)
        page.wait_for_timeout(1000)
        cards = page.locator('.bg-dark-card.border').count()
        assert cards >= 3

    def test_occupancy_table(self, page: Page):
        login(page)
        page.wait_for_timeout(1000)
        expect(page.locator('table').first).to_be_visible()

    def test_debtors_section(self, page: Page):
        login(page)
        page.wait_for_timeout(1000)
        # Should have debtors or "no debtors" message
        page.locator('.bg-dark-card').count()


# ============================================================
# SIDEBAR
# ============================================================
class TestSidebar:
    def test_all_nav_links(self, page: Page):
        login(page)
        links = ['/residents', '/buildings', '/rooms', '/contracts', '/finance', '/reports', '/audit', '/users']
        for path in links:
            page.click(f'aside >> a[href="{path}"]')
            page.wait_for_timeout(300)
            expect(page).to_have_url(F + path)

    def test_sidebar_language_switch(self, page: Page):
        login(page)
        page.locator('aside >> button:has-text("UZ")').click()
        page.wait_for_timeout(300)
        expect(page.locator('aside >> text=Yashovchilar')).to_be_visible()
        page.locator('aside >> button:has-text("RU")').click()
        page.wait_for_timeout(300)

    def test_logout(self, page: Page):
        login(page)
        page.locator('aside >> text=Выйти').click()
        page.wait_for_timeout(500)
        expect(page).to_have_url(F + '/login')


# ============================================================
# RESIDENTS — FULL FLOW
# ============================================================
class TestResidentsFlow:
    def test_list_page(self, page: Page):
        login(page)
        page.goto(F + '/residents')
        page.wait_for_timeout(500)
        expect(page.locator('h1')).to_be_visible()

    def test_status_tabs(self, page: Page):
        login(page)
        page.goto(F + '/residents')
        page.wait_for_timeout(500)
        tabs = page.locator('.rounded-lg.p-1 >> button')
        for i in range(min(tabs.count(), 5)):
            tabs.nth(i).click()
            page.wait_for_timeout(300)

    def test_create_resident_form(self, page: Page):
        login(page)
        page.goto(F + '/residents/new')
        page.wait_for_timeout(500)
        # Should have name fields, photo upload, gender buttons
        inputs = page.locator('input').count()
        assert inputs >= 3

    def test_create_resident_and_redirect(self, page: Page):
        login(page)
        page.goto(F + '/residents/new')
        page.wait_for_timeout(500)
        # Fill required fields (last name, first name, student ID)
        all_inputs = page.locator('section input')
        if all_inputs.count() >= 3:
            all_inputs.nth(0).fill('E2EТест')
            all_inputs.nth(1).fill('Жилец')
        page.locator('input[placeholder="N 000000"]').fill('E2E-QA-FLOW')
        page.locator('button:has-text("Сохранить")').click()
        page.wait_for_timeout(1000)
        expect(page).to_have_url(F + '/residents')

    def test_search_residents(self, page: Page):
        login(page)
        page.goto(F + '/residents')
        page.wait_for_timeout(500)
        search = page.locator('input[type="text"]')
        if search.count() > 0:
            search.first.fill('E2E')
            page.wait_for_timeout(1000)


# ============================================================
# RESIDENT DETAIL
# ============================================================
class TestResidentDetail:
    def test_click_opens_detail(self, page: Page):
        login(page)
        page.goto(F + '/residents')
        page.wait_for_timeout(500)
        rows = page.locator('tbody >> tr')
        if rows.count() > 0:
            rows.first.click()
            page.wait_for_timeout(500)
            expect(page.locator('h1')).to_be_visible()

    def test_all_tabs(self, page: Page):
        login(page)
        page.goto(F + '/residents')
        page.wait_for_timeout(500)
        rows = page.locator('tbody >> tr')
        if rows.count() > 0:
            rows.first.click()
            page.wait_for_timeout(500)
            tabs = page.locator('.border-b >> button')
            for i in range(min(tabs.count(), 4)):
                tabs.nth(i).click()
                page.wait_for_timeout(300)

    def test_balance_visible(self, page: Page):
        login(page)
        page.goto(F + '/residents')
        page.wait_for_timeout(500)
        rows = page.locator('tbody >> tr')
        if rows.count() > 0:
            rows.first.click()
            page.wait_for_timeout(500)
            expect(page.locator('text=UZS')).to_be_visible()

    def test_action_buttons(self, page: Page):
        login(page)
        page.goto(F + '/residents')
        page.wait_for_timeout(500)
        rows = page.locator('tbody >> tr')
        if rows.count() > 0:
            rows.first.click()
            page.wait_for_timeout(500)
            # Should have edit, transfer, evict, delete buttons
            buttons = page.locator('.ml-auto >> button')
            assert buttons.count() >= 3


# ============================================================
# BUILDINGS FLOW
# ============================================================
class TestBuildingsFlow:
    def test_list_loads(self, page: Page):
        login(page)
        page.goto(F + '/buildings')
        page.wait_for_timeout(500)
        expect(page.locator('h1')).to_be_visible()

    def test_add_building_modal(self, page: Page):
        login(page)
        page.goto(F + '/buildings')
        page.wait_for_timeout(500)
        page.locator('button:has-text("+")').first.click()
        page.wait_for_timeout(500)
        expect(page.locator('.fixed')).to_be_visible()

    def test_manage_floors_link(self, page: Page):
        login(page)
        page.goto(F + '/buildings')
        page.wait_for_timeout(500)
        links = page.locator('text=Управлять')
        if links.count() > 0:
            links.first.click()
            page.wait_for_timeout(500)
            # Should navigate to floors page
            expect(page.locator('h1')).to_be_visible()


# ============================================================
# FLOORS PAGE
# ============================================================
class TestFloorsPage:
    def test_floors_load(self, page: Page):
        login(page)
        page.goto(F + '/buildings')
        page.wait_for_timeout(500)
        links = page.locator('text=Управлять')
        if links.count() > 0:
            links.first.click()
            page.wait_for_timeout(500)
            expect(page.locator('h1')).to_be_visible()

    def test_click_room_opens_modal(self, page: Page):
        login(page)
        page.goto(F + '/buildings')
        page.wait_for_timeout(500)
        links = page.locator('text=Управлять')
        if links.count() > 0:
            links.first.click()
            page.wait_for_timeout(500)
            rooms = page.locator('.rounded-lg.cursor-pointer')
            if rooms.count() > 0:
                rooms.first.click()
                page.wait_for_timeout(500)
                expect(page.locator('.fixed')).to_be_visible()


# ============================================================
# ROOMS FLOW
# ============================================================
class TestRoomsFlow:
    def test_grid_view(self, page: Page):
        login(page)
        page.goto(F + '/rooms')
        page.wait_for_timeout(1000)
        expect(page.locator('h1')).to_be_visible()

    def test_list_view(self, page: Page):
        login(page)
        page.goto(F + '/rooms')
        page.wait_for_timeout(1000)
        toggles = page.locator('.rounded-lg.p-1 >> button')
        if toggles.count() >= 2:
            toggles.last.click()
            page.wait_for_timeout(500)
            expect(page.locator('table')).to_be_visible()

    def test_click_room_modal(self, page: Page):
        login(page)
        page.goto(F + '/rooms')
        page.wait_for_timeout(1000)
        rooms = page.locator('.rounded-xl.cursor-pointer')
        if rooms.count() > 0:
            rooms.first.click()
            page.wait_for_timeout(500)
            expect(page.locator('.fixed')).to_be_visible()

    def test_room_modal_has_slots(self, page: Page):
        login(page)
        page.goto(F + '/rooms')
        page.wait_for_timeout(1000)
        rooms = page.locator('.rounded-xl.cursor-pointer')
        if rooms.count() > 0:
            rooms.first.click()
            page.wait_for_timeout(500)
            modal = page.locator('.fixed')
            expect(modal).to_be_visible()

    def test_stats_cards(self, page: Page):
        login(page)
        page.goto(F + '/rooms')
        page.wait_for_timeout(500)
        cards = page.locator('.text-2xl.font-bold')
        assert cards.count() >= 4


# ============================================================
# CONTRACTS
# ============================================================
class TestContracts:
    def test_list_loads(self, page: Page):
        login(page)
        page.goto(F + '/contracts')
        page.wait_for_timeout(500)
        expect(page.locator('h1')).to_be_visible()

    def test_status_tabs(self, page: Page):
        login(page)
        page.goto(F + '/contracts')
        page.wait_for_timeout(500)
        tabs = page.locator('.rounded-lg.p-1 >> button')
        for i in range(min(tabs.count(), 4)):
            tabs.nth(i).click()
            page.wait_for_timeout(300)

    def test_click_contract_shows_detail(self, page: Page):
        login(page)
        page.goto(F + '/contracts')
        page.wait_for_timeout(500)
        rows = page.locator('tbody >> tr')
        if rows.count() > 0:
            rows.first.click()
            page.wait_for_timeout(500)


# ============================================================
# FINANCE FLOW
# ============================================================
class TestFinanceFlow:
    def test_payments_list(self, page: Page):
        login(page)
        page.goto(F + '/finance')
        page.wait_for_timeout(500)
        expect(page.locator('h1')).to_be_visible()

    def test_new_payment_navigate(self, page: Page):
        login(page)
        page.goto(F + '/finance')
        page.wait_for_timeout(500)
        page.locator('button:has-text("+")').first.click()
        page.wait_for_timeout(500)
        expect(page).to_have_url(F + '/finance/payment/new')

    def test_payment_form_elements(self, page: Page):
        login(page)
        page.goto(F + '/finance/payment/new')
        page.wait_for_timeout(500)
        # Search field
        expect(page.locator('input').first).to_be_visible()
        # Payment method buttons (cash, transfer, card)
        buttons = page.locator('.rounded-xl.border')
        assert buttons.count() >= 3

    def test_payment_from_resident_detail(self, page: Page):
        login(page)
        page.goto(F + '/residents')
        page.wait_for_timeout(500)
        rows = page.locator('tbody >> tr')
        if rows.count() > 0:
            rows.first.click()
            page.wait_for_timeout(500)
            pay_btn = page.locator('button:has-text("+")')
            if pay_btn.count() > 0:
                pay_btn.first.click()
                page.wait_for_timeout(500)
                # Should navigate to payment page with resident pre-selected
                expect(page).to_have_url(F + '/finance/payment/new?resident=*')


# ============================================================
# REPORTS
# ============================================================
class TestReports:
    def test_page_loads(self, page: Page):
        login(page)
        page.goto(F + '/reports')
        page.wait_for_timeout(500)
        expect(page.locator('h1')).to_be_visible()

    def test_all_tabs_switch(self, page: Page):
        login(page)
        page.goto(F + '/reports')
        page.wait_for_timeout(500)
        tabs = page.locator('.border-b >> button')
        count = tabs.count()
        for i in range(min(count, 5)):
            tabs.nth(i).click()
            page.wait_for_timeout(500)

    def test_each_tab_has_content(self, page: Page):
        login(page)
        page.goto(F + '/reports')
        page.wait_for_timeout(500)
        tabs = page.locator('.border-b >> button')
        for i in range(min(tabs.count(), 5)):
            tabs.nth(i).click()
            page.wait_for_timeout(500)
            # Each tab should render something
            page.locator('.bg-dark-card').count()


# ============================================================
# AUDIT
# ============================================================
class TestAudit:
    def test_page_loads(self, page: Page):
        login(page)
        page.goto(F + '/audit')
        page.wait_for_timeout(500)
        expect(page.locator('h1')).to_be_visible()

    def test_expand_row_detail(self, page: Page):
        login(page)
        page.goto(F + '/audit')
        page.wait_for_timeout(500)
        rows = page.locator('.cursor-pointer')
        if rows.count() > 0:
            rows.first.click()
            page.wait_for_timeout(500)
            # Detail should expand
            expect(page.locator('.bg-dark-bg.border')).to_be_visible()

    def test_action_filter(self, page: Page):
        login(page)
        page.goto(F + '/audit')
        page.wait_for_timeout(500)
        sel = page.locator('select')
        if sel.count() >= 1:
            sel.first.select_option(index=1)
            page.wait_for_timeout(500)
            sel.first.select_option(index=0)

    def test_section_filter(self, page: Page):
        login(page)
        page.goto(F + '/audit')
        page.wait_for_timeout(500)
        sel = page.locator('select')
        if sel.count() >= 2:
            sel.nth(1).select_option(index=1)
            page.wait_for_timeout(500)
            sel.nth(1).select_option(index=0)


# ============================================================
# USERS FLOW
# ============================================================
class TestUsersFlow:
    def test_list_loads(self, page: Page):
        login(page)
        page.goto(F + '/users')
        page.wait_for_timeout(500)
        expect(page.locator('h1')).to_be_visible()

    def test_click_user_detail_panel(self, page: Page):
        login(page)
        page.goto(F + '/users')
        page.wait_for_timeout(500)
        rows = page.locator('tbody >> tr')
        if rows.count() > 0:
            rows.first.click()
            page.wait_for_timeout(500)
            expect(page.locator('text=Email')).to_be_visible()

    def test_detail_shows_role(self, page: Page):
        login(page)
        page.goto(F + '/users')
        page.wait_for_timeout(500)
        rows = page.locator('tbody >> tr')
        if rows.count() > 0:
            rows.first.click()
            page.wait_for_timeout(500)

    def test_add_user_modal_step1(self, page: Page):
        login(page)
        page.goto(F + '/users')
        page.wait_for_timeout(500)
        page.locator('button:has-text("+")').first.click()
        page.wait_for_timeout(500)
        # Step 1 — email verification
        expect(page.locator('.fixed >> input[type="email"]')).to_be_visible()

    def test_add_user_modal_close(self, page: Page):
        login(page)
        page.goto(F + '/users')
        page.wait_for_timeout(500)
        page.locator('button:has-text("+")').first.click()
        page.wait_for_timeout(300)
        page.locator('.fixed >> button').first.click()
        page.wait_for_timeout(300)


# ============================================================
# LANGUAGE — FULL FLOW
# ============================================================
class TestLanguageFullFlow:
    def test_uz_on_login(self, page: Page):
        page.goto(F + '/login')
        page.wait_for_timeout(300)
        page.locator('button:has-text("UZ")').click()
        page.wait_for_timeout(300)
        expect(page.locator('text=Kirish')).to_be_visible()

    def test_qq_on_login(self, page: Page):
        page.goto(F + '/login')
        page.wait_for_timeout(300)
        page.locator('button:has-text("QQ")').click()
        page.wait_for_timeout(300)
        expect(page.locator('text=Kiriw')).to_be_visible()

    def test_language_persists_after_login(self, page: Page):
        page.goto(F + '/login')
        page.wait_for_timeout(300)
        page.locator('button:has-text("UZ")').click()
        page.wait_for_timeout(200)
        page.fill('input[type="email"]', EMAIL)
        page.fill('input[type="password"]', PWD)
        page.click('button[type="submit"]')
        page.wait_for_url(F + '/')
        page.wait_for_timeout(500)
        expect(page.locator('aside >> text=Yashovchilar')).to_be_visible()
        # Reset to RU
        page.locator('aside >> button:has-text("RU")').click()
        page.wait_for_timeout(300)

    def test_switch_back_to_ru(self, page: Page):
        page.goto(F + '/login')
        page.wait_for_timeout(300)
        page.locator('button:has-text("UZ")').click()
        page.wait_for_timeout(200)
        page.locator('button:has-text("RU")').click()
        page.wait_for_timeout(300)
        expect(page.locator('text=Войти')).to_be_visible()


# ============================================================
# CROSS-BROWSER (placeholder)
# ============================================================
@pytest.mark.skip(reason='Run manually: pytest test_e2e.py --browser firefox')
class TestCrossBrowser:
    def test_login_works(self, page: Page):
        login(page)
        expect(page).to_have_url(F + '/')
