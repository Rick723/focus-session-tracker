module PagesHelper
  def focus_duration_label(total_seconds)
    minutes = total_seconds.to_i / 60

    "実測 #{minutes}分"
  end

  def pomo_doro_badge_class(kind)
    case kind
    when :completed
      "calendar-badge calendar-badge-completed"
    when :reached_five_minutes
      "calendar-badge calendar-badge-five-minutes"
    else
      "calendar-badge calendar-badge-other"
    end
  end
end
