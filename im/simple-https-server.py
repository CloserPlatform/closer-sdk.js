#!/bin/env python2
#    openssl req -new -x509 -keyout server.pem -out server.pem -days 365 -nodes

import BaseHTTPServer, SimpleHTTPServer
import ssl

print "Starting SSL server on 0.0.0.0:8443"
httpd = BaseHTTPServer.HTTPServer(('0.0.0.0', 8443), SimpleHTTPServer.SimpleHTTPRequestHandler)
httpd.socket = ssl.wrap_socket(httpd.socket, certfile='im/server.pem', server_side=True)
httpd.serve_forever()
