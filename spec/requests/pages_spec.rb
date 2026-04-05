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
        expect(response.body).to include('data-calendar-day')
        expect(response.body).to include('data-date="2026-04-03"')
        expect(response.body).to include('data-calendar-modal')
      end
    end
  end

  describe "GET /calendar/day_details" do
    it "current_user 配下の指定日の sessions を started_at 昇順で返す" do
      travel_to Time.zone.local(2026, 4, 10, 12, 0, 0) do
        get root_path
        user = User.order(:id).last
        other_user = create(:user)

        early_session = create(
          :focus_session,
          user: user,
          started_at: Time.zone.local(2026, 4, 5, 10, 0, 0),
          duration_seconds: 1500,
          completed_at: Time.zone.local(2026, 4, 5, 10, 25, 0)
        )
        later_session = create(
          :focus_session,
          user: user,
          started_at: Time.zone.local(2026, 4, 5, 14, 10, 0),
          duration_seconds: 480,
          completed_at: nil
        )
        create(
          :focus_session,
          user: user,
          started_at: Time.zone.local(2026, 4, 5, 18, 0, 0),
          duration_seconds: 120,
          completed_at: nil
        )
        create(
          :focus_session,
          user: other_user,
          started_at: Time.zone.local(2026, 4, 5, 9, 0, 0),
          duration_seconds: 1500,
          completed_at: Time.zone.local(2026, 4, 5, 9, 25, 0)
        )

        get calendar_day_details_path(date: "2026-04-05")

        expect(response).to have_http_status(:ok)

        body = JSON.parse(response.body)

        expect(body).to eq(
          {
            "date" => "2026-04-05",
            "sessions" => [
              {
                "id" => early_session.id,
                "started_at" => early_session.started_at.iso8601,
                "duration_seconds" => 1500,
                "completed_at" => early_session.completed_at.iso8601,
                "kind" => "completed"
              },
              {
                "id" => later_session.id,
                "started_at" => later_session.started_at.iso8601,
                "duration_seconds" => 480,
                "completed_at" => nil,
                "kind" => "reached_five_minutes"
              }
            ]
          }
        )
      end
    end

    it "対象日が 0件でも date と空配列を返す" do
      travel_to Time.zone.local(2026, 4, 10, 12, 0, 0) do
        get root_path

        get calendar_day_details_path(date: "2026-04-06")

        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)).to eq(
          {
            "date" => "2026-04-06",
            "sessions" => []
          }
        )
      end
    end
  end
end
