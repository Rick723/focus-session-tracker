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
end
