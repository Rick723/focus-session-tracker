class ApplicationController < ActionController::Base
  before_action :ensure_anonymous_user

  private

  def ensure_anonymous_user
    # まずはCookieからトークン文字列を読む
    token = cookies.encrypted[:anonymous_token]
    user = nil

    # トークンがあれば、対応するユーザーを探す
    if token.present?
      user = User.find_by(anonymous_token: token)

      # ユーザーが見つかったときだけ、有効期限を更新して再保存
      # TODO トークン自体の更新でセキュリティ性の向上を担保する
      if user
        cookies.encrypted[:anonymous_token] = {
          value: token,
          expires: 3.months
        }
      end
    end

    # ユーザーが見つからなければ新規作成
    if user.nil?
      token = SecureRandom.hex(16)
      user = User.create!(anonymous_token: token)

      cookies.encrypted[:anonymous_token] = {
        value: token,
        expires: 3.months
      }
    end

    @current_user = user
  end

  def current_user
    @current_user
  end
end