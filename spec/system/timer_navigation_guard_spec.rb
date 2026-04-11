require "rails_helper"

RSpec.describe "タイマー導線制御", type: :system, js: true do
  before do
    driven_by(:selenium, using: :headless_chrome, screen_size: [1400, 1400])
  end

  it "稼働中は他画面リンクを隠し5分未満停止で初期状態へ戻す" do
    visit timer_path

    expect(page).to have_selector("#page-links", visible: :visible)

    find("#start-button").click

    expect(page).to have_no_selector("#page-links", visible: :visible)
    expect(page).to have_selector("#stop-button", visible: :visible)

    accept_confirm do
      find("#stop-button", visible: :visible).click
    end

    expect(page).to have_selector("#page-links", visible: :visible)
    expect(page).to have_selector("#start-button", visible: :visible)
    expect(page).to have_selector("#stop-button[hidden]", visible: :all)
    expect(page).to have_selector("#time", text: "25:00")
    expect(page).to have_selector("#creature-icon[data-creature-stage='seed']")
    expect(page).to have_selector("#timer-status-message", text: "たねをまいて集中タイムを始めましょう！")
    expect(FocusSession.count).to eq(0)

    values = page.evaluate_script(<<~JS)
      [
        localStorage.getItem("startedAt"),
        localStorage.getItem("focusSessionId"),
        localStorage.getItem("postedStartedAt")
      ]
    JS

    expect(values).to eq([nil, nil, nil])
  end
end
