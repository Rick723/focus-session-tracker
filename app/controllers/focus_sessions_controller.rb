class FocusSessionsController < ApplicationController
  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found

  def create
    # 5分到達時に初めてFocusSessionを生成
    focus_session_params = create_params
    # 既存レコードを確認、あれば再利用対象としてJSONレスポンスとしてidと200ステータスコードを返す
    existing_focus_session = current_user.focus_sessions.find_by(started_at: focus_session_params[:started_at])

    if existing_focus_session
      render json: { id: existing_focus_session.id, reused: true }, status: :ok
      return
    end

    @focus_session = current_user.focus_sessions.build(focus_session_params)

    if @focus_session.save
      render json: { id: @focus_session.id }, status: :created
    else
      render json: { errors: @focus_session.errors.full_messages }, status: :unprocessable_entity
    end
  rescue ActiveRecord::RecordNotUnique
    existing_focus_session = current_user.focus_sessions.find_by(started_at: focus_session_params[:started_at])

    if existing_focus_session
      render json: { id: existing_focus_session.id, reused: true }, status: :ok
    else
      render json: { error: "focus_session_conflict" }, status: :conflict
    end
  end

  def update
    # 25分完了時に現在ユーザーの対象セッションを取得して更新
    @focus_session = current_user.focus_sessions.find(params[:id])

    if @focus_session.completed_at.present?
      render json: { error: "already_completed" }, status: :conflict
      return
    end

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

  def render_not_found
    render json: { error: "not_found" }, status: :not_found
  end
end
