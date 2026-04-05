class PagesController < ApplicationController
  def top
  end

  def timer
  end

  def calendar
    @display_month = parse_display_month(params[:month])
    # 月間のセッションを取得
    @month_focus_sessions = current_user.focus_sessions
      .where(started_at: month_range(@display_month))
      .order(:started_at)
    # 取得したセッションを日単位で表示しやすいように整形
    @daily_summaries = CalendarMonthPresenter.new(
      focus_sessions: @month_focus_sessions
    ).daily_summaries
  end

  def calendar_day_details
    target_date = parse_target_date(params[:date])
    sessions = current_user.focus_sessions
      .where(started_at: day_range(target_date))
      .order(:started_at)

    render json: {
      date: target_date.iso8601,
      sessions: sessions.filter_map do |focus_session|
        kind = CalendarMonthPresenter.session_kind_for(focus_session)
        next if kind.nil?

        {
          id: focus_session.id,
          started_at: focus_session.started_at.iso8601,
          duration_seconds: focus_session.duration_seconds,
          completed_at: focus_session.completed_at&.iso8601,
          kind: kind.to_s
        }
      end
    }
  rescue ArgumentError, TypeError
    render json: { error: "invalid date" }, status: :bad_request
  end

  private

  def parse_display_month(raw_month)
    return Time.zone.today.beginning_of_month.to_date if raw_month.blank?

    Date.strptime(raw_month, "%Y-%m").beginning_of_month
  rescue ArgumentError
    Time.zone.today.beginning_of_month.to_date
  end

  def month_range(display_month)
    display_month.beginning_of_month.beginning_of_day..display_month.end_of_month.end_of_day
  end

  def day_range(target_date)
    target_date.beginning_of_day..target_date.end_of_day
  end

  def parse_target_date(raw_date)
    Date.iso8601(raw_date)
  end
end
