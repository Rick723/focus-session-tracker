class CreateUsers < ActiveRecord::Migration[7.1]
  def change
    create_table :users do |t|
      t.string :anonymous_token, null: false
      t.index :anonymous_token, unique: true
      t.timestamps
    end
  end
end
