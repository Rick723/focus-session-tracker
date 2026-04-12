require "rails_helper"

RSpec.describe "タイマー通知設定 UI", type: :system, js: true do
  before do
    driven_by(:selenium, using: :headless_chrome, screen_size: [1400, 1400])
  end

  it "デスクトップ幅では通知設定ボタンが表示される" do
    visit timer_path

    expect(page).to have_selector("#timer-notification-button", visible: :visible)
  end
end
