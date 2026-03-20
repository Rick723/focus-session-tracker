class FocusSessionsController < ApplicationController

  def create
    # 5分到達時に初めてFocusSessionを生成
    @focus_session = current_user.focus_sessions.build(create_params)

    if @focus_session.save
      render json: { id: @focus_session.id }, status: :created
    else
      render json: { errors: @focus_session.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    # 25分完了時に現在ユーザーの対象セッションを取得して更新
    @focus_session = current_user.focus_sessions.find(params[:id])

    if @focus_session.update(update_params)
      render json: { id: @focus_session.id }, status: :ok
    else
      render json: { errors: @focus_session.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def create_params
    params.require(:focus_session).permit(:duration_seconds, :started_at)
  end

  def update_params
    params.require(:focus_session).permit(:duration_seconds, :completed_at)
  end
end