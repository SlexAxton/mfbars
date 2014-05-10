# mfbars

This library modifies the Handlebars parser and precompiler in order to allow you to write messages
in your native language into your handlebars templates, but then still switch them out for other
languages and compile them into fast/small functions as messageformat.js does outside of
handlebars.

This allows your templates to still contain the valuable context of your native language, but also
allow the app to optimally compile into a minimal runtime.

There are additional features that help with providing additional context for translators. The
format that's used here is custom as there is not a real standard, but does come from experience
working with translators.

## How to use it

```javascript
var Handlebars = require('mfbars')(require('handlebars'));

// Then just use Handlebars as you normally would.
```

## What it looks like

```html
{{#if friends}}
<article class="friend-count">
  <p>
  {{#_ "friend_count" .}}
    You {friends, plural, offset:1
      =0 {like this}
      one {and one other friend like this}
      other {and # other friends like this}
    }.
  {{/_}}
  </p>
</article>
{{/if}}
```

## How it looks after mfbars messes with it (pretty much)

### Will generate some JavaScript

```js
Handlebars.registerHelper('_mfbars_friend_count', function(data) {
  var p = Messageformat.render;
  var msg = function (d) {
    return "You " + p(
      d,
      "friends",
      1,
      "en",
      {
        "0": "like this",
        "one": "and one other friend like this",
        "other": "and "+n(d,"friends",1)+" other friends like this"
      }
    ) + "."
  };

  return msg(data);
});
```

### And will rewrite your template to look like this on the fly

```html
{{#if friends}}
<article class="friend-count">
  <p>
  {{_mfbars_friend_count .}}
  </p>
</article>
{{/if}}
```

### Other languages

If you specify another language to compile to, it will throw away the inline message and put in
your specified translation. The only thing that changes is the output of the compiled Handlebars
helpers. So feel free to compile this into a separate "package," but since rendering messages is
required functionality, it's usually faster to just have whole separate builds of your app with
each language embedded inside.


