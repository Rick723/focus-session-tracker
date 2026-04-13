require "rails_helper"

RSpec.describe "モバイル縦画面レイアウト", type: :system, js: true do
  before do
    driven_by(:selenium, using: :headless_chrome, screen_size: [393, 720])
  end

  it "トップ画面の主要導線が初期表示で見切れない" do
    page.current_window.resize_to(393, 640)

    visit root_path

    expect(page).to have_link("集中を始める", href: timer_path)

    metrics = page.evaluate_script(<<~JS)
      (() => {
        const viewportHeight = window.innerHeight;
        const hero = document.querySelector(".top-hero");
        const primaryLink = document.querySelector(".top-link-button-primary");
        const utilityLink = document.querySelector(".top-hero__utility-link");

        return {
          viewportHeight,
          primaryLinkBottom: primaryLink.getBoundingClientRect().bottom,
          utilityLinkBottom: utilityLink.getBoundingClientRect().bottom,
          heroOverflowY: getComputedStyle(hero).overflowY
        };
      })()
    JS

    expect(metrics["heroOverflowY"]).not_to eq("hidden")
    expect(metrics["primaryLinkBottom"]).to be <= metrics["viewportHeight"]
    expect(metrics["utilityLinkBottom"]).to be <= metrics["viewportHeight"] + 1
  end

  it "タイマー画面の主要操作が初期表示で見切れない" do
    page.current_window.resize_to(393, 720)

    visit timer_path

    expect(page).to have_selector("#start-button", visible: :visible)
    expect(page).to have_selector("#timer-status-message", visible: :visible)

    metrics = page.evaluate_script(<<~JS)
      (() => {
        const viewportHeight = window.innerHeight;
        const timerPage = document.getElementById("timer-page");
        const startButton = document.getElementById("start-button");

        return {
          viewportHeight,
          startButtonBottom: startButton.getBoundingClientRect().bottom,
          timerPageOverflowY: getComputedStyle(timerPage).overflowY
        };
      })()
    JS

    page.execute_script(<<~JS)
      document.getElementById("timer-status-message").scrollIntoView({
        block: "nearest"
      });
    JS

    status_metrics = page.evaluate_script(<<~JS)
      (() => {
        const viewportHeight = window.innerHeight;
        const statusMessage = document.getElementById("timer-status-message");
        const rect = statusMessage.getBoundingClientRect();

        return {
          viewportHeight,
          statusMessageTop: rect.top,
          statusMessageBottom: rect.bottom
        };
      })()
    JS

    expect(metrics["timerPageOverflowY"]).not_to eq("hidden")
    expect(metrics["startButtonBottom"]).to be <= metrics["viewportHeight"]
    expect(status_metrics["statusMessageTop"]).to be >= 0
    expect(status_metrics["statusMessageBottom"]).to be <= status_metrics["viewportHeight"] + 1
  end
end
