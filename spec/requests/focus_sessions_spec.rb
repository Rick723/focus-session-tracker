require "rails_helper"

RSpec.describe "FocusSessions", type: :request do
  def with_stubbed_current_user(user)
    allow(User).to receive(:find_by).and_call_original
    allow(User).to receive(:find_by).with(anonymous_token: user.anonymous_token).and_return(user)
  end

  def stub_focus_sessions_for(user:, started_at:, duration_seconds:, invalid_focus_session:, existing_focus_session: nil)
    focus_sessions = instance_double(ActiveRecord::Associations::CollectionProxy)

    allow(invalid_focus_session).to receive(:save).and_return(false)
    allow(user).to receive(:focus_sessions).and_return(focus_sessions)
    allow(focus_sessions).to receive(:find_by).with(started_at: started_at).and_return(nil, existing_focus_session)
    allow(focus_sessions).to receive(:build).with(ActionController::Parameters.new(
      "started_at" => started_at,
      "duration_seconds" => duration_seconds
    ).permit!).and_return(invalid_focus_session)
    with_stubbed_current_user(user)
  end

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

    it "5分未満の duration_seconds は保存せず unprocessable_content を返す" do
      get root_path

      expect do
        post focus_sessions_path, params: {
          focus_session: {
            started_at: Time.current.iso8601(6),
            duration_seconds: 299
          }
        }, as: :json
      end.not_to change(FocusSession, :count)

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.media_type).to eq("application/json")
      expect(JSON.parse(response.body)["errors"]).to be_present
    end

    it "save時に uniqueness validation が発生しても既存の focus session を再利用する" do
      started_at = Time.current.iso8601(6)

      get root_path
      user = User.order(:id).last
      existing_focus_session = create(
        :focus_session,
        user: user,
        started_at: Time.iso8601(started_at),
        duration_seconds: 300
      )
      invalid_focus_session = build(
        :focus_session,
        user: user,
        started_at: Time.iso8601(started_at),
        duration_seconds: 300
      )

      invalid_focus_session.errors.add(:started_at, :taken)
      stub_focus_sessions_for(
        user: user,
        started_at: started_at,
        duration_seconds: 300,
        invalid_focus_session: invalid_focus_session,
        existing_focus_session: existing_focus_session
      )

      expect do
        post focus_sessions_path, params: {
          focus_session: {
            started_at: started_at,
            duration_seconds: 300
          }
        }, as: :json
      end.not_to change(FocusSession, :count)

      expect(response).to have_http_status(:ok)
      expect(response.media_type).to eq("application/json")
      expect(JSON.parse(response.body)).to include(
        "id" => existing_focus_session.id,
        "reused" => true
      )
    end

    it "started_at に taken 以外の error がある場合は reused 扱いしない" do
      started_at = Time.current.iso8601(6)

      get root_path
      user = User.order(:id).last
      invalid_focus_session = build(
        :focus_session,
        user: user,
        started_at: Time.iso8601(started_at),
        duration_seconds: 300
      )

      invalid_focus_session.errors.add(:started_at, :taken)
      invalid_focus_session.errors.add(:started_at, :invalid)
      stub_focus_sessions_for(
        user: user,
        started_at: started_at,
        duration_seconds: 300,
        invalid_focus_session: invalid_focus_session
      )

      expect do
        post focus_sessions_path, params: {
          focus_session: {
            started_at: started_at,
            duration_seconds: 300
          }
        }, as: :json
      end.not_to change(FocusSession, :count)

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.media_type).to eq("application/json")
      body = JSON.parse(response.body)
      expect(body["reused"]).to be_nil
      expect(body["errors"]).to be_present
      expect(body["errors"]).to include(a_string_matching(/Started at/))
    end
  end

  describe "PATCH /focus_sessions/:id" do
    it "focus session がすでに完了済みの場合は conflict の JSON を返す" do
      get root_path
      user = User.order(:id).last
      focus_session = create(
        :focus_session,
        user: user,
        started_at: 25.minutes.ago,
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

    it "completed_at があるのに 25分未満の duration_seconds は unprocessable_content を返す" do
      get root_path
      user = User.order(:id).last
      focus_session = create(
        :focus_session,
        user: user,
        started_at: 25.minutes.ago,
        duration_seconds: 300
      )

      patch focus_session_path(focus_session), params: {
        focus_session: {
          duration_seconds: 1200,
          completed_at: Time.current.iso8601
        }
      }, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.media_type).to eq("application/json")
      expect(JSON.parse(response.body)["errors"]).to be_present

      focus_session.reload
      expect(focus_session.duration_seconds).to eq(300)
      expect(focus_session.completed_at).to be_nil
    end
  end
end
