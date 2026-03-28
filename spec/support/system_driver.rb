require "action_dispatch/system_testing/browser"

Selenium::WebDriver::Chrome::Service.driver_path = ENV.fetch("CHROMEDRIVER_PATH", "/usr/bin/chromedriver")

module HeadlessChromeDockerOptions
  private

  def set_headless_chrome_browser_options
    super

    configure do |capabilities|
      capabilities.add_argument("--no-sandbox")
      capabilities.add_argument("--disable-dev-shm-usage")
      capabilities.add_argument("--disable-gpu")
      capabilities.binary = ENV.fetch("CHROME_BIN", "/usr/bin/chromium")
    end
  end
end

ActionDispatch::SystemTesting::Browser.prepend(HeadlessChromeDockerOptions)
