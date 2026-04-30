# CREAMS

Make sure Python 3.10 or later is installed.

This project can be run in two simple ways.

## Local setup

1. Run the server:

```bash
python app.py
```

2. Open `website.html` in your browser.

3. If you want to use `index.html` on localhost instead, open `website.js` and change the `this.ws` line (675) to:

```javascript
this.ws = new WebSocket("ws://localhost:6790");
```

4. Join a room and start chatting.

If Python says the `websockets` package is missing, install it with:

```bash
python -m pip install websockets
```

## Server setup with ngrok

1. Run the server:

```bash
python app.py
```
2. Create a free ngrok account at ngrok.com and follow the install steps.

3. Start ngrok on port `6790`:

```bash
ngrok http 6790
```

4. Open `website.js` and find the line (675) that looks like:

```javascript
this.ws = new WebSocket("...");
```

5. Put inside the parentheses "wss:'your ngrok url minus the https://'"

6. Go to the link:

If your ngrok URL changes, update the link in `website.js` again.

7. To stop the server press ctrl+c in the terminal where it is running.
