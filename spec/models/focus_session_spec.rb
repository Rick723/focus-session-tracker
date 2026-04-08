require "rails_helper"

RSpec.describe FocusSession, type: :model do
  describe "validations" do
    it "5分未満の duration_seconds では無効" do
      focus_session = build(:focus_session, duration_seconds: 299)

      expect(focus_session).to be_invalid
      expect(focus_session.errors[:duration_seconds]).to be_present
    end

    it "completed_at がある場合は 25分完了の duration_seconds が必要" do
      focus_session = build(
        :focus_session,
        duration_seconds: 1200,
        completed_at: Time.current
      )

      expect(focus_session).to be_invalid
      expect(focus_session.errors[:duration_seconds]).to include("must be 1500 when completed_at is present")
    end
  end
end
