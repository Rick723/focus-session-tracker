module PagesHelper
  def focus_duration_label(total_seconds)
    minutes = total_seconds.to_i / 60

    "実測 #{minutes}分"
  end

  def calendar_session_kind_label(kind)
    case kind.to_sym
    when :completed
      "ポモちゃん"
    when :reached_five_minutes
      "ドロちゃん"
    else
      "きろく"
    end
  end

  def calendar_session_kind_icon_path(kind, size:)
    filename = case kind.to_sym
    when :completed
      "creature_images/pixel_creatures/pomo-chan_#{size}px.png"
    when :reached_five_minutes
      "creature_images/pixel_creatures/doro-chan_#{size}px.png"
    end

    filename.present? ? asset_path(filename) : nil
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
