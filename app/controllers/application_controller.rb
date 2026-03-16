class ApplicationController < ActionController::Base
  before_action :ensure_anonymous_user

  private
  #初回アクセス時にトークン作成メソッド（Cookie)
    def ensure_anonymous_user
      #Cookieの暗号化
      token = cookies.encrypted[:anonymous_token]
      user = nil

      #トークンに合致したユーザーが存在しているかの判定
      if token.present?
        #ユーザー情報の取得
        user = User.find_by(anonymous_token: token)

        # userを取得した際に有効期限を付与（毎回更新）
        if user
          cookies.encrypted[:anonymous_token] = {
            value: token,
            expires: 3.months
          }
        end
      end

      #ユーザーが存在していない場合新しいトークンを作成
      if user.nil?
        #ランダムに文字列を生成し、トークンにする
        token = SecureRandom.hex(16)
        #トークンがない場合新しくユーザーを登録
        user = User.create!(anonymous_token: token)
        #新しく作成したトークンと紐づけし、暗号化して保存
        cookies.encrypted[:anonymous_token] = token
      end

        @current_user = user
    end

    #既に取得してあるユーザーを返すメソッド
    def current_user
      @current_user
    end
  
end
