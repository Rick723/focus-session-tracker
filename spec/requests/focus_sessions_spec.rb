require "rails_helper"

RSpec.describe "FocusSessions", type: :request do
  describe "POST /focus_sessions" do
    it "同じ user と started_at の場合は既存の focus session を再利用する" do
      started_at = Time.current.iso8601(6)

      get root_path

      expect do
        post focus_sessions_path, params: {
          focus_session: {
            started_at: started_at,
            duration_seconds: 300
          }
        }, as: :json
      end.to change(FocusSession, :count).by(1)

      first_body = JSON.parse(response.body)

      expect(response).to have_http_status(:created)
      expect(response.media_type).to eq("application/json")
      expect(first_body["id"]).to be_present

      expect do
        post focus_sessions_path, params: {
          focus_session: {
            started_at: started_at,
            duration_seconds: 300
          }
        }, as: :json
      end.not_to change(FocusSession, :count)

      second_body = JSON.parse(response.body)

      expect(response).to have_http_status(:ok)
      expect(response.media_type).to eq("application/json")
      expect(second_body).to include(
        "id" => first_body["id"],
        "reused" => true
      )
    end
  end

  describe "PATCH /focus_sessions/:id" do
    it "focus session がすでに完了済みの場合は conflict の JSON を返す" do
      get root_path
      user = User.order(:id).last
      focus_session = create(
        :focus_session,
        user: user,
        completed_at: Time.current
      )

      patch focus_session_path(focus_session), params: {
        focus_session: {
          duration_seconds: 1500,
          completed_at: Time.current.iso8601
        }
      }, as: :json

      expect(response).to have_http_status(:conflict)
      expect(response.media_type).to eq("application/json")
      expect(JSON.parse(response.body)).to include("error" => "already_completed")
    end
  end
end
