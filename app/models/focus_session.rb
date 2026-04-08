class FocusSession < ApplicationRecord
  belongs_to :user

  validates :started_at, presence: true, uniqueness: { scope: :user_id }
  validates :duration_seconds, presence: true,
    numericality: { only_integer: true, greater_than_or_equal_to: 300, less_than_or_equal_to: 1500 }
  validate :completed_at_is_not_before_started_at
  validate :completed_session_has_full_duration

  private

  def completed_at_is_not_before_started_at
    return if completed_at.blank? || started_at.blank?
    return unless completed_at < started_at

    errors.add(:completed_at, "must be greater than or equal to started_at")
  end

  def completed_session_has_full_duration
    return if completed_at.blank?
    return if duration_seconds == 1500

    errors.add(:duration_seconds, "must be 1500 when completed_at is present")
  end
end
