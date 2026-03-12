FROM ruby:3.2

RUN apt-get update -qq && \
    apt-get install -y \
      build-essential \
      default-libmysqlclient-dev \
      libyaml-dev \
      nodejs \
      pkg-config

WORKDIR /app

COPY Gemfile Gemfile.lock ./

RUN bundle install

COPY . .

EXPOSE 3000

CMD ["bin/rails", "server", "-b", "0.0.0.0"]