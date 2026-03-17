class User < ApplicationRecord
  has_many :focus_sessions, dependent: :destroy
end
