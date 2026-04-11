require "rails_helper"

RSpec.describe "タイマー復元 UI", type: :system, js: true do
  before do
    driven_by(:selenium, using: :headless_chrome, screen_size: [1400, 1400])
  end

  it "5分到達後に再読み込みしても成長状態と導線が崩れない" do
    started_at = 8.minutes.ago.iso8601

    visit timer_path

    page.execute_script(<<~JS, started_at)
      localStorage.setItem("startedAt", arguments[0]);
      localStorage.setItem("focusSessionId", "123");
      localStorage.setItem("postedStartedAt", arguments[0]);
    JS

    visit timer_path

    expect(page).to have_selector("#creature-icon[data-creature-stage='sprout']")
    expect(page).to have_selector("#stop-button", visible: :visible)
    expect(page).to have_no_selector("#page-links", visible: :visible)
    expect(page).to have_selector("#timer-status-message", text: "ドロちゃんがすくすく育っています。")
  end
end
