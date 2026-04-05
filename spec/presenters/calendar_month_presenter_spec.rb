require "rails_helper"

RSpec.describe CalendarMonthPresenter do
  describe "#daily_summaries" do
    it "focus session を日ごとに分類して表示用データへ整形する" do
      user = create(:user)
      create(
        :focus_session,
        user: user,
        started_at: Time.zone.local(2026, 4, 8, 9, 0, 0),
        duration_seconds: 1500,
        completed_at: Time.zone.local(2026, 4, 8, 9, 25, 0)
      )
      create(
        :focus_session,
        user: user,
        started_at: Time.zone.local(2026, 4, 8, 14, 0, 0),
        duration_seconds: 300,
        completed_at: nil
      )
      create(
        :focus_session,
        user: user,
        started_at: Time.zone.local(2026, 3, 30, 14, 0, 0),
        duration_seconds: 300,
        completed_at: nil
      )

      summaries = described_class.new(focus_sessions: user.focus_sessions.where(started_at: Date.new(2026, 4, 1).all_month)).daily_summaries
      target_day = summaries.fetch(Date.new(2026, 4, 8))

      expect(target_day[:session_count]).to eq(2)
      expect(target_day[:total_focus_seconds]).to eq(1800)
      expect(target_day[:pomo_doro_items]).to eq(
        [
          { kind: :completed, label: "完走", count: 1 },
          { kind: :reached_five_minutes, label: "5分到達", count: 1 }
        ]
      )
    end

    it "2種類に当てはまらない session は分類項目に含めない" do
      user = create(:user)
      create(
        :focus_session,
        user: user,
        started_at: Time.zone.local(2026, 4, 9, 10, 0, 0),
        duration_seconds: 120,
        completed_at: nil
      )

      summaries = described_class.new(
        focus_sessions: user.focus_sessions.where(started_at: Date.new(2026, 4, 1).all_month)
      ).daily_summaries

      expect(summaries).to eq({})
    end
  end
end
