class CreateUsers < ActiveRecord::Migration[7.1]
  def change
    create_table :users do |t|
      t.string :anonymous_token, null: false
      t.timestamps
    end
    add_index :users, :anonymous_token, unique: true
  end
end
