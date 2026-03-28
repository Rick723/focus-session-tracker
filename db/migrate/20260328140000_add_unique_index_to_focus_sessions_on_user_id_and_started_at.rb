class AddUniqueIndexToFocusSessionsOnUserIdAndStartedAt < ActiveRecord::Migration[7.1]
  def change
    add_index :focus_sessions, [:user_id, :started_at],
      unique: true,
      name: "index_focus_sessions_on_user_id_and_started_at"
  end
end
