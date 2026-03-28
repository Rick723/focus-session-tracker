require "rails_helper"

RSpec.describe "タイマー pending UI", type: :system, js: true do
  before do
    driven_by(:selenium, using: :headless_chrome, screen_size: [1400, 1400])
  end

  it "期限切れ再訪時に pending 用のメッセージを表示して操作を無効化する" do
    started_at = 26.minutes.ago.iso8601

    visit timer_path

    page.execute_script(<<~JS, started_at)
      localStorage.setItem("startedAt", arguments[0]);
      localStorage.setItem("postedStartedAt", arguments[0]);
      localStorage.removeItem("focusSessionId");
    JS

    visit timer_path

    expect(page).to have_selector(
      "#timer-status-message",
      text: "保存処理を確認中です。少し待ってから再読み込みしてください。"
    )
    expect(page).to have_selector("#start-button[disabled]", visible: :all)
    expect(page).to have_selector("#stop-button[disabled]", visible: :all)
  end
end
