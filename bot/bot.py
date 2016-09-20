#! /bin/env python3

import json
from http.server import HTTPServer, SimpleHTTPRequestHandler
import sys
import requests

host = "localhost"
port = "8080"
bot = "exactly!"
botId = ""
backendURL = "http://localhost:5431"

class BotHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        self.send_response(204)
        self.send_header('Content-type', 'text/html')
        self.end_headers()

        data = json.loads(str(self.rfile.read(), 'utf-8'))
        print("Got request:", data)

        for msg in data:
            if ("exactly" in msg['body']) or ("Exactly" in msg['body']):
                requests.post(backendURL + "/bot/sendMessage", json = {
                    'room': msg['room'],
                    'body': 'Exactly! http://i.giphy.com/MOf4i4FexFxhm.gif'
                }, headers = {
                    'X-Api-Key': botId
                });
        return

if __name__ == "__main__":
    bot = sys.argv[1]
    host = sys.argv[2]
    port = sys.argv[3]
    backendURL = sys.argv[4]

    print("Starting bot", bot, "on:", host, port)
    r = requests.post(backendURL + "/bot", json = {
        'name': bot,
        'callback': "http://" + host + ":"+ port + "/"
    })

    if r.status_code == 200:
        print("Bot created: ", r.json())
        botId = r.json()['id']
    else:
        print("Bot already exists!", r.text)
        exit(1)

    httpd = HTTPServer(('', int(port)), BotHandler)
    httpd.serve_forever()
