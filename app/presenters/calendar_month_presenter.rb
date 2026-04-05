class CalendarMonthPresenter
  FIVE_MINUTES_IN_SECONDS = 300

  def self.empty_summary
    {
      session_count: 0,
      total_focus_seconds: 0,
      pomo_doro_counts: Hash.new(0),
      pomo_doro_items: []
    }
  end

  def initialize(focus_sessions:)
    @focus_sessions = focus_sessions
  end

  def daily_summaries
    @daily_summaries ||= begin
      summaries = Hash.new { |hash, key| hash[key] = self.class.empty_summary }

      focus_sessions.each do |focus_session|
        session_kind = classify_session(focus_session)
        next if session_kind.nil?

        date = focus_session.started_at.in_time_zone.to_date
        summary = summaries[date]

        summary[:session_count] += 1
        summary[:total_focus_seconds] += focus_session.duration_seconds.to_i
        summary[:pomo_doro_counts][session_kind] += 1
      end

      summaries.transform_values do |summary|
        summary.merge(pomo_doro_items: build_pomo_doro_items(summary[:pomo_doro_counts]))
      end
    end
  end

  private

  attr_reader :focus_sessions

  def classify_session(focus_session)
    return :completed if focus_session.completed_at.present?
    return :reached_five_minutes if focus_session.duration_seconds.to_i >= FIVE_MINUTES_IN_SECONDS

    nil
  end

  def build_pomo_doro_items(counts)
    [
      { kind: :completed, label: "完走", count: counts[:completed] },
      { kind: :reached_five_minutes, label: "5分到達", count: counts[:reached_five_minutes] }
    ].select { |item| item[:count].positive? }
  end
end
