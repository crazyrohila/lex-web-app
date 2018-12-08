"use strict";

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
};
var jq; // Get selector only inside root element

function elementWithRootContext(selector) {
  return '#' + chatbot.rootElementId + ' ' + selector;
} // get the #conversation div


function getConversationNode() {
  return document.querySelector(elementWithRootContext('#conversation'));
} // Get the main-container inside root element


function getWidgetContainer(event, widget) {
  var widgetContainer = document.createElement('div');
  widgetContainer.className = 'main-container';
  widgetContainer.setAttribute("id", "main-container");
  widgetContainer.innerHTML = pageTemplate(widget);

  if (widget) {
    var e = event.target;
    var dim = e.getBoundingClientRect();
    var x = event.clientX - dim.left + 'px';
    var y = event.clientY - (dim.top + dim.height) + 'px';
    widgetContainer.style = 'position: fixed; right: ' + x + ';';
  }

  return widgetContainer;
}

function pageTemplate(widget) {
  return "\n    <div class=\"chatbot-header\">\n      <div class=\"logo\">\n        Lex Web-App\n      </div>\n      <div class=\"powered-logo\">\n        <img src=\"https://d1.awsstatic.com/logos/aws/PB_AWS_logo_RGB.jpg\">\n      </div>\n      " + (widget ? "<div class=\"widget-actions\">\n        <span class=\"widget-actions__toggle\" onclick=\"show_hide()\">__</span>\n        <span class=\"widget-actions__close\" onclick=\"close_widget()\">X</i></span>\n        </div>" : '') + "\n    </div>\n    <div id=\"conversation\"></div>\n    <form id=\"chatform\" class=\"chatform\" onsubmit=\"return pushMessageToLex();\">\n      <input type=\"text\" id=\"chatform-input\" class=\"chatform-input\" size=\"80\" value=\"\" placeholder=\"type your query\">\n      <button type=\"submit\" class=\"btn-submit\" value=\"submit\">Submit</button>\n    </form>\n  ";
} // Create the chat row


function createChatRow(type) {
  var chatRow = document.createElement('div');
  var alignment = type == 'request' ? 'left' : 'right';
  chatRow.className = 'chat-row chat-row--' + type + ' chat-row-' + alignment;
  return chatRow;
} // Build the user input row


function buildRequestRow(message) {
  var chatRow = createChatRow('request');
  chatRow.innerHTML = "\n    <div class=\"bot-icon\"></div>\n    <div class=\"message message--request\">" + message + "</div>\n  ";
  return chatRow;
} // Build the bot response row


function buildResponseRow(message) {
  var chatRow = createChatRow('response');
  chatRow.innerHTML = "\n    <div class=\"bot-icon\"><img src=\"assets/botIcon.png\"></div>\n    <div class=\"message message--response\">" + message + "</div>\n  ";
  return chatRow;
} // Add rows to conversation list


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
  var chat_item;
  var prompt = response.message ? response.message : '';
  chat_item = buildResponseRow(prompt);
  addToConversation(chat_item);

  try {
    if (response.responseCard && response.responseCard.genericAttachments) {
      chat_item = buildResponseRow(generateCardsItem(response.responseCard.genericAttachments));
      addToConversation(chat_item);
    }
  } catch (err) {
    console.log(err);
  }
}

function generateCardsItem(options) {
  var cards = "<div class=\"cards\">";
  var buttons = null;
  options.forEach(function (option) {
    if (option.buttons) {
      buttons = generatePickerItem(option.buttons);
    }

    cards += "\n      <div class=\"card-item\">\n        " + (option.attachmentLinkUrl ? "<a class=\"card-link\" href=\"" + option.attachmentLinkUrl + "\">" : '') + "\n          " + (option.imageUrl ? "<img src=\"" + option.imageUrl + "\">" : '') + "\n          " + (option.title ? "<h3 class=\"card-title\">" + option.title + "</h3>" : '') + "\n          " + (option.subTitle ? "<h4 class=\"card-sub-title\">" + option.subTitle + "</h4>" : '') + "\n          " + (option.buttons ? buttons : '') + "\n        " + (option.attachmentLinkUrl ? "</a>" : '') + "\n      </div>\n    ";
  });
  cards += "</div>";
  return cards;
}

