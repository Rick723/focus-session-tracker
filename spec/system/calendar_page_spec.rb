require "rails_helper"

RSpec.describe "カレンダー画面", type: :system, js: true do
  include ActiveSupport::Testing::TimeHelpers

  before do
    driven_by(:selenium, using: :headless_chrome, screen_size: [1400, 1400])
  end

  it "月表示カードに日別の記録を表示できる" do
    travel_to Time.zone.local(2026, 4, 10, 12, 0, 0) do
      visit root_path
      user = User.order(:id).last

      create(
        :focus_session,
        user: user,
        started_at: Time.zone.local(2026, 4, 3, 9, 0, 0),
        duration_seconds: 1500,
        completed_at: Time.zone.local(2026, 4, 3, 9, 25, 0)
      )
      create(
        :focus_session,
        user: user,
        started_at: Time.zone.local(2026, 4, 3, 14, 0, 0),
        duration_seconds: 300,
        completed_at: nil
      )

      visit calendar_path(month: "2026-04")

      expect(page).to have_selector(".calendar-title", text: "2026年4月 の育成記録")
      expect(page).to have_selector("[data-calendar-day][data-date='2026-04-03']")

      within("[data-calendar-day][data-date='2026-04-03']") do
        expect(page).to have_text("2件")
        expect(page).to have_text("実測 30分")
        expect(page).to have_selector(".calendar-badge__icon", count: 2)
        expect(page).to have_text("完走")
        expect(page).to have_text("5分到達")
      end
    end
  end

  it "日付カードから詳細モーダルを開いてセッション内容を見られる" do
    travel_to Time.zone.local(2026, 4, 10, 12, 0, 0) do
      visit root_path
      user = User.order(:id).last

      create(
        :focus_session,
        user: user,
        started_at: Time.zone.local(2026, 4, 5, 10, 0, 0),
        duration_seconds: 1500,
        completed_at: Time.zone.local(2026, 4, 5, 10, 25, 0)
      )

      visit calendar_path(month: "2026-04")

      find("[data-calendar-day][data-date='2026-04-05']").click

      expect(page).to have_selector(".calendar-modal-panel", visible: :visible)
      expect(page).to have_selector("[data-calendar-modal-date]", text: "2026-04-05")
      expect(page).to have_selector(".calendar-modal-summary-badge__icon")
      expect(page).to have_selector(".calendar-session-item-icon")
      expect(page).to have_selector(".calendar-session-item-meta", text: "開始時刻")

      find(".calendar-modal-close", visible: :visible).click

      expect(page).to have_selector("[data-calendar-modal][hidden]", visible: :all)
    end
  end
end
