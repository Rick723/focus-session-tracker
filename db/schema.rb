# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2026_03_13_102853) do
  create_table "focus_sessions", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.datetime "started_at", null: false
    t.integer "duration_seconds", null: false
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["completed_at"], name: "index_focus_sessions_on_completed_at"
    t.index ["started_at"], name: "index_focus_sessions_on_started_at"
    t.index ["user_id"], name: "index_focus_sessions_on_user_id"
  end

  create_table "users", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "anonymous_token", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["anonymous_token"], name: "index_users_on_anonymous_token", unique: true
  end

  add_foreign_key "focus_sessions", "users"
end