function generatePickerItem(options) {
  var buttons = "<div class=\"buttons\">";
  options.forEach(function (option) {
    buttons += "\n      <span class=\"button\" onclick=\"pushMessageToLex('" + option.value + "')\" data-value=\"" + option.value + "\">" + option.text + "</span>\n    ";
  });
  buttons += "</div>";
  return buttons;
} // Push new message to lex and conversation


function pushMessageToLex(value) {
  var hideRequest = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  var inputElement = document.getElementById('chatform-input');

  if (!value) {
    value = inputElement.value;
  }

  var params = {
    botAlias: chatbot.botAlias,
    botName: chatbot.botName,
    inputText: value,
    userId: chatbot.lexUserId,
    sessionAttributes: chatbot.sessionAttributes
  };
  var callback = {
    error: showError,
    success: showResponse
  };

  if (!hideRequest) {
    showRequest(value);
  }

  postToLex(params, callback, inputElement); // we always cancel form submission

  return false;
} // Post to LEX


function postToLex(params, callback, inputElement) {
  // Disable input box
  if (inputElement) {
    inputElement.value = '...';
    inputElement.setAttribute('readonly', true);
    inputElement.classList.add('disabled');
  }

  chatbot.lexruntime.postText(params, function (err, data) {
    if (err) {
      callback.error('Error:  ' + err.message + ' (see console for details)');
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
} // Show and Hide widget


function show_hide() {
  var chatbot_widget = document.getElementById("main-container");

  if (chatbot_widget.style.display === "none") {
    chatbot_widget.style.display = "block";
  } else {
    chatbot_widget.style.display = "none";
  }
} // Close and end the session of widget


function close_widget() {
  var container = document.getElementById("main-container");
  var chat_button = document.getElementById("view_chat");
  chat_button.style.removeProperty("display");
  container.parentNode.removeChild(container);
  return false;
} // Initial conversation window


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
}

; // Start the bot and load required script and styles

function chatinit() {
  if (!chatbot.botName) {
    console.log('Please provide lex botName');
    return;
  }

  if (!chatbot.poolId) {
    console.log('Please provide cognito pool id for Lex');
    return;
  }

  var rootElement = document.getElementById(chatbot.rootElementId);

  if (!rootElement) {
    rootElement = document.createElement('div');
    rootElement.id = chatbot.rootElementId;
    rootElement.setAttribute('data-username', 'there!');
    document.body.appendChild(rootElement);
  } // Load css till we add aws-sdk js


  loadStyles(); // Include jquery if it's not added earlier

  includejQuery(function () {
    loadScript(chatbot.aws_sdk_path, function () {
      AWS.config.region = chatbot.region; // Region

      AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        // Provide your Pool Id here
        IdentityPoolId: chatbot.poolId
      });
      chatbot.lexruntime = new AWS.LexRuntime();
    }); // Add init icon

    if (chatbot.widget) {
      rootElement.classList += "window-widget";
      rootElement.innerHTML += "\n        <div class=\"view_chat\" id=\"view_chat\" onclick=\"launchWidget(event, true)\" aria-hidden=\"true\">\n          <i class=\"\">+</i>\n        </div>\n      ";
    } else {
      launchWidget(null, false);
      rootElement.classList += "window-page";
    }
  });
}

; // Load css and icons

