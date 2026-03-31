require "rails_helper"

RSpec.describe "タイマー conflict UI", type: :system, js: true do
  before do
    driven_by(:selenium, using: :headless_chrome, screen_size: [1400, 1400])
  end

  def current_user
    User.order(:id).last
  end

  it "25分超過再訪時に PATCH が 409 でも初期状態へ戻る" do
    started_at = 26.minutes.ago.iso8601

    visit timer_path
    focus_session = create(
      :focus_session,
      user: current_user,
      started_at: Time.iso8601(started_at),
      duration_seconds: 1500,
      completed_at: Time.current
    )

    page.execute_script(<<~JS, started_at)
      localStorage.setItem("startedAt", arguments[0]);
      localStorage.setItem("focusSessionId", "#{focus_session.id}");
      localStorage.setItem("postedStartedAt", arguments[0]);
    JS

    visit timer_path

    expect(page).to have_selector("#time", text: "25:00")
    expect(page).to have_selector("#start-button", visible: :visible)
    expect(page).to have_selector("#stop-button[hidden]", visible: :all)
    expect(page).to have_selector(
      "#timer-status-message",
      text: "すでに保存済みのため初期状態に戻しました。"
    )

    values = page.evaluate_script(<<~JS)
      [
        localStorage.getItem("startedAt"),
        localStorage.getItem("focusSessionId"),
        localStorage.getItem("postedStartedAt")
      ]
    JS

    expect(values).to eq([nil, nil, nil])
  end

  it "停止時に PATCH が 409 でも再読み込みロックせず初期状態へ戻る" do
    started_at = 1.minute.ago.iso8601

    visit timer_path
    focus_session = create(
      :focus_session,
      user: current_user,
      started_at: Time.iso8601(started_at),
      duration_seconds: 1500,
      completed_at: Time.current
    )

    page.execute_script(<<~JS, started_at)
      localStorage.setItem("startedAt", arguments[0]);
      localStorage.setItem("focusSessionId", "#{focus_session.id}");
      localStorage.setItem("postedStartedAt", arguments[0]);
    JS

    visit timer_path

    accept_confirm do
      find("#stop-button", visible: :visible).click
    end

    expect(page).to have_selector("#time", text: "25:00")
    expect(page).to have_selector("#start-button", visible: :visible)
    expect(page).to have_selector("#stop-button[hidden]", visible: :all)
    expect(page).to have_selector(
      "#timer-status-message",
      text: "すでに保存済みのため初期状態に戻しました。"
    )
    expect(page).to have_no_selector("#start-button[disabled]", visible: :all)

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
