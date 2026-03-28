FactoryBot.define do
  factory :focus_session do
    association :user
    started_at { Time.current }
    duration_seconds { 1500 }
    completed_at { nil }
  end
end
