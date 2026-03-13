class CreateFocusSessions < ActiveRecord::Migration[7.1]
  def change
    create_table :focus_sessions do |t|
      t.references :user, null:false, foreign_key: true, index: true
      #セッションに関するカラム
      t.datetime :started_at, null: false, index: true
      #t.datetime :ended_at, null: false # 実測時間をもとに状態判定できそうなので初期作成時には保留
      t.integer :duration_seconds, null:false
      #成果判定に関するカラム
      # t.datetime :reached_5min_at, null:false, index: true # started_atで状態判定できそうなので保留
      t.datetime :completed_at, index: true

      t.timestamps
    end
  end
end
