FactoryBot.define do
  factory :user do
    sequence(:anonymous_token) { |n| "anonymous-token-#{n}" }
  end
end
