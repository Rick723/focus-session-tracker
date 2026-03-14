class CreateFocusSessions < ActiveRecord::Migration[7.1]
  def change
    create_table :focus_sessions do |t|
      t.references :user, null: false, foreign_key: true
      #セッションに関するカラム
      t.datetime :started_at, null: false
      t.integer :duration_seconds, null: false
      #成果判定に関するカラム
      t.datetime :completed_at

      t.index :started_at
      t.index :completed_at
      t.timestamps
    end
  end
end
