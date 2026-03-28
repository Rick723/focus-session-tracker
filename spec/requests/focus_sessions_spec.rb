require "rails_helper"

RSpec.describe "FocusSessions", type: :request do
  describe "PATCH /focus_sessions/:id" do
    it "returns conflict json when focus session is already completed" do
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
