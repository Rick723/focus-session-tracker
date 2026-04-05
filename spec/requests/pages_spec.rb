require "rails_helper"

RSpec.describe "Pages", type: :request do
  include ActiveSupport::Testing::TimeHelpers

  describe "GET /" do
    it "トップページに正常にアクセスできる" do
      get root_path

      expect(response).to have_http_status(:ok)
    end
  end

  describe "GET /calendar" do
    it "表示月の focus session を日ごとに集計して表示する" do
      travel_to Time.zone.local(2026, 4, 10, 12, 0, 0) do
        get root_path
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
        create(
          :focus_session,
          user: user,
          started_at: Time.zone.local(2026, 5, 1, 9, 0, 0),
          duration_seconds: 1500,
          completed_at: Time.zone.local(2026, 5, 1, 9, 25, 0)
        )

        get calendar_path(month: "2026-04")

        expect(response).to have_http_status(:ok)
        expect(response.body).to include("2026年4月 の成果")
        expect(response.body).to include("実測 30分")
        expect(response.body).to include("完走 1")
        expect(response.body).to include("5分到達 1")
        expect(response.body).not_to include("完走 2")
      end
    end
  end
end
