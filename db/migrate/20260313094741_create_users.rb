class CreateUsers < ActiveRecord::Migration[7.1]
  def change
    create_table :users do |t|
      t.string :anonymous_token, null: false, index: { unique: true }

      t.timestamps
    end
  end
end
