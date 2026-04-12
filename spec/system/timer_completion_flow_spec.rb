require "rails_helper"

RSpec.describe "タイマー完了フロー", type: :system, js: true do
  before do
    driven_by(:selenium, using: :headless_chrome, screen_size: [1400, 1400])
  end

  it "5分到達で記録し25分完了で初期状態へ戻る" do
    visit timer_path

    find("#start-button").click
    expect(page).to have_selector("#stop-button", visible: :visible)
    page.execute_script("window.timerTestHooks.stopTimer()")

    page.execute_script("window.timerTestHooks.setRemaining(1201)")
    page.evaluate_async_script(<<~JS)
      const done = arguments[0];
      window.timerTestHooks.tick().then(done);
    JS

    focus_session = FocusSession.order(:id).last

    expect(focus_session).to be_present
    expect(focus_session.duration_seconds).to eq(300)
    expect(focus_session.completed_at).to be_nil
    expect(page).to have_selector("#creature-icon[data-creature-stage='sprout']")
    expect(page).to have_no_selector("#page-links", visible: :visible)

    page.execute_script(<<~JS)
      window.timerTestHooks.setFocusSessionId(localStorage.getItem("focusSessionId"))
      window.timerTestHooks.setRemaining(1)
    JS
    page.evaluate_async_script(<<~JS)
      const done = arguments[0];
      window.timerTestHooks.tick().then(done);
    JS

    focus_session.reload

    expect(focus_session.duration_seconds).to eq(1500)
    expect(focus_session.completed_at).to be_present
    expect(page).to have_selector("#creature-icon[data-creature-stage='harvest']")
    expect(page).to have_selector("#result-icon", visible: :visible)
    expect(page).to have_selector("#timer-result-confirm", visible: :visible)
    expect(page).to have_selector("#timer-status-message", text: "ポモちゃんが実りました！ 次のたねもまけます。")

    find("#timer-result-confirm", visible: :visible).click

    expect(page).to have_selector("#time", text: "25:00")
    expect(page).to have_selector("#creature-icon[data-creature-stage='seed']")
    expect(page).to have_selector("#start-button", visible: :visible)
    expect(page).to have_selector("#stop-button[hidden]", visible: :all)
    expect(page).to have_selector("#page-links", visible: :visible)
    expect(page).to have_selector("#timer-status-message", text: "たねをまいて集中タイムを始めましょう！")

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
