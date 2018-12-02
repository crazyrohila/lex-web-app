# Chatbot Widget

Chatbot webapp is a chatbot wizard.

# Usage

  - Copy `dist` folder to project.
  - Just add following markup to any page or add new html file with this content:
  ```
  <script>
    fullPage = false;
    chatbot_identifier = 'chatbot-widget';
    botName = '<lex-bot>'
    awsRegion = '<aws-region>'
    awsCognitoPoolId = '<aws-cognito-pool>'
  </script>
  <div id="chatbot-widget" data-username="Hey User">
  <script src="dist/bundle.min.js"></script>
  ```
  Change the `botName`, `awsRegion`, `awsCognitoPoolId` and bundle file path.

# Build

install packages: `npm install`
run bundle task: `gulp bundle`

It will create `dist` directory and place minifies CSS and JS files in it. Always use minified files in production.

# Response Templates

See the <a href="response.md">response.md</a> file for expected response format.
