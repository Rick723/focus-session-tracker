require "rails_helper"

RSpec.describe "トップ画面", type: :system, js: true do
  before do
    driven_by(:selenium, using: :headless_chrome, screen_size: [1400, 1400])
  end

  it "アプリ名と主要導線が表示される" do
    visit root_path

    expect(page).to have_selector("h1", text: "はじめの５分集中タイマー")
    expect(page).to have_selector(".top-hero__subtitle", text: "〜 ポモちゃんドロちゃん育成記録 〜")
    expect(page).to have_link("集中を始める", href: timer_path)
    expect(page).to have_link("記録を見る", href: calendar_path)
    expect(page).to have_link("Xで宣言する", href: /twitter\.com\/intent\/tweet/)
    expect(page).to have_selector("[data-top-modal-open]", text: "アプリについて")
    expect(page).to have_selector("[data-top-modal-open]", text: "プライバシーポリシー")
  end

  it "インフォメーションボタンから説明モーダルを開閉できる" do
    visit root_path

    expect(page).to have_selector("[data-top-modal][hidden]", visible: :all)

    find("[data-top-modal-open][aria-controls='top-info-modal']").click

    expect(page).to have_selector("[data-top-modal]", visible: :visible)
    expect(page).to have_selector("#top-modal-title", text: "アプリについて")
    expect(page).to have_selector(
      "#top-modal-description",
      text: "集中を始めるきっかけは、まず5分でじゅうぶん。"
    )

    find(".top-modal__close", visible: :visible).click

    expect(page).to have_selector("[data-top-modal][hidden]", visible: :all)
  end

  it "プライバシーポリシーモーダルを開閉できる" do
    visit root_path

    find("[data-top-modal-open][aria-controls='top-privacy-modal']").click

    expect(page).to have_selector("#top-privacy-modal", visible: :visible)
    expect(page).to have_selector("#top-privacy-modal-title", text: "プライバシーポリシー")
    expect(page).to have_selector(
      "#top-privacy-modal-description",
      text: "anonymous_token"
    )
    expect(page).to have_selector(
      "#top-privacy-modal-description",
      text: "startedAt"
    )
    expect(page).to have_selector(
      "#top-privacy-modal-description",
      text: "cookie や localStorage を削除すると、履歴や進行中タイマーの状態が失われることがあります。"
    )

    page.execute_script("document.querySelector('#top-privacy-modal .top-modal__backdrop').click()")

    expect(page).to have_selector("#top-privacy-modal[hidden]", visible: :all)
  end
end
