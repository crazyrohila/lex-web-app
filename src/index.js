// 'use strict';
// set the focus to the input box

// Initialize the Amazon Cognito credentials provider
var chatbot = {
  rootElementId: window.chatbot_identifier ? chatbot_identifier : 'chatbot-widget',
  initializer: window.initializer ? initializer : null,
  widget: window.fullPage ? false : true,
  botName: window.botName ? botName : null,
  botAlias: window.botAlias ? botAlias : '$LATEST',
  region: window.awsRegion ? awsRegion : 'us-east-1',
  poolId: window.awsCognitoPoolId ? awsCognitoPoolId : null,
  lexruntime: null,
  lexUserId: 'lex-web-' + Date.now(),
  sessionAttributes: {},
  aws_sdk_path: 'https://sdk.amazonaws.com/js/aws-sdk-2.340.0.min.js'
}
var jq;

// Get selector only inside root element
function elementWithRootContext(selector) {
  return '#' + chatbot.rootElementId + ' ' + selector;
}

// get the #conversation div
function getConversationNode() {
  return document.querySelector(elementWithRootContext('#conversation'));
}

// Get the main-container inside root element
function getWidgetContainer(event, widget) {
  var widgetContainer = document.createElement('div');
  widgetContainer.className = 'main-container';
  widgetContainer.setAttribute("id", "main-container");
  widgetContainer.innerHTML = pageTemplate(widget);
  if (widget) {
    var e = event.target;
    var dim = e.getBoundingClientRect();
    var x = (event.clientX - dim.left) + 'px';
    var y = (event.clientY - (dim.top + dim.height)) + 'px';
    widgetContainer.style = 'position: fixed; right: '+x+';';
  }
  return widgetContainer;
}

function pageTemplate(widget) {
  return `
    <div class="chatbot-header">
      <div class="logo">
        Lex Web-App
      </div>
      <div class="powered-logo">
        <img src="https://d1.awsstatic.com/logos/aws/PB_AWS_logo_RGB.jpg">
      </div>
      ${
        widget ? `<div class="widget-actions">
        <span class="widget-actions__toggle" onclick="show_hide()">__</span>
        <span class="widget-actions__close" onclick="close_widget()">X</i></span>
        </div>` : ''
      }
    </div>
    <div id="conversation"></div>
    <form id="chatform" class="chatform" onsubmit="return pushMessageToLex();">
      <input type="text" id="chatform-input" class="chatform-input" size="80" value="" placeholder="type your query">
      <button type="submit" class="btn-submit" value="submit">Submit</button>
    </form>
  `;
}

// Create the chat row
function createChatRow(type) {
  var chatRow = document.createElement('div');
  var alignment = (type == 'request') ? 'left' : 'right';
  chatRow.className = 'chat-row chat-row--' + type + ' chat-row-' + alignment;
  return chatRow;
}

// Build the user input row
function buildRequestRow(message) {
  var chatRow = createChatRow('request');
  chatRow.innerHTML = `
    <div class="bot-icon"></div>
    <div class="message message--request">${message}</div>
  `;
  return chatRow;
}

// Build the bot response row
function buildResponseRow(message) {
  var chatRow = createChatRow('response');
  chatRow.innerHTML = `
    <div class="bot-icon"><img src="assets/botIcon.png"></div>
    <div class="message message--response">${message}</div>
  `;
  return chatRow;
}

// Add rows to conversation list
function addToConversation(chatRow) {
  var conversationDiv = getConversationNode();
  conversationDiv.appendChild(chatRow);
  conversationDiv.scrollTop = conversationDiv.scrollHeight;
}

function showRequest(message) {
  addToConversation(buildRequestRow(message));
}

function showError(error) {
  console.log(error);
  var errorPara = document.createElement('p');
  errorPara.className = 'message--error';
  errorPara.appendChild(document.createTextNode(error));
  addToConversation(errorPara);
}

function showResponse(response) {
  var row;
  try {
    var message = JSON.parse(response.message);
    var prompt = message.prompt ? message.prompt : '';
    row = buildResponseRow(prompt);
    if (message.type) {
      row.querySelector('.message').appendChild(buildTemplates(message));
    }
    addToConversation(row);
  }
  catch(err) {
    console.log(err);
    row = buildResponseRow(response.message);
    addToConversation(row);
  }
}

function buildTemplates(message) {
  var formatedTemplate;
  // @TODO To be added components: image, audio, video, date
  if (message.type == "cards") {
    formatedTemplate = generateCardsItem(message.data);
  }
  else {
    formatedTemplate = generatePickerItem(message.data);
  }
  return formatedTemplate;
}

function generateCardsItem(options) {
  var cards = document.createElement('div');
  cards.className = 'cards';
  cards.innerHTML = '';
  options.forEach(function(option) {
    cards.innerHTML += `
      <div class="card-item" onclick="pushMessageToLex('${option.value}')" data-value="${option.value}">
        ${option.url ? `<img src="${option.url}">` : ''}
        <p class="card-link">${option.label}</p>
      </div>
    `;
  });
  return cards;
}

function generatePickerItem(options) {
  var buttons = document.createElement('div');
  buttons.className = 'buttons';
  buttons.innerHTML = '';
  options.forEach(function(option) {
    buttons.innerHTML += `
      <span class="button" onclick="pushMessageToLex('${option.value}')" data-value="${option.value}">${option.label}</span>
    `;
  });
  return buttons;
}