function loadStyles() {
  var customStyle = document.createElement('style');
  customStyle.innerText = '[id^="chatbot-widget"] *,[id^="chatbot-widget"] *:before,[id^="chatbot-widget"] *:after{box-sizing:border-box}[id^="chatbot-widget"] img{width:100%;height:auto;vertical-align:baseline}[id^="chatbot-widget"] .chatbot-header{position:relative;display:flex;justify-content:space-between;padding:30px 10px 10px;border-bottom:3px solid}[id^="chatbot-widget"] .logo{font-size:24px}[id^="chatbot-widget"] .chatbot-header img{max-width:100px;height:auto}[id^="chatbot-widget"] .widget-actions{position:absolute;right:0;top:0}[id^="chatbot-widget"] .widget-actions span{display:inline-block;padding:0 4px;color:#fff;font-size:20px;cursor:pointer}[id^="chatbot-widget"] .widget-actions__toggle{background:#5217ca}[id^="chatbot-widget"] .widget-actions__close{background:#f77}[id^="chatbot-widget"].window-widget .main-container{z-index:10;font-size:12px;min-height:350px;width:480px;bottom:86px;border:1px solid #5217ca}[id^="chatbot-widget"] #conversation{position:relative;overflow-y:auto;min-height:inherit;width:auto;padding-top:20px}[id^="chatbot-widget"].window-widget #conversation{height:380px}[id^="chatbot-widget"].window-page #conversation{height:75vh}[id^="chatbot-widget"] .chat-row{clear:both;overflow:hidden;padding:0 10px}[id^="chatbot-widget"] .bot-icon img{max-width:45px}[id^="chatbot-widget"] .message{max-width:65%;min-width:50%;border:0;margin-bottom:12px;margin-top:6px;border-radius:10px;box-shadow:0 0 10px #ccc;padding:10px}[id^="chatbot-widget"] .chat-row-left .bot-icon{margin-right:10px;float:left}[id^="chatbot-widget"] .chat-row-right .bot-icon{margin-left:10px;float:right}[id^="chatbot-widget"] .chat-row-left .message{float:left;text-align:left;border-top-left-radius:0}[id^="chatbot-widget"] .chat-row-right .message{float:right;text-align:right;border-top-right-radius:0}[id^="chatbot-widget"] .message--error{margin:4px;padding:4px 10px 4px 10px;border-radius:4px;text-align:right;min-width:50%;max-width:85%;float:right;background-color:#f77}[id^="chatbot-widget"] .chatform{position:relative;height:35px;margin:0}[id^="chatbot-widget"] .chatform-input{padding:8px 10px;font-size:14px;width:100%;display:inherit;border:1px solid #5217ca}[id^="chatbot-widget"] .chatform-input.disabled{cursor:not-allowed;background:#ccc}[id^="chatbot-widget"] .chatform-input::placeholder{color:#ccc;font-style:italic}[id^="chatbot-widget"] .chatform .btn-submit{position:absolute;top:0;right:0;height:inherit;background:#5217ca;color:#fff;border:0}[id^="chatbot-widget"] .button{display:inline-block;padding:5px 8px;background:#5217ca;margin:5px;color:#fff;cursor:pointer}[id^="chatbot-widget"] .cards{overflow:scroll;display:flex;flex-wrap:nowrap;justify-content:flex-start}[id^="chatbot-widget"] .card-item{display:flex;flex-direction:column;justify-content:stretch;align-items:center;max-width:200px;overflow:hidden;border:1px solid #ccc;border-radius:10px;margin:10px;cursor:pointer}[id^="chatbot-widget"] .card-item img{border-bottom:1px solid}[id^="chatbot-widget"] .card-item .card-title,[id^="chatbot-widget"] .card-item .card-sub-title{align-self:flex-start;margin:0;padding:0 5px}[id^="chatbot-widget"] .card-link{margin:0;color:#5217ca}[id^="chatbot-widget"] .buttons{width:100%;display:flex;align-items:center;flex-wrap:wrap;justify-content:center;padding:5px}[id^="chatbot-widget"] .view_chat{position:fixed;bottom:35px;right:35px;width:40px;height:40px;background:#5217ca;border-radius:50%;color:#fff;font-size:36px;line-height:100%;text-align:center;cursor:pointer}[id^="chatbot-widget"] .audio-control{cursor:pointer;background-color:#fff;box-shadow:0 0 8px #5217ca;border-radius:100px;height:100px;margin:20px auto;width:100px;display:flex;margin-bottom:0}[id^="chatbot-widget"] .audio-control:hover,[id^="chatbot-widget"] .audio-control--active{box-shadow:0 0 8px #5217ca}[id^="chatbot-widget"] .audio-control i{margin:auto}[id^="chatbot-widget"] .voice--message--status{text-align:center;padding:5px;margin-top:0}[id^="chatbot-widget"] .lex-voice--close{float:right;padding:12px}';
  document.head.appendChild(customStyle);
} // Load aws-sdk script


function loadScript(url, callback) {
  var script = document.createElement("script");

  if (script.readyState) {
    //IE
    script.onreadystatechange = function () {
      if (script.readyState === "loaded" || script.readyState === "complete") {
        script.onreadystatechange = null;
        callback();
      }
    };
  } else {
    //Others
    script.onload = function () {
      callback();
    };
  }

  script.src = url;
  document.getElementsByTagName("head")[0].appendChild(script);
}

; // Include jquery if not present

function includejQuery(callback) {
  if (window.jQuery) {
    jq = jQuery;
    callback();
  } else {
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
}

; // Start the bot

chatinit();