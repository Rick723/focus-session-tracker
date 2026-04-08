FROM ruby:3.2.10

RUN apt-get update -qq && \
    apt-get install -y \
      build-essential \
      chromium \
      chromium-driver \
      default-libmysqlclient-dev \
      libyaml-dev \
      nodejs \
      pkg-config

WORKDIR /app

COPY Gemfile Gemfile.lock ./

RUN bundle install

COPY . .

RUN RAILS_ENV=production SECRET_KEY_BASE_DUMMY=1 ./bin/rails assets:precompile

EXPOSE 3000

ENTRYPOINT ["./bin/docker-entrypoint"]
CMD ["bin/rails", "server", "-b", "0.0.0.0"]