// Push new message to lex and conversation
function pushMessageToLex(value, hideRequest = false) {
  var inputElement = document.getElementById('chatform-input');
  if (!value) {
    value = inputElement.value;
  }
  var params = {
    botAlias: chatbot.botAlias,
    botName: chatbot.botName,
    inputText: value,
    userId: chatbot.lexUserId,
    sessionAttributes: chatbot.sessionAttributes,
  };
  var callback = {
    error: showError,
    success: showResponse
  }
  if (!hideRequest) {
    showRequest(value);
  }

  postToLex(params, callback, inputElement);
  // we always cancel form submission
  return false;
}

// Post to LEX
function postToLex(params, callback, inputElement) {
  // Disable input box
  if (inputElement) {
    inputElement.value = '...';
    inputElement.setAttribute('readonly', true);
    inputElement.classList.add('disabled');
  }

  chatbot.lexruntime.postText(params, function (err, data) {
    if (err) {
      callback.error('Error:  ' + err.message + ' (see console for details)')
    }
    if (data) {
      chatbot.sessionAttributes = data.sessionAttributes;
      callback.success(data);
    }
    if (inputElement) {
      // re-enable input
      inputElement.value = '';
      inputElement.removeAttribute('readonly');
      inputElement.classList.remove('disabled');
    }
  });
}

// Show and Hide widget
function show_hide() {
  var chatbot_widget = document.getElementById("main-container");
  if (chatbot_widget.style.display === "none") {
    chatbot_widget.style.display = "block";
  } else {
    chatbot_widget.style.display = "none";
  }
}

// Close and end the session of widget
function close_widget() {
  var container = document.getElementById("main-container");
  var chat_button = document.getElementById("view_chat");
  chat_button.style.removeProperty("display");
  container.parentNode.removeChild(container);
  return false;
}

// Initial conversation window
function launchWidget(evt, widget) {
  var rootElem = document.getElementById(chatbot.rootElementId);
  var username = rootElem.getAttribute('data-username') || 'there!';
  var widgetContainer = document.querySelectorAll(elementWithRootContext('.main-container'));

  if (widgetContainer && widgetContainer.length) {
      show_hide();
  } else {
    // Show widget
    widgetContainer = getWidgetContainer(evt, widget);
    rootElem.appendChild(widgetContainer);
    var message = "Hi, I am your virtual assistant.";
    var response = buildResponseRow(message);
    addToConversation(response);
    if (chatbot.initializer) {
      var hideInitialRequest = true;
      pushMessageToLex(chatbot.initializer, hideInitialRequest);
    }
  }
};


// Start the bot and load required script and styles
function chatinit() {
  if (!chatbot.botName) {
    console.log('Please provide lex botName')
    return;
  }
  if (!chatbot.poolId) {
    console.log('Please provide cognito pool id for Lex')
    return;
  }
  var rootElement = document.getElementById(chatbot.rootElementId);
  if (!rootElement) {
    rootElement = document.createElement('div');
    rootElement.id = chatbot.rootElementId;
    rootElement.setAttribute('data-username', 'there!');
    document.body.appendChild(rootElement);
  }
  // Load css till we add aws-sdk js
  loadStyles();

  // Include jquery if it's not added earlier
  includejQuery(function() {
    loadScript(chatbot.aws_sdk_path, function () {
      AWS.config.region = chatbot.region; // Region
      AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        // Provide your Pool Id here
        IdentityPoolId: chatbot.poolId,
      });
      chatbot.lexruntime = new AWS.LexRuntime();
    });

    // Add init icon
    if (chatbot.widget) {
      rootElement.classList += "window-widget";
      rootElement.innerHTML += `
        <div class="view_chat" id="view_chat" onclick="launchWidget(event, true)" aria-hidden="true">
          <i class="">+</i>
        </div>
      `;
    } else {
      launchWidget(null, false);
      rootElement.classList += "window-page";
    }
  });
};

// Load css and icons
function loadStyles() {
  var customStyle = document.createElement('style');
  customStyle.innerText = '@import "main.css"';
  document.head.appendChild(customStyle);
}

// Load aws-sdk script
function loadScript(url, callback) {
  var script = document.createElement("script");
  if (script.readyState) {  //IE
    script.onreadystatechange = function () {
      if (script.readyState === "loaded" || script.readyState === "complete") {
        script.onreadystatechange = null;
        callback();
      }
    };
  } else {  //Others
    script.onload = function () {
      callback();
    };
  }

  script.src = url;
  document.getElementsByTagName("head")[0].appendChild(script);
};

// Include jquery if not present
function includejQuery(callback) {
  if (window.jQuery) {
    jq = jQuery;
    callback();
  }
  else {
    // jQuery not loaded, load it and when it loads call
    // noConflict and the callback (if any).
    var script = document.createElement('script');
    var jquery_src = 'https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js';
    script.onload = function () {
      jQuery.noConflict();
      jq = jQuery;
      callback();
    };
    script.src = jquery_src;
    document.getElementsByTagName('head')[0].appendChild(script);
  }
};

// Start the bot
chatinit();
