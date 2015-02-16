var http = require('http');
var https = require('https');
var port = process.env.PORT || 3000;
var apiKey = process.env.GITHUB_API_KEY;
if (!apiKey) {
  throw new Error("GITHUB_API_KEY not set");
}

var makeComment = function(issueNumber, bodyMsg, cb) {
  var postData = JSON.stringify({ body: bodyMsg });
  var options = {
    hostname: 'api.github.com',
    port: 443,
    path: '/repos/code-cracker/code-cracker/issues/' + issueNumber + '/comments',
    method: 'POST',
    headers:  {
      'Authorization': 'token ' + apiKey,
      'Content-Type': 'application/json',
      'Content-Length': postData.length,
      'User-Agent': 'CodeCracker Bot'
    }
  };
  var error = "";
  var callbackCalled = false;
  var req = https.request(options, function(res) {
    if (res.statusCode != 201) {
      error = "Response was not 201, but " + res.statusCode + ". Headers: " + JSON.stringify(res.headers) + "\nData:";
      res.setEncoding('utf8');
      res.on('data', function(data) {
        error += data;
      });
      res.on('end', function() {
        if (!callbackCalled) {
          callbackCalled = true;
          cb(new Error(error));
        }
      });
    } else {
        if (!callbackCalled) {
          callbackCalled = true;
          cb();
        }
    }
  });
  req.write(postData);
  req.end();
  req.on('error', function(err) {
    if (!callbackCalled) {
      callbackCalled = true;
      cb(err);
    }
  });
}

http.createServer(function (req, res) {
  if (req.method === 'POST' & req.url.toUpperCase() === '/MESSAGE') {
    try {
      var bodyMsg = "";
      req.on('data', function (chunk) {
        bodyMsg += chunk;
      });
      req.on('end', function () {
        if (!bodyMsg) {
          res.writeHead(500);
          res.end('No body specified.');
          return;
        }
        try {
          var parsedBodyMsg = JSON.parse(bodyMsg);
        } catch (e) {
          res.writeHead(500);
          res.end('Only Json allowed.');
          return;
        }
        if (!parsedBodyMsg.body) {
          res.writeHead(500);
          res.end('Body missing in json.');
          return;
        }
        if (!parsedBodyMsg.issueNumber) {
          res.writeHead(500);
          res.end('Issue number missing in json.');
          return;
        }

        makeComment(parsedBodyMsg.issueNumber, parsedBodyMsg.body, function(err){
          if (err) {
            console.log(err);
            res.writeHead(500);
            res.end('Error sending request to Github.');
          }
          else {
            res.writeHead(201);
            res.end();
          }
        });
      });
    } catch (err) {
      console.log("Unexpected error: " + err);
      res.writeHead(500);
      res.end();
    }
    return;
  }
  res.writeHead(404);
  res.end();
}).listen(port);
console.log('Server running at http://127.0.0.1:' + port + '/');
