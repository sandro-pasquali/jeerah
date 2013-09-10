JiraApi 	= require('jira').JiraApi;
var util 	= require('util');
var fs		= require('fs');
var rl		= require('readline');
var http	= require('http');
var express	= require('express');
var jade	= require('jade');
var crypto	= require('crypto');
var uuid 	= require('node-uuid');
var moment  = require('moment');
var config	= require('./config.json');

var app 	= express();
var clients	= {};

app
.use(express.compress())
.use(express.static('public/'))
.use(express.bodyParser())
.set('views', __dirname + '/views')
.set('view engine', 'jade')

var pinger = function() {
	setTimeout(function() {
		var c;
		for(c in clients) {
			clients[c].socket.write("data: PING\n\n");
		}
		pinger();
	}, 15000);
};
pinger();

var createHash = function() {
	return crypto.createHash('sha256').update(uuid.v4()).digest('hex');
};

var Jira = {
	getUsersIssues : function(id, cb) {
		var client = clients[id];
		if(!client) {
			return cb(new Error("Unable to get user issues."));
		}

		client.jira.searchJira('status in (Open) and assignee = ' + client.username, {
			fields: ["*all"]
		}, function(err, issueList) {
			if(err) {
				return cb(new Error(err));
			}
			
			
			//console.log(util.inspect(issueList, {depth:10, colors:true}));
			
			var out = [];
			issueList.issues.forEach(function(ob) {
				out.push({
					id 		: ob.id,
					link	: ob.self,
					key		: ob.key,
					fields 	: ob.fields
				});
			});
			
			cb(null, out);
		});
	},
}

var broadcast = function(id, msg) {
	if(typeof msg !== "string") {
		msg = JSON.stringify(msg);
	}
	clients[id] && clients[id].socket.write("data: " + msg + "\n\n");
}

var parallel = function(fn, finalCb, targ) {

	targ	= targ || [];
	finalCb	= finalCb || function(){};

	var	results	= {
		errored	: false,
		last	: null,
		stack	: []
	};
	var $this	= this;
	var len		= targ.length;
	var idx		= 0;
	var cnt     = 0;

	while(idx < len) {
		fn.call(this, targ[idx], idx, results, function(err, res, ridx) {

			results.errored = results.errored || err;
			results.last	= res;

			if(ridx !== void 0) {
				results.stack[ridx] = res;
			} else {
				results.stack.push(res);
			}

			++cnt

			if(cnt === len) {
				finalCb.call(this, results);
			}
		});

		++idx;
	}
};

app.get("/connect/:username/:password", function(request, response) {
  		
  	var username = decodeURIComponent(request.params.username);	
  	
	//	Don't recreate if username already registered.
	//	This shouldn't happen in normal operation.
	//
	var c;
	for(c in clients) {
		if(clients[c].username === username) {
			return response.end();
		}
	};
  		
	var id = createHash();
	
	response.writeHead(200, {
		"Content-Type"	: "text/event-stream",
		"Cache-Control"	: "no-cache",
		"Connection"	: "keep-alive"
	});

	response.write(":" + Array(2049).join(" ") + "\n");
	response.write("retry: 2000\n");

	clients[id] = {
		socket 		: response,
		username	: request.params.username,
		jira		: new JiraApi(
			config.protocol, 
			config.host, 
			config.port, 
			username, 
			decodeURIComponent(request.params.password), 
			config.apiVersion, 
			config.verbose, 
			config.strictSSL
		)
	};
	
	response.on("close", function() {
		delete clients[id];
	});
	
	//	Fetch tickets for this user, which is also a test of credentials.
	//	Warn if fail; return tickets if not.
	//
	Jira.getUsersIssues(id, function(err, issues) {
		if(err || typeof issues !== "object") {
			return broadcast(id, new Error(err));
		}
		
		var jOb = {
			groups: {},
			assignee : {},
			counter: 0
		}
		
		issues.forEach(function(iss) {
		
			var key		= iss.key;
			var proj 	= key.split("-")[0];
			
			jOb.assignee = iss.fields.assignee;
			
			jOb.groups[proj] = jOb.groups[proj] || [];
			
			iss.fields.created = moment(iss.fields.created).calendar();
			iss.fields.updated = moment(iss.fields.updated).calendar();
			
			jOb.groups[proj].push({
				id		: iss.id,
				link 	: 'http://' + config.host + "/browse/" + key,
				key 	: key,
				fields	: iss.fields
			});
		});

		app.render("summary_issue_view", jOb, function(err, html) {
			if(err) {
				return console.log(err);
			}
			broadcast(id, {
				tickets: html
			});
		});

		app.render("user_profile", jOb, function(err, html) {
			if(err) {
				return console.log(err);
			}
			broadcast(id, {
				userProfile: html
			});
		});
		
		app.render("paged_tickets", jOb, function(err, html) {
			if(err) {
				return console.log(err);
			}
			
			html = html.replace(/\n/g, "<br />");
			
			broadcast(id, {
				pagedTickets: html
			});
		});
	});
});

var server = http.createServer(app);
server.listen(8080);



