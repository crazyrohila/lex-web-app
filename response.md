## Cards ##

```json
{
  "type": "cards",
  "prompt": "prompt message",
  "data": [{
    "label": "Title",
    "value": "text to be sent to the server",
    "url": "Image URL"
  },
  {
    "label": "Title ",
    "value": "text to be sent to the server",
    "url": "Image URL"
  }]
}
```


## Picker ##

```json
{
  "type": "buttons",
  "prompt": "prompt message",
  "data": [{
    "label": "Text to show",
    "value": "Value send to lex"
  },
  {
    "label": "Text to show",
    "value": "Value send to lex"
  }]
}
```

## Plaintext ##

```json
{
  "type": "plaintext",
  "prompt": "prompt message"
}
```

### Yet to be added components

## Date ##

```javascript
{
  "type": "date",
  "prompt": "String"
}
```

## Image ##

```javascript
{
  "type": "image",
  "prompt": "string"
  "data": [{
    "url": "Image URL",
    "label": "string",
    "value": "string"
  }]
}
```

## Video ##

```javascript
{
  "type": "video",
  "prompt": "string"
  "data": [{
    "url": "Video URL",
    "thumb": "thumb URL",
    "label": "string",
    "value": "string"
  }]
}
```

## Audio ##

```javascript
{
  "type": "audio",
  "prompt": "string"
  "data": [{
    "url": "Audio URL",
    "label": "string",
    "value": "string"
  }]
}
```
