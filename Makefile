all: dist

dist: 
		mkdir -p ./dist
		npm install
		./node_modules/bookmarklet/bin/cli.js ./src/GoogleFlightsExport.js ./dist/GoogleFlightsExport.bookmarklet.js

clean: 
		rm -rf ./dist