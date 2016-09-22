#! /bin/env python3

import json
from http.server import HTTPServer, SimpleHTTPRequestHandler
import sys
import requests

backendURL = ""
botId = ""
botApiKey = ""

class BotHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        self.send_response(204)
        self.send_header('Content-type', 'text/html')
        self.end_headers()

        data = json.loads(str(self.rfile.read(), 'utf-8'))
        print("Got request:", data)

        for msg in data:
            if ("exactly" in msg['body']) or ("Exactly" in msg['body']):
                requests.post(backendURL + "/api/bots/" + botId + "/sendMessage", json = {
                    'room': msg['room'],
                    'body': 'Exactly! http://i.giphy.com/MOf4i4FexFxhm.gif'
                }, headers = {
                    'X-Api-Key': botApiKey
                });
        return

if __name__ == "__main__":
    port = sys.argv[1]
    backendURL = sys.argv[2]
    botId = sys.argv[3]
    botApiKey = sys.argv[4]
    httpd = HTTPServer(('', int(port)), BotHandler)
    httpd.serve_forever()
