from app import init_db, ThreadingHTTPServer, Handler, HOST, PORT

init_db()
print(f'CyberShield running at http://{HOST}:{PORT}')
ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
